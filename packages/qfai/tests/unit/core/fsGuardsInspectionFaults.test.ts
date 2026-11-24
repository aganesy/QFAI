/**
 * The shared directory guards count only a missing entry as absent. An `lstat` that fails for
 * any other reason, as when a directory denies the lookup or the disk returns `EIO`, stops the
 * caller with the path and the cause instead of reading as "nothing there".
 *
 * `vi.mock` is hoisted to module scope, so the fault lives in its own file.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  findUnreachableHostDirComponent,
  findUnsafeHostFileComponent,
  findUnsafeWrapperComponent,
  firstLinkedComponent,
  safeLstat,
} from "../../../src/core/init/fsGuards.js";

type FsPromises = typeof fsPromises;

const fault = vi.hoisted(() => ({
  target: undefined as string | undefined,
  code: "EACCES",
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    default: actual,
    lstat: (...args: Parameters<FsPromises["lstat"]>): ReturnType<FsPromises["lstat"]> => {
      if (fault.target !== undefined && String(args[0]) === fault.target) {
        return Promise.reject(
          Object.assign(new Error(`${fault.code}: simulated, lstat`), { code: fault.code }),
        );
      }
      return actual.lstat(...args);
    },
  };
});

const tempDirs: string[] = [];

afterEach(async () => {
  fault.target = undefined;
  fault.code = "EACCES";
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function newProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-guard-fault-"));
  tempDirs.push(dir);
  await mkdir(path.join(dir, ".codex", "agents"), { recursive: true });
  await writeFile(path.join(dir, ".codex", "agents", "a.toml"), "x", "utf-8");
  return dir;
}

function failAt(target: string, code: string): void {
  fault.target = target;
  fault.code = code;
}

describe("safeLstat", () => {
  it("answers undefined for a missing entry", async () => {
    const root = await newProject();
    expect(await safeLstat(path.join(root, "missing"))).toBeUndefined();
  });

  it("throws with the path and the cause for any other failure", async () => {
    const root = await newProject();
    const target = path.join(root, ".codex");
    failAt(target, "EACCES");

    await expect(safeLstat(target)).rejects.toThrow(
      `${target} could not be inspected: EACCES: simulated, lstat`,
    );
  });
});

describe("findUnsafeWrapperComponent", () => {
  it("throws naming the component relative to the project for an EIO", async () => {
    const root = await newProject();
    failAt(path.join(root, ".codex", "agents"), "EIO");

    await expect(findUnsafeWrapperComponent(root, ".codex/agents")).rejects.toThrow(
      ".codex/agents could not be inspected: EIO: simulated, lstat",
    );
  });

  it("still answers undefined when a component is missing", async () => {
    const root = await newProject();
    expect(await findUnsafeWrapperComponent(root, ".claude/agents")).toBeUndefined();
  });
});

describe("findUnreachableHostDirComponent", () => {
  it("throws naming the component for an EACCES", async () => {
    const root = await newProject();
    failAt(path.join(root, ".codex"), "EACCES");

    await expect(findUnreachableHostDirComponent(root, ".codex/agents")).rejects.toThrow(
      ".codex could not be inspected: EACCES: simulated, lstat",
    );
  });
});

describe("findUnsafeHostFileComponent", () => {
  it("throws naming the file when its own metadata cannot be read", async () => {
    const root = await newProject();
    failAt(path.join(root, ".codex", "agents", "a.toml"), "EACCES");

    await expect(findUnsafeHostFileComponent(root, [".codex", "agents", "a.toml"])).rejects.toThrow(
      ".codex/agents/a.toml could not be inspected: EACCES: simulated, lstat",
    );
  });
});

describe("firstLinkedComponent", () => {
  it("throws naming the component relative to the root for an EIO", async () => {
    const root = await newProject();
    failAt(path.join(root, ".codex"), "EIO");

    await expect(
      firstLinkedComponent(path.join(root, ".codex", "agents", "a.toml"), root),
    ).rejects.toThrow(".codex could not be inspected: EIO: simulated, lstat");
  });

  it("answers null when the chain ends at a missing entry or below a file", async () => {
    const root = await newProject();
    expect(await firstLinkedComponent(path.join(root, "missing", "deeper"), root)).toBeNull();
    expect(
      await firstLinkedComponent(path.join(root, ".codex", "agents", "a.toml", "below"), root),
    ).toBeNull();
  });
});
