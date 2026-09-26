// QFAI:EX-0001-0195-03

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];

function planDeclaring(effect: string) {
  return {
    route: "direct",
    writeScope: ["docs/guide.md"],
    stages: [
      {
        stageInstanceId: "direct-edit",
        stageKind: "maintenance",
        skill: "qfai-maintain",
        operation: "non-normative-edit",
        effects: [effect],
      },
      {
        stageInstanceId: "direct-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
      },
    ],
  };
}

function allowedEffects(effect: string, authorizations: Snapshot["authorizations"] = []) {
  const issued = decide(
    {
      run: { id: "run-effects", state: "ready", sequence: 4 },
      plan: planDeclaring(effect),
      flowBinding: { flowId: "BF-0007" },
      authorizations,
    },
    { operation: "next" },
    {},
  );
  return issued.verdict.workOrder?.scope?.allowedEffects;
}

const undeclaredByPolicy: [string, string][] = [
  ["push", "push"],
  ["pull-request", "pull-request"],
  ["merge", "merge"],
  ["deploy", "deploy"],
  ["production-migration", "production-migration"],
  ["extra-spending", "extra-spending"],
];

for (const [title, effect] of undeclaredByPolicy) {
  it(title, () => {
    expect(allowedEffects(effect)).toEqual([]);
  });
}

it("project-policy-deploy", () => {
  const policy = {
    authorizationId: "policy-deploy",
    kind: "project_policy",
    policy: { path: ".qfai/policies/deploy.md", digest: "c".repeat(64), effects: ["deploy"] },
  };
  expect(allowedEffects("deploy", [policy])).toEqual(["deploy"]);
});

it("request-scope-push", () => {
  const requestScope = { authorizationId: "request-scope-1", kind: "request_scope" };
  expect(allowedEffects("push", [requestScope])).toEqual([]);
});
