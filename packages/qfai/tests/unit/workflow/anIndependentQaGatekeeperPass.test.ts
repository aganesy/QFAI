// QFAI:EX-0001-0192-21

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

it("Decide finish where the only qa-gatekeeper PASS comes from an instance the actor history shows as an author", () => {
  const snapshot = readySnapshot();
  const acceptedStages = (snapshot.acceptedStages ?? []).map((stage) => ({
    ...stage,
    reviewResults: (stage.reviewResults ?? []).map((review) => ({
      ...review,
      agentInstance: "agent-impl-1",
    })),
  }));
  const decision = finish({ ...snapshot, acceptedStages }, metFacts());

  expect(decision.verdict.run).toEqual(snapshot.run);
  expect(decision.verdict.unmet).toEqual([
    { condition: "review-missing", subject: "qa-gatekeeper", owner: "operator" },
  ]);
});
