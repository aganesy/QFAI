// Doctor records each Playwright probe's `displayCommand` so a reader can rerun
// the probe by hand. It must render the argument array the probe was spawned
// with, not the candidate's base arguments.

import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolvePlaywrightLauncher } from "../../../../src/core/prototyping/playwrightLauncher.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

/**
 * Seed `node_modules/.bin/playwright` (on Windows `node_modules/.bin/playwright.cmd`) that exits 0
 * only when its sole argument is `--help`, so a passing probe proves which
 * arguments it ran with.
 */
async function seedHelpOnlyShim(root: string): Promise<void> {
  const binDir = path.join(root, "node_modules", ".bin");
  await mkdir(binDir, { recursive: true });
  if (process.platform === "win32") {
    await writeFile(
      path.join(binDir, "playwright.cmd"),
      '@echo off\r\nif not "%~2"=="" exit /b 1\r\nif "%~1"=="--help" (exit /b 0) else (exit /b 1)\r\n',
      "utf-8",
    );
  } else {
    const shim = path.join(binDir, "playwright");
    await writeFile(shim, '#!/bin/sh\ntest "$#" -eq 1 && test "$1" = --help\n', "utf-8");
    await chmod(shim, 0o755);
  }
}

describe("Playwright launcher probe display command", () => {
  it("renders the arguments the probe actually ran with", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-probecmd-"));
    tempDirs.push(root);
    await seedHelpOnlyShim(root);

    const resolution = await resolvePlaywrightLauncher(root, { timeoutMs: 10_000 });

    const first = resolution.attempts[0];
    expect(first?.origin).toBe("node_modules/.bin");
    expect(first?.probe).toMatchObject({ ok: true, exitCode: 0 });
    const executable = first?.executable ?? "";
    const renderedExecutable = /^[A-Za-z0-9._:\\/-]+$/.test(executable)
      ? executable
      : JSON.stringify(executable);
    expect(first?.displayCommand).toBe(`${renderedExecutable} --help`);
  });
});
