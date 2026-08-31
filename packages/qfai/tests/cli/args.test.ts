import { describe, expect, it } from "vitest";

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
});
