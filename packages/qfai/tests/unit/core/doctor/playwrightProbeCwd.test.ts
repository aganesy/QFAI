// The Playwright launcher probe runs from the inspected project, not from the
// process that launched doctor. With `doctor --root` naming another checkout,
// a project wrapper that reads a relative file, and `npx`, which resolves
// packages from its working directory, must both see the target root.

import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolvePlaywrightLauncher } from "../../../../src/core/prototyping/playwrightLauncher.js";

const MARKER = "qfai-probe-cwd-marker";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-probecwd-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

/**
 * Seed `scripts/playwright` (on Windows `scripts/playwright.cmd`) that exits 0
 * only when the marker file is in its working directory. Windows exercises the
 * cmd-shim spawn branch; every other platform exercises the direct spawn.
 */
async function seedCwdSensitiveWrapper(root: string): Promise<void> {
  const scriptsDir = path.join(root, "scripts");
  await mkdir(scriptsDir, { recursive: true });
  if (process.platform === "win32") {
    await writeFile(
      path.join(scriptsDir, "playwright.cmd"),
      `@echo off\r\nif exist ${MARKER} (exit /b 0) else (exit /b 1)\r\n`,
      "utf-8",
    );
  } else {
    const wrapper = path.join(scriptsDir, "playwright");
    await writeFile(wrapper, `#!/bin/sh\ntest -f ./${MARKER}\n`, "utf-8");
    await chmod(wrapper, 0o755);
  }
  await writeFile(path.join(root, MARKER), "", "utf-8");
}

describe("Playwright launcher probe working directory", () => {
  it("runs the probe with the target root as its working directory", async () => {
    const root = await newTempDir("target");
    await seedCwdSensitiveWrapper(root);
    expect(path.resolve(process.cwd())).not.toBe(path.resolve(root));

    const resolution = await resolvePlaywrightLauncher(root, { timeoutMs: 10_000 });

    const first = resolution.attempts[0];
    expect(first?.origin).toBe("project-wrapper");
    expect(first?.probe).toMatchObject({ ok: true, exitCode: 0 });
    expect(resolution.resolved?.origin).toBe("project-wrapper");
  });
});
