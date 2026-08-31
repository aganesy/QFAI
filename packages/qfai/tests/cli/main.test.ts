import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
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

  // CLI-arg errors exit 2 on every command, not just `guardrails`
  // (`.qfai/contracts/cli/qfai-init.md` exit-code table).
  it("sets exitCode=2 when help is shown due to invalid args", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["validate", "--format"], cwd);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("reports the unknown flag on stderr and exits 2 instead of running the command", async () => {
    // A `--dry-run` typo used to fall through the parser's
    // `default: break;` and perform a REAL init at exit 0, so the
    // target directory must stay empty here.
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-unknown-flag-"));
    const written: string[] = [];
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        written.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      });
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((): boolean => true);

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["init", "--dryrun"], cwd);
      expect(process.exitCode).toBe(2);
      expect(written.join("")).toContain("--dryrun");
      await expect(readdir(cwd)).resolves.toEqual([]);
    } finally {
      process.exitCode = previousExitCode;
      writeSpy.mockRestore();
      stdoutSpy.mockRestore();
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("exits 2 for an unknown option in the command position", async () => {
    // `qfai --bogus` used to reach the unknown-command branch, which
    // prints a message but sets no exit code — so a wrapper saw 0.
    const cwd = process.cwd();
    const written: string[] = [];
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        written.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      });
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((): boolean => true);

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["--bogus"], cwd);
      expect(process.exitCode).toBe(2);
      expect(written.join("")).toContain("--bogus");
    } finally {
      process.exitCode = previousExitCode;
      writeSpy.mockRestore();
      stdoutSpy.mockRestore();
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
