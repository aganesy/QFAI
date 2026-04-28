import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

const mockSpawn = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: mockSpawn,
}));

class MockStream extends EventEmitter {
  destroyed = false;

  destroy(): void {
    this.destroyed = true;
  }
}

class HangingChild extends EventEmitter {
  stdout = new MockStream();
  stderr = new MockStream();
  killSignals: Array<NodeJS.Signals | undefined> = [];
  unrefCalled = false;

  kill(signal?: NodeJS.Signals): boolean {
    this.killSignals.push(signal);
    return true;
  }

  unref(): void {
    this.unrefCalled = true;
  }
}

class SuccessfulChild extends EventEmitter {
  stdout = new MockStream();
  stderr = new MockStream();

  constructor() {
    super();
    queueMicrotask(() => {
      this.emit("close", 0, null);
    });
  }

  kill(): boolean {
    return true;
  }

  unref(): void {}
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-playwright-launcher-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.clearAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("resolvePlaywrightCliLauncher", () => {
  it("returns timeout failure even when the spawned process never closes", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "scripts"), { recursive: true });
    await writeFile(path.join(root, "scripts", "playwright-cli.cmd"), "@echo off\r\n", "utf-8");

    const child = new HangingChild();
    mockSpawn.mockImplementation(() => child);
    const originalPath = process.env.PATH;
    process.env.PATH = "";

    try {
      const { resolvePlaywrightCliLauncher } =
        await import("../../../src/core/prototyping/playwrightCliLauncher.js");
      const startedAt = Date.now();
      const result = await resolvePlaywrightCliLauncher(root, { timeoutMs: 20 });
      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(Date.now() - startedAt).toBeLessThan(500);
      expect(result.status).toBe("not_runnable");
      expect(result.attempts[0]?.probe.timedOut).toBe(true);
      expect(result.attempts[0]?.probe.error).toMatch(/timed out/i);
      expect(child.unrefCalled).toBe(true);
      expect(child.killSignals).toEqual(expect.arrayContaining([undefined, "SIGKILL"]));
      expect(child.stdout.destroyed).toBe(true);
      expect(child.stderr.destroyed).toBe(true);
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it.runIf(process.platform !== "win32")(
    "prefers the bare launcher over a .cmd sidecar on POSIX",
    async () => {
      const root = await newTempDir();
      const binDir = path.join(root, "node_modules", ".bin");
      await mkdir(binDir, { recursive: true });
      await writeFile(
        path.join(binDir, "playwright-cli.cmd"),
        "@echo off\r\nexit /b 1\r\n",
        "utf-8",
      );
      const bareLauncher = path.join(binDir, "playwright-cli");
      await writeFile(bareLauncher, "#!/bin/sh\necho ok\n", "utf-8");
      await chmod(bareLauncher, 0o755);

      mockSpawn.mockImplementation(() => new SuccessfulChild());
      const originalPath = process.env.PATH;
      process.env.PATH = "";

      try {
        const { resolvePlaywrightCliLauncher } =
          await import("../../../src/core/prototyping/playwrightCliLauncher.js");
        const result = await resolvePlaywrightCliLauncher(root, { timeoutMs: 20 });

        expect(result.status).toBe("resolved");
        expect(result.resolved?.executable).toBe(bareLauncher);
      } finally {
        process.env.PATH = originalPath;
      }
    },
  );
});
