// On Windows npm's `.cmd` launcher needs a shell, so the default install runner
// starts npm's JavaScript entry with Node. When that entry is neither beside
// node nor under a directory on PATH, the install fails instead of falling back
// to a shell. `npmCommand` is replaced with the answer it gives when no entry is
// beside node, and `spawn` with a stand-in that records any call; `vi.mock` is
// hoisted to module scope, so this case lives in its own file.

import type * as ChildProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as GraphProcess from "../../../../src/core/graph/process.js";

const recorded = vi.hoisted((): { spawned: string[] } => ({ spawned: [] }));

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof ChildProcess>("node:child_process");
  return {
    ...actual,
    spawn: (command: string) => {
      recorded.spawned.push(command);
      const child = new EventEmitter();
      setImmediate(() => child.emit("close", 0));
      return child;
    },
  };
});

vi.mock("../../../../src/core/graph/process.js", async () => {
  const actual = await vi.importActual<typeof GraphProcess>(
    "../../../../src/core/graph/process.js",
  );
  return {
    ...actual,
    npmCommand: async () => {
      await Promise.resolve();
      return { command: "npm", prefix: [] };
    },
  };
});

const { runAutoremediate } = await import("../../../../src/core/doctor/autoremediate.js");

const tempDirs: string[] = [];
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
const originalPath = process.env["PATH"];

beforeEach(() => {
  Object.defineProperty(process, "platform", { value: "win32", configurable: true });
});

afterEach(async () => {
  recorded.spawned.length = 0;
  if (originalPlatform) {
    Object.defineProperty(process, "platform", originalPlatform);
  }
  process.env["PATH"] = originalPath;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

// QFAI:AC-0003-0010-03
// QFAI:EX-0003-0010-04
describe("an install whose npm entry cannot be found on Windows", () => {
  it("fails without starting a process", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-autoremediate-noentry-"));
    tempDirs.push(root);
    const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["left-pad"] }),
      "utf-8",
    );
    // A directory on PATH without npm, so the machine's own npm stays out of the lookup.
    process.env["PATH"] = path.join(root, "bin");

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
    });

    expect(summary.installed).toEqual([]);
    expect(summary.failedInstalls).toEqual(["left-pad"]);
    expect(summary.lines).toContainEqual(
      expect.stringMatching(/install failed for left-pad: .*npm-cli\.js\) was not found/u),
    );
    expect(recorded.spawned).toEqual([]);
  });
});
