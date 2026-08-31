import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";

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

describe("cli usage errors", () => {
  async function captureRun(argv: string[]): Promise<{ stdout: string; stderr: string }> {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(argv, process.cwd());
      return {
        stdout: stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
        stderr: stderrSpy.mock.calls.map((call) => String(call[0])).join(""),
      };
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      process.exitCode = previousExitCode;
    }
  }

  it("writes the rejection reason to stderr, not only usage to stdout", async () => {
    const { stdout, stderr } = await captureRun(["validate", "--profile", "bogus"]);
    expect(stderr).toContain("--profile");
    expect(stderr).toContain('"bogus"');
    expect(stdout).toContain("qfai <command> [options]");
  });

  it("surfaces the per-family subcommand diagnostics on stderr", async () => {
    const cases: Array<{ argv: string[]; expected: string }> = [
      { argv: ["audit"], expected: "qfai audit: unknown or missing subcommand. Expected: log" },
      { argv: ["atdd"], expected: "qfai atdd: unknown or missing subcommand. Expected: scaffold" },
      {
        argv: ["handoff"],
        expected: "qfai handoff: unknown or missing subcommand. Expected: upgrade",
      },
      {
        argv: ["discussion"],
        expected: "qfai discussion: unknown or missing subcommand. Expected: list|use",
      },
      {
        argv: ["prototyping", "bogusaction"],
        expected:
          'qfai prototyping: unknown subcommand "bogusaction". Expected: preflight|iterate|certify|show-spec',
      },
    ];
    for (const { argv, expected } of cases) {
      const { stderr } = await captureRun(argv);
      expect(stderr).toContain(expected);
    }
  });

  it("keeps stderr silent when help is requested explicitly", async () => {
    const { stdout, stderr } = await captureRun(["--help"]);
    expect(stderr).toBe("");
    expect(stdout).toContain("qfai <command> [options]");
  });
});
