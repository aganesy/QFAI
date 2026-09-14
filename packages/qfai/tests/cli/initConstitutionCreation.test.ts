import type * as fsPromises from "node:fs/promises";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

type FsPromises = typeof fsPromises;
const { copyFileSpy, linkSpy, lstatSpy, openSpy, rmSpy } = vi.hoisted(() => ({
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
  openSpy:
    vi.fn<
      (
        actual: FsPromises,
        ...args: Parameters<FsPromises["open"]>
      ) => ReturnType<FsPromises["open"]>
    >(),
  rmSpy: vi.fn<(actual: FsPromises, ...args: Parameters<FsPromises["rm"]>) => Promise<void>>(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    copyFile: (...args: Parameters<FsPromises["copyFile"]>) => copyFileSpy(actual, ...args),
    link: (...args: Parameters<FsPromises["link"]>) => linkSpy(actual, ...args),
    lstat: (...args: Parameters<FsPromises["lstat"]>) => lstatSpy(actual, ...args),
    open: (...args: Parameters<FsPromises["open"]>) => openSpy(actual, ...args),
    rm: (...args: Parameters<FsPromises["rm"]>) => rmSpy(actual, ...args),
  };
});

const { replaceGovernedAsset, runInit } = await import("../../src/cli/commands/init.js");
const { classifyAssistantAsset, hashAssistantAssetFile, readAssistantAssetsLock } =
  await import("../../src/core/assistantAssetProvenance.js");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const CONSTITUTION = path.join(".qfai", "assistant", "constitution", "constitution.md");
const FLOOR = path.join(".agents", "rules", "minimal-implementation.md");

function passThrough(): void {
  copyFileSpy.mockImplementation((actual, ...args) => actual.copyFile(...args));
  linkSpy.mockImplementation((actual, ...args) => actual.link(...args));
  lstatSpy.mockImplementation((actual, ...args) => actual.lstat(...args));
  openSpy.mockImplementation((actual, ...args) => actual.open(...args));
  rmSpy.mockImplementation((actual, ...args) => actual.rm(...args));
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
  it.each([
    { published: true, code: "EACCES" },
    { published: true, code: "EIO" },
    { published: false, code: "EACCES" },
    { published: false, code: "EIO" },
  ])("retains the cleanup inspection reason $code after published=$published", async (scenario) => {
    await withProject(async (root) => {
      const source = path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION);
      const target = path.join(root, "created-policy.md");
      const adopter = "# Existing adopter policy\n";
      if (!scenario.published) await writeFile(target, adopter);
      const cause = Object.assign(new Error(`${scenario.code}: staging metadata unavailable`), {
        code: scenario.code,
      });
      let linked = false;
      let staging: string | undefined;
      let inspected = false;
      linkSpy.mockImplementation(async (actual, ...args) => {
        staging = String(args[0]);
        try {
          await actual.link(...args);
        } finally {
          linked = true;
        }
      });
      lstatSpy.mockImplementation((actual, ...args) => {
        if (linked && String(args[0]) === staging) {
          inspected = true;
          return Promise.reject(cause);
        }
        return actual.lstat(...args);
      });
      let result: string | undefined;
      let failure: unknown;
      const output = await captureStdout(async () => {
        try {
          result = await replaceGovernedAsset(source, target, undefined, "create-only");
        } catch (error: unknown) {
          failure = error;
        }
      });

      expect(inspected).toBe(true);
      expect(output).toContain(cause.message);
      expect(output).toContain("Do not delete this occupied path");
      expect((await readFile(String(staging))).equals(await readFile(source))).toBe(true);
      if (scenario.published) {
        expect(result).toBe("replaced");
        expect(failure).toBeUndefined();
        expect((await readFile(target)).equals(await readFile(source))).toBe(true);
      } else {
        expect(failure).toMatchObject({ code: "EEXIST" });
        expect(await readFile(target, "utf-8")).toBe(adopter);
      }
    });
  });

  it.each([
    { relative: "constitution/constitution.md", change: "staging before link" },
    { relative: "catalog/test-layers.md", change: "staging before link" },
    { relative: "constitution/constitution.md", change: "destination after link" },
    { relative: "constitution/constitution.md", change: "destination bytes after link" },
  ])("protects $relative with $change instead of recording a shipped write", async (scenario) => {
    await withProject(async (root) => {
      const target = path.join(root, ".qfai", "assistant", ...scenario.relative.split("/"));
      const replacement = "# Adopter concurrent content\n";
      let staging: string | undefined;
      linkSpy.mockImplementation(async (actual, ...args) => {
        if (String(args[1]) !== target) return actual.link(...args);
        staging = String(args[0]);
        if (scenario.change === "staging before link") {
          await actual.unlink(staging);
          await actual.writeFile(staging, replacement, { flag: "wx" });
        }
        await actual.link(...args);
        if (scenario.change === "destination after link") {
          await actual.unlink(target);
          await actual.writeFile(target, replacement, { flag: "wx" });
        }
        if (scenario.change === "destination bytes after link") {
          await actual.writeFile(target, replacement);
        }
      });

      const output = await init(root);
      expect(staging).toBeDefined();
      expect(await readFile(target, "utf-8")).toBe(replacement);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files[scenario.relative]).toBeUndefined();
      expect(output).toContain("created during initialization");
      if (scenario.change === "staging before link") {
        expect(await readFile(String(staging), "utf-8")).toBe(replacement);
        expect(output).toContain("could not verify staging ownership");
      } else {
        await expect(lstat(String(staging))).rejects.toMatchObject({ code: "ENOENT" });
      }

      passThrough();
      await init(root);
      expect(await readFile(target, "utf-8")).toBe(replacement);
      const retried = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      const source = path.join(
        ROOT,
        "packages/qfai/assets/init/.qfai/assistant",
        scenario.relative,
      );
      expect(
        classifyAssistantAsset(
          await hashAssistantAssetFile(target),
          (await hashAssistantAssetFile(source)) ?? undefined,
          retried?.files[scenario.relative],
        ),
      ).toBe("forked");
      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));
      expect(await readFile(target, "utf-8")).toBe(replacement);
    });
  });

  it("classifies a same-byte substituted staging inode as concurrent rather than its own write", async () => {
    await withProject(async (root) => {
      const source = path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION);
      const target = path.join(root, "created-policy.md");
      let substituted = false;
      let staging: string | undefined;
      linkSpy.mockImplementation(async (actual, ...args) => {
        if (String(args[1]) === target) {
          staging = String(args[0]);
          const complete = await actual.readFile(staging);
          await actual.unlink(staging);
          await actual.writeFile(staging, complete, { flag: "wx" });
          substituted = true;
        }
        await actual.link(...args);
      });

      expect(await replaceGovernedAsset(source, target, undefined, "create-only")).toBe(
        "target-changed",
      );
      expect(substituted).toBe(true);
      expect((await readFile(target)).equals(await readFile(source))).toBe(true);
      expect((await readFile(String(staging))).equals(await readFile(source))).toBe(true);
    });
  });

  it("closes and removes the owned stage when shipped permissions cannot be applied", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      const cause = Object.assign(new Error("stage chmod failed"), { code: "EACCES" });
      let failedHandle: Awaited<ReturnType<FsPromises["open"]>> | undefined;
      let staging: string | undefined;
      openSpy.mockImplementation(async (actual, ...args) => {
        const opened = await actual.open(...args);
        if (args[1] === "wx" && path.dirname(String(args[0])) === path.dirname(target)) {
          vi.spyOn(opened, "chmod").mockImplementation(() => {
            failedHandle = opened;
            staging = String(args[0]);
            return Promise.reject(cause);
          });
        }
        return opened;
      });

      await expect(init(root)).rejects.toBe(cause);
      if (failedHandle === undefined || staging === undefined) {
        throw new Error("The creation writer must apply shipped permissions before publication.");
      }
      await expect(failedHandle.stat()).rejects.toMatchObject({ code: "EBADF" });
      await expect(lstat(target)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(staging)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("preserves a created governed file's native shipped read-only permissions", async () => {
    await withProject(async (root) => {
      const actual = await vi.importActual<FsPromises>("node:fs/promises");
      const source = path.join(root, "shipped-policy.md");
      const target = path.join(root, "created-policy.md");
      await actual.writeFile(source, "# Shipped policy\n");
      await actual.chmod(source, 0o444);
      try {
        const sourceMode = (await actual.stat(source)).mode & 0o7777;
        expect(await replaceGovernedAsset(source, target, undefined, "create-only")).toBe(
          "replaced",
        );
        expect((await actual.stat(target)).mode & 0o7777).toBe(sourceMode);
        expect((await actual.readFile(target)).equals(await actual.readFile(source))).toBe(true);
      } finally {
        await actual.chmod(source, 0o644);
        await actual.chmod(target, 0o644).catch((cause: unknown) => {
          if (!(cause instanceof Error) || !("code" in cause) || cause.code !== "ENOENT") {
            throw cause;
          }
        });
      }
    });
  });

  it.skipIf(process.platform === "win32")(
    "preserves shipped permission bits under a restrictive POSIX umask",
    async () => {
      await withProject(async (root) => {
        const actual = await vi.importActual<FsPromises>("node:fs/promises");
        const source = path.join(root, "shipped-policy.md");
        const target = path.join(root, "created-policy.md");
        await actual.writeFile(source, "# Shipped policy\n");
        await actual.chmod(source, 0o644);
        const previous = process.umask(0o077);
        try {
          await replaceGovernedAsset(source, target, undefined, "create-only");
          expect((await actual.stat(target)).mode & 0o7777).toBe(0o644);
          expect((await actual.readFile(target)).equals(await actual.readFile(source))).toBe(true);
        } finally {
          process.umask(previous);
        }
      });
    },
  );

  it("keeps a published inode refreshable after staging cleanup", async () => {
    await withProject(async (root) => {
      const source = path.join(
        ROOT,
        "packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md",
      );
      const target = path.join(root, ".qfai", "assistant", "catalog", "test-layers.md");
      await replaceGovernedAsset(source, target, undefined, "create-only");
      await writeFile(target, "# Older release\n", "utf-8");

      expect(await replaceGovernedAsset(source, target)).toBe("replaced");
      expect((await readFile(target)).equals(await readFile(source))).toBe(true);
    });
  });

  it.each(["EEXIST", "EACCES"])(
    "rejects a %s occupied creation stage without claiming concurrent final publication",
    async (code) => {
      await withProject(async (root) => {
        const target = path.join(root, CONSTITUTION);
        const replacement = "# Adopter staging content\n";
        let staging: string | undefined;
        openSpy.mockImplementation(async (actual, ...args) => {
          if (
            staging !== undefined ||
            args[1] !== "wx" ||
            path.dirname(String(args[0])) !== path.dirname(target)
          ) {
            return actual.open(...args);
          }
          staging = String(args[0]);
          await actual.writeFile(staging, replacement, { flag: "wx" });
          if (code === "EACCES") {
            throw Object.assign(new Error("stage access denied"), { code });
          }
          return actual.open(...args);
        });

        const failure = await init(root).then(
          () => null,
          (cause: unknown) => cause,
        );
        expect(failure).toMatchObject({ cause: { code } });
        if (!(failure instanceof Error) || staging === undefined) {
          throw new Error("An unavailable stage must remain protected and stop publication.");
        }
        expect(failure.message).toContain(JSON.stringify(staging));
        expect(failure.message).toContain("preserve any occupied staging path");
        expect(await readFile(staging, "utf-8")).toBe(replacement);
        await expect(lstat(target)).rejects.toMatchObject({ code: "ENOENT" });
      });
    },
  );
  it.each([
    { name: "regular after publication", published: true, canonical: true, symlink: false },
    { name: "symlink after publication", published: true, canonical: true, symlink: true },
    { name: "regular after a canonical race", published: false, canonical: true, symlink: false },
    { name: "symlink after a canonical race", published: false, canonical: true, symlink: true },
    { name: "regular after an adopter race", published: false, canonical: false, symlink: false },
    { name: "symlink after an adopter race", published: false, canonical: false, symlink: true },
  ])("protects a $name creation stage replaced before cleanup", async (scenario) => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      const backing = path.join(root, "adopter-staging.md");
      const replacement = "# Adopter staging content\n";
      const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      const raced = scenario.canonical ? shipped : Buffer.from("# Adopter constitution\n");
      await writeFile(backing, replacement);
      let staging: string | undefined;
      linkSpy.mockImplementation(async (actual, ...args) => {
        if (String(args[1]) !== target) return actual.link(...args);
        staging = String(args[0]);
        if (!scenario.published) await actual.writeFile(target, raced, { flag: "wx" });
        let failed = false;
        let publicationCause: unknown;
        try {
          await actual.link(...args);
        } catch (cause: unknown) {
          failed = true;
          publicationCause = cause;
          expect(cause).toMatchObject({ code: "EEXIST" });
        }
        await actual.unlink(staging);
        if (scenario.symlink) await actual.symlink(backing, staging, "file");
        else await actual.writeFile(staging, replacement, { flag: "wx" });
        if (failed) throw publicationCause;
      });

      const output = await init(root);
      if (staging === undefined) throw new Error("The creation writer must attempt publication.");
      const retained = await lstat(staging).catch((cause: unknown) => {
        if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return null;
        throw cause;
      });
      expect(retained).not.toBeNull();
      expect(retained?.isSymbolicLink()).toBe(scenario.symlink);
      expect(await readFile(staging, "utf-8")).toBe(replacement);
      expect(await readFile(backing, "utf-8")).toBe(replacement);
      expect((await readFile(target)).equals(raced)).toBe(true);
      expect(output).toContain("could not verify staging ownership");
      expect(output).toContain(JSON.stringify(staging));
      expect(output).toContain("Do not delete this occupied path");
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      if (scenario.canonical) expect(lock?.files["constitution/constitution.md"]).toBeDefined();
      else expect(lock?.files["constitution/constitution.md"]).toBeUndefined();
    });
  });

  it.each(["catalog/test-layers.md", "constitution/drift-protocol.md"])(
    "keeps a missing %s unpublished when its staged write fails",
    async (relative) => {
      await withProject(async (root) => {
        const target = path.join(root, ".qfai", "assistant", ...relative.split("/"));
        const source = path.join(ROOT, "packages/qfai/assets/init/.qfai/assistant", relative);
        const complete = await readFile(source);
        const partial = "# Partial governed asset\n";
        let failed = false;
        copyFileSpy.mockImplementation(async (actual, ...args) => {
          if (String(args[0]) !== source) return actual.copyFile(...args);
          failed = true;
          await actual.writeFile(args[1], partial);
          throw Object.assign(new Error("governed copy failed after partial output"), {
            code: "EIO",
          });
        });
        openSpy.mockImplementation(async (actual, ...args) => {
          const opened = await actual.open(...args);
          if (args[1] !== "wx" || path.dirname(String(args[0])) !== path.dirname(target)) {
            return opened;
          }
          const write = opened.writeFile.bind(opened);
          vi.spyOn(opened, "writeFile").mockImplementation(async (...writeArgs) => {
            if (!Buffer.isBuffer(writeArgs[0]) || !writeArgs[0].equals(complete)) {
              return write(...writeArgs);
            }
            failed = true;
            await write(partial, "utf-8");
            throw Object.assign(new Error("governed write failed after partial output"), {
              code: "EIO",
            });
          });
          return opened;
        });

        await expect(init(root)).rejects.toMatchObject({ code: "EIO" });
        expect(failed).toBe(true);
        await expect(lstat(target)).rejects.toMatchObject({ code: "ENOENT" });
        expect(
          (await readdir(path.dirname(target))).filter((name) => name.startsWith(".qfai-staging-")),
        ).toEqual([]);
        const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
        expect(lock?.files[relative]).toBeUndefined();

        passThrough();
        await init(root);
        expect((await readFile(target)).equals(await readFile(source))).toBe(true);
        const recovered = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
        expect(recovered?.files[relative]).toBeDefined();
      });
    },
  );

  it.each(["EACCES", "ENOENT"])(
    "rejects a %s shipped governed-set failure before copying or migrating assets",
    async (code) => {
      await withProject(async (root) => {
        const instructions = path.join(root, ".qfai", "assistant", "instructions");
        await mkdir(instructions, { recursive: true });
        const legacy = path.join(instructions, "quality.md");
        const legacyText = "# Adopter quality rules\n";
        const entry = path.join(root, "AGENTS.md");
        const entryText = "# Adopter instructions\n";
        await writeFile(legacy, legacyText);
        await writeFile(entry, entryText);
        const rootBefore = (await readdir(root)).sort();
        const assistantBefore = (await readdir(path.dirname(instructions))).sort();
        const shipped = path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION);
        let refused = false;
        openSpy.mockImplementation((actual, ...args) => {
          if (String(args[0]) !== shipped) return actual.open(...args);
          refused = true;
          return Promise.reject(
            Object.assign(new Error("shipped asset cannot be opened"), { code }),
          );
        });

        const failure = await captureStdout(() =>
          runInit({
            dir: root,
            force: true,
            dryRun: false,
            yes: true,
            upgradeAssistantTree: true,
          }),
        ).then(
          () => null,
          (cause: unknown) => cause,
        );
        expect(refused).toBe(true);
        expect(failure).toBeInstanceOf(Error);
        if (!(failure instanceof Error))
          throw new Error("An unverifiable shipped set must stop init.");
        expect(failure.message).toContain("Reinstall QFAI");
        expect(failure.message).toContain("no package assets were copied or migrated");
        expect(failure.cause).toBeInstanceOf(Error);
        if (!(failure.cause instanceof Error))
          throw new Error("The shipped-set cause must remain.");
        expect(failure.cause.message).toContain("constitution/constitution.md");
        expect((await readdir(root)).sort()).toEqual(rootBefore);
        expect((await readdir(path.dirname(instructions))).sort()).toEqual(assistantBefore);
        expect(await readFile(legacy, "utf-8")).toBe(legacyText);
        expect(await readFile(entry, "utf-8")).toBe(entryText);
        expect(linkSpy).not.toHaveBeenCalled();
      });
    },
  );

  it.each([
    { name: "metadata", statFails: true, closeFails: false },
    { name: "metadata and close", statFails: true, closeFails: true },
    { name: "close after publication", statFails: false, closeFails: true },
  ])("closes the creation handle and preserves $name failures", async (scenario) => {
    await withProject(async (root) => {
      let staging: string | undefined;
      let destination: string | undefined;
      let handle: Awaited<ReturnType<FsPromises["open"]>> | undefined;
      openSpy.mockImplementation(async (actual, ...args) => {
        const opened = await actual.open(...args);
        if (
          staging !== undefined ||
          args[1] !== "wx" ||
          path.dirname(String(args[0])) !== path.dirname(path.join(root, CONSTITUTION))
        ) {
          return opened;
        }
        staging = String(args[0]);
        handle = opened;
        if (scenario.statFails) {
          vi.spyOn(opened, "stat").mockRejectedValueOnce(
            Object.assign(new Error("staging metadata unavailable"), { code: "EIO" }),
          );
        }
        const close = opened.close.bind(opened);
        vi.spyOn(opened, "close").mockImplementation(async () => {
          await close();
          if (scenario.closeFails) {
            throw Object.assign(new Error("staging close failed"), { code: "EBUSY" });
          }
        });
        return opened;
      });
      linkSpy.mockImplementation(async (actual, ...args) => {
        await actual.link(...args);
        if (String(args[0]) === staging) destination = String(args[1]);
      });

      const failure = await init(root).then(
        () => null,
        (cause: unknown) => cause,
      );
      if (staging === undefined || handle === undefined) {
        throw new Error("A creation stage must be pinned to its exclusive handle.");
      }
      if (scenario.statFails && scenario.closeFails) {
        expect(failure).toBeInstanceOf(AggregateError);
        if (!(failure instanceof AggregateError)) throw new Error("Both failures must remain.");
        expect(failure.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: "EIO" }),
            expect.objectContaining({ code: "EBUSY" }),
          ]),
        );
        expect(failure.cause).toMatchObject({ code: "EBUSY" });
      } else expect(failure).toMatchObject({ code: scenario.statFails ? "EIO" : "EBUSY" });
      await expect(handle.stat()).rejects.toMatchObject({ code: "EBADF" });
      if (scenario.statFails) {
        expect(destination).toBeUndefined();
        expect((await lstat(staging)).isFile()).toBe(true);
      } else {
        if (destination === undefined) throw new Error("The complete asset must remain published.");
        const source = path.join(
          ROOT,
          "packages/qfai/assets/init",
          path.relative(root, destination),
        );
        expect((await readFile(destination)).equals(await readFile(source))).toBe(true);
        expect((await lstat(staging)).isFile()).toBe(true);
        passThrough();
        await rm(staging);
        await init(root);
        const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
        expect(
          lock?.files[
            path
              .relative(path.join(root, ".qfai", "assistant"), destination)
              .split(path.sep)
              .join("/")
          ],
        ).toBeDefined();
      }
    });
  });

  it.each([
    { name: "metadata", closeFails: false },
    { name: "metadata and close", closeFails: true },
  ])("preserves the probe and all causes when $name inspection fails", async (scenario) => {
    await withProject(async (root) => {
      let probe: string | undefined;
      let handle: Awaited<ReturnType<FsPromises["open"]>> | undefined;
      openSpy.mockImplementation(async (actual, ...args) => {
        const opened = await actual.open(...args);
        if (args[1] !== "wx") return opened;
        probe = String(args[0]);
        handle = opened;
        vi.spyOn(opened, "stat").mockRejectedValueOnce(
          Object.assign(new Error("probe metadata unavailable"), { code: "EIO" }),
        );
        const close = opened.close.bind(opened);
        vi.spyOn(opened, "close").mockImplementation(async () => {
          await close();
          if (scenario.closeFails) {
            throw Object.assign(new Error("probe close failed"), { code: "EBUSY" });
          }
        });
        return opened;
      });

      const failure = await init(root).then(
        () => null,
        (cause: unknown) => cause,
      );
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError) || probe === undefined || handle === undefined) {
        throw new Error("An unverified probe must remain protected.");
      }
      const primary: unknown = failure.errors[0];
      if (!(primary instanceof Error)) throw new Error("The probe failure must remain available.");
      if (scenario.closeFails) {
        expect(primary.cause).toBeInstanceOf(AggregateError);
        if (!(primary.cause instanceof AggregateError)) throw new Error("Both causes must remain.");
        expect(primary.cause.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: "EIO" }),
            expect.objectContaining({ code: "EBUSY" }),
          ]),
        );
      } else expect(primary.cause).toMatchObject({ code: "EIO" });
      expect(failure.message).toContain(JSON.stringify(probe));
      expect(failure.message).toContain("Do not delete these occupied paths");
      expect(await readdir(root)).toEqual([path.basename(probe)]);
      expect((await lstat(probe)).isFile()).toBe(true);
      expect(linkSpy).not.toHaveBeenCalled();
      await expect(handle.stat()).rejects.toMatchObject({ code: "EBADF" });
    });
  });

  it.each([
    { name: "source regular", changedIndex: 0, symlink: false },
    { name: "destination regular", changedIndex: 1, symlink: false },
    { name: "source symlink", changedIndex: 0, symlink: true },
    { name: "destination symlink", changedIndex: 1, symlink: true },
  ] as const)("protects a $name probe replaced after linking", async (scenario) => {
    await withProject(async (root) => {
      const instructions = path.join(root, ".qfai", "assistant", "instructions");
      await mkdir(instructions, { recursive: true });
      const legacy = path.join(instructions, "quality.md");
      const backing = path.join(instructions, "adopter-probe.md");
      await writeFile(legacy, "# Adopter quality rules\n");
      await writeFile(backing, "# Adopter replacement\n");
      await writeFile(path.join(root, "AGENTS.md"), "# Adopter instructions\n");
      const rootBefore = (await readdir(root)).sort();
      let probes: [string, string] | undefined;
      linkSpy.mockImplementation(async (actual, ...args) => {
        await actual.link(...args);
        if (probes !== undefined) return;
        probes = [String(args[0]), String(args[1])];
        const replacement = probes[scenario.changedIndex];
        expect(path.dirname(replacement)).toBe(path.dirname(instructions));
        await actual.rm(replacement);
        if (scenario.symlink) await actual.symlink(backing, replacement, "file");
        else await actual.writeFile(replacement, "# Adopter replacement\n");
      });

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
      if (probes === undefined) throw new Error("The creation probe must link.");
      const replacement = probes[scenario.changedIndex];
      const retained = await lstat(replacement).catch((cause: unknown) => {
        if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return null;
        throw cause;
      });
      expect(retained).not.toBeNull();
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error("A changed probe must stop init.");
      expect(failure.message).toContain(JSON.stringify(replacement));
      expect(failure.message).toContain("Do not delete these occupied paths");
      expect(retained?.isSymbolicLink()).toBe(scenario.symlink);
      expect(await readFile(replacement, "utf-8")).toBe("# Adopter replacement\n");
      expect(await readFile(backing, "utf-8")).toBe("# Adopter replacement\n");
      expect(await readFile(legacy, "utf-8")).toBe("# Adopter quality rules\n");
      expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(
        "# Adopter instructions\n",
      );
      expect((await readdir(root)).sort()).toEqual(rootBefore);
      expect(
        (await readdir(path.dirname(instructions))).filter(
          (name) => name !== path.basename(replacement),
        ),
      ).toEqual(["instructions"]);
      const otherProbe = scenario.changedIndex === 0 ? probes[1] : probes[0];
      await expect(lstat(otherProbe)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it.each([
    { name: "canonical", code: "EBUSY", canonical: true },
    { name: "adopter", code: "EACCES", canonical: false },
  ])("reports retained staging after a lost creation race with $name bytes", async (scenario) => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      const raced = scenario.canonical ? shipped : Buffer.from("# Adopter constitution\n");
      let staging: string | undefined;
      linkSpy.mockImplementation(async (actual, ...args) => {
        if (staging === undefined && String(args[1]) === target) {
          staging = String(args[0]);
          await actual.writeFile(target, raced, { flag: "wx" });
        }
        return actual.link(...args);
      });
      rmSpy.mockImplementation((actual, ...args) => {
        if (String(args[0]) === staging) {
          return Promise.reject(
            Object.assign(new Error("creation staging is busy"), { code: scenario.code }),
          );
        }
        return actual.rm(...args);
      });

      const output = await init(root);
      if (staging === undefined) throw new Error("The creation writer must stage complete bytes.");
      expect(output).toContain("could not remove staging file");
      expect(output).toContain(JSON.stringify(staging));
      expect(output).toContain("Restore access, remove only this staging file");
      expect((await readFile(target)).equals(raced)).toBe(true);
      expect((await readFile(staging)).equals(shipped)).toBe(true);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      if (scenario.canonical) expect(lock?.files["constitution/constitution.md"]).toBeDefined();
      else expect(lock?.files["constitution/constitution.md"]).toBeUndefined();

      passThrough();
      await rm(staging);
      await init(root);
      expect((await readFile(target)).equals(raced)).toBe(true);
      await expect(lstat(staging)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it.each(["EACCES", "EPERM"])(
    "reports permission recovery for a %s probe-creation failure before asset changes",
    async (code) => {
      await withProject(async (root) => {
        const instructions = path.join(root, ".qfai", "assistant", "instructions");
        await mkdir(instructions, { recursive: true });
        const legacy = path.join(instructions, "quality.md");
        await writeFile(legacy, "# Adopter quality rules\n");
        await writeFile(path.join(root, "AGENTS.md"), "# Adopter instructions\n");
        const rootBefore = (await readdir(root)).sort();
        const assistantBefore = (await readdir(path.dirname(instructions))).sort();
        let attempted: string | undefined;
        openSpy.mockImplementation((actual, ...args) => {
          if (args[1] !== "wx" || !path.basename(String(args[0])).startsWith(".qfai-staging-")) {
            return actual.open(...args);
          }
          attempted = String(args[0]);
          return Promise.reject(Object.assign(new Error("probe creation denied"), { code }));
        });

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
        if (!(failure instanceof Error) || attempted === undefined) {
          throw new Error("The failed creation probe must report recovery.");
        }
        expect(linkSpy).not.toHaveBeenCalled();
        expect((await readdir(root)).sort()).toEqual(rootBefore);
        expect((await readdir(path.dirname(instructions))).sort()).toEqual(assistantBefore);
        expect(await readFile(legacy, "utf-8")).toBe("# Adopter quality rules\n");
        expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(
          "# Adopter instructions\n",
        );
        await expect(lstat(path.join(root, CONSTITUTION))).rejects.toMatchObject({
          code: "ENOENT",
        });
        await expect(
          lstat(path.join(root, ".qfai", "assistant", ".assets.lock.json")),
        ).rejects.toMatchObject({ code: "ENOENT" });
        expect(failure).toMatchObject({
          message: expect.stringContaining("hard links"),
          cause: { code },
        });
        expect(failure.message).toContain(JSON.stringify(path.dirname(attempted)));
        expect(failure.message).toContain("Restore write access");
      });
    },
  );

  it.each(["EBUSY", "EACCES"])(
    "reports %s staging cleanup failure without losing a published constitution",
    async (code) => {
      await withProject(async (root) => {
        const target = path.join(root, CONSTITUTION);
        let staging: string | undefined;
        linkSpy.mockImplementation(async (actual, ...args) => {
          await actual.link(...args);
          if (String(args[1]) === target) staging = String(args[0]);
        });
        rmSpy.mockImplementation((actual, ...args) => {
          if (String(args[0]) === staging) {
            return Promise.reject(Object.assign(new Error("staging cleanup denied"), { code }));
          }
          return actual.rm(...args);
        });

        const output = await init(root);
        if (staging === undefined) throw new Error("The constitution must be published.");
        expect(output).toContain("could not remove staging file");
        expect(output).toContain(JSON.stringify(staging));
        expect(output).toContain(JSON.stringify(target));
        expect(output).toContain("Restore access, remove only this staging file");
        const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
        expect((await readFile(target)).equals(shipped)).toBe(true);
        expect((await readFile(staging)).equals(shipped)).toBe(true);
        expect((await lstat(staging)).ino).toBe((await lstat(target)).ino);
        const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
        expect(lock?.files["constitution/constitution.md"]).toBeDefined();

        passThrough();
        await rm(staging);
        await init(root);
        expect((await readFile(target)).equals(shipped)).toBe(true);
        await expect(lstat(staging)).rejects.toMatchObject({ code: "ENOENT" });
        const recovered = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
        expect(recovered?.files["constitution/constitution.md"]).toBeDefined();
      });
    },
  );

  it.each([
    { name: "source after a successful link", failedIndex: 0, linkFails: false },
    { name: "destination after a successful link", failedIndex: 1, linkFails: false },
    { name: "source after a rejected link", failedIndex: 0, linkFails: true },
  ] as const)("stops before asset changes when cleanup fails for the $name", async (scenario) => {
    await withProject(async (root) => {
      const instructions = path.join(root, ".qfai", "assistant", "instructions");
      await mkdir(instructions, { recursive: true });
      const legacy = path.join(instructions, "quality.md");
      await writeFile(legacy, "# Adopter quality rules\n");
      await writeFile(path.join(root, "AGENTS.md"), "# Adopter instructions\n");
      const rootBefore = (await readdir(root)).sort();
      let probes: [string, string] | undefined;
      linkSpy.mockImplementation((actual, ...args) => {
        probes = [String(args[0]), String(args[1])];
        if (scenario.linkFails) {
          return Promise.reject(
            Object.assign(new Error("hard links unavailable"), { code: "ENOTSUP" }),
          );
        }
        return actual.link(...args);
      });
      rmSpy.mockImplementation((actual, ...args) => {
        if (String(args[0]) === probes?.[scenario.failedIndex]) {
          return Promise.reject(Object.assign(new Error("probe is busy"), { code: "EBUSY" }));
        }
        return actual.rm(...args);
      });

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
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError))
        throw new Error("Cleanup must report retained probes.");
      if (probes === undefined) throw new Error("The creation probe must run.");
      const retained = probes[scenario.failedIndex];
      const otherProbe = scenario.failedIndex === 0 ? probes[1] : probes[0];
      expect(failure.message).toContain(JSON.stringify(retained));
      expect(failure.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ cause: expect.objectContaining({ code: "EBUSY" }) }),
        ]),
      );
      if (scenario.linkFails) {
        expect(failure.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ cause: expect.objectContaining({ code: "ENOTSUP" }) }),
          ]),
        );
      }
      expect((await readdir(root)).sort()).toEqual(rootBefore);
      expect(path.dirname(retained)).toBe(path.dirname(instructions));
      expect(
        (await readdir(path.dirname(instructions))).filter(
          (name) => name !== path.basename(retained),
        ),
      ).toEqual(["instructions"]);
      expect(await readFile(legacy, "utf-8")).toBe("# Adopter quality rules\n");
      expect(await readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(
        "# Adopter instructions\n",
      );
      expect((await lstat(retained)).isFile()).toBe(true);
      await expect(lstat(otherProbe)).rejects.toMatchObject({
        code: "ENOENT",
      });
    });
  });

  it("keeps a concurrent probe destination it does not own", async () => {
    await withProject(async (root) => {
      let concurrent: string | undefined;
      linkSpy.mockImplementation(async (actual, ...args) => {
        concurrent = String(args[1]);
        await actual.writeFile(args[1], "Adopter-owned probe path\n");
        throw Object.assign(new Error("destination already exists"), { code: "EEXIST" });
      });

      await expect(init(root)).rejects.toMatchObject({ cause: { code: "EEXIST" } });
      if (concurrent === undefined) throw new Error("The concurrent destination must be created.");
      expect(await readFile(concurrent, "utf-8")).toBe("Adopter-owned probe path\n");
      expect(await readdir(root)).toEqual([path.basename(concurrent)]);
    });
  });

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
      expect(output).toContain("manually installing and reconciling the constitution");
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

  it("leaves no partial constitution after a failed staged write and succeeds on retry", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      const complete = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      let failed = false;
      openSpy.mockImplementation(async (actual, ...args) => {
        const opened = await actual.open(...args);
        if (args[1] !== "wx" || path.dirname(String(args[0])) !== path.dirname(target)) {
          return opened;
        }
        const write = opened.writeFile.bind(opened);
        vi.spyOn(opened, "writeFile").mockImplementation(async (...writeArgs) => {
          if (!Buffer.isBuffer(writeArgs[0]) || !writeArgs[0].equals(complete)) {
            return write(...writeArgs);
          }
          failed = true;
          await write("# Partial constitution\n", "utf-8");
          throw Object.assign(new Error("write failed after partial output"), { code: "EIO" });
        });
        return opened;
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
      linkSpy.mockImplementation(async (actual, ...args) => {
        if (!inserted && String(args[1]) === target) {
          inserted = true;
          await actual.writeFile(target, await actual.readFile(args[0]), { flag: "wx" });
        }
        return actual.link(...args);
      });
      await init(root);
      expect(inserted).toBe(true);
      const lock = await readAssistantAssetsLock(path.join(root, ".qfai", "assistant"));
      expect(lock?.files["constitution/constitution.md"]).toBeDefined();
      const shipped = await readFile(path.join(ROOT, "packages/qfai/assets/init", CONSTITUTION));
      expect((await readFile(target)).equals(shipped)).toBe(true);
    });
  });

  it("keeps a constitution created between the absence probe and publication", async () => {
    await withProject(async (root) => {
      const target = path.join(root, CONSTITUTION);
      const adopterText = "# Adopter constitution\n";
      let inserted = false;
      linkSpy.mockImplementation(async (actual, ...args) => {
        if (!inserted && String(args[1]) === target) {
          inserted = true;
          await actual.writeFile(target, adopterText, { flag: "wx" });
        }
        return actual.link(...args);
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
