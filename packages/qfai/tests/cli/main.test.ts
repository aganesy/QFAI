import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";
import { resolveToolVersion } from "../../src/core/version.js";

describe("cli root discovery", { timeout: 15000 }, () => {
  it("finds config in parent when --root is omitted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-root-"));
    const cwd = path.join(root, "packages", "app");
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await mkdir(cwd, { recursive: true });

      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run(["validate", "--fail-on", "never"], cwd);
      } finally {
        process.exitCode = previousExitCode;
      }

      const validatePath = path.join(root, ".qfai", "report", "validate.json");
      await expect(readFile(validatePath, "utf-8")).resolves.toContain('"toolVersion"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("sets exitCode=1 when help is shown due to invalid args", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["validate", "--format"], cwd);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("sets exitCode=1 when the command is unknown", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["bogus"], cwd);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("sets exitCode=2 when guardrails args are invalid", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["guardrails", "--path"], cwd);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});

describe("cli --version", () => {
  async function captureRun(argv: string[]): Promise<{ stdout: string; exitCode: unknown }> {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    process.stdout.write = ((chunk: unknown): boolean => {
      chunks.push(typeof chunk === "string" ? chunk : String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      await run(argv, process.cwd());
      return { stdout: chunks.join(""), exitCode: process.exitCode };
    } finally {
      process.stdout.write = originalWrite;
      process.exitCode = previousExitCode;
    }
  }

  it("prints the resolved tool version and leaves the exit code unset", async () => {
    const expected = await resolveToolVersion();
    const { stdout, exitCode } = await captureRun(["--version"]);
    expect(stdout.trim()).toBe(expected);
    expect(exitCode).toBeUndefined();
  });

  it("supports the -V alias", async () => {
    const expected = await resolveToolVersion();
    const { stdout } = await captureRun(["-V"]);
    expect(stdout.trim()).toBe(expected);
  });

  it("does not print usage for a version request", async () => {
    const { stdout } = await captureRun(["--version"]);
    expect(stdout).not.toContain("qfai <command> [options]");
  });

  it("advertises the version flag in usage output", async () => {
    const { stdout } = await captureRun(["--help"]);
    expect(stdout).toContain("-V, --version");
  });
});
