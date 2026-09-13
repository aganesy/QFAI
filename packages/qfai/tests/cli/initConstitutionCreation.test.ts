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

const { runInit } = await import("../../src/cli/commands/init.js");
const { readAssistantAssetsLock } = await import("../../src/core/assistantAssetProvenance.js");
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
      copyFileSpy.mockImplementation(async (actual, ...args) => {
        const [source, destination] = args;
        if (
          staging === undefined &&
          typeof source === "string" &&
          source.endsWith(path.join("constitution", "constitution.md")) &&
          typeof destination === "string" &&
          path.dirname(destination) === path.dirname(target)
        ) {
          staging = destination;
          await actual.writeFile(target, raced, { flag: "wx" });
        }
        return actual.copyFile(...args);
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
