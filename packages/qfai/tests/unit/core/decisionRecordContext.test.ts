/**
 * Unit: decisionRecord context detection (boundary).
 *
 * - TC-0015-0023: an `AskUserQuestion` whose `envelopeContractClause`
 *   names NONE of the four envelope-deviation contexts MUST NOT write
 *   a decision record (no fail-open false-positive).
 *
 * The detector keys on a fixed four-context taxonomy per DR-0270:
 *   - skill-envelope
 *   - architectural-decision
 *   - rejected-option (re-adoption)
 *   - scope-expansion
 */
// QFAI:SPEC-0015:TC-0015-0023

import { describe, expect, it } from "vitest";

import {
  ENVELOPE_DEVIATION_CONTEXTS,
  isEnvelopeDeviationContext,
} from "../../../src/core/decisionRecord.js";

describe("TC-0015-0023: isEnvelopeDeviationContext rejects non-envelope strings", () => {
  it("recognizes the canonical 4 envelope-deviation contexts", () => {
    expect(isEnvelopeDeviationContext("skill-envelope")).toBe(true);
    expect(isEnvelopeDeviationContext("architectural-decision")).toBe(true);
    expect(isEnvelopeDeviationContext("rejected-option")).toBe(true);
    expect(isEnvelopeDeviationContext("scope-expansion")).toBe(true);
  });

  it("recognizes the 4 contexts via substring (e.g. 'rejected-option re-adoption')", () => {
    expect(isEnvelopeDeviationContext("rejected-option re-adoption")).toBe(true);
    expect(isEnvelopeDeviationContext("envelope contract / skill-envelope deviation")).toBe(true);
  });

  it("rejects non-envelope contexts (no fail-open)", () => {
    expect(isEnvelopeDeviationContext("routine-question")).toBe(false);
    expect(isEnvelopeDeviationContext("formatting choice")).toBe(false);
    expect(isEnvelopeDeviationContext("")).toBe(false);
    expect(isEnvelopeDeviationContext("decision")).toBe(false);
    expect(isEnvelopeDeviationContext(undefined)).toBe(false);
  });

  it("exports the canonical 4-context list", () => {
    expect(ENVELOPE_DEVIATION_CONTEXTS.length).toBe(4);
    expect(ENVELOPE_DEVIATION_CONTEXTS).toEqual([
      "skill-envelope",
      "architectural-decision",
      "rejected-option",
      "scope-expansion",
    ]);
  });
});
