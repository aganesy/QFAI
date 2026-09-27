/**
 * Integration: Stage 0 output is reused inside a run only on an equal recomputed key.
 *
 * Reads `## Stage 0` of the shipped operating baseline, the one place every stage skill takes its
 * Stage 0 rules from.
 */
// QFAI:SPEC-0001:TC-0001-0025
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-operating-baseline.md";

describe("Stage 0 reuse inside a run", () => {
  it("TC-0001-0025: Stage 0 output is reused inside a run only on an equal recomputed key", async () => {
    const stage0 = flat(sectionOf(await readShipped(BASELINE), "## Stage 0"));
    expect(stage0, "the section exists").not.toBe("");

    expect(stage0).toMatch(
      /inside an active workflow run, a stage reuses the Stage 0 output an earlier stage wrote only when the key recorded with it, recomputed, is equal/i,
    );
    expect(stage0).toMatch(/refresh only what changed/i);
    for (const part of [
      /tool, policy and skill hashes/i,
      /input file hashes/i,
      /glob membership/i,
      /capability state/i,
    ]) {
      expect(stage0, `the key covers ${part.source}`).toMatch(part);
    }
    expect(stage0).toMatch(/no stage-specific check is served from (?:that|the) output/i);
    expect(stage0).toMatch(/layer decision/i);
    expect(stage0).toMatch(/ledger check/i);
    expect(stage0).toMatch(/outside a run, Stage 0 is unchanged/i);
  });
});
