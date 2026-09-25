// QFAI:SPEC-0018:TC-0018-0040
// QFAI:SPEC-0018:TC-0018-0041

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

function uncommittedFacts() {
  const facts = metFacts();
  const completion = facts.completion;
  if (!completion) throw new Error("the fixture carries completion facts");
  completion.uncommittedPaths = ["src/notify/email.ts"];
  return facts;
}

const uncommitted = { condition: "uncommitted", subject: "src/notify/email.ts", owner: "operator" };

it("TC-0018-0040 (TDD-0053): Decide finish on a working_tree run whose conditions hold except uncommitted", () => {
  const snapshot: ReturnType<typeof readySnapshot> = {
    ...readySnapshot(),
    completionTarget: "working_tree",
  };
  const decision = finish(snapshot, uncommittedFacts());

  expect(decision.verdict.run).toEqual({ ...snapshot.run, state: "completed", sequence: 13 });
  expect(decision.verdict.target).toBe("working_tree");
  expect(decision.verdict.unmet).toEqual([]);
  expect(decision.verdict.deliveryUnmet).toEqual([uncommitted]);
  expect(JSON.stringify(decision)).not.toContain("qfai_done");
});

it("TC-0018-0041 (TDD-0054): Decide finish on a qfai_done run whose only unmet condition is uncommitted", () => {
  const snapshot = readySnapshot();
  const decision = finish(snapshot, uncommittedFacts());

  expect(decision.verdict.run).toEqual(snapshot.run);
  expect(decision.verdict.target).toBeUndefined();
  expect(decision.verdict.unmet).toEqual([uncommitted]);
  expect(decision.events).toEqual([]);
});
