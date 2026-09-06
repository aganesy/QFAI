import { describe, expect, it } from "vitest";

import type { ParsedArgs } from "../../src/cli/lib/args.js";
import { parseArgs } from "../../src/cli/lib/args.js";

describe("parseArgs", () => {
  it("does not skip other options when --format has no value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--format", "--strict"], cwd);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.validateFormat).toBe("text");
  });

  it("sets validateFormat when --format has an explicit value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--format", "github", "--strict"], cwd);
    expect(parsed.options.help).toBe(false);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.validateFormat).toBe("github");
  });

  it("accepts --dir on init, which is the only command that reads it", () => {
    const parsed = parseArgs(["init", "--dir", "/tmp/out"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.dir).toBe("/tmp/out");
  });

  for (const command of ["validate", "report", "doctor", "atdd"] as const) {
    it(`rejects --dir on ${command}, which never reads it`, () => {
      // `options.dir` is read at exactly one place — the `init` arm of the
      // dispatch. Anywhere else the flag reached nothing and `resolveRoot` fell
      // through to the current directory, so `validate --dir <path>` answered
      // about the CURRENT tree and `report --dir <path>` overwrote its
      // `report.md`. A confident verdict about a tree the operator did not name
      // is worse than an error, because it looks like an answer (#1143).
      const parsed = parseArgs([command, "--dir", "/tmp/elsewhere"], process.cwd());
      expect(parsed.invalid).toBe(true);
    });
  }

  it("accepts --upgrade-assistant-tree on init", () => {
    const parsed = parseArgs(
      ["init", "--dir", "/tmp/out", "--upgrade-assistant-tree"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.upgradeAssistantTree).toBe(true);
  });

  for (const command of ["validate", "report", "doctor"] as const) {
    it(`rejects --upgrade-assistant-tree on ${command}`, () => {
      // The same shape as --dir and worse in one way: accepted here it exited 0
      // having upgraded nothing, so the operator went on reading an assistant
      // tree they believed had been refreshed (#1143).
      const parsed = parseArgs([command, "--upgrade-assistant-tree"], process.cwd());
      expect(parsed.invalid).toBe(true);
    });
  }

  describe("shared flags reach only the commands that read them", () => {
    // The owner lists are derived from where `main.ts` reads each field. A flag
    // accepted where nothing reads it reaches nothing and the run proceeds as if
    // it had not been given — `--dry-run` most sharply, since an operator who
    // believes a run is a rehearsal gets a real one (#1144).
    //
    // `handoff` and `prototyping` take a subcommand, so their rows name one: a
    // bare `handoff` is invalid for its own reasons and would pass a rejection
    // row without testing the flag.
    const OWNERS = [
      ["--force", [["init"], ["handoff", "upgrade"], ["prototyping", "iterate"]], ["validate"]],
      ["--yes", [["init"], ["doctor"]], ["validate", "report"]],
      [
        "--dry-run",
        [["init"], ["doctor"], ["handoff", "upgrade"], ["prototyping", "iterate"]],
        ["validate", "report", "atdd"],
      ],
    ] as const;

    for (const [flag, owners, strangers] of OWNERS) {
      for (const owner of owners) {
        it(`accepts ${flag} on ${owner.join(" ")}`, () => {
          const parsed = parseArgs([...owner, flag], process.cwd());
          expect(parsed.invalid).toBe(false);
        });
      }
      for (const stranger of strangers) {
        it(`rejects ${flag} on ${stranger}, which never reads it`, () => {
          const parsed = parseArgs([stranger, flag], process.cwd());
          expect(parsed.invalid).toBe(true);
        });
      }
    }
  });

  it("still accepts --root on the commands that resolve a target", () => {
    // The flag the operator wanted. A rejection that did not leave this working
    // would have removed the only way to point those commands at a tree.
    const parsed = parseArgs(["validate", "--root", "/tmp/project"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.root).toBe("/tmp/project");
    expect(parsed.options.rootExplicit).toBe(true);
  });

  it("parses --fail-on {never|warning|error} and rejects other values", () => {
    const cwd = process.cwd();
    for (const value of ["never", "warning", "error"] as const) {
      const parsed = parseArgs(["validate", "--fail-on", value], cwd);
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.failOn).toBe(value);
    }
    // A misspelled or mis-cased threshold must not fall through to the
    // config default: the gate would then silently differ from the flag.
    for (const value of ["errr", "nver", "ERROR"]) {
      const bogus = parseArgs(["validate", "--fail-on", value], cwd);
      expect(bogus.invalid).toBe(true);
      expect(bogus.options.help).toBe(true);
      expect(bogus.options.failOn).toBeUndefined();
    }
  });

  it("requires a value for --fail-on", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--fail-on"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("does not consume other options as a value for --out", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["report", "--out", "--format", "json"], cwd);
    expect(parsed.options.help).toBe(true);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.reportFormat).toBe("json");
  });

  it("parses --base-url for report", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      ["report", "--base-url", "https://example.com/", "--format", "md"],
      cwd,
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.reportBaseUrl).toBe("https://example.com/");
    expect(parsed.options.reportFormat).toBe("md");
  });

  it("requires a value for --base-url", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["report", "--base-url", "--format", "md"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses guardrails options", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      [
        "guardrails",
        "extract",
        "--path",
        "18_delta.md",
        "--path",
        "more",
        "--max",
        "12",
        "--keyword",
        "layout",
      ],
      cwd,
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.guardrailsAction).toBe("extract");
    expect(parsed.options.guardrailsPaths).toEqual(["18_delta.md", "more"]);
    expect(parsed.options.guardrailsMax).toBe(12);
    expect(parsed.options.guardrailsKeyword).toBe("layout");
  });

  it("parses --profile for validate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "atdd"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.profile).toBe("atdd");
  });

  it("allows --out for prototyping preflight only", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "preflight", "--out", "tmp/out.json"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.doctorOut).toBe("tmp/out.json");
  });

  it("parses a strict integer --cycle for prototyping iterate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "3"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAction).toBe("iterate");
    expect(parsed.options.prototypingCycle).toBe(3);
  });

  it("rejects a partial numeric --cycle value for prototyping iterate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "3abc"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.prototypingCycle).toBeUndefined();
  });

  it("rejects a fractional --cycle value for prototyping iterate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "1.5"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.prototypingCycle).toBeUndefined();
  });

  // v2.0 (spec-0012 absorbed): the v1.x round-* / --candidates / --survivors
  // arg surface was removed; the iterate command takes only --cycle and
  // --target-url. No equivalent --out / --format rejection tests are needed
  // because the new CLI surface does not accept those flags for `iterate`.

  it("rejects unsupported --format values for prototyping preflight", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "preflight", "--format", "github"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("accepts --format text|json for guardrails", () => {
    const cwd = process.cwd();
    const json = parseArgs(["guardrails", "check", "--format", "json"], cwd);
    expect(json.invalid).toBe(false);
    expect(json.options.guardrailsFormat).toBe("json");

    const text = parseArgs(["guardrails", "list", "--format", "text"], cwd);
    expect(text.invalid).toBe(false);
    expect(text.options.guardrailsFormat).toBe("text");
  });

  it("rejects unsupported --format values for guardrails", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["guardrails", "check", "--format", "github"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.invalidExitCode).toBe(2);
  });

  it("parses sdd profile for validate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "sdd"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.profile).toBe("sdd");
  });

  it("marks invalid --profile value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "unknown"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("marks removed --phase option as invalid", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--phase", "atdd"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("marks guardrails without action as invalid", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["guardrails", "--path", "18_delta.md"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.invalidExitCode).toBe(2);
  });

  // CHG-006 second-wave flag parsing (spec-0012):
  //   --emit-skeletons / --skeleton-mode / --mode under `prototyping iterate`.

  it("parses --emit-skeletons on prototyping iterate (default-OFF without the flag)", () => {
    const cwd = process.cwd();
    const without = parseArgs(["prototyping", "iterate", "--cycle", "0"], cwd);
    expect(without.invalid).toBe(false);
    expect(without.options.prototypingEmitSkeletons).toBeUndefined();
    const withFlag = parseArgs(["prototyping", "iterate", "--cycle", "0", "--emit-skeletons"], cwd);
    expect(withFlag.invalid).toBe(false);
    expect(withFlag.options.prototypingEmitSkeletons).toBe(true);
  });

  it("parses --skeleton-mode {placeholder|full|stub} and rejects other values", () => {
    const cwd = process.cwd();
    for (const value of ["placeholder", "full", "stub"] as const) {
      const parsed = parseArgs(
        ["prototyping", "iterate", "--cycle", "0", "--skeleton-mode", value],
        cwd,
      );
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.prototypingSkeletonMode).toBe(value);
    }
    const bogus = parseArgs(
      ["prototyping", "iterate", "--cycle", "0", "--skeleton-mode", "bogus"],
      cwd,
    );
    expect(bogus.invalid).toBe(true);
    expect(bogus.options.help).toBe(true);
  });

  it("requires a value for --skeleton-mode", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "0", "--skeleton-mode"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses --mode {convergence|exploration} and rejects other values", () => {
    const cwd = process.cwd();
    for (const value of ["convergence", "exploration"] as const) {
      const parsed = parseArgs(["prototyping", "iterate", "--cycle", "0", "--mode", value], cwd);
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.prototypingMode).toBe(value);
    }
    const bogus = parseArgs(["prototyping", "iterate", "--cycle", "0", "--mode", "feral"], cwd);
    expect(bogus.invalid).toBe(true);
    expect(bogus.options.help).toBe(true);
  });

  it("requires a value for --mode", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "0", "--mode"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses --verbose for init and defaults it off", () => {
    const cwd = process.cwd();
    const withFlag = parseArgs(["init", "--dir", ".", "--verbose"], cwd);
    expect(withFlag.invalid).toBe(false);
    expect(withFlag.options.verbose).toBe(true);

    const without = parseArgs(["init", "--dir", "."], cwd);
    expect(without.invalid).toBe(false);
    expect(without.options.verbose).toBe(false);
  });

  // --verbose is published in the help text as an init-only option, so a
  // misuse must surface rather than be silently dropped: automation that
  // asked for the expanded list would otherwise get a success exit code and
  // no detail.
  it("rejects --verbose on commands other than init", () => {
    const cwd = process.cwd();
    for (const command of ["validate", "doctor", "report"]) {
      const parsed = parseArgs([command, "--verbose"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.help).toBe(true);
      expect(parsed.options.verbose).toBe(false);
    }
  });

  // Pin the unified value-taking-flag contract (see args.ts contract
  // block): when --spec / --scope / --upgrade-scope / --operator /
  // --clause are used on a subcommand that does NOT accept the flag,
  // the parser MUST (1) consume the value token so it cannot leak
  // into the positional stream, AND (2) call markInvalid() so the
  describe("validate --spec", () => {
    it("collects a single --spec value", () => {
      const parsed = parseArgs(["validate", "--spec", "0003"], process.cwd());
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.validateSpecIds).toEqual(["0003"]);
    });

    it("is repeatable and preserves order", () => {
      const parsed = parseArgs(
        ["validate", "--spec", "0003", "--spec", "spec-0004", "--profile", "sdd"],
        process.cwd(),
      );
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.validateSpecIds).toEqual(["0003", "spec-0004"]);
      expect(parsed.options.profile).toBe("sdd");
    });

    it("defaults to an empty scope, which means the whole repo", () => {
      const parsed = parseArgs(["validate"], process.cwd());
      expect(parsed.options.validateSpecIds).toEqual([]);
    });

    it("still marks --spec invalid on a subcommand that does not accept it", () => {
      const parsed = parseArgs(["audit", "log", "--spec", "0003"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.validateSpecIds).toEqual([]);
    });
  });

  // `report` accepts the same flag: the scoping `validate --spec` introduced
  // used to stop at the report boundary, where `markInvalid()` rejected it.
  describe("report --spec", () => {
    it("collects --spec values without marking the parse invalid", () => {
      const parsed = parseArgs(
        ["report", "--spec", "0003", "--spec", "spec-0004", "--format", "json"],
        process.cwd(),
      );
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.reportSpecIds).toEqual(["0003", "spec-0004"]);
      expect(parsed.options.reportFormat).toBe("json");
      // The validate slot must stay untouched — the two scopes are separate.
      expect(parsed.options.validateSpecIds).toEqual([]);
    });

    it("defaults to an empty scope, which means the whole repo", () => {
      const parsed = parseArgs(["report"], process.cwd());
      expect(parsed.options.reportSpecIds).toEqual([]);
    });
  });

  // misuse surfaces as a parse error. Pre-fix, --spec / --operator /
  // --clause silently dropped on misuse, and --upgrade-scope did
  // not consume its value. Per-flag assertions follow.
  describe("misplaced-subcommand value-taking flags: markInvalid + consume value token", () => {
    it("--spec on a non-atdd subcommand marks invalid AND consumes the value token", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["audit", "log", "--spec", "spec-0006", "--format", "json"], cwd);
      expect(parsed.invalid).toBe(true);
      // The "spec-0006" value must NOT have shifted into a positional;
      // --format following it should still be honored.
      expect(parsed.options.auditAction).toBe("log");
      // No atdd spec id should have been recorded.
      expect(parsed.options.atddSpecId).toBeUndefined();
    });

    it("--operator on a non-audit subcommand marks invalid AND consumes the value token", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--operator", "alice", "--format", "github"], cwd);
      expect(parsed.invalid).toBe(true);
      // "alice" must NOT have shifted into a positional, so --format
      // remains parseable downstream.
      expect(parsed.options.validateFormat).toBe("github");
      expect(parsed.options.auditOperator).toBeUndefined();
    });

    it("--clause on a non-audit subcommand marks invalid AND consumes the value token", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["report", "--clause", "skill-envelope", "--format", "json"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.reportFormat).toBe("json");
      expect(parsed.options.auditClause).toBeUndefined();
    });

    it("--scope on a non-audit/non-certify subcommand marks invalid AND consumes the value token", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--scope", "saas-package", "--format", "github"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.validateFormat).toBe("github");
      // Neither audit-scope nor prototyping-scope should be populated.
      expect(parsed.options.auditScope).toBeUndefined();
      expect(parsed.options.prototypingScope).toBeUndefined();
    });

    it("--upgrade-scope on a non-certify subcommand marks invalid AND consumes the value token", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--upgrade-scope", "full", "--format", "github"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.validateFormat).toBe("github");
      expect(parsed.options.prototypingUpgradeScopeFull).toBeUndefined();
    });

    // Adjacent-flag regression probe. If a misplaced value-taking flag
    // skips its `i += 1` (the pre-PR `--upgrade-scope` bug), the next
    // iteration sees the flag's intended value as a token, which can
    // shift downstream flag parsing in subtle ways. With the unified
    // contract, `--upgrade-scope` on a non-certify subcommand always
    // consumes the next token, so a following `--scope full` on an
    // `audit` subcommand still parses to `auditScope === "full"`. A
    // regression that strips the consume would re-process the dangling
    // `full` as a positional and break the chain.
    it("misplaced --upgrade-scope consumes its value before --scope on a chained audit invocation", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(
        ["audit", "log", "--upgrade-scope", "full", "--scope", "deviation"],
        cwd,
      );
      // The misplaced flag is invalid, but the downstream `--scope
      // deviation` (which IS valid for audit) must still populate
      // `auditScope`. With the consume contract this works because
      // the dangling `full` does not interfere with the next iter.
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.auditScope).toBe("deviation");
    });
  });
  // 引数拒否の理由 (invalidReason) は main.ts が stderr に出す診断文。
  // 「どのトークンが拒否されたか」が出力に現れることを固定する。
  describe("invalidReason", () => {
    it("names the flag when a value-taking flag has no value", () => {
      const parsed = parseArgs(["validate", "--format"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toBe("qfai validate: --format requires a value.");
    });

    it("names the flag, the rejected value and the accepted set", () => {
      const parsed = parseArgs(["validate", "--profile", "bogus"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toContain("--profile");
      expect(parsed.invalidReason).toContain('"bogus"');
      expect(parsed.invalidReason).toContain("full");
    });

    it("keeps the first reason when several rejections fire", () => {
      const parsed = parseArgs(["validate", "--format", "--profile"], process.cwd());
      expect(parsed.invalidReason).toBe("qfai validate: --format requires a value.");
    });

    it("reuses the per-family subcommand wording when the subcommand is missing", () => {
      const cwd = process.cwd();
      expect(parseArgs(["audit"], cwd).invalidReason).toBe(
        "qfai audit: unknown or missing subcommand. Expected: log",
      );
      expect(parseArgs(["atdd"], cwd).invalidReason).toBe(
        "qfai atdd: unknown or missing subcommand. Expected: scaffold",
      );
      expect(parseArgs(["handoff"], cwd).invalidReason).toBe(
        "qfai handoff: unknown or missing subcommand. Expected: upgrade",
      );
      expect(parseArgs(["discussion"], cwd).invalidReason).toBe(
        "qfai discussion: unknown or missing subcommand. Expected: list|use",
      );
      expect(parseArgs(["prototyping"], cwd).invalidReason).toBe(
        "qfai prototyping: unknown or missing subcommand. Expected: preflight|iterate|certify|show-spec",
      );
      expect(parseArgs(["guardrails"], cwd).invalidReason).toBe(
        "qfai guardrails: unknown or missing subcommand. Expected: list|extract|check",
      );
    });

    it("quotes the rejected subcommand token", () => {
      const parsed = parseArgs(["prototyping", "bogusaction"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toBe(
        'qfai prototyping: unknown subcommand "bogusaction". Expected: preflight|iterate|certify|show-spec',
      );
    });

    it("reports a flag used on a command that does not accept it", () => {
      // `init` rather than `report`: `report --spec` is a real scoping flag
      // now, so it is no longer an example of this class.
      const parsed = parseArgs(["init", "--spec", "0003"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toBe("qfai init: --spec is not valid for this command.");
    });

    it("leaves invalidReason unset when the arguments parse", () => {
      const parsed = parseArgs(["validate", "--profile", "full"], process.cwd());
      expect(parsed.invalid).toBe(false);
      expect(parsed.invalidReason).toBeUndefined();
    });
  });

  // Unknown-flag handling. Pre-fix the flag switch ended with a bare
  // `default: break;`, so any unrecognized `--token` was silently
  // dropped: `qfai init --dryrun` performed a REAL init and still
  // exited 0. `.qfai/contracts/cli/qfai-init.md` reserves exit 2 for
  // CLI-arg errors, so an unknown flag must markInvalid() with 2.
  describe("unknown flags", () => {
    it("marks an unrecognized --flag invalid and reserves exit 2", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["init", "--bogus-flag", "--dry-run"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.help).toBe(true);
      expect(parsed.options.invalidExitCode).toBe(2);
      expect(parsed.options.unknownFlags).toEqual(["--bogus-flag"]);
    });

    it("does not let a --dry-run typo fall through to a real init", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["init", "--dryrun"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.dryRun).toBe(false);
      expect(parsed.options.invalidExitCode).toBe(2);
      expect(parsed.options.unknownFlags).toEqual(["--dryrun"]);
    });

    it("collects every unknown flag in argv order", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--nope", "--strict", "--also-nope"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.strict).toBe(true);
      expect(parsed.options.unknownFlags).toEqual(["--nope", "--also-nope"]);
    });

    it("keeps positional subcommand arguments exempt", () => {
      const cwd = process.cwd();
      const use = parseArgs(["discussion", "use", "disc-0001"], cwd);
      expect(use.invalid).toBe(false);
      expect(use.options.discussionId).toBe("disc-0001");
      expect(use.options.unknownFlags).toEqual([]);

      const handoff = parseArgs(["handoff", "upgrade", "legacy.md"], cwd);
      expect(handoff.invalid).toBe(false);
      expect(handoff.options.handoffLegacyFile).toBe("legacy.md");
      expect(handoff.options.unknownFlags).toEqual([]);
    });

    it("routes arg errors on non-guardrails commands to exit 2 as well", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--format"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.invalidExitCode).toBe(2);
    });

    // A leading unknown option is consumed by `command = args.shift()`
    // before the flag loop, so it used to reach main.ts's
    // unknown-command branch, which sets no exit code (exit 0).
    it("rejects an unknown option in the command position", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["--bogus"], cwd);
      expect(parsed.command).toBeNull();
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.unknownFlags).toEqual(["--bogus"]);
      expect(parsed.options.invalidExitCode).toBe(2);
    });

    it("still keeps a leading --help/-h a clean help request", () => {
      const cwd = process.cwd();
      for (const token of ["--help", "-h"]) {
        const parsed = parseArgs([token], cwd);
        expect(parsed.command).toBeNull();
        expect(parsed.invalid).toBe(false);
        expect(parsed.options.help).toBe(true);
        expect(parsed.options.unknownFlags).toEqual([]);
      }
    });

    it("collects a leading unknown option together with later ones", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["--bogus", "--also-bogus"], cwd);
      expect(parsed.command).toBeNull();
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.unknownFlags).toEqual(["--bogus", "--also-bogus"]);
    });
  });

  // Contract rule 2 extended to the whole switch: a command-specific
  // flag used on a command that does not own it must markInvalid()
  // instead of being silently dropped, and value-taking flags must
  // still consume their value token on the reject path.
  describe("cross-command flag ownership", () => {
    type Options = ParsedArgs["options"];

    const valueTakingCases: {
      flag: string;
      value: string;
      wrongCommand: string[];
      probe: (options: Options) => void;
      untouched: (options: Options) => void;
    }[] = [
      {
        flag: "--in",
        value: "validate.json",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.reportIn).toBeUndefined(),
      },
      {
        flag: "--base-url",
        value: "https://example.com/",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.reportBaseUrl).toBeUndefined(),
      },
      {
        flag: "--path",
        value: "18_delta.md",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.guardrailsPaths).toEqual([]),
      },
      {
        flag: "--max",
        value: "12",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.guardrailsMax).toBeUndefined(),
      },
      {
        flag: "--keyword",
        value: "layout",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.guardrailsKeyword).toBeUndefined(),
      },
      {
        flag: "--platform",
        value: "web",
        wrongCommand: ["report"],
        probe: (o) => expect(o.reportFormat).toBe("json"),
        untouched: (o) => expect(o.platform).toBeUndefined(),
      },
      {
        flag: "--target-url",
        value: "https://example.com/",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingTargetUrl).toBeUndefined(),
      },
      {
        flag: "--cycle",
        value: "5",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingCycle).toBeUndefined(),
      },
      {
        flag: "--license-patch",
        value: "patch.json",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingLicensePatch).toBeUndefined(),
      },
      {
        flag: "--primary-spec-id",
        value: "spec-0001",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingPrimarySpecId).toBeUndefined(),
      },
      {
        flag: "--skeleton-mode",
        value: "stub",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingSkeletonMode).toBeUndefined(),
      },
      {
        flag: "--mode",
        value: "exploration",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingMode).toBeUndefined(),
      },
    ];

    it.each(valueTakingCases)(
      "$flag on a non-owning command marks invalid AND consumes the value token",
      ({ flag, value, wrongCommand, probe, untouched }) => {
        const cwd = process.cwd();
        const formatValue = wrongCommand[0] === "report" ? "json" : "github";
        const parsed = parseArgs([...wrongCommand, flag, value, "--format", formatValue], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.help).toBe(true);
        untouched(parsed.options);
        // The dangling value must not have shifted into the positional
        // stream: the trailing --format is still honored.
        probe(parsed.options);
      },
    );

    const booleanCases: { flag: string; untouched: (options: Options) => void }[] = [
      { flag: "--run-validate", untouched: (o) => expect(o.reportRunValidate).toBe(false) },
      { flag: "--check", untouched: (o) => expect(o.prototypingCheckOnly).toBeUndefined() },
      {
        flag: "--check-convergence",
        untouched: (o) => expect(o.prototypingCheckConvergence).toBeUndefined(),
      },
      { flag: "--capture", untouched: (o) => expect(o.prototypingCapture).toBeUndefined() },
      { flag: "--auto-serve", untouched: (o) => expect(o.prototypingAutoServe).toBeUndefined() },
      {
        flag: "--emit-skeletons",
        untouched: (o) => expect(o.prototypingEmitSkeletons).toBeUndefined(),
      },
      { flag: "--active", untouched: (o) => expect(o.discussionActive).toBeUndefined() },
      { flag: "--clean", untouched: (o) => expect(o.doctorClean).toBeUndefined() },
      { flag: "--autoremediate", untouched: (o) => expect(o.doctorAutoremediate).toBeUndefined() },
    ];

    it.each(booleanCases)(
      "$flag on a non-owning command marks invalid instead of being dropped",
      ({ flag, untouched }) => {
        const cwd = process.cwd();
        const parsed = parseArgs(["validate", flag, "--format", "github"], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.help).toBe(true);
        expect(parsed.options.validateFormat).toBe("github");
        untouched(parsed.options);
      },
    );

    it("rejects prototyping flags used on the wrong prototyping subcommand", () => {
      const cwd = process.cwd();
      const capture = parseArgs(["prototyping", "certify", "--capture"], cwd);
      expect(capture.invalid).toBe(true);
      expect(capture.options.prototypingCapture).toBeUndefined();

      const cycle = parseArgs(["prototyping", "preflight", "--cycle", "3"], cwd);
      expect(cycle.invalid).toBe(true);
      expect(cycle.options.prototypingCycle).toBeUndefined();

      const check = parseArgs(["prototyping", "iterate", "--cycle", "0", "--check"], cwd);
      expect(check.invalid).toBe(true);
      expect(check.options.prototypingCheckOnly).toBeUndefined();
    });

    it("rejects guardrails flags used on a non-owning guardrails action", () => {
      const cwd = process.cwd();

      // runGuardrails reads `max` only on the extract path.
      const listMax = parseArgs(["guardrails", "list", "--max", "0"], cwd);
      expect(listMax.invalid).toBe(true);
      expect(listMax.options.guardrailsMax).toBeUndefined();

      // `check` returns before the keyword filter is applied.
      const checkKeyword = parseArgs(["guardrails", "check", "--keyword", "foo"], cwd);
      expect(checkKeyword.invalid).toBe(true);
      expect(checkKeyword.options.guardrailsKeyword).toBeUndefined();

      const extractMax = parseArgs(["guardrails", "extract", "--max", "0"], cwd);
      expect(extractMax.invalid).toBe(false);
      expect(extractMax.options.guardrailsMax).toBe(0);

      const listKeyword = parseArgs(["guardrails", "list", "--keyword", "foo"], cwd);
      expect(listKeyword.invalid).toBe(false);
      expect(listKeyword.options.guardrailsKeyword).toBe("foo");
    });

    it("accepts --active only on `discussion list`", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["discussion", "use", "discussion-1", "--active"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.discussionActive).toBeUndefined();
      expect(parsed.options.discussionId).toBe("discussion-1");
    });

    it("accepts doctor --target-url only with the built-in prototyping profile", () => {
      const cwd = process.cwd();

      const bare = parseArgs(["doctor", "--target-url", "https://x/"], cwd);
      expect(bare.invalid).toBe(true);

      // A skill profile does not run the targetUrl probe either.
      const skillProfile = parseArgs(
        ["doctor", "--profile", "qfai-sdd", "--target-url", "https://x/"],
        cwd,
      );
      expect(skillProfile.invalid).toBe(true);

      // The pairing is judged after the loop, so `--profile` may follow.
      const trailingProfile = parseArgs(
        ["doctor", "--target-url", "https://x/", "--profile", "prototyping"],
        cwd,
      );
      expect(trailingProfile.invalid).toBe(false);
      expect(trailingProfile.options.prototypingTargetUrl).toBe("https://x/");
    });

    it("rejects --strict / --fail-on on commands that never read them", () => {
      const cwd = process.cwd();

      const reportStrict = parseArgs(["report", "--strict"], cwd);
      expect(reportStrict.invalid).toBe(true);
      expect(reportStrict.options.strict).toBe(false);

      const reportFailOn = parseArgs(["report", "--fail-on", "warning", "--format", "json"], cwd);
      expect(reportFailOn.invalid).toBe(true);
      expect(reportFailOn.options.failOn).toBeUndefined();
      expect(reportFailOn.options.reportFormat).toBe("json");

      const validateStrict = parseArgs(["validate", "--strict", "--fail-on", "warning"], cwd);
      expect(validateStrict.invalid).toBe(false);
      expect(validateStrict.options.strict).toBe(true);
      expect(validateStrict.options.failOn).toBe("warning");

      const preflight = parseArgs(["prototyping", "preflight", "--fail-on", "error"], cwd);
      expect(preflight.invalid).toBe(false);
      expect(preflight.options.failOn).toBe("error");

      const doctorFailOn = parseArgs(["doctor", "--fail-on", "warning"], cwd);
      expect(doctorFailOn.invalid).toBe(false);
      expect(doctorFailOn.options.failOn).toBe("warning");

      // `prototyping iterate` does not thread failOn into its runner.
      const iterateFailOn = parseArgs(
        ["prototyping", "iterate", "--cycle", "0", "--fail-on", "warning"],
        cwd,
      );
      expect(iterateFailOn.invalid).toBe(true);
      expect(iterateFailOn.options.failOn).toBeUndefined();
    });

    it("keeps every guarded flag valid on its owning command", () => {
      const cwd = process.cwd();

      const report = parseArgs(
        ["report", "--in", "validate.json", "--run-validate", "--base-url", "https://x/"],
        cwd,
      );
      expect(report.invalid).toBe(false);
      expect(report.options.reportIn).toBe("validate.json");
      expect(report.options.reportRunValidate).toBe(true);
      expect(report.options.reportBaseUrl).toBe("https://x/");

      const iterate = parseArgs(
        [
          "prototyping",
          "iterate",
          "--cycle",
          "0",
          "--target-url",
          "https://x/",
          "--capture",
          "--auto-serve",
          "--check-convergence",
          "--emit-skeletons",
          "--skeleton-mode",
          "stub",
          "--mode",
          "exploration",
          "--license-patch",
          "patch.json",
          "--primary-spec-id",
          "spec-0001",
        ],
        cwd,
      );
      expect(iterate.invalid).toBe(false);
      expect(iterate.options.prototypingCycle).toBe(0);
      expect(iterate.options.prototypingCapture).toBe(true);
      expect(iterate.options.prototypingAutoServe).toBe(true);
      expect(iterate.options.prototypingCheckConvergence).toBe(true);
      expect(iterate.options.prototypingEmitSkeletons).toBe(true);
      expect(iterate.options.prototypingSkeletonMode).toBe("stub");
      expect(iterate.options.prototypingMode).toBe("exploration");
      expect(iterate.options.prototypingLicensePatch).toBe("patch.json");
      expect(iterate.options.prototypingPrimarySpecId).toBe("spec-0001");
      expect(iterate.options.prototypingTargetUrl).toBe("https://x/");

      const certify = parseArgs(["prototyping", "certify", "--check"], cwd);
      expect(certify.invalid).toBe(false);
      expect(certify.options.prototypingCheckOnly).toBe(true);

      // `doctor --profile prototyping` shares the targetUrl probe, so
      // --target-url stays valid there alongside doctor's own flags.
      const doctor = parseArgs(
        ["doctor", "--profile", "prototyping", "--target-url", "https://x/", "--clean"],
        cwd,
      );
      expect(doctor.invalid).toBe(false);
      expect(doctor.options.prototypingTargetUrl).toBe("https://x/");
      expect(doctor.options.doctorClean).toBe(true);

      const discussion = parseArgs(["discussion", "list", "--active"], cwd);
      expect(discussion.invalid).toBe(false);
      expect(discussion.options.discussionActive).toBe(true);

      const validate = parseArgs(["validate", "--platform", "web"], cwd);
      expect(validate.invalid).toBe(false);
      expect(validate.options.platform).toBe("web");
    });
  });

  // The contract block in args.ts claims to govern EVERY value-taking
  // arm of the flag switch. These cases pin the arms that used to opt
  // out of it: the command-guarded four (`--path` / `--max` /
  // `--keyword` / `--platform`, which returned before `i += 1` and so
  // left the value token unconsumed) and the eight that carried no
  // guard at all and were therefore accepted on any command.
  describe("command-scoped value-taking flags: markInvalid + consume value token", () => {
    const cwd = process.cwd();

    it("--path / --max / --keyword outside guardrails mark invalid AND consume the value", () => {
      for (const [flag, value] of [
        ["--path", "18_delta.md"],
        ["--max", "12"],
        ["--keyword", "layout"],
      ] as const) {
        const parsed = parseArgs(["validate", flag, value, "--format", "github"], cwd);
        expect(parsed.invalid).toBe(true);
        // The value must NOT have shifted into a positional, so the
        // trailing --format is still honored.
        expect(parsed.options.validateFormat).toBe("github");
        expect(parsed.options.guardrailsPaths).toEqual([]);
        expect(parsed.options.guardrailsMax).toBeUndefined();
        expect(parsed.options.guardrailsKeyword).toBeUndefined();
      }
    });

    it("a misplaced --path consumes its value before a downstream audit --scope", () => {
      const parsed = parseArgs(
        ["audit", "log", "--path", "README.md", "--scope", "deviation"],
        cwd,
      );
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.auditScope).toBe("deviation");
    });

    it("--platform outside validate marks invalid AND consumes the value", () => {
      const parsed = parseArgs(["report", "--platform", "linux", "--format", "json"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.platform).toBeUndefined();
      expect(parsed.options.reportFormat).toBe("json");
    });

    it("--in / --base-url outside report mark invalid AND consume the value", () => {
      for (const flag of ["--in", "--base-url"] as const) {
        const parsed = parseArgs(["validate", flag, "value", "--format", "github"], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.reportIn).toBeUndefined();
        expect(parsed.options.reportBaseUrl).toBeUndefined();
        expect(parsed.options.validateFormat).toBe("github");
      }
    });

    it("--target-url is accepted on doctor, prototyping preflight and prototyping iterate", () => {
      const doctor = parseArgs(
        ["doctor", "--profile", "prototyping", "--target-url", "http://127.0.0.1:9"],
        cwd,
      );
      expect(doctor.invalid).toBe(false);
      expect(doctor.options.prototypingTargetUrl).toBe("http://127.0.0.1:9");

      const preflight = parseArgs(
        ["prototyping", "preflight", "--target-url", "http://127.0.0.1:9"],
        cwd,
      );
      expect(preflight.invalid).toBe(false);
      expect(preflight.options.prototypingTargetUrl).toBe("http://127.0.0.1:9");

      const iterate = parseArgs(
        ["prototyping", "iterate", "--cycle", "0", "--target-url", "http://127.0.0.1:9"],
        cwd,
      );
      expect(iterate.invalid).toBe(false);
      expect(iterate.options.prototypingTargetUrl).toBe("http://127.0.0.1:9");
    });

    it("--target-url elsewhere marks invalid AND consumes the value", () => {
      const parsed = parseArgs(
        ["validate", "--target-url", "http://127.0.0.1:9", "--format", "github"],
        cwd,
      );
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.prototypingTargetUrl).toBeUndefined();
      expect(parsed.options.validateFormat).toBe("github");
    });

    it("iterate-only value flags outside `prototyping iterate` mark invalid AND consume the value", () => {
      for (const [flag, value] of [
        ["--cycle", "5"],
        ["--license-patch", "patch.json"],
        ["--primary-spec-id", "0003"],
        ["--skeleton-mode", "stub"],
        ["--mode", "exploration"],
      ] as const) {
        const parsed = parseArgs(["validate", flag, value, "--format", "github"], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.validateFormat).toBe("github");
        expect(parsed.options.prototypingCycle).toBeUndefined();
        expect(parsed.options.prototypingLicensePatch).toBeUndefined();
        expect(parsed.options.prototypingPrimarySpecId).toBeUndefined();
        expect(parsed.options.prototypingSkeletonMode).toBeUndefined();
        expect(parsed.options.prototypingMode).toBeUndefined();

        // Same flag on a sibling prototyping subcommand is equally invalid.
        const sibling = parseArgs(["prototyping", "certify", flag, value], cwd);
        expect(sibling.invalid).toBe(true);
      }
    });
  });
});

