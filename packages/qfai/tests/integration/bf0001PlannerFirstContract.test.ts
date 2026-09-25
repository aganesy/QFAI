import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const discussion = path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", "qfai-discussion");

// QFAI:EX-0001-0016-01
// QFAI:EX-0001-0016-02
it("requires a user-chosen brand theme while rejecting a final screen winner", async () => {
  const skill = await readFile(path.join(discussion, "SKILL.md"), "utf8");
  const matrix = await readFile(
    path.join(discussion, "references", "discussion-completion-matrix.md"),
    "utf8",
  );
  expect(skill).toContain("The brand direction is the exception");
  expect(matrix).toContain("names an adopted theme");
  expect(matrix).toContain("Exploration directions are carried unranked");
  const reviewerChecks = skill
    .split("Reviewer checks must confirm:")[1]
    ?.split("## Sub-agent Delegation")[0];
  expect(reviewerChecks).toContain(
    "discussion stayed planner-first and did not choose a single visual winner",
  );
  expect(matrix).toContain("no single screen exploration is selected");
});
