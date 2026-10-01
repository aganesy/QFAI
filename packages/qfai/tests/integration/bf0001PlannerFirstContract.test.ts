import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { readDiscussionStep } from "../helpers/discussionSteps.js";

const assistant = path.join(getInitAssetsDir(), ".qfai", "assistant");
const discussion = path.join(assistant, "skill", "qfai-discussion");

// QFAI:EX-0001-0016-01
// QFAI:EX-0001-0016-02
it("requires a user-chosen brand theme while rejecting a final screen winner", async () => {
  const step = await readDiscussionStep(assistant, "discussion-pack");
  const matrix = await readFile(
    path.join(discussion, "references", "discussion-completion-matrix.md"),
    "utf8",
  );
  expect(step).toContain("The brand direction is the exception");
  expect(matrix).toContain("names an adopted theme");
  expect(matrix).toContain("Exploration directions are carried unranked");
  const reviewerChecks = step.split(/^## Gate$/m)[1];
  expect(reviewerChecks).toContain(
    "stayed planner-first and did not choose a single visual winner",
  );
  expect(matrix).toContain("no single screen exploration is selected");
});
