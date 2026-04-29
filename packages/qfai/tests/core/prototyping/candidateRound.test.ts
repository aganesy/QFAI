import { describe, expect, it } from "vitest";

import {
  buildCandidates,
  isCandidateId,
  markDroppedCandidates,
  parseCandidateIds,
} from "../../../src/core/prototyping/candidate.js";
import {
  buildCandidateConcept,
  candidateConceptPath,
} from "../../../src/core/prototyping/candidateConcept.js";
import {
  candidateRoutePath,
  nextExplorationRound,
  previousExplorationRound,
  roundCandidateArtifactPath,
  roundCommandPlansPath,
} from "../../../src/core/prototyping/round.js";

describe("spec-0018 candidate helpers", () => {
  it("parses valid candidate ids and rejects invalid ones", () => {
    expect(isCandidateId("c1")).toBe(true);
    expect(isCandidateId("c12")).toBe(true);
    expect(isCandidateId("candidate-1")).toBe(false);
    expect(() => parseCandidateIds(["c1", "bad-id"])).toThrow(/invalid candidateId/);
  });

  it("rejects duplicate candidate ids", () => {
    expect(() => parseCandidateIds(["c1", "c1"])).toThrow(/duplicate candidateId/);
  });

  it("marks dropped candidates without mutating survivors", () => {
    const candidates = buildCandidates(parseCandidateIds(["c1", "c2", "c3"]), "r5");
    const updated = markDroppedCandidates(candidates, parseCandidateIds(["c1", "c3"]), "r3");

    expect(updated).toEqual([
      { candidateId: "c1", firstRound: "r5", droppedAtRound: null },
      { candidateId: "c2", firstRound: "r5", droppedAtRound: "r3" },
      { candidateId: "c3", firstRound: "r5", droppedAtRound: null },
    ]);
  });
});

describe("spec-0018 round helpers", () => {
  it("derives next and previous rounds", () => {
    expect(nextExplorationRound("r5")).toBe("r3");
    expect(nextExplorationRound("r3")).toBe("r2");
    expect(previousExplorationRound("r2")).toBe("r3");
    expect(previousExplorationRound("r1")).toBe("r2");
  });

  it("builds round paths and candidate routes", () => {
    expect(roundCommandPlansPath("r5")).toBe(
      ".qfai/evidence/prototyping/rounds/r5/command-plans.json",
    );
    expect(roundCandidateArtifactPath("r3", "c1", "concept.json")).toBe(
      ".qfai/evidence/prototyping/rounds/r3/candidates/c1/concept.json",
    );
    expect(candidateRoutePath("c2", "/orders/new")).toBe("/prototype/c2/orders/new");
    expect(candidateRoutePath("c2", "/")).toBe("/prototype/c2/");
  });
});

describe("spec-0018 candidate concepts", () => {
  it("builds concept payloads and paths", () => {
    const concept = buildCandidateConcept({
      candidateId: "c1",
      round: "r5",
      statement: "Calm operational confidence",
      designThesis: "Dense operational comparison surface",
      referenceLineage: ["REF-001"],
      templateSeedUsage: "reference-only",
      antiTemplateConstraints: ["Replace default shadcn rhythm"],
      noveltyBet: "Domain-specific comparison bands replace KPI cards",
      anchors: ["CONCEPT-0001"],
      nonGoals: ["Loud novelty-first visuals"],
      pivotFromPrior: null,
    });

    expect(concept.schemaVersion).toBe("2.0");
    expect(concept.designThesis).toBe("Dense operational comparison surface");
    expect(concept.anchors).toEqual(["CONCEPT-0001"]);
    expect(candidateConceptPath("r5", "c1")).toBe(
      ".qfai/evidence/prototyping/rounds/r5/candidates/c1/concept.json",
    );
  });

  it("rejects empty statements", () => {
    expect(() =>
      buildCandidateConcept({
        candidateId: "c1",
        round: "r5",
        statement: "   ",
        designThesis: "x",
        referenceLineage: [],
        templateSeedUsage: "none",
        antiTemplateConstraints: [],
        noveltyBet: "x",
        anchors: [],
        nonGoals: [],
        pivotFromPrior: null,
      }),
    ).toThrow(/statement must be non-empty/);
  });

  it("requires anti-template constraints when a template seed is used", () => {
    expect(() =>
      buildCandidateConcept({
        candidateId: "c1",
        round: "r5",
        statement: "x",
        designThesis: "x",
        referenceLineage: ["REF-001"],
        templateSeedUsage: "implementation-seed",
        antiTemplateConstraints: [],
        noveltyBet: "x",
        anchors: [],
        nonGoals: [],
        pivotFromPrior: null,
      }),
    ).toThrow(/templateSeedUsage requires antiTemplateConstraints/);
  });

  it("requires reference lineage at build time", () => {
    expect(() =>
      buildCandidateConcept({
        candidateId: "c1",
        round: "r5",
        statement: "x",
        designThesis: "x",
        referenceLineage: [],
        templateSeedUsage: "none",
        antiTemplateConstraints: [],
        noveltyBet: "x",
        anchors: [],
        nonGoals: [],
        pivotFromPrior: null,
      }),
    ).toThrow(/referenceLineage must be non-empty/);
  });

  it("rejects placeholder anti-template constraints", () => {
    expect(() =>
      buildCandidateConcept({
        candidateId: "c1",
        round: "r5",
        statement: "x",
        designThesis: "x",
        referenceLineage: ["REF-001"],
        templateSeedUsage: "implementation-seed",
        antiTemplateConstraints: ["placeholder"],
        noveltyBet: "x",
        anchors: [],
        nonGoals: [],
        pivotFromPrior: null,
      }),
    ).toThrow(/antiTemplateConstraints entries must be meaningful/);
  });
});
