import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

  it("sets exitCode from report so --fail-on gates the run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run(["report", "--root", root, "--run-validate", "--fail-on", "never"], root);
        expect(process.exitCode).toBe(0);

        const validatePath = path.join(root, ".qfai", "report", "validate.json");
        const parsed = JSON.parse(await readFile(validatePath, "utf-8")) as { counts: unknown };
        const seededPath = path.join(root, ".qfai", "report", "validate.seeded.json");
        await writeFile(
          seededPath,
          `${JSON.stringify({ ...parsed, counts: { info: 0, warning: 0, error: 1 } }, null, 2)}\n`,
          "utf-8",
        );

        await run(["report", "--root", root, "--in", seededPath, "--fail-on", "error"], root);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = previousExitCode;
      }
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
