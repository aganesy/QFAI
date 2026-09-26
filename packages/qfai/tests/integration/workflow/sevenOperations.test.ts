// QFAI:AC-0001-0192-05
// QFAI:EX-0001-0192-17

import { afterEach, expect, it } from "vitest";

import { field, minimalProject, removeProjects, workflow } from "./workflowProject.js";

afterEach(removeProjects);

const refused: [string, string[]][] = [
  ["op-route", ["route"]],
  ["op-exec", ["exec"]],
  ["op-unknown", ["launch"]],
  ["flag-unknown", ["status", "--bogus"]],
];

for (const [title, args] of refused) {
  it(title, async () => {
    const root = await minimalProject();
    const run = workflow(root, args);

    expect({
      exit: run.status,
      code: field(run.json, "error.code"),
      reason: field(run.json, "error.reasons.0.reason"),
    }).toEqual({ exit: 2, code: "invalid-input", reason: "schema" });
  });
}

it("Built CLI npx qfai workflow --help", async () => {
  const root = await minimalProject();
  const run = workflow(root, ["--help"]);
  const lines = run.stdout.trim().split("\n");

  expect({ exit: run.status, operations: lines.map((line) => line.split(/\s+/)[0]) }).toEqual({
    exit: 0,
    operations: ["start", "next", "accept", "decision", "status", "resume", "finish"],
  });
});
