import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";
import { resolveToolVersion } from "../../src/core/version.js";
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

  // `--dry-run` is rejected on the commands that never wired it, but
  // `handoff upgrade` implements it: the flag must reach the command and
  // preview instead of writing the canonical file.
  it("honours --dry-run on handoff upgrade instead of writing the canonical file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-dryrun-"));
    const legacyFile = path.join(root, "legacy.yaml");
    await writeFile(legacyFile, "companyName: FreshCo\n", "utf-8");

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await captureStdout(async () => {
        await run(["handoff", "upgrade", legacyFile, "--root", root, "--dry-run"], root);
      });
      expect(process.exitCode).toBe(0);
      // The whole point of the flag: nothing may be written.
      await expect(readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8")).rejects.toThrow();
    } finally {
      process.exitCode = previousExitCode;
      await rm(root, { recursive: true, force: true });
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
