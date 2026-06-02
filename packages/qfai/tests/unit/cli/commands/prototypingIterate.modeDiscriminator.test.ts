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

import { describe, expect, it } from "vitest";

import {
  EXPLORATION_RELAXABLE_CODES,
  EXPLORATION_HARD_ERROR_CODES,
  relaxIssuesForMode,
  resolvePrototypingMode,
} from "../../../../src/core/prototyping/mode.js";
import type { Issue } from "../../../../src/core/types.js";

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
});
