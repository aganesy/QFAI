// QFAI:EX-0001-0192-41

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
  ["uncommitted tracked stage change", "src/notify/email.ts"],
  ["uncommitted tracked summary", `.qfai/evidence/workflow/${RUN_ID}/summary.json`],
  [
    "uncommitted authorization file",
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
