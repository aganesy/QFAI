// QFAI:EX-0001-0185-21

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

// The ready snapshot with its one qa-gatekeeper PASS given by `reviewer`.
function reviewedBy(reviewer: string) {
  const snapshot = readySnapshot();
  const acceptedStages = (snapshot.acceptedStages ?? []).map((stage) => ({
    ...stage,
    reviewResults: (stage.reviewResults ?? []).map((review) => ({
      ...review,
      agentInstance: reviewer,
    })),
  }));
  const actorHistory = [
    ...(snapshot.actorHistory ?? []),
    { role: "author", agentInstance: "agent-sdd-1", stageInstanceId: "bounded-sdd-delta" },
  ];
  return { ...snapshot, acceptedStages, actorHistory };
}

it("Decide finish where the only qa-gatekeeper PASS comes from an author of the stage it reviewed", () => {
  const snapshot = reviewedBy("agent-sdd-1");
  const decision = finish(snapshot, metFacts());

  expect(decision.verdict.run).toEqual(snapshot.run);
  expect(decision.verdict.unmet).toEqual([
    { condition: "review-missing", subject: "qa-gatekeeper", owner: "operator" },
  ]);
});

it("Decide finish where the only qa-gatekeeper PASS comes from the author of another stage", () => {
  const decision = finish(reviewedBy("agent-impl-1"), metFacts());

  expect(decision.verdict.unmet ?? []).not.toContainEqual(
    expect.objectContaining({ condition: "review-missing" }),
  );
});
