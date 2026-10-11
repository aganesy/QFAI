import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyDecisionRenumberPlan,
  buildDecisionRenumberPlan,
} from "../../../src/core/storyTree/renumberDecision.js";

const faults = vi.hoisted(() => ({ unreadable: "", denied: 0 }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    open: (...args: Parameters<typeof actual.open>) => {
      if (String(args[0]) === faults.unreadable) {
        faults.denied += 1;
        return Promise.reject(
          Object.assign(new Error("candidate read denied"), { code: "EACCES" }),
        );
      }
      return actual.open(...args);
    },
  };
});

let root: string;
const specsDir = ".qfai/spec";
const ledger = `${specsDir}/decisions.md`;
const candidates = [ledger, "a.txt", "b.txt"];

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

async function prepare() {
  await mkdir(path.join(root, specsDir), { recursive: true });
  const table = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
  await writeFile(path.join(root, ledger), table + "| DEC-0001 | Inherited | Keep | DONE |\n");
  git("add", ".");
  git("commit", "-m", "ancestor");
  git("checkout", "-b", "topic");
  await writeFile(
    path.join(root, ledger),
    table + "| DEC-0001 | Inherited | Keep | DONE |\n| DEC-0002 | New choice | Reason | TODO |\n",
  );
  for (const file of candidates.slice(1)) {
    await writeFile(path.join(root, file), `${file}: DEC-0002\n`);
  }
  git("add", ".");
  git("commit", "-m", "branch decision and references");
  return buildDecisionRenumberPlan({
    root,
    specsDir,
    from: "DEC-0002",
    to: "DEC-0003",
    base: "main",
  });
}

async function snapshot(): Promise<Buffer[]> {
  return Promise.all(candidates.map((file) => readFile(path.join(root, file))));
}

