/**
 * Unit: `prototyping.mode` config key + `--mode` CLI override + medium
 * gate-relaxation.
 *
 * - TC-0012-0475: `--mode exploration` overrides config; absence of
 *   both defaults to `convergence`. `prototyping.json#mode` records
 *   the per-iteration mode. Under exploration `QFAI-CRIT-008` and the
 *   design-compliance error downgrade error → warning while schema /
 *   path / license (exit 66) gates stay hard error (DR-0263 medium).
 *
 * The discriminator lives in `core/prototyping/mode.ts`
 * (`resolvePrototypingMode` + `relaxIssuesForMode`).
 */
// QFAI:SPEC-0012:TC-0012-0475

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  EXPLORATION_RELAXABLE_CODES,
  EXPLORATION_HARD_ERROR_CODES,
  relaxIssuesForMode,
  resolvePrototypingMode,
} from "../../../../src/core/prototyping/mode.js";
import type { Issue } from "../../../../src/core/types.js";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root would resolve `src/core/validators` to a path that does not exist
// and the emitter scan below would then pass vacuously.
// tests/unit/cli/commands/<this file> -> packages/qfai
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const validatorsRoot = path.join(packageRoot, "src", "core", "validators");

/**
 * The prototyping structural-validator family: the exact source surface
 * `EXPLORATION_HARD_ERROR_CODES` claims to enumerate. Keep in sync with the
 * JSDoc on that constant.
 */
const PROTOTYPING_FAMILY = [
  path.join(validatorsRoot, "prototypingEvidence.ts"),
  path.join(validatorsRoot, "prototyping"),
];

