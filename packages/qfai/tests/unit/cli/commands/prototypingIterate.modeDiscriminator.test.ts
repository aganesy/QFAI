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

/** Shape of a rule code, used to ignore non-code string literals. */
const RULE_CODE = /^[A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+$/;

/** Any double-quoted string literal. */
const STRING_LITERAL = /"([^"\n]+)"/g;

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

/**
 * Every rule code appearing as a string literal in a validator module, with
 * comments blanked out so a code merely NAMED in prose does not count as
 * emitted. `mode.ts` is deliberately outside the scanned tree: it is the
 * declaration under test, and letting it back its own entries is exactly the
 * vacuity this guards against.
 */
async function collectEmittedCodes(): Promise<Set<string>> {
  const files = await walkTsFiles(validatorsRoot);
  expect(files.length).toBeGreaterThan(0);
  const codes = new Set<string>();
  for (const file of files) {
    const source = (await readFile(file, "utf-8"))
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");
    for (const match of source.matchAll(STRING_LITERAL)) {
      const value = match[1];
      if (value !== undefined && RULE_CODE.test(value)) codes.add(value);
    }
  }
  return codes;
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

  // Without this the disjointness check above is vacuous for any entry no
  // emitter produces: a placeholder string can never appear in the relaxable
  // set, so it can never fail, and a refactor that DID make the real gate
  // relaxable would still leave the test green.
  it("every EXPLORATION_HARD_ERROR_CODES entry is a code a validator actually emits", async () => {
    const emitted = await collectEmittedCodes();
    for (const hard of EXPLORATION_HARD_ERROR_CODES) {
      expect(
        emitted.has(hard),
        `${hard} is in the hard-error allowlist but no validator emits it`,
      ).toBe(true);
    }
  });

  it("every EXPLORATION_RELAXABLE_CODES entry is a code a validator actually emits", async () => {
    const emitted = await collectEmittedCodes();
    for (const code of EXPLORATION_RELAXABLE_CODES) {
      expect(
        emitted.has(code),
        `${code} is in the relaxable allowlist but no validator emits it`,
      ).toBe(true);
    }
  });
});
