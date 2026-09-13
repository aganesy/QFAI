import type * as fsPromises from "node:fs/promises";
import { lstat, mkdir, mkdtemp, readFile, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

type FsPromises = typeof fsPromises;
const { copyFileSpy, lstatSpy } = vi.hoisted(() => ({
  copyFileSpy:
    vi.fn<(actual: FsPromises, ...args: Parameters<FsPromises["copyFile"]>) => Promise<void>>(),
  lstatSpy:
    vi.fn<
      (
        actual: FsPromises,
        ...args: Parameters<FsPromises["lstat"]>
      ) => ReturnType<FsPromises["lstat"]>
    >(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    copyFile: (...args: Parameters<FsPromises["copyFile"]>) => copyFileSpy(actual, ...args),
    lstat: (...args: Parameters<FsPromises["lstat"]>) => lstatSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { readAssistantAssetsLock } = await import("../../src/core/assistantAssetProvenance.js");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const CONSTITUTION = path.join(".qfai", "assistant", "constitution", "constitution.md");
const FLOOR = path.join(".agents", "rules", "minimal-implementation.md");

function passThrough(): void {
  copyFileSpy.mockImplementation((actual, ...args) => actual.copyFile(...args));
  lstatSpy.mockImplementation((actual, ...args) => actual.lstat(...args));
}

beforeEach(passThrough);

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-constitution-create-"));
  try {
    await task(root);
  } finally {
    passThrough();
    await removeTempTree(root);
  }
}

const init = (root: string): Promise<string> =>
  captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

describe("constitution creation preserves a path it cannot claim", () => {
  it("explains how to recover from a non-file constitution occupant without removing it", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      await mkdir(target, { recursive: true });
      await mkdir(path.join(root, path.dirname(FLOOR)), { recursive: true });
      await writeFile(path.join(root, FLOOR), "# Adopter safety rules\n");

      const output = await init(root);
      expect(output).toContain("remove or relocate the non-file occupant");
      expect(output).toContain("rerun `qfai init`");
      expect((await lstat(target)).isDirectory()).toBe(true);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files["constitution/constitution.md"]).toBeUndefined();

      await writeFile(
        path.join(root, FLOOR),
        await readFile(path.join(ROOT, "packages/qfai/assets/init/root", FLOOR)),
      );
      await rmdir(target);
      await init(root);
      const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      expect((await readFile(target)).equals(shipped)).toBe(true);
      const recoveredLock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(recoveredLock?.files["constitution/constitution.md"]).toBeDefined();
    });
  });

  it("installs and records a constitution when its path stays absent", async () => {
    await withProject(async (root) => {
      await init(root);
      const [actual, shipped] = await Promise.all([
        readFile(path.join(root, CONSTITUTION)),
        readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION)),
      ]);
      expect(actual.equals(shipped)).toBe(true);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files["constitution/constitution.md"]).toBeDefined();
    });
  });

  it("records the canonical constitution created by a concurrent initializer", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      let inserted = false;
      copyFileSpy.mockImplementation(async (actual, ...args) => {
        const [source, destination] = args;
        if (
          !inserted &&
          typeof source === "string" &&
          source.endsWith(path.join("constitution", "constitution.md")) &&
          typeof destination === "string" &&
          path.dirname(destination) === path.dirname(target)
        ) {
          inserted = true;
          await writeFile(target, await readFile(source));
        }
        return actual.copyFile(...args);
      });
      await init(root);
      expect(inserted).toBe(true);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files["constitution/constitution.md"]).toBeDefined();
      const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      expect((await readFile(target)).equals(shipped)).toBe(true);
    });
  });

  it("keeps a constitution created between the absence probe and the copy", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      const adopterText = "# Adopter constitution\n";
      let inserted = false;
      copyFileSpy.mockImplementation(async (actual, ...args) => {
        const [source, destination] = args;
        if (
          !inserted &&
          typeof source === "string" &&
          source.endsWith(path.join("constitution", "constitution.md")) &&
          typeof destination === "string" &&
          path.dirname(destination) === path.dirname(target)
        ) {
          inserted = true;
          await writeFile(target, adopterText);
        }
        return actual.copyFile(...args);
      });
      const output = await init(root);
      expect(inserted).toBe(true);
      expect(await readFile(target, "utf-8")).toBe(adopterText);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files["constitution/constitution.md"]).toBeUndefined();
      expect(output).toContain("created during initialization");
    });
  });

  it("defers an uninspectable constitution when the safety master is edited", async () => {
    await withProject(async (root) => {
      await init(root);
      const target = path.join(root, CONSTITUTION);
      const previous = await readFile(target);
      const priorLock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      await writeFile(path.join(root, FLOOR), "# Adopter safety rules\n");
      lstatSpy.mockImplementation((actual, ...args) => {
        if (String(args[0]) === target) {
          return Promise.reject(
            Object.assign(new Error("cannot inspect constitution"), { code: "EACCES" }),
          );
        }
        return actual.lstat(...args);
      });
      const output = await init(root);
      expect(output).toContain("manual merge");
      expect(output).toContain("existing constitution");
      expect((await readFile(target)).equals(previous)).toBe(true);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files["constitution/constitution.md"]).toBe(
        priorLock?.files["constitution/constitution.md"],
      );
    });
  });
});
