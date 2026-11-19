/**
 * A migration move between two filesystems copies and then removes the source.
 * The copy is published at the destination only once it is complete, and the
 * source stays until it is, so a failed copy leaves nothing a retry would take
 * for existing data and a destination that appears meanwhile is not replaced.
 *
 * `rename` raises `EXDEV` here to stand in for a second filesystem. `vi.mock`
 * is hoisted to module scope, so these cases live apart from `harness.test.ts`.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  MigrationContext,
  MigrationStep,
} from "../../../../src/migration/specToStory/harness.js";

type FsPromises = typeof fsPromises;
type CpArgs = Parameters<FsPromises["cp"]>;

const { renameSpy, cpSpy } = vi.hoisted(() => ({
  renameSpy: vi.fn(),
  cpSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    rename: (from: string, to: string): unknown => renameSpy(actual, from, to),
    cp: (...args: CpArgs): unknown => cpSpy(actual, ...args),
  };
});

const { defaultConfig } = await import("../../../../src/core/config.js");
const { executePlannedStep } = await import("../../../../src/migration/specToStory/harness.js");

const roots: string[] = [];

/** `rename` fails as it does across filesystems for every move out of `source`. */
function renameAcrossFilesystemsFrom(source: string): void {
  renameSpy.mockImplementation((actual: FsPromises, from: string, to: string) => {
    if (from === source) {
      return Promise.reject(Object.assign(new Error("simulated EXDEV"), { code: "EXDEV" }));
    }
    return actual.rename(from, to);
  });
}

beforeEach(() => {
  renameSpy.mockImplementation((actual: FsPromises, from: string, to: string) =>
    actual.rename(from, to),
  );
  cpSpy.mockImplementation((actual: FsPromises, ...args: CpArgs) => actual.cp(...args));
});

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function context(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-cross-fs-"));
  roots.push(root);
  await mkdir(path.join(root, ".qfai"));
  return {
    root,
    specsDir: path.join(root, ".qfai", "spec"),
    contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
    config: structuredClone(defaultConfig),
  };
}

function moveStep(source: string, target: string): MigrationStep {
  return {
    number: 1,
    writeSet: ["qfai"],
    plan: () => Promise.resolve({ operations: [{ kind: "move", source, target }] }),
  };
}

function io() {
  return { stdout: { write: () => true }, stderr: { write: () => true } };
}

describe("a migration move across filesystems", () => {
  it("leaves no destination and keeps the source when the copy fails, so a retry completes it", async () => {
    const ctx = await context();
    const source = path.join(ctx.root, ".qfai", "old");
    await mkdir(source);
    await writeFile(path.join(source, "a.md"), "a");
    await writeFile(path.join(source, "b.md"), "b");
    renameAcrossFilesystemsFrom(source);
    // The disk fills after the first file of the copy.
    cpSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
      await actual.mkdir(to, { recursive: true });
      await actual.copyFile(path.join(from, "a.md"), path.join(to, "a.md"));
      throw Object.assign(new Error("simulated ENOSPC"), { code: "ENOSPC" });
    });
    const step = moveStep(".qfai/old", ".qfai/new");

    await expect(executePlannedStep(step, ctx, false, io())).rejects.toMatchObject({
      code: "ENOSPC",
    });
    expect((await readdir(path.join(ctx.root, ".qfai"))).sort()).toEqual(["old"]);
    expect((await readdir(source)).sort()).toEqual(["a.md", "b.md"]);

    cpSpy.mockImplementation((actual: FsPromises, ...args: CpArgs) => actual.cp(...args));
    expect(await executePlannedStep(step, ctx, false, io())).toBe(0);
    expect((await readdir(path.join(ctx.root, ".qfai"))).sort()).toEqual(["new"]);
    expect(await readFile(path.join(ctx.root, ".qfai", "new", "a.md"), "utf8")).toBe("a");
    expect(await readFile(path.join(ctx.root, ".qfai", "new", "b.md"), "utf8")).toBe("b");
  });

  it("refuses to replace a file that appears at the destination during the copy, and keeps the source", async () => {
    const ctx = await context();
    const source = path.join(ctx.root, ".qfai", "source.md");
    const target = path.join(ctx.root, ".qfai", "target.md");
    await writeFile(source, "source");
    renameAcrossFilesystemsFrom(source);
    // Another process writes the destination while the copy runs.
    cpSpy.mockImplementation(async (actual: FsPromises, ...args: CpArgs) => {
      await actual.cp(...args);
      await actual.writeFile(target, "theirs");
    });
    const captured: string[] = [];
    const output = {
      stdout: { write: () => true },
      stderr: { write: (v: string) => captured.push(v) },
    };

    expect(
      await executePlannedStep(moveStep(".qfai/source.md", ".qfai/target.md"), ctx, false, output),
    ).toBe(2);
    expect(captured.join("")).toBe("Migration destination exists: .qfai/target.md\n");
    expect(await readFile(target, "utf8")).toBe("theirs");
    expect(await readFile(source, "utf8")).toBe("source");
    expect((await readdir(path.join(ctx.root, ".qfai"))).sort()).toEqual([
      "source.md",
      "target.md",
    ]);
  });
});