/** Shape of a rule code, used to ignore non-code string literals. */
const RULE_CODE = /^[A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+$/;

/** `const NAME = "literal";` — so `issue(FINDING_CODE, ...)` resolves too. */
const CONST_STRING = /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]*)?=\s*(["'])([^"'\n]*)\2\s*;/g;

const SEVERITIES = new Set(["error", "warning", "info"]);

/** code -> every severity it is emitted at across the scanned sources. */
type Emissions = ReadonlyMap<string, ReadonlySet<string>>;

async function walkTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

/** Expand a mixed list of `.ts` files and directories into a file list. */
async function expandTsTargets(targets: readonly string[]): Promise<string[]> {
  const files: string[] = [];
  for (const target of targets) {
    files.push(...(target.endsWith(".ts") ? [target] : await walkTsFiles(target)));
  }
  return files;
}

/**
 * Split the top-level, comma-separated arguments of the call whose `(` sits at
 * `open`. Quote/template/bracket aware, so a message containing `, "error",`
 * or a `${JSON.stringify(x)}` hole cannot be mistaken for an argument break.
 */
function splitCallArgs(source: string, open: number): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (quote !== null) {
      current += ch;
      if (ch === "\\") {
        current += source[i + 1] ?? "";
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      current += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      if (depth > 1) current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        args.push(current);
        return args;
      }
      current += ch;
    } else if (ch === "," && depth === 1) {
      args.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  return args;
}

/** Resolve an argument expression to a string literal, following `const` aliases. */
function resolveLiteral(expr: string | undefined, consts: ReadonlyMap<string, string>): string {
  const trimmed = (expr ?? "").trim();
  const quoted = /^(["'])([^"'\n]*)\1$/.exec(trimmed);
  return quoted?.[2] ?? consts.get(trimmed) ?? "";
}

/** Comments blanked out, so a code merely NAMED in prose never counts as emitted. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");
}

/**
 * Every `issue(<code>, <message>, <severity>, ...)` emission in the given
 * validator sources, keyed by code. Reading the SEVERITY (not merely the
 * presence of the string) is what lets the hard-error list be checked for
 * completeness instead of for plausibility. `mode.ts` is deliberately outside
 * every scanned tree: it is the declaration under test, and letting it back its
 * own entries is exactly the vacuity this guards against.
 */
async function collectIssueEmissions(targets: readonly string[]): Promise<Emissions> {
  const files = await expandTsTargets(targets);
  expect(files.length).toBeGreaterThan(0);
  const emissions = new Map<string, Set<string>>();
  for (const file of files) {
    const source = stripComments(await readFile(file, "utf-8"));
    const consts = new Map<string, string>(
      [...source.matchAll(CONST_STRING)].map((m) => [m[1] ?? "", m[3] ?? ""]),
    );
    for (const call of source.matchAll(/\bissue\s*\(/g)) {
      const args = splitCallArgs(source, call.index + call[0].length - 1);
      const code = resolveLiteral(args[0], consts);
      const severity = resolveLiteral(args[2], consts);
      if (!RULE_CODE.test(code) || !SEVERITIES.has(severity)) continue;
      const seen = emissions.get(code) ?? new Set<string>();
      seen.add(severity);
      emissions.set(code, seen);
    }
  }
  return emissions;
}

function codesEmittedAtError(emissions: Emissions): string[] {
  return [...emissions.entries()]
    .filter(([, severities]) => severities.has("error"))
    .map(([code]) => code)
    .sort();
}

describe("TC-0012-0475: prototyping mode discriminator + CLI override", () => {
  it("defaults to convergence when neither CLI nor config is set", () => {
    const mode = resolvePrototypingMode({ cli: undefined, config: undefined });
    expect(mode).toBe("convergence");
  });

  it("CLI override beats config", () => {
    const mode = resolvePrototypingMode({ cli: "exploration", config: "convergence" });
    expect(mode).toBe("exploration");
  });

  it("config is honoured when CLI is absent", () => {
    const mode = resolvePrototypingMode({ cli: undefined, config: "exploration" });
    expect(mode).toBe("exploration");
  });

  it("invalid CLI / config values fall back to convergence", () => {
    // Defensive: a typoed value must not silently relax gates.
    const mode = resolvePrototypingMode({ cli: "nope", config: "also-nope" });
    expect(mode).toBe("convergence");
  });
});

describe("TC-0012-0475: exploration medium gate-relaxation downgrades soft gates only", () => {
  const baseIssue: Issue = {
    code: "QFAI-CRIT-008",
    severity: "error",
    category: "canonical",
    message: "iter loop not completed",
    rule: "renderCritique.loopNotCompleted",
  };

  it("downgrades QFAI-CRIT-008 under exploration", () => {
    const out = relaxIssuesForMode([baseIssue], "exploration");
    const found = out.find((i) => i.code === "QFAI-CRIT-008");
    expect(found?.severity).toBe("warning");
  });

  it("preserves QFAI-CRIT-008 severity under convergence", () => {
    const out = relaxIssuesForMode([baseIssue], "convergence");
    const found = out.find((i) => i.code === "QFAI-CRIT-008");
    expect(found?.severity).toBe("error");
  });

  it("downgrades design-compliance issues under exploration but keeps schema/path/license hard error", () => {
    const issues: Issue[] = [
      {
        code: "QFAI-DCON-030",
        severity: "error",
        category: "canonical",
        message: "design contract drift",
        rule: "designContractReadiness.drift",
      },
      // Hard-error class: schema / path / license MUST stay error
      // (exit 66 contract).
      {
        code: "QFAI-PROT-002",
        severity: "error",
        category: "canonical",
        message: "schema missing required field",
        rule: "prototypingEvidence.schema",
      },
    ];
    const out = relaxIssuesForMode(issues, "exploration");
    expect(out.find((i) => i.code === "QFAI-DCON-030")?.severity).toBe("warning");
    expect(out.find((i) => i.code === "QFAI-PROT-002")?.severity).toBe("error");
  });

  it("EXPLORATION_RELAXABLE_CODES and EXPLORATION_HARD_ERROR_CODES are disjoint", () => {
    const relaxable = new Set(EXPLORATION_RELAXABLE_CODES);
    for (const hard of EXPLORATION_HARD_ERROR_CODES) {
      expect(relaxable.has(hard)).toBe(false);
    }
  });

  // Set EQUALITY, not membership. Membership alone leaves the disjointness
  // check above vacuous: a subset list lets a real hard gate (say
  // QFAI-PROT-001) be moved into EXPLORATION_RELAXABLE_CODES with every test
  // still green, because the code it would have collided with was never
  // listed. Equality closes both directions — an unlisted error emitter fails
  // here, and a listed one cannot be quietly dropped to make room for a
  // relaxation.
  it("EXPLORATION_HARD_ERROR_CODES is exactly the prototyping family's error emitters", async () => {
    const derived = codesEmittedAtError(await collectIssueEmissions(PROTOTYPING_FAMILY));
    expect(derived).toEqual([...EXPLORATION_HARD_ERROR_CODES].sort());
  });

  it("QFAI-PROT-010 stays out of the hard list because it is emitted as a warning", async () => {
    const emissions = await collectIssueEmissions(PROTOTYPING_FAMILY);
    expect([...(emissions.get("QFAI-PROT-010") ?? [])]).toEqual(["warning"]);
    expect(EXPLORATION_HARD_ERROR_CODES).not.toContain("QFAI-PROT-010");
  });

  it("every EXPLORATION_RELAXABLE_CODES entry is emitted at error severity", async () => {
    // A code no validator emits as an error has nothing to downgrade: the
    // relaxation would be a no-op dressed up as a policy.
    const emissions = await collectIssueEmissions([validatorsRoot]);
    for (const code of EXPLORATION_RELAXABLE_CODES) {
      expect(
        emissions.get(code)?.has("error") ?? false,
        `${code} is in the relaxable allowlist but no validator emits it as an error`,
      ).toBe(true);
    }
  });
});
