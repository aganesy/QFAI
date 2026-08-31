import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

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

  it("sets exitCode=1 when the top-level command is unknown", async () => {
    const cwd = process.cwd();

    // Two spellings of the same defect, one from each side of this merge: a
    // word that is no command at all, and a near-miss typo of one that is.
    // Both reach the same `Unknown command` path, and keeping both keeps the
    // typo case from being read as a suggestion feature that does not exist.
    for (const unknown of ["bogus", "vlaidate"]) {
      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run([unknown], cwd);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = previousExitCode;
      }
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
