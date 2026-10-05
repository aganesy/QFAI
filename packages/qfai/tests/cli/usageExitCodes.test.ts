import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { parseArgs } from "../../src/cli/lib/args.js";
import { EXIT_CODES, formatExitCodesSection } from "../../src/cli/lib/exitCodes.js";
import { run } from "../../src/cli/main.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.resolve(here, "..", "..", "src", "cli", "commands");

async function captureHelp(): Promise<string> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  });
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(["--help"], process.cwd());
  } finally {
    process.exitCode = previousExitCode;
    spy.mockRestore();
  }
  return chunks.join("");
}

describe("qfai --help exit-code section", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    // Best-effort cleanup: a leftover temp dir must not fail the suite.
    await Promise.all(
      tempDirs.splice(0).map(async (dir) => {
        try {
          await rm(dir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }),
    );
  });

  it("renders an Exit codes: block that names every code the CLI returns", async () => {
    const help = await captureHelp();

    expect(help).toContain("Exit codes:");
    for (const code of Object.values(EXIT_CODES)) {
      expect(help).toContain(`${code} =`);
    }
  });

  it("documents the per-command split rather than a single flat table", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    expect(section).toContain("validate / doctor");
    expect(section).toContain("report");
    expect(section).toMatch(
      /atdd scaffold\s+0 = success,[\s\S]*?1 = a runtime read or write failure,[\s\S]*?2 = a usage error/,
    );
  });

  it("records the non-usage exit codes the other commands actually return", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // report exits 2 on missing input — the catch-all "1 = a usage error"
    // row would misreport it.
    expect(section).toMatch(
      new RegExp(
        `report\\s+${EXIT_CODES.ok} = success,[\\s\\S]*?${EXIT_CODES.inputError} = the input`,
      ),
    );
  });

  it("documents report's 1 for a corrupt input file, not only the missing-file 2", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const reportRow = section.slice(
      section.indexOf("\n  report"),
      section.indexOf("atdd scaffold"),
    );

    // A corrupt / schema-invalid validate.json throws out of runReport, and
    // cli/index.ts turns any throw into exit 1 — the row has to say so.
    expect(reportRow).toMatch(
      new RegExp(`${EXIT_CODES.findings} = the input validate.json is corrupt`),
    );
  });

  it("awaits the command rather than handing it to a catch nobody reads", async () => {
    // The entry is the last place a promise can be consumed, and it handed the
    // command's to a `.catch` whose own promise reached no one. The rule asks
    // for a consuming caller; on a module top level with no caller, and an
    // entry built for CommonJS as well as ESM, that is a function the call
    // below adopts rather than a top-level await.
    const entry = await readFile(path.resolve(here, "..", "..", "src", "cli", "index.ts"), "utf-8");

    expect(entry, "the command must be awaited").toMatch(/await run\(process\.argv/);
    expect(entry, "and its failure must still become exit 1").toMatch(/process\.exitCode = 1;/);
    expect(entry, "the chain the rule refuses must be gone").not.toMatch(
      /run\(process\.argv[\s\S]{0,40}\)\.catch\(/,
    );
  });

  it("rejects a corrupt validate.json instead of exiting 0 or 2", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "qfai-report-corrupt-"));
    tempDirs.push(dir);
    const inputPath = path.join(dir, "validate.json");
    await writeFile(inputPath, "{ not json", "utf-8");
    const specsDir = path.join(dir, ".qfai", "spec");
    await mkdir(specsDir, { recursive: true });
    await writeFile(path.join(specsDir, "decisions.md"), "# Decisions\n", "utf-8");

    // The throw is what cli/index.ts maps to exit 1; the row now names it.
    await expect(run(["report", "--root", dir, "--in", inputPath], dir)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("says an unknown option stops the run rather than being ignored", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // parseArgs used to drop an unrecognized flag in its `default` branch, and
    // the note read "ignored — the command still exits 0". It rejects now, so
    // the note that described the old hole would send an operator looking for
    // a 0 that no longer arrives.
    const parsed = parseArgs(["validate", "--typo"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.invalidExitCode).toBe(EXIT_CODES.inputError);

    expect(section).toContain("an unknown option");
    expect(section).toMatch(
      new RegExp(`an unknown option[\\s\\S]*?stops at ${EXIT_CODES.inputError}`),
    );
  });

  it("keeps an unknown COMMAND name on its own row, apart from the arg-error code", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // Two rows of one table, and the init CLI contract reserves 2 for an
    // unknown flag or a malformed value — not for a mistyped command name.
    // Folding the two together would file a typo under a row written for
    // something else, and `--help` after the typo must not read as success.
    expect(section).toMatch(
      new RegExp(`An unknown \\*command\\* name[\\s\\S]*?${EXIT_CODES.findings}`),
    );
  });

  it("names the runtime error the validate / doctor row blamed on --fail-on", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const validateRow = section.slice(
      section.indexOf("validate / doctor"),
      section.indexOf("db-drift"),
    );

    // emitJson() (validate) and the --out writeFile() (doctor)
    // are unguarded, so an unwritable destination throws and cli/index.ts
    // maps it to 1. Presenting 1 as "the --fail-on threshold was reached"
    // makes an I/O failure read as a quality verdict.
    expect(validateRow).toMatch(
      new RegExp(`${EXIT_CODES.findings} = the --fail-on threshold was reached, or a runtime`),
    );
    expect(validateRow).toContain("an output I/O exception");
  });

  it("exits 1, not 0 or the --fail-on 1, when doctor cannot write its --out file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "qfai-preflight-out-"));
    tempDirs.push(dir);
    // A regular file where --out wants a parent directory makes doctor's
    // mkdir() fail with ENOTDIR — an I/O error reachable without relying on
    // permission bits (the suite runs as uid 0 in CI containers).
    const blocker = path.join(dir, "blocker");
    await writeFile(blocker, "not a directory\n", "utf-8");

    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(
        run(
          [
            "doctor",
            "--profile",
            "prototyping",
            "--root",
            dir,
            "--format",
            "json",
            "--out",
            path.join(blocker, "preflight.json"),
          ],
          dir,
        ),
      ).rejects.toBeInstanceOf(Error);
    } finally {
      spy.mockRestore();
    }
  });

  it("documents that an invalid --fail-on value is a CLI-arg error", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // args.ts calls markInvalid() for an unknown threshold, exactly as it does
    // for --cycle: falling back to the config default would leave the gate
    // silently differing from the flag the caller wrote, in either direction.
    // The code it stops with is `invalidExitCode`, which is the same on every
    // command — the note said 1, so the number in the help disagreed with the
    // number the parser had already chosen.
    const parsed = parseArgs(["validate", "--fail-on", "typo"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.failOn).toBeUndefined();
    expect(parsed.options.invalidExitCode).toBe(EXIT_CODES.inputError);

    expect(section).toContain("a bad --fail-on value");
    expect(section).toMatch(
      new RegExp(`a bad --fail-on value[\\s\\S]*?returns ${EXIT_CODES.inputError}`),
    );
  });

  it("treats a mistyped command as a usage error even with --help", async () => {
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      // The help branch used to return before the unknown-command branch,
      // so `qfai vlaidate --help` exited 0 and hid the typo from CI.
      await run(["vlaidate", "--help"], process.cwd());
      expect(process.exitCode).toBe(EXIT_CODES.findings);

      process.exitCode = undefined;
      await run(["vlaidate"], process.cwd());
      expect(process.exitCode).toBe(EXIT_CODES.findings);

      // A real command with --help still exits 0.
      process.exitCode = undefined;
      await run(["validate", "--help"], process.cwd());
      expect(process.exitCode).toBeUndefined();
    } finally {
      spy.mockRestore();
      process.exitCode = previousExitCode;
    }
  });

  it("keeps KNOWN_COMMANDS in sync with the dispatch switch", async () => {
    const source = await readFile(path.join(commandsDir, "..", "main.ts"), "utf-8");
    const switchCases = [...source.matchAll(/^ {4}case "([a-z-]+)":$/gmu)].map((m) => m[1] ?? "");
    const declared = [
      ...(
        source.match(
          /const KNOWN_COMMANDS: ReadonlySet<string> = new Set\(\[([\s\S]*?)\]\)/u,
        )?.[1] ?? ""
      ).matchAll(/"([a-z-]+)"/gu),
    ].map((m) => m[1] ?? "");

    expect(switchCases.length).toBeGreaterThan(0);
    // A command added to the switch but not here would exit 0 on a typo'd
    // sibling name; one removed here would be rejected before dispatch.
    expect([...declared].sort()).toEqual([...switchCases].sort());
  });

  it("keeps the rendered section in sync with the EXIT_CODES constants", () => {
    const section = formatExitCodesSection();

    expect(section.startsWith("Exit codes:")).toBe(true);
    for (const code of Object.values(EXIT_CODES)) {
      expect(section).toContain(`${code} =`);
    }
  });
});
