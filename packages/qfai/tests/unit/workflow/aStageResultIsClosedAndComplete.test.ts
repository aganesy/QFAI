// QFAI:EX-0001-0201-19

import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { stageResultVariants } from "../../integration/workflow/stageResultVariants.js";

// The routing result example the `qfai-run` payload reference shows.
async function routingExample(): Promise<unknown> {
  const doc = path.join(
    getInitAssetsDir(),
    ".qfai",
    "assistant",
    "skill",
    "qfai-run",
    "references",
    "payloads.md",
  );
  const text = await readFile(doc, "utf8");
  const block = text.split("## Routing result")[1]?.split("```json\n")[1]?.split("```")[0];
  return JSON.parse(block ?? "null");
}

it("The parser's verdict on each stage result variant", async () => {
  const verdicts = stageResultVariants(await routingExample()).map(({ name, payload }) => {
    const refusals =
      typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? stageResultRefusals({ ...payload })
        : [{ reason: "schema", subject: "payload" }];
    return [name, refusals.map(({ reason, subject }) => `${reason}:${subject}`)];
  });

  expect(Object.fromEntries(verdicts)).toEqual({
    "routing result": [],
    "stage result with no actor": ["schema:actor"],
    "stage result with an unknown key": ["schema:note"],
    "stage result with an unknown outcome": ["schema:outcome"],
    "stage result with a flowless debt": [],
    "stage result whose fact question carries a recommendation": ["schema:questions[0]"],
    "stage result binding a malformed flow ID": ["schema:bindings[0].flowId"],
    "stage result measured with nulls": [],
    "stage result with a debt missing its owner": ["schema:debts[0].resolvingOwner"],
  });
});

it("A stage result carrying approved, and one carrying an authorization of an unknown kind", () => {
  const refusals = (extra: object) =>
    stageResultRefusals({ resultId: "r", ...extra }).filter(
      (refusal) => refusal.subject === "approved" || refusal.subject === "authorization",
    );

  expect([refusals({ approved: true }), refusals({ authorization: { kind: "mode" } })]).toEqual([
    [{ reason: "schema", subject: "approved" }],
    [{ reason: "authorization-kind", subject: "authorization" }],
  ]);
});
