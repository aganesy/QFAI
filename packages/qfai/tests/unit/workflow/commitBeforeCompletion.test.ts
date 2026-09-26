// QFAI:SPEC-0018:TC-0018-0265

import { expect, it } from "vitest";

import { RUN_ID, completion, finish, metFacts, readySnapshot } from "./finishFixture.js";

// `finish` on a ready `qfai_done` run whose only unmet condition is one uncommitted path.
function finishWithUncommitted(path: string) {
  const decision = finish(readySnapshot(), {
    ...metFacts(),
    completion: {
      ...completion(),
      changedPaths: ["src/notify/email.ts", path],
      uncommittedPaths: [path],
    },
  });
  return {
    state: decision.verdict.run?.state,
    unmet: decision.verdict.unmet,
    events: decision.events.length,
  };
}

const uncommitted: [string, string][] = [
  ["TC-0018-0265 (TDD-0522): uncommitted tracked stage change", "src/notify/email.ts"],
  [
    "TC-0018-0265 (TDD-0523): uncommitted tracked summary",
    `.qfai/evidence/workflow/${RUN_ID}/summary.json`,
  ],
  [
    "TC-0018-0265 (TDD-0524): uncommitted authorization file",
    `.qfai/evidence/workflow/${RUN_ID}/authorizations/authorization-5.json`,
  ],
];

for (const [title, path] of uncommitted) {
  it(title, () => {
    expect(finishWithUncommitted(path)).toEqual({
      state: "ready",
      unmet: [{ condition: "uncommitted", subject: path, owner: "operator" }],
      events: 0,
    });
  });
}