describe("parseArgs --version", () => {
  it("treats --version in the command position as a version request", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["--version"], cwd);
    expect(parsed.command).toBeNull();
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.version).toBe(true);
    expect(parsed.options.help).toBe(false);
  });

  it("treats -V in the command position as a version request", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["-V"], cwd);
    expect(parsed.command).toBeNull();
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.version).toBe(true);
  });

  it("accepts --version as a trailing flag without marking the args invalid", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--version"], cwd);
    expect(parsed.command).toBe("validate");
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.version).toBe(true);
  });

  it("leaves version false when no version flag is present", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate"], cwd);
    expect(parsed.options.version).toBe(false);
  });

  // The subcommand scan runs before the flag loop and only skipped `--`
  // tokens, so a short flag was shifted away as an unknown action: the long
  // form worked on these commands and the short one printed help.
  for (const command of [
    "prototyping",
    "guardrails",
    "audit",
    "handoff",
    "atdd",
    "discussion",
  ] as const) {
    for (const flag of ["--version", "-V"] as const) {
      it(`sets version for \`qfai ${command} ${flag}\``, () => {
        const parsed = parseArgs([command, flag], process.cwd());
        expect(parsed.options.version).toBe(true);
      });
    }
  }

  it("does not read a short flag as the handoff upgrade legacy file", () => {
    const parsed = parseArgs(["handoff", "upgrade", "-V"], process.cwd());
    expect(parsed.options.handoffAction).toBe("upgrade");
    expect(parsed.options.handoffLegacyFile).toBeUndefined();
    expect(parsed.options.version).toBe(true);
  });

  it("does not read a short flag as the discussion use id", () => {
    const parsed = parseArgs(["discussion", "use", "-V"], process.cwd());
    expect(parsed.options.discussionAction).toBe("use");
    expect(parsed.options.discussionId).toBeUndefined();
    expect(parsed.options.version).toBe(true);
  });

  it("still rejects an unknown subcommand name", () => {
    // Skipping dash-prefixed tokens must not skip a real typo: the post-loop
    // "action required" guard still has to fire.
    const parsed = parseArgs(["prototyping", "itrate"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.prototypingAction).toBeUndefined();
  });

  it("still requires a subcommand when only flags follow", () => {
    const parsed = parseArgs(["prototyping", "--root", "."], process.cwd());
    expect(parsed.invalid).toBe(true);
  });
});

