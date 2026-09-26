// QFAI:SPEC-0018:TC-0018-0086
// QFAI:SPEC-0018:TC-0018-0087

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
      specBinding: { specId: "spec-0007" },
      authorizations,
    },
    { operation: "next" },
    {},
  );
  return issued.verdict.workOrder?.scope?.allowedEffects;
}

const undeclaredByPolicy: [string, string][] = [
  ["TC-0018-0086 (TDD-0112): push", "push"],
  ["TC-0018-0086 (TDD-0113): pull-request", "pull-request"],
  ["TC-0018-0086 (TDD-0114): merge", "merge"],
  ["TC-0018-0086 (TDD-0115): deploy", "deploy"],
  ["TC-0018-0086 (TDD-0116): production-migration", "production-migration"],
  ["TC-0018-0086 (TDD-0117): extra-spending", "extra-spending"],
];

for (const [title, effect] of undeclaredByPolicy) {
  it(title, () => {
    expect(allowedEffects(effect)).toEqual([]);
  });
}

it("TC-0018-0087 (TDD-0118): project-policy-deploy", () => {
  const policy = {
    authorizationId: "policy-deploy",
    kind: "project_policy",
    policy: { path: ".qfai/policies/deploy.md", digest: "c".repeat(64), effects: ["deploy"] },
  };
  expect(allowedEffects("deploy", [policy])).toEqual(["deploy"]);
});

it("TC-0018-0087 (TDD-0119): request-scope-push", () => {
  const requestScope = { authorizationId: "request-scope-1", kind: "request_scope" };
  expect(allowedEffects("push", [requestScope])).toEqual([]);
});
