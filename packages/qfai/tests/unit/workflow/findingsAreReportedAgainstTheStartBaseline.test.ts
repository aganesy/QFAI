// QFAI:EX-0001-0192-23

import { expect, it } from "vitest";

import { finish, metFacts, readySnapshot } from "./finishFixture.js";

type Finding = { code: string; file: string; refs: string[] };

function finishWith(baseline: Finding[], found: Finding[]) {
  const snapshot = readySnapshot();
  const start = snapshot.baseline;
  if (!start) throw new Error("the fixture carries a start baseline");
  const facts = metFacts();
  const completion = facts.completion;
  if (!completion) throw new Error("the fixture carries completion facts");
  completion.validate.findings = found.map((finding) => ({ ...finding, severity: "error" }));
  return finish({ ...snapshot, baseline: { ...start, findings: baseline } }, facts);
}

it("A start baseline with one error, and finish facts holding it and one new error", () => {
  const known = { code: "QFAI-TRACE-002", file: "src/notify/email.ts", refs: [] };
  const added = { code: "QFAI-TRACE-004", file: "src/notify/sms.ts", refs: [] };
  const decision = finishWith([known], [known, added]);

  expect(decision.verdict.run?.state).toBe("ready");
  expect(decision.verdict.unmet).toEqual([
    {
      condition: "gate-failed",
      subject: "validate",
      owner: "operator",
      findings: [
        { ...known, baseline: "pre-existing" },
        { ...added, baseline: "new" },
      ],
    },
  ]);
});

it("A finish finding with the baseline's code and file and its refs in another order", () => {
  const code = "QFAI-TRACE-002";
  const file = "src/notify/email.ts";
  const decision = finishWith(
    [{ code, file, refs: ["REQ-0001", "REQ-0002"] }],
    [{ code, file, refs: ["REQ-0002", "REQ-0001"] }],
  );

  expect(decision.verdict.unmet?.[0]?.findings).toEqual([
    { code, file, refs: ["REQ-0002", "REQ-0001"], baseline: "pre-existing" },
  ]);
});
