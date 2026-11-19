/**
 * How the migration replaces a file that already exists.
 *
 * Writing over a file truncates it first, so a full disk, an `EIO` or a stopped
 * run partway through leaves a half-written document and no copy of what it
 * replaced. Each overwrite the migration makes goes to a new file beside the
 * target and is renamed over it instead, so a failed write leaves the original
 * exactly as it was and leaves no temporary file behind.
 *
 * The failure is injected into `writeFile`: it writes half the bytes and then
 * fails as a full disk does. `vi.mock` is hoisted to module
 * scope, so these cases live apart from `harness.test.ts`.
 */

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { writeReminderHooks } from "../../../../src/core/init/reminderHooks.js";
import {
  executePlannedStep,
  type MigrationContext,
  type MigrationStep,
} from "../../../../src/migration/specToStory/harness.js";
import { step11 } from "../../../../src/migration/specToStory/step11InstallEntry.js";

type FsPromises = typeof fsPromises;

const { failure, diskFull } = vi.hoisted(() => ({
  failure: { on: false },
  diskFull: (): NodeJS.ErrnoException =>
    Object.assign(new Error("ENOSPC: no space left on device"), { code: "ENOSPC" }),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    writeFile: async (...args: Parameters<FsPromises["writeFile"]>) => {
      if (!failure.on) return actual.writeFile(...args);
      const [file, data, options] = args;
      const text = typeof data === "string" ? data : "";
      await actual.writeFile(file, text.slice(0, Math.floor(text.length / 2)), options);
      throw diskFull();
    },
  };
});

const roots: string[] = [];

beforeEach(() => {
  failure.on = false;
});

afterEach(async () => {
  failure.on = false;
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function context(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-atomic-"));
  roots.push(root);
  await mkdir(path.join(root, ".qfai"));
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = ".qfai/spec";
  config.paths.contractsDir = ".qfai/spec/03_contract";
  config.paths.testsDir = "tests";
  return {
    root,
    specsDir: path.join(root, ".qfai", "spec"),
    contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
    config,
  };
}

async function put(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

const silent = { stdout: { write: () => true }, stderr: { write: () => true } };

describe("migration overwrites", () => {
  it("leaves the original document and no temporary file when a planned write fails", async () => {
    const ctx = await context();
    const relative = ".qfai/spec/notes.md";
    const target = path.join(ctx.root, ...relative.split("/"));
    const original = "# Notes\n\nThe original document, kept whole.\n";
    await put(target, original);
    const step: MigrationStep = {
      number: 3,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "write", target: relative, content: "# Notes\n\nReplaced.\n" }],
        }),
    };

    failure.on = true;
    await expect(executePlannedStep(step, ctx, false, silent)).rejects.toThrow("ENOSPC");
    failure.on = false;

    expect(await readFile(target, "utf8")).toBe(original);
    expect(await readdir(path.dirname(target))).toEqual(["notes.md"]);
  });

  // Windows runners cap a whole path at 260 characters unless long paths are
  // enabled, so the fixture path itself would fail there; the name length
  // limit this checks is the same 255 bytes on Linux and macOS.
  it.skipIf(process.platform === "win32")(
    "replaces a document whose name is near the file name length limit",
    async () => {
      const ctx = await context();
      const relative = `.qfai/spec/${"n".repeat(240)}.md`;
      const target = path.join(ctx.root, ...relative.split("/"));
      await put(target, "old\n");
      const step: MigrationStep = {
        number: 3,
        writeSet: ["qfai"],
        plan: () =>
          Promise.resolve({ operations: [{ kind: "write", target: relative, content: "new\n" }] }),
      };

      expect(await executePlannedStep(step, ctx, false, silent)).toBe(0);

      expect(await readFile(target, "utf8")).toBe("new\n");
      expect(await readdir(path.dirname(target))).toEqual([path.basename(target)]);
    },
  );

  it("leaves the original hook settings when rewriting them fails", async () => {
    const root = (await context()).root;
    const target = path.join(root, ".claude", "settings.json");
    const original = '{\n  "permissions": {}\n}\n';
    await put(target, original);

    failure.on = true;
    await expect(
      writeReminderHooks({ kind: "create", target, text: '{\n  "hooks": {}\n}\n' }),
    ).rejects.toThrow("ENOSPC");
    failure.on = false;

    expect(await readFile(target, "utf8")).toBe(original);
    expect(await readdir(path.dirname(target))).toEqual(["settings.json"]);
  });

  it("leaves the original reminder text when step 11 fails to replace it", async () => {
    const ctx = await context();
    const shown = ".agents/rules/reminders.json";
    const target = path.join(ctx.root, ...shown.split("/"));
    const original = '{ "edited": "by the project" }\n';
    await put(target, original);
    const plan = await step11.plan(ctx);
    const replace = plan.operations.find(
      (operation) => operation.kind === "delegate" && operation.target === shown,
    );
    if (replace?.kind !== "delegate") throw new Error(`step 11 planned no write of ${shown}`);

    failure.on = true;
    await expect(replace.apply()).rejects.toThrow("ENOSPC");
    failure.on = false;

    expect(await readFile(target, "utf8")).toBe(original);
    expect(await readdir(path.dirname(target))).toEqual(["reminders.json"]);
  });
});
