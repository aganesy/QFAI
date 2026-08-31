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

  it("documents --strict and --fail-on as report gates in the help text", async () => {
    // The gate flags are only discoverable to an operator reading `--help`;
    // while `usage()` scoped both to `validate` alone they looked unsupported
    // on `report` even though main.ts forwards them.
    const chunks: string[] = [];
    const previousWrite = process.stdout.write.bind(process.stdout);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      process.stdout.write = (chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      };
      await run(["--help"], process.cwd());
    } finally {
      process.stdout.write = previousWrite;
      process.exitCode = previousExitCode;
    }

    const help = chunks.join("");
    expect(help).toContain("--strict                     validate/report:");
    expect(help).toContain("--fail-on <error|warning|never>  validate/report:");
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
