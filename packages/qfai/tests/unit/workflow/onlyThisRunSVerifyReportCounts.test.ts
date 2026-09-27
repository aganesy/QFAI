// QFAI:EX-0001-0192-20

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

it("Decide finish on a run with no accepted verify stage", () => {
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
