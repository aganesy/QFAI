import { describe, expect, it } from "vitest";

import { buildAbsorptionPlan } from "../../../src/core/prototyping/absorptionBuilder.js";
import { parseCandidateIds } from "../../../src/core/prototyping/candidate.js";
import { buildHarvestRecord } from "../../../src/core/prototyping/harvestBuilder.js";

describe("spec-0018 harvest builder", () => {
  it("derives the target round and preserves harvested elements", () => {
    const harvest = buildHarvestRecord({
      fromRound: "r5",
      allCandidatesConsidered: parseCandidateIds(["c1", "c2", "c3", "c4", "c5"]),
      harvestedElements: [
        {
          harvestId: "h1",
          sourceCandidateId: "c2",
          sourceStrengthId: "s7",
          category: "navigation",
          description: "Pinned nav",
          rationale: "Worth keeping",
          evidenceRefs: ["ref"],
        },
      ],
    });

    expect(harvest.toRound).toBe("r3");
    expect(harvest.harvestedElements[0]?.harvestId).toBe("h1");
  });
});

describe("spec-0018 absorption builder", () => {
  it("pre-enumerates all harvest ids under rejected for each survivor", () => {
    const harvest = buildHarvestRecord({
      fromRound: "r5",
      allCandidatesConsidered: parseCandidateIds(["c1", "c2", "c3", "c4", "c5"]),
      harvestedElements: [
        {
          harvestId: "h1",
          sourceCandidateId: "c2",
          sourceStrengthId: "s1",
          category: "layout",
          description: "Tighter shell",
          rationale: "Reusable",
          evidenceRefs: ["ref-1"],
        },
        {
          harvestId: "h2",
          sourceCandidateId: "c4",
          sourceStrengthId: "s9",
          category: "interaction",
          description: "Pinned CTA",
          rationale: "Reusable",
          evidenceRefs: ["ref-2"],
        },
      ],
    });

    const plan = buildAbsorptionPlan({
      round: "r3",
      harvest,
      harvestRef: ".qfai/evidence/prototyping/rounds/r5/harvest.json",
      survivors: parseCandidateIds(["c1", "c3", "c5"]),
      targetConceptRefs: {
        c1: ".qfai/evidence/prototyping/rounds/r3/candidates/c1/concept.json",
        c3: ".qfai/evidence/prototyping/rounds/r3/candidates/c3/concept.json",
        c5: ".qfai/evidence/prototyping/rounds/r3/candidates/c5/concept.json",
      },
    });

    expect(plan.absorptions).toHaveLength(3);
    expect(plan.absorptions[0]?.rejected.map((entry) => entry.harvestId)).toEqual(["h1", "h2"]);
    expect(plan.absorptions[0]?.applied).toEqual([]);
  });

  it("rejects round mismatches and missing concept refs", () => {
    const harvest = buildHarvestRecord({
      fromRound: "r3",
      allCandidatesConsidered: parseCandidateIds(["c1", "c2", "c3"]),
    });

    expect(() =>
      buildAbsorptionPlan({
        round: "r1",
        harvest,
        harvestRef: "ref",
        survivors: parseCandidateIds(["c1"]),
        targetConceptRefs: {
          c1: "ref",
        },
      }),
    ).toThrow(/does not match/);

    expect(() =>
      buildAbsorptionPlan({
        round: "r2",
        harvest,
        harvestRef: "ref",
        survivors: parseCandidateIds(["c1"]),
        targetConceptRefs: {},
      }),
    ).toThrow(/missing targetConceptRef/);
  });
});
