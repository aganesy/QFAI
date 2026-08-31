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

describe("cli usage text", () => {
  async function captureHelp(): Promise<string> {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      process.stdout.write = (chunk: string | Uint8Array): boolean => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      };
      await run(["--help"], process.cwd());
    } finally {
      process.stdout.write = originalWrite;
      process.exitCode = previousExitCode;
    }
    return chunks.join("");
  }

  /** The `--force` help entry, including its wrapped continuation lines. */
  function forceEntry(help: string): string {
    const lines = help.split("\n");
    const start = lines.findIndex((candidate) => candidate.trimStart().startsWith("--force"));
    expect(start).toBeGreaterThanOrEqual(0);

    const entry = [lines[start]];
    for (const candidate of lines.slice(start + 1)) {
      if (candidate.trim() === "" || candidate.trimStart().startsWith("--")) break;
      entry.push(candidate);
    }
    return entry.join("\n");
  }

  it("describes --force as covering the regenerated symlink asset surfaces", async () => {
    const entry = forceEntry(await captureHelp());

    expect(entry).toContain(".agents");
    expect(entry).toContain(".claude");
    expect(entry).toContain(".github");
    expect(entry).toContain(".codex");
  });

  it("names copilot-instructions.md among the files --force rewrites", async () => {
    const entry = forceEntry(await captureHelp());

    expect(entry).toContain("copilot-instructions.md");
    expect(entry).toContain("README.md");
  });

  it("does not claim everything outside skills/agents is skipped when it exists", async () => {
    const entry = forceEntry(await captureHelp());

    expect(entry).not.toContain("それ以外は既存があればスキップ");
    expect(entry).toContain("assistant/manifest/**");
  });
});
