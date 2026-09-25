// QFAI:SPEC-0018:TC-0018-0062

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

const drifts: [string, { toolVersion?: string; cliEntryDigest?: string }, string][] = [
  ["TC-0018-0062 (TDD-0079): tool-version", { toolVersion: "2.1.0" }, "tool-version"],
  [
    "TC-0018-0062 (TDD-0080): cli-entry-digest",
    { cliEntryDigest: "f".repeat(64) },
    "cli-entry-digest",
  ],
];

for (const [title, change, subject] of drifts) {
  it(title, () => {
    const snapshot = readySnapshot();
    const facts = metFacts();
    const completion = facts.completion;
    if (!completion) throw new Error("the fixture carries completion facts");
    const decision = finish(snapshot, { ...facts, completion: { ...completion, ...change } });

    expect(decision.verdict.run).toEqual(snapshot.run);
    expect(decision.verdict.unmet).toEqual([
      { condition: "tool-drift", subject, owner: "operator" },
    ]);
  });
}
