// QFAI:SPEC-0018:TC-0018-0025
// QFAI:SPEC-0018:TC-0018-0026

import { afterEach, expect, it } from "vitest";

import { field, minimalProject, removeProjects, workflow } from "./workflowProject.js";

afterEach(removeProjects);

const refused: [string, string[]][] = [
  ["TC-0018-0025 (TDD-0269): op-route", ["route"]],
  ["TC-0018-0025 (TDD-0270): op-exec", ["exec"]],
  ["TC-0018-0025 (TDD-0271): op-unknown", ["launch"]],
  ["TC-0018-0025 (TDD-0272): flag-unknown", ["status", "--bogus"]],
];

for (const [title, args] of refused) {
  it(title, async () => {
    const root = await minimalProject();
    const run = workflow(root, args);

    expect({ exit: run.status, code: field(run.json, "error.code") }).toEqual({
      exit: 2,
      code: "invalid-input",
    });
  });
}

it("TC-0018-0026 (TDD-0273): Built CLI npx qfai workflow --help", async () => {
  const root = await minimalProject();
  const run = workflow(root, ["--help"]);
  const lines = run.stdout.trim().split("\n");

  expect({ exit: run.status, operations: lines.map((line) => line.split(/\s+/)[0]) }).toEqual({
    exit: 0,
    operations: ["start", "next", "accept", "decision", "status", "resume", "finish"],
  });
});
