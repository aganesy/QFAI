// QFAI:EX-0001-0193-05
// QFAI:EX-0001-0193-06
// QFAI:EX-0001-0193-12
// Fault seeds: FAULT-015

import { afterEach, expect, it } from "vitest";

import {
  accepted,
  EXAMPLE_ROWS,
  EXAMPLES,
  examples,
  issued,
  read,
  readySnapshot,
  removeStoryProjects,
  storyProject,
  TEST,
  testFile,
  write,
} from "./storyTreeFixture.js";

afterEach(removeStoryProjects);

const ADDED = "| EX-0001-0001-03 | AC-0001-0001-01 | A cancelled line | No row |";

it("A test annotating an example loses its annotation while an implement stage runs", async () => {
  const root = await storyProject();
  const { snapshot, workOrder } = await issued(root, readySnapshot("implement"));
  await write(root, TEST, testFile(["EX-0001-0001-01"]));
  const tree = await read(root, EXAMPLES);

  expect({
    obligations: workOrder?.obligations?.ids,
    verdict: await accepted(root, snapshot),
    tree: await read(root, EXAMPLES),
  }).toEqual({
    obligations: ["AC-0001-0001-01", "BF-0001", "EX-0001-0001-01", "EX-0001-0001-02"],
    verdict: {
      state: "running",
      reasons: [{ reason: "example-uncovered", subject: "EX-0001-0001-02" }],
    },
    tree,
  });
});

it("An implement stage adds an example to a story of the bound flow", async () => {
  const root = await storyProject();
  const { snapshot } = await issued(root, readySnapshot("implement"));
  await write(root, EXAMPLES, examples([...EXAMPLE_ROWS, ADDED]));

  expect(await accepted(root, snapshot)).toEqual({
    state: "running",
    reasons: [{ reason: "example-added", subject: "EX-0001-0001-03" }],
  });
});

it("An sdd_delta stage adds one example and removes another a test annotated", async () => {
  const root = await storyProject();
  const { snapshot } = await issued(root, readySnapshot("sdd_delta"));
  await write(
    root,
    EXAMPLES,
    examples(["| EX-0001-0001-01 | AC-0001-0001-01 | Two order lines | Two rows |", ADDED]),
  );

  expect(await accepted(root, snapshot)).toEqual({ state: "ready", reasons: undefined });
});
