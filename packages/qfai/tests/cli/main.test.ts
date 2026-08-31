import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";
import { captureStdout } from "../helpers/stdout.js";

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

  it("keeps guardrails --format json stdout parseable when no config is found", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-json-"));
    const deltaPath = path.join(root, "18_delta.md");
    try {
      await writeFile(
        deltaPath,
        [
          "# SPEC-0001: Delta",
          "",
          "## Decision Guardrails",
          "",
          "- ID: DG-0001",
          "  Type: non-goal",
          "  Guardrail: Do not change the spec layout.",
          "  Rationale: Spec layout is a hard gate.",
          "  Reconsider: never",
          "",
        ].join("\n"),
        "utf-8",
      );

      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      let output = "";
      try {
        output = await captureStdout(async () => {
          await run(["guardrails", "list", "--path", deltaPath, "--format", "json"], root);
        });
      } finally {
        process.exitCode = previousExitCode;
      }

      // The missing-config notice must go to stderr, leaving stdout pure JSON.
      expect(() => JSON.parse(output)).not.toThrow();
      expect(output).not.toContain("defaultConfig");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits a JSON refusal envelope when the parser rejects guardrails --format json", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    let output = "";
    try {
      output = await captureStdout(async () => {
        await run(["guardrails", "extract", "--max", "abc", "--format", "json"], cwd);
      });
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }

    // The parser rejects before runGuardrails() is reached, so usage must go to
    // stderr and stdout must still be parseable.
    const parsed: unknown = JSON.parse(output);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("guardrails --format json must emit an object on a parser rejection");
    }
    expect({ ...parsed }.error).toEqual(expect.objectContaining({ code: "invalid-arguments" }));
  });

  it("keeps usage on stdout when a guardrails rejection did not ask for json", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    let output = "";
    try {
      output = await captureStdout(async () => {
        await run(["guardrails", "extract", "--max", "abc"], cwd);
      });
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }

    expect(output).toContain("qfai <command> [options]");
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
