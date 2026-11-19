// The default install runner starts npm without a shell on every platform,
// so a dependency name is one argument and no shell reads it. `spawn` is
// replaced with a stand-in that records the call and exits 0; `vi.mock` is
// hoisted to module scope, so this case lives in its own file.

import type * as ChildProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type SpawnCall = {
  readonly command: string;
  readonly args: readonly string[];
  readonly options: Readonly<Record<string, unknown>>;
};

const recorded = vi.hoisted((): { calls: SpawnCall[] } => ({ calls: [] }));

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof ChildProcess>("node:child_process");
  return {
    ...actual,
    spawn: (command: string, args: string[], options: Record<string, unknown>) => {
      recorded.calls.push({ command, args, options });
      const child = new EventEmitter();
      setImmediate(() => child.emit("close", 0));
      return child;
    },
  };
});

const { npmEntryOnPath, npmInstallInvocation, runAutoremediate } =
  await import("../../../../src/core/doctor/autoremediate.js");

const tempDirs: string[] = [];

afterEach(async () => {
  recorded.calls.length = 0;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

// QFAI:AC-0003-0010-03
// QFAI:EX-0003-0010-04
describe("the default install runner starts npm without a shell", () => {
  it("passes the dependency name as the last argument after install", async () => {
    const invocation = await npmInstallInvocation("@playwright/test");
    expect(invocation.args.slice(-2)).toEqual(["install", "@playwright/test"]);
    if (process.platform === "win32") {
      // npm's `.cmd` launcher needs a shell, so Windows starts npm's JavaScript entry with Node.
      expect(invocation.command).toBe(process.execPath);
    }
  });

  // Windows falls back to this when npm-cli.js is not beside node.
  it("finds npm's JavaScript entry beside an npm on the search path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-autoremediate-npmpath-"));
    tempDirs.push(root);
    const withNpm = path.join(root, "with-npm");
    const entry = path.join(withNpm, "node_modules", "npm", "bin", "npm-cli.js");
    await mkdir(path.dirname(entry), { recursive: true });
    await writeFile(entry, "", "utf-8");
    const searchPath = ["", path.join(root, "without-npm"), withNpm].join(path.delimiter);
    expect(await npmEntryOnPath(searchPath)).toBe(entry);
    expect(await npmEntryOnPath(path.join(root, "without-npm"))).toBeUndefined();
  });

  it("spawns with shell: false on every platform", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-autoremediate-noshell-"));
    tempDirs.push(root);
    const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["left-pad"] }),
      "utf-8",
    );

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
    });

    expect(summary.installed).toEqual(["left-pad"]);
    expect(recorded.calls).toHaveLength(1);
    const call = recorded.calls[0];
    if (!call) throw new Error("expected one spawn call");
    expect(call.options["shell"]).toBe(false);
    expect(call.options["cwd"]).toBe(root);
    expect(call.args.slice(-2)).toEqual(["install", "left-pad"]);
  });
});