describe("parseArgs dash-leading positionals", () => {
  // A subcommand name is a closed set and never starts with `-`, but the
  // positional after it is caller data: a relative path may legitimately begin
  // with a single `-`. Excluding every dash-prefixed token from both positions
  // stopped `qfai handoff upgrade -legacy.yaml` from converting anything —
  // the file was left unread and the command died on `<legacy-file> is
  // required.`
  it("accepts a legacy file whose name starts with a dash", () => {
    const parsed = parseArgs(["handoff", "upgrade", "-legacy.yaml"], process.cwd());
    expect(parsed.options.handoffAction).toBe("upgrade");
    expect(parsed.options.handoffLegacyFile).toBe("-legacy.yaml");
    expect(parsed.invalid).toBe(false);
  });

  it("accepts a legacy file that starts with a dash alongside a trailing flag", () => {
    const parsed = parseArgs(
      ["handoff", "upgrade", "-legacy.yaml", "--root", "/tmp/example"],
      process.cwd(),
    );
    expect(parsed.options.handoffLegacyFile).toBe("-legacy.yaml");
    expect(parsed.options.root).toBe("/tmp/example");
    expect(parsed.invalid).toBe(false);
  });

  it("accepts a discussion id that starts with a dash", () => {
    const parsed = parseArgs(["discussion", "use", "-discussion-0001"], process.cwd());
    expect(parsed.options.discussionAction).toBe("use");
    expect(parsed.options.discussionId).toBe("-discussion-0001");
    expect(parsed.invalid).toBe(false);
  });

  // Over-correction pins: relaxing the positional must not re-admit the two
  // short flags the parser reserves, nor any long flag.
  it("keeps -h out of the handoff upgrade legacy file", () => {
    const parsed = parseArgs(["handoff", "upgrade", "-h"], process.cwd());
    expect(parsed.options.handoffLegacyFile).toBeUndefined();
    expect(parsed.options.help).toBe(true);
  });

  it("keeps a long flag out of the handoff upgrade legacy file", () => {
    const parsed = parseArgs(["handoff", "upgrade", "--root", "/tmp/example"], process.cwd());
    expect(parsed.options.handoffLegacyFile).toBeUndefined();
    expect(parsed.options.root).toBe("/tmp/example");
  });

  it("keeps -h out of the discussion use id", () => {
    const parsed = parseArgs(["discussion", "use", "-h"], process.cwd());
    expect(parsed.options.discussionId).toBeUndefined();
    expect(parsed.options.help).toBe(true);
  });

  it("still refuses a dash-leading token in the subcommand position", () => {
    const parsed = parseArgs(["handoff", "-legacy.yaml"], process.cwd());
    expect(parsed.options.handoffAction).toBeUndefined();
    expect(parsed.options.handoffLegacyFile).toBeUndefined();
    expect(parsed.invalid).toBe(true);
  });
});
