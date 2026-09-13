import type * as fsPromises from "node:fs/promises";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

type FsPromises = typeof fsPromises;
const { copyFileSpy, linkSpy, lstatSpy } = vi.hoisted(() => ({
  copyFileSpy:
    vi.fn<(actual: FsPromises, ...args: Parameters<FsPromises["copyFile"]>) => Promise<void>>(),
  linkSpy: vi.fn<(actual: FsPromises, ...args: Parameters<FsPromises["link"]>) => Promise<void>>(),
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
    link: (...args: Parameters<FsPromises["link"]>) => linkSpy(actual, ...args),
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
  linkSpy.mockImplementation((actual, ...args) => actual.link(...args));
  lstatSpy.mockImplementation((actual, ...args) => actual.lstat(...args));
}

beforeEach(() => {
  passThrough();
  linkSpy.mockClear();
});

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
  it.each(["EPERM", "ENOTSUP", "EOPNOTSUPP"])(
    "rejects %s hard-link failure before copying or migrating assets",
    async (code) => {
      await withProject(async (root) => {
        const instructions = path.join(root, ".qfai", "assistant", "instructions");
        await mkdir(instructions, { recursive: true });
        const legacy = path.join(instructions, "quality.md");
        const legacyText = "# Adopter quality rules\n";
        await writeFile(legacy, legacyText);
        await writeFile(path.join(root, "AGENTS.md"), "# Adopter instructions\n");
        const rootBefore = (await readdir(root)).sort();
        const assistantBefore = (await readdir(path.dirname(instructions))).sort();
        linkSpy.mockImplementation(() =>
          Promise.reject(Object.assign(new Error("hard links unavailable"), { code })),
        );

        const failure = await captureStdout(() =>
          runInit({
            dir: root,
            force: false,
            dryRun: false,
            yes: true,
            upgradeAssistantTree: true,
          }),
        ).then(
          () => null,
          (cause: unknown) => cause,
        );
        expect(failure).toBeInstanceOf(Error);
        expect((await readdir(root)).sort()).toEqual(rootBefore);
        expect((await readdir(path.dirname(instructions))).sort()).toEqual(assistantBefore);
        expect(await readFile(legacy, "utf-8")).toBe(legacyText);
        expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(
          "# Adopter instructions\n",
        );
        expect(failure).toMatchObject({
          message: expect.stringContaining("hard links"),
          cause: { code },
        });
        await expect(lstat(path.join(root, CONSTITUTION))).rejects.toMatchObject({
          code: "ENOENT",
        });
        await expect(
          lstat(path.join(root, ".qfai", "assistant", ".assets.lock.json")),
        ).rejects.toMatchObject({ code: "ENOENT" });
      });
    },
  );

  it("does not probe hard links or change assets during a dry run", async () => {
    await withProject(async (root) => {
      linkSpy.mockImplementation(() =>
        Promise.reject(Object.assign(new Error("hard links unavailable"), { code: "EPERM" })),
      );
      await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: true, yes: true, upgradeAssistantTree: true }),
      );
      expect(linkSpy).not.toHaveBeenCalled();
      expect(await readdir(root)).toEqual([]);
    });
  });

  it("does not require hard links when governed assets already exist", async () => {
    await withProject(async (root) => {
      await init(root);
      linkSpy.mockClear();
      linkSpy.mockImplementation(() =>
        Promise.reject(Object.assign(new Error("hard links unavailable"), { code: "ENOTSUP" })),
      );
      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));
      expect(linkSpy).not.toHaveBeenCalled();
    });
  });

  it("does not probe a missing constitution deferred by an edited safety master", async () => {
    await withProject(async (root) => {
      await init(root);
      await writeFile(path.join(root, FLOOR), "# Adopter safety rules\n");
      await rm(path.join(root, CONSTITUTION));
      linkSpy.mockClear();
      linkSpy.mockImplementation(() =>
        Promise.reject(Object.assign(new Error("hard links unavailable"), { code: "EOPNOTSUPP" })),
      );
      const output = await init(root);
      expect(linkSpy).not.toHaveBeenCalled();
      expect(output).toContain("manual merge of the safety master");
      await expect(lstat(path.join(root, CONSTITUTION))).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

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

  it("leaves no partial constitution after a failed copy and succeeds on retry", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      let failed = false;
      copyFileSpy.mockImplementation(async (actual, ...args) => {
        const [source, destination] = args;
        if (
          !failed &&
          typeof source === "string" &&
          source.endsWith(path.join("constitution", "constitution.md")) &&
          typeof destination === "string" &&
          path.dirname(destination) === path.dirname(target)
        ) {
          failed = true;
          await actual.writeFile(destination, "# Partial constitution\n");
          throw Object.assign(new Error("copy failed after partial output"), { code: "EIO" });
        }
        return actual.copyFile(...args);
      });

      await expect(init(root)).rejects.toMatchObject({ code: "EIO" });
      expect(failed).toBe(true);
      await expect(lstat(target)).rejects.toMatchObject({ code: "ENOENT" });
      const failedLock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(failedLock?.files["constitution/constitution.md"]).toBeUndefined();

      passThrough();
      await init(root);
      const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      expect((await readFile(target)).equals(shipped)).toBe(true);
      const recovered = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(recovered?.files["constitution/constitution.md"]).toBeDefined();
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
