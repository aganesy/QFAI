import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { KNOWN_COMMANDS, parseArgs } from "../../src/cli/lib/args.js";
import { run } from "../../src/cli/main.js";
import { REVIEWER_SESSION_STATUSES } from "../../src/core/prototyping/evaluatorReview.js";
import { captureStdout } from "../helpers/stdout.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Runs `qfai --help` and returns everything it wrote to stdout. */
async function captureHelp(): Promise<string> {
  const cwd = process.cwd();
  const previousExitCode = process.exitCode;
  const written: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.exitCode = undefined;
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    written.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
    return true;
  }) as typeof process.stdout.write;
  try {
    await run(["--help"], cwd);
  } finally {
    process.stdout.write = originalWrite;
    process.exitCode = previousExitCode;
  }
  return written.join("");
}

/**
 * The `Exit codes` block only. Assertions about the exit-code contract have to
 * land inside it — the Options list above mentions the same words (`収束`,
 * `--check-convergence`) for unrelated reasons, so a whole-help `toContain`
 * would pass on text that never reached the table a caller reads.
 */
function exitCodesBlock(help: string): string {
  const start = help.indexOf("Exit codes");
  expect(start).toBeGreaterThanOrEqual(0);
  return help.slice(start);
}

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

  it("sets exitCode=2 when a prototyping iterate flag is rejected by the parser", async () => {
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["prototyping", "iterate", "--cycle", "notanumber"], cwd);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("sets exitCode=2 for an unknown top-level command", async () => {
    // `bogus` is here because main arrived at the same defect from the other
    // side, wiring the dispatch switch's `default:` to a non-zero code and
    // pinning 1. This PR's exit-code table — the one `usage()` now prints —
    // files "未知のコマンド" under 2 with the rest of the usage errors, so the
    // case survives with the code the table states rather than with two rules
    // for one invocation.
    const cwd = process.cwd();

    for (const argv of [["typo"], ["bogus"]]) {
      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run(argv, cwd);
        expect(process.exitCode, `argv: ${argv.join(" ")}`).toBe(2);
      } finally {
        process.exitCode = previousExitCode;
      }
    }
  });

  it("sets exitCode=2 for an unknown command asking for help", async () => {
    // `--help` is parsed before the dispatch switch, so `run()` returned
    // through the help branch and never reached the `default:` that assigns
    // the usage code: a misspelled command name reported success.
    const cwd = process.cwd();

    // `qfai --help typo` is not in this set: there the first token *is*
    // `--help`, so the invocation is a help request with a stray argument,
    // not a misspelled command. It stays exit 0.
    for (const argv of [
      ["typo", "--help"],
      ["typo", "-h"],
    ]) {
      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run(argv, cwd);
        expect(process.exitCode, `argv: ${argv.join(" ")}`).toBe(2);
      } finally {
        process.exitCode = previousExitCode;
      }
    }
  });

  it("does not mistake a real command asking for help for a typo", async () => {
    // The rejection above keys on a list, so the list has to hold every name
    // the dispatch switch answers to. `--help` returns before any command
    // runs, which makes this safe to sweep.
    const cwd = process.cwd();

    for (const command of KNOWN_COMMANDS) {
      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run([command, "--help"], cwd);
        expect(process.exitCode, `command: ${command}`).toBeUndefined();
      } finally {
        process.exitCode = previousExitCode;
      }
    }
  });

  it("keeps KNOWN_COMMANDS and the dispatch switch in step", async () => {
    // A name here that nothing dispatches falls through to `default:`; a name
    // the switch answers to but this list omits is rejected as a typo. Neither
    // drift is visible from behaviour alone, since both still exit 2.
    const source = await readFile(path.resolve(__dirname, "../../src/cli/main.ts"), "utf-8");
    const dispatched = [...source.matchAll(/^ {4}case "([\w-]+)":$/gm)].map((match) => match[1]);
    expect(dispatched.length).toBeGreaterThan(0);
    expect([...dispatched].sort()).toEqual([...KNOWN_COMMANDS].sort());
  });

  it("does not sell exit 1 as gate-failure-only", async () => {
    // `audit log` returns 1 when it cannot read `decisions/`, and
    // `handoff upgrade` returns 1 for a missing, malformed or unwritable
    // legacy file. A table promising "1 = gate failure" for every command
    // makes automation file those runtime faults as inspection failures — and
    // the two want opposite responses.
    const help = await captureHelp();
    expect(help).toContain("Exit codes");
    expect(help).toContain("実行時エラー");
    expect(help).toContain("audit log");
    expect(help).toContain("handoff upgrade");
    // …and the honest consequence: the exit code alone cannot separate them.
    expect(help).toContain("終了コードだけでは区別できない");
    // The unknown-command contract holds with --help too.
    expect(help).toContain("qfai typo --help");
  });

  it("only cites --format values the parser accepts", async () => {
    // The machine-readable escape hatch pointed at `validate --format json`.
    // `applyFormatOption()` takes text|github for validate, so a caller who
    // followed the help to tell a gate failure from a runtime fault got the
    // usage exit 2 and no counts at all — the one audience the sentence exists
    // for is the audience it broke.
    const help = await captureHelp();

    // Structural, not a string match on the old wording: every literal
    // `<command> --format <value>` the help spells out as an example has to be
    // an invocation the parser actually accepts. `<text|github>` placeholders
    // in the Options list start with `<` and are skipped.
    const examples = [...help.matchAll(/\b(\w[\w-]*) --format ([a-z][\w-]*)/g)];
    expect(examples.length).toBeGreaterThan(0);
    for (const [, command, value] of examples) {
      const parsed = parseArgs([command, "--format", value], process.cwd());
      expect(parsed.invalid, `help cites: ${command} --format ${value}`).toBe(false);
    }

    // …and the replacement names an artifact the reader can actually open.
    expect(exitCodesBlock(help)).toContain(".qfai/report/validate.json");
  });

  it("does not sell prototyping's exit 2 as usage errors only", async () => {
    // `iterate --check-convergence` returns 2 from `runCheckConvergencePeek()`
    // for a correct invocation whose state is simply not converged yet, and the
    // canonical matrix files lock drift under 2 as well. A table that reads
    // "2 = usage error" makes a caller treat "keep iterating" as a typo.
    const block = exitCodesBlock(await captureHelp());
    expect(block).toContain("未収束");
    expect(block).toContain("prototyping.json");
    expect(block).toContain("lock drift");
  });

  it("does not sell iterate's exit 64 as convergence only", async () => {
    // 64 is also the Reviewer-Playwright hard stop (every reviewer on a
    // spec × screen pair exhausted the retry budget). Both mean "stopped", and
    // only the review payload separates them — automation that read 64 as
    // convergence walked a failed run straight into `certify`.
    const block = exitCodesBlock(await captureHelp());
    expect(block).toContain("review.json");
    expect(block).toContain("sessionStatus");
    // The over-correction pin: 64 still has to carry its convergence meaning.
    expect(block).toContain("収束して停止");

    // Structural: the statuses the help names are the ones the payload schema
    // defines, so a rename in `REVIEWER_SESSION_STATUSES` cannot leave the help
    // telling operators to look for a value that can never appear.
    for (const status of REVIEWER_SESSION_STATUSES) {
      // Word-bounded: `ok` is two letters and would otherwise pass on any word
      // that happens to contain it.
      expect(block, `sessionStatus: ${status}`).toMatch(new RegExp(`\\b${status}\\b`));
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
