// QFAI:SPEC-0018:TC-0018-0033

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

it("TC-0018-0033 (TDD-0036): Decide finish on a run with no accepted verify stage", () => {
  const snapshot = readySnapshot();
  const withoutVerify = {
    ...snapshot,
    acceptedStages: (snapshot.acceptedStages ?? []).filter((stage) => stage.stageKind !== "verify"),
  };
  const decision = finish(withoutVerify, metFacts());

  expect(decision.verdict.run).toEqual(snapshot.run);
  expect(decision.verdict.unmet).toEqual([
    { condition: "verify-missing", subject: "bounded-verify", owner: "qfai-verify" },
  ]);
  expect(decision.events).toEqual([]);
});
