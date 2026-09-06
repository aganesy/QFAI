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

function isExitCodeName(value: string): value is keyof typeof EXIT_CODES {
  return Object.prototype.hasOwnProperty.call(EXIT_CODES, value);
}

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
    expect(section).toContain("guardrails");
    expect(section).toContain("prototyping iterate");
    expect(section).toContain("prototyping certify");
  });

  it("states why guardrails alone returns 2 for a usage error", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    expect(section).toMatch(/guardrails[\s\S]*使用法エラー/);
  });

  it("records the non-usage exit codes the other commands actually return", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // guardrails check reports 検査エラー with 1, not only 0 / 2.
    expect(section).toMatch(
      new RegExp(`guardrails[\\s\\S]*?${EXIT_CODES.findings} = check で検査エラー`),
    );
    // report / show-spec exit 2 on a missing or unreadable input file — the
    // catch-all "1 = 使用法エラー" row would misreport them.
    expect(section).toMatch(
      new RegExp(`report\\s+${EXIT_CODES.ok} = 成功,[\\s\\S]*?${EXIT_CODES.inputError} = 入力`),
    );
    expect(section).toMatch(
      new RegExp(
        `prototyping show-spec\\s+${EXIT_CODES.ok} = 成功,[\\s\\S]*?${EXIT_CODES.inputError} = prototyping.json`,
      ),
    );
    expect(section).toContain("--check の証明書 digest・gate mismatch");
  });

  it("names the iterate outcomes that share 0 and 2 with unrelated causes", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const iterateRow = section.slice(
      section.indexOf("prototyping iterate"),
      section.indexOf("prototyping iterate --check-convergence"),
    );

    // 0 is not only "continue": cycle 0 with zero UI-bearing specs is a
    // terminal no-op, and a loop that keeps going lands on 2 at cycle 1.
    expect(iterateRow).toMatch(new RegExp(`${EXIT_CODES.ok} = [^\\n]*no-op`));
    // 2 also covers --auto-serve / --capture runtime failures, which need a
    // different recovery than fixing inputs.
    expect(iterateRow).toContain("--auto-serve");
    expect(iterateRow).toContain("--capture");
  });

  it("names the certify layout incompatibility that also returns 64", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const certifyRow = section.slice(section.indexOf("prototyping certify"));

    expect(certifyRow).toMatch(
      new RegExp(`${EXIT_CODES.prototypingConverged} = [^]*?flat layout 非対応`),
    );
  });

  it("splits --check-convergence from the ordinary iterate row", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    expect(section).toContain("prototyping iterate --check-convergence");
    expect(section).toMatch(new RegExp(`--check-convergence[\\s\\S]*?${EXIT_CODES.ok} = 収束済み`));
  });

  it("does not advertise the reviewer hard-stop that no CLI path returns", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // `shouldStop()` never inspects review.json#sessionStatus, so 64 from
    // `prototyping iterate` is always convergence today.
    expect(section).not.toMatch(/hard-stop/i);
  });

  it("documents report's 1 for a corrupt input file, not only the missing-file 2", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const reportRow = section.slice(
      section.indexOf("\n  report"),
      section.indexOf("prototyping iterate"),
    );

    // A corrupt / schema-invalid validate.json throws out of runReport, and
    // cli/index.ts turns any throw into exit 1 — the row has to say so.
    expect(reportRow).toMatch(new RegExp(`${EXIT_CODES.findings} = 入力 validate.json の破損`));
  });

  it("rejects a corrupt validate.json instead of exiting 0 or 2", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "qfai-report-corrupt-"));
    tempDirs.push(dir);
    const inputPath = path.join(dir, "validate.json");
    await writeFile(inputPath, "{ not json", "utf-8");

    // The throw is what cli/index.ts maps to exit 1; the row now names it.
    await expect(run(["report", "--root", dir, "--in", inputPath], dir)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("separates the --check-convergence cycle-range error from 未収束", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const peekRow = section.slice(section.indexOf("prototyping iterate --check-convergence"));

    expect(peekRow).toContain("--cycle 範囲エラー");
  });

  it("returns the input-error code for an out-of-range --check-convergence cycle", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "qfai-peek-range-"));
    tempDirs.push(dir);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await run(
        ["prototyping", "iterate", "--check-convergence", "--cycle", "10", "--root", dir],
        dir,
      );
      expect(process.exitCode).toBe(EXIT_CODES.inputError);
    } finally {
      process.exitCode = previousExitCode;
    }
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

    expect(section).toContain("未知のオプション");
    expect(section).toMatch(
      new RegExp(`未知のオプション[\\s\\S]*?${EXIT_CODES.inputError} で停止する`),
    );
  });

  it("keeps an unknown COMMAND name on its own row, apart from the arg-error code", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // Two rows of one table, and the init CLI contract reserves 2 for an
    // unknown flag or a malformed value — not for a mistyped command name.
    // Folding the two together would file a typo under a row written for
    // something else, and `--help` after the typo must not read as success.
    expect(section).toMatch(new RegExp(`未知の \\*コマンド\\* 名[\\s\\S]*?${EXIT_CODES.findings}`));
  });

  it("names the certify runtime error that the 0 / 2 / 64 row omitted", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const certifyRow = section.slice(section.indexOf("prototyping certify"));

    // writeCompletionCertificate() throws on a read-only destination and
    // cli/index.ts maps any throw to 1 — the row has to carry it.
    expect(certifyRow).toMatch(new RegExp(`${EXIT_CODES.findings} = 実行時エラー`));
    expect(certifyRow).toContain("証明書 I/O の例外");
  });

  it("names the runtime error the validate / doctor / preflight rows blamed on --fail-on", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const validateRow = section.slice(
      section.indexOf("validate / doctor"),
      section.indexOf("prototyping preflight"),
    );
    const preflightRow = section.slice(
      section.indexOf("prototyping preflight"),
      section.indexOf("guardrails"),
    );

    // emitJson() (validate) and the --out writeFile() (doctor / preflight)
    // are unguarded, so an unwritable destination throws and cli/index.ts
    // maps it to 1. Presenting 1 as "the --fail-on threshold was reached"
    // makes an I/O failure read as a quality verdict.
    for (const row of [validateRow, preflightRow]) {
      expect(row).toMatch(
        new RegExp(`${EXIT_CODES.findings} = --fail-on 閾値に到達, または実行時`),
      );
      expect(row).toContain("出力 I/O の例外");
    }
  });

  it("exits 1, not 0 or the --fail-on 1, when preflight cannot write its --out file", async () => {
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
            "prototyping",
            "preflight",
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

  it("documents show-spec's 1 for a spec-resolution I/O error, not only the 0 / 2 pair", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const showSpecRow = section.slice(
      section.indexOf("prototyping show-spec"),
      section.indexOf("その他のコマンド"),
    );

    // resolveSurfaceUnion() re-throws every non-ENOENT spec-body read error
    // rather than classifying the spec as non-UI, so 1 is reachable with a
    // perfectly valid prototyping.json.
    expect(showSpecRow).toMatch(new RegExp(`${EXIT_CODES.findings} = 実行時エラー`));
    expect(showSpecRow).toContain("spec 解決時の I/O 例外");
    // Over-correction pin: the missing / corrupt prototyping.json stays 2.
    expect(showSpecRow).toMatch(
      new RegExp(`${EXIT_CODES.inputError} = prototyping.json の欠落 / 破損`),
    );
  });

  it("exits 1 when show-spec hits a non-ENOENT spec read failure", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "qfai-showspec-io-"));
    tempDirs.push(dir);
    const protoJson = path.join(dir, ".qfai", "evidence", "prototyping", "prototyping.json");
    await mkdir(path.dirname(protoJson), { recursive: true });
    await writeFile(
      protoJson,
      `${JSON.stringify({ frozenSpecsCovered: ["spec-0001"], specsCovered: ["spec-0001"] }, null, 2)}\n`,
      "utf-8",
    );
    // A directory named 01_Spec.md makes readFile fail with EISDIR — the
    // non-ENOENT class resolveSurfaceUnion re-throws. Same reason as above:
    // chmod-based unreadability is a no-op for uid 0.
    await mkdir(path.join(dir, ".qfai", "specs", "spec-0001", "01_Spec.md"), { recursive: true });

    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await expect(run(["prototyping", "show-spec", "--root", dir], dir)).rejects.toBeInstanceOf(
        Error,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("splits the parser-rejected --check-convergence cycle from the runner's range error", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));
    const peekRow = section.slice(section.indexOf("prototyping iterate --check-convergence"));

    // `-1` never reaches the runner: parseNonNegativeInteger rejects it, so
    // the row must not fold it into the 未収束 / range-error 2.
    expect(peekRow).toMatch(new RegExp(`${EXIT_CODES.findings} = --cycle が非負整数でない`));
    expect(peekRow).toContain("10 以上の非負整数");
  });

  it("returns the CLI-arg-error code for a negative --check-convergence cycle", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "qfai-peek-negative-"));
    tempDirs.push(dir);
    const parsed = parseArgs(
      ["prototyping", "iterate", "--check-convergence", "--cycle", "-1"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(true);

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await run(
        ["prototyping", "iterate", "--check-convergence", "--cycle", "-1", "--root", dir],
        dir,
      );
      // A rejected value is a CLI-arg error on every command, so it shares the
      // out-of-range case's code rather than the findings code the note used
      // to promise.
      expect(process.exitCode).toBe(EXIT_CODES.inputError);
    } finally {
      spy.mockRestore();
      process.exitCode = previousExitCode;
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

    expect(section).toContain("--fail-on の不正値");
    expect(section).toMatch(
      new RegExp(`--fail-on の不正値[\\s\\S]*?${EXIT_CODES.inputError} を返す`),
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
    expect(section).toContain(`${EXIT_CODES.prototypingConverged} =`);
    expect(section).toContain(`${EXIT_CODES.prototypingBudgetExhausted} =`);
    expect(section).toContain(`${EXIT_CODES.prototypingLicenseFailure} =`);
  });

  it("routes every sysexits-range return in the prototyping commands through EXIT_CODES", async () => {
    const files = ["prototypingIterate.ts", "prototypingCertify.ts"];
    const sources = await Promise.all(
      files.map(async (file) => readFile(path.join(commandsDir, file), "utf-8")),
    );

    const literals: string[] = [];
    const viaConstant: string[] = [];
    sources.forEach((source, index) => {
      for (const match of source.matchAll(/\breturn\s+(\d{2,3})\s*;/g)) {
        if (Number.parseInt(match[1] ?? "", 10) >= 64) {
          literals.push(`${files[index] ?? ""}: return ${match[1] ?? ""};`);
        }
      }
      for (const match of source.matchAll(/\breturn\s+EXIT_CODES\.(\w+)\s*;/g)) {
        viaConstant.push(match[1] ?? "");
      }
    });

    // A new bare `return 64;` would document itself out of `--help`.
    expect(literals).toEqual([]);
    expect(viaConstant.length).toBeGreaterThan(0);
    const section = formatExitCodesSection();
    for (const name of viaConstant) {
      expect(isExitCodeName(name)).toBe(true);
      if (!isExitCodeName(name)) {
        continue;
      }
      expect(section).toContain(`${EXIT_CODES[name]} =`);
    }
  });
});
