// A project whose only Playwright launcher is the PowerShell shim
// `node_modules/.bin/playwright.ps1` must be probed through PowerShell, since
// cmd.exe cannot run a `.ps1` script. `spawn` is replaced with a stand-in that
// records the call and exits 0, and `process.platform` reads `win32`, so the
// command doctor starts is asserted on every platform; `vi.mock` is hoisted to
// module scope, so this case lives in its own file.

import type * as ChildProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SpawnCall = {
  readonly command: string;
  readonly args: readonly string[];
};

const recorded = vi.hoisted((): { calls: SpawnCall[] } => ({ calls: [] }));

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof ChildProcess>("node:child_process");
  return {
    ...actual,
    spawn: (command: string, args: string[]) => {
      recorded.calls.push({ command, args });
      const child = new EventEmitter();
      setImmediate(() => child.emit("close", 0, null));
      return child;
    },
  };
});

const { resolvePlaywrightLauncher } =
  await import("../../../../src/core/prototyping/playwrightLauncher.js");

const tempDirs: string[] = [];
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
const originalPath = process.env.PATH;

beforeEach(() => {
  Object.defineProperty(process, "platform", { value: "win32", configurable: true });
  // An empty PATH keeps a machine's own playwright and npx out of the probe.
  process.env.PATH = "";
});

afterEach(async () => {
  recorded.calls.length = 0;
  if (originalPlatform) {
    Object.defineProperty(process, "platform", originalPlatform);
  }
  process.env.PATH = originalPath;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

// QFAI:AC-0003-0006-01
// QFAI:EX-0003-0006-01
describe("a PowerShell-only Playwright shim on Windows", () => {
  it("is probed with PowerShell -File, not cmd.exe", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ps1-launcher-"));
    tempDirs.push(root);
    const binDir = path.join(root, "node_modules", ".bin");
    await mkdir(binDir, { recursive: true });
    const shim = path.join(binDir, "playwright.ps1");
    await writeFile(shim, "Write-Output 1.52.0\r\n", "utf-8");

    const resolution = await resolvePlaywrightLauncher(root);

    expect(resolution.status).toBe("resolved");
    expect(resolution.resolved?.executable).toBe(shim);
    expect(recorded.calls).toEqual([
      {
        command: "powershell.exe",
        args: ["-NoProfile", "-NonInteractive", "-File", shim, "--help"],
      },
    ]);
  });
});
