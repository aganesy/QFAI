import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

const mockSpawn = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: mockSpawn,
}));

class HangingChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;

  kill(): boolean {
    this.killed = true;
    return true;
  }
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

    mockSpawn.mockImplementation(() => new HangingChild());
    const originalPath = process.env.PATH;
    process.env.PATH = "";

    try {
      const { resolvePlaywrightCliLauncher } =
        await import("../../../src/core/prototyping/playwrightCliLauncher.js");
      const startedAt = Date.now();
      const result = await resolvePlaywrightCliLauncher(root, { timeoutMs: 20 });

      expect(Date.now() - startedAt).toBeLessThan(500);
      expect(result.status).toBe("not_runnable");
      expect(result.attempts[0]?.probe.timedOut).toBe(true);
      expect(result.attempts[0]?.probe.error).toMatch(/timed out/i);
    } finally {
      process.env.PATH = originalPath;
    }
  });
});
