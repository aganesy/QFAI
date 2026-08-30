import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { KNOWN_COMMANDS } from "../../src/cli/lib/args.js";
import { run } from "../../src/cli/main.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    const cwd = process.cwd();

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(["typo"], cwd);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
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

    const help = written.join("");
    expect(help).toContain("Exit codes");
    expect(help).toContain("実行時エラー");
    expect(help).toContain("audit log");
    expect(help).toContain("handoff upgrade");
    // …and the honest consequence: the exit code alone cannot separate them.
    expect(help).toContain("終了コードだけでは区別できない");
    // The unknown-command contract holds with --help too.
    expect(help).toContain("qfai typo --help");
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
