// QFAI:EX-0001-0192-35

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

const drifts: [string, { toolVersion?: string; cliEntryDigest?: string }, string][] = [
  ["tool-version", { toolVersion: "2.1.0" }, "tool-version"],
  ["cli-entry-digest", { cliEntryDigest: "f".repeat(64) }, "cli-entry-digest"],
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