beforeEach(async () => {
  faults.denied = 0;
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-renumber-fault-"));
  git("init", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
  git("config", "core.autocrlf", "false");
});

afterEach(async () => {
  faults.unreadable = "";
  await rm(root, { recursive: true, force: true });
});

describe("decision renumber write safety", () => {
  // QFAI:EX-0001-0008-20
  it("rejects an unreadable candidate while preserving every original", async () => {
    await prepare();
    const before = await snapshot();
    faults.unreadable = path.join(root, "b.txt");
    try {
      const failure = buildDecisionRenumberPlan({
        root,
        specsDir,
        from: "DEC-0002",
        to: "DEC-0003",
        base: "main",
      });
      await expect(failure).rejects.toThrow("b.txt");
      await expect(failure).rejects.toThrow(/unreadable/i);
      expect(faults.denied).toBeGreaterThan(0);
    } finally {
      faults.unreadable = "";
    }
    expect(await snapshot()).toEqual(before);
  });

  // QFAI:EX-0001-0008-21
  it.each(["HEAD", "base"])("writes nothing when the fixed %s changes", async (ref) => {
    const plan = await prepare();
    const before = await snapshot();
    if (ref === "HEAD") git("commit", "--allow-empty", "-m", "advance HEAD");
    else git("update-ref", "refs/heads/main", "HEAD");
    const writer = vi.fn(async (file: string, contents: Buffer) => writeFile(file, contents));
    await expect(applyDecisionRenumberPlan(plan, { writeFile: writer })).rejects.toThrow(
      /(?:changed|stale|HEAD|base|main)/i,
    );
    expect(writer).not.toHaveBeenCalled();
    expect(await snapshot()).toEqual(before);
  });

  // QFAI:EX-0001-0008-21
  it("preserves a concurrent byte change detected before the first write", async () => {
    const plan = await prepare();
    const last = plan.changes.at(-1);
    if (!last || plan.changes.length < 2) throw new Error("fixture needs multiple patches");
    const concurrent = Buffer.from("Operator changed this candidate\n");
    await writeFile(path.join(root, last.file), concurrent);
    const before = await snapshot();
    const writer = vi.fn(async (file: string, contents: Buffer) => writeFile(file, contents));
    await expect(applyDecisionRenumberPlan(plan, { writeFile: writer })).rejects.toThrow(last.file);
    expect(writer).not.toHaveBeenCalled();
    expect(await snapshot()).toEqual(before);
  });

  // QFAI:EX-0001-0008-21
  it("restores earlier writes but preserves a later candidate changed before its write", async () => {
    const plan = await prepare();
    const [first, second, third] = plan.changes;
    if (!first || !second || !third) throw new Error("fixture needs three patches");
    const concurrent = Buffer.from("Later operator edit\n");
    await expect(
      applyDecisionRenumberPlan(plan, {
        writeFile: async (file, contents) => {
          await writeFile(file, contents);
          if (file === path.join(root, first.file) && contents.equals(first.replacement)) {
            await writeFile(path.join(root, second.file), concurrent);
          }
        },
      }),
    ).rejects.toThrow(second.file);
    expect(await readFile(path.join(root, first.file))).toEqual(first.original);
    expect(await readFile(path.join(root, second.file))).toEqual(concurrent);
    expect(await readFile(path.join(root, third.file))).toEqual(third.original);
  });

  // QFAI:EX-0001-0008-22
  it("restores earlier files when a later write fails", async () => {
    const plan = await prepare();
    const second = plan.changes[1];
    if (!second) throw new Error("fixture needs multiple patches");
    const before = await snapshot();
    await expect(
      applyDecisionRenumberPlan(plan, {
        writeFile: async (file, contents) => {
          if (file === path.join(root, second.file)) throw new Error("later write denied");
          await writeFile(file, contents);
        },
      }),
    ).rejects.toThrow(/later write denied/);
    expect(await snapshot()).toEqual(before);
  });

  // QFAI:EX-0001-0008-22
  it("reports an unrestored partial write without replacing its mismatched bytes", async () => {
    const plan = await prepare();
    const [first, second, third] = plan.changes;
    if (!first || !second || !third) throw new Error("fixture needs three patches");
    const partial = second.replacement.subarray(0, 3);
    const failure = applyDecisionRenumberPlan(plan, {
      writeFile: async (file, contents) => {
        if (file === path.join(root, second.file)) {
          await writeFile(file, partial);
          throw new Error("partial write denied");
        }
        await writeFile(file, contents);
      },
    });
    await expect(failure).rejects.toThrow("partial write denied");
    await expect(failure).rejects.toThrow(second.file);
    expect(await readFile(path.join(root, first.file))).toEqual(first.original);
    expect(await readFile(path.join(root, second.file))).toEqual(partial);
    expect(await readFile(path.join(root, third.file))).toEqual(third.original);
  });

  // QFAI:EX-0001-0008-22
  it("attempts other restorations after one fails and reports the unrestored path", async () => {
    const plan = await prepare();
    const [first, second, third] = plan.changes;
    if (!first || !second || !third) throw new Error("fixture needs three patches");
    const failure = applyDecisionRenumberPlan(plan, {
      writeFile: async (file, contents) => {
        if (file === path.join(root, third.file)) throw new Error("last write denied");
        if (file === path.join(root, first.file) && contents.equals(first.original)) {
          throw new Error("restoration denied");
        }
        await writeFile(file, contents);
      },
    });
    await expect(failure).rejects.toThrow("last write denied");
    await expect(failure).rejects.toThrow(first.file);
    expect(await readFile(path.join(root, first.file))).toEqual(first.replacement);
    expect(await readFile(path.join(root, second.file))).toEqual(second.original);
    expect(await readFile(path.join(root, third.file))).toEqual(third.original);
  });

  // QFAI:EX-0001-0008-22
  it("preserves concurrent edits during rollback and restores the other changed file", async () => {
    const plan = await prepare();
    const [first, second, third] = plan.changes;
    if (!first || !second || !third) throw new Error("fixture needs three patches");
    const concurrent = Buffer.from("Concurrent writer owns these bytes\n");
    const failure = applyDecisionRenumberPlan(plan, {
      writeFile: async (file, contents) => {
        if (file === path.join(root, third.file)) {
          await writeFile(path.join(root, first.file), concurrent);
          throw new Error("last write failed");
        }
        await writeFile(file, contents);
      },
    });
    await expect(failure).rejects.toThrow("last write failed");
    await expect(failure).rejects.toThrow(first.file);
    expect(await readFile(path.join(root, first.file))).toEqual(concurrent);
    expect(await readFile(path.join(root, second.file))).toEqual(second.original);
    expect(await readFile(path.join(root, third.file))).toEqual(third.original);
  });
});
