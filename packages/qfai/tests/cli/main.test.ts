import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { captureStdout } from "../helpers/stdout.js";

describe("cli root discovery", () => {
  it("dispatches story-tree scaffold options and refuses the retired spec option", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-atdd-"));
    const previous = process.exitCode;
    try {
      const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0008");
      const story = path.join(flow, "user-story-0008-0007");
      await mkdir(story, { recursive: true });
      await writeFile(path.join(flow, "business-flow.md"), "# BF-0008: Checkout\n");
      await writeFile(path.join(story, "01_User-story.md"), "# US-0008-0007: Checkout\n");
      await writeFile(
        path.join(story, "02_Acceptance-Criteria.md"),
        "```gherkin\n# AC-0008-0007-01\nScenario: checkout\n```\n",
      );
      process.exitCode = undefined;
      await run(["atdd", "scaffold", "--root", root, "--story", "US-0008-0007"], root);
      expect(process.exitCode).toBe(0);
      expect(
        await readFile(
          path.join(root, "tests", "integration", "US-0008-0007", "AC-0008-0007-01.test.ts"),
          "utf8",
        ),
      ).toContain(["QFAI:", "AC-0008-0007-01"].join(""));
      await run(["atdd", "scaffold", "--root", root, "--spec", "spec-0008"], root);
      expect(process.exitCode).toBe(2);
      await run(["atdd", "scaffold", "--root", root, "--story", "US-8-7"], root);
      expect(process.exitCode).toBe(2);
      await run(["atdd", "scaffold", "--root", root, "--flow", "BF-8"], root);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previous;
      await rm(root, { recursive: true, force: true });
    }
  });

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
        const parsed = JSON.parse(await readFile(validatePath, "utf-8")) as {
          counts: { info: number; warning: number; error: number };
          issues: unknown[];
        };
        const seededPath = path.join(root, ".qfai", "report", "validate.seeded.json");
        await writeFile(
          seededPath,
          `${JSON.stringify({ ...parsed, issues: [...parsed.issues, { code: "QFAI-STORY-006", severity: "error", category: "canonical", message: "Missing BF test" }], counts: { ...parsed.counts, error: parsed.counts.error + 1 } }, null, 2)}\n`,
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

  // CLI-arg errors exit 2 on every command
  // (BR-0009-0045 of `.qfai/spec/03_contract/cli/cli-0009-qfai-init.md`).
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

  it("names the current assistant skill and agent targets in init --force help", async () => {
    const help = await captureStdout(() => run(["--help"], process.cwd()));

    expect(help).toContain(".qfai/assistant/{skill,agent}/**");
    expect(help).toContain(".qfai/assistant/skill/<id>/ stays");
    expect(help).not.toContain(".qfai/assistant/{skills,agents}/**");
    expect(help).not.toContain(".qfai/assistant/skills/<id>/ stays");
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

  it("writes the init tree to --root instead of the cwd", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "qfai-init-root-"));
    const target = path.join(base, "target");
    const cwd = path.join(base, "cwd");
    try {
      await mkdir(target, { recursive: true });
      await mkdir(cwd, { recursive: true });

      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run(["init", "--root", target, "--yes"], cwd);
      } finally {
        process.exitCode = previousExitCode;
      }

      await expect(readdir(path.join(target, ".qfai"))).resolves.not.toHaveLength(0);
      await expect(readdir(cwd)).resolves.toEqual([]);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});

describe("cli usage errors", () => {
  async function captureRun(
    argv: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: typeof process.exitCode }> {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(argv, process.cwd());
      return {
        stdout: stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
        stderr: stderrSpy.mock.calls.map((call) => String(call[0])).join(""),
        exitCode: process.exitCode,
      };
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      process.exitCode = previousExitCode;
    }
  }

  // QFAI:EX-0001-0173-03
  it("exits 2 on an audit argument error and names the reason on stderr", async () => {
    const missing = await captureRun(["audit"]);
    expect(missing.exitCode).toBe(2);
    expect(missing.stderr).toContain("qfai audit: unknown or missing subcommand. Expected: log");
    const format = await captureRun(["audit", "log", "--format", "csv"]);
    expect(format.exitCode).toBe(2);
    expect(format.stderr).toContain("--format");
  });

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
        argv: ["discussion"],
        expected: "qfai discussion: unknown or missing subcommand. Expected: list|use",
      },
      {
        argv: ["prototyping", "bogusaction"],
        expected:
          'qfai prototyping: unknown subcommand "bogusaction". Expected: preflight|iterate|certify|show-ui-contract|rescope|refreeze',
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
    // And nothing else plain, now that init writes no README anywhere.
    expect(entry).not.toContain("README.md");
  });

  it("does not claim everything outside skills/agents is skipped when it exists", async () => {
    const entry = forceEntry(await captureHelp());

    expect(entry).not.toContain("everything else is skipped if it already exists");
    expect(entry).toContain("rule/*.local.md overlays");
    expect(entry).not.toContain("assistant/catalog");
  });

  it("names the current assistant layers as the --upgrade-assistant-tree destinations", async () => {
    const lines = (await captureHelp()).split("\n");
    const start = lines.findIndex((candidate) =>
      candidate.trimStart().startsWith("--upgrade-assistant-tree"),
    );
    expect(start).toBeGreaterThanOrEqual(0);
    const entry = [lines[start], lines[start + 1]].join("\n");

    expect(entry).toContain("-> rule/ skill/ agent/ prompt/");
    for (const retired of ["constitution/", "manifest/", "catalog/", "process/"]) {
      expect(entry).not.toContain(retired);
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
