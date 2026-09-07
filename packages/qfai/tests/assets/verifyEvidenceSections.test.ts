/**
 * The verify evidence template answers "which sections are required?" once.
 *
 * The prose list named seven sections and called itself exhaustive and ordered,
 * while the copy/paste skeleton below it carried ten `##` headings — the three
 * extras (`QFAI gates`, `Repo gates`, `Next actions (if any)`) interleaved
 * rather than appended. `qfai-verify/SKILL.md` treats the file as binding and
 * forbids deleting a heading without saying which shape is the authority, so an
 * operator following the list dropped exactly the headings the skill's own
 * obligations depend on. Nothing machine-checks the file; this test does.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped assistant tree plus its generated root mirror. */
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const TEMPLATE_REL = "assistant/skills/qfai-verify/templates/verify-evidence.md";

const LIST_HEADER = "Required sections (all of them, in this order):";

/** Section names the skeleton carries, in skeleton order. */
const EXPECTED_SECTIONS = [
  "Objective",
  "Inputs reviewed (files/paths)",
  "Decisions made (with rationale)",
  "Work performed (what changed, where)",
  "Commands executed + key outputs",
  "QFAI gates",
  "Repo gates",
  "Next actions (if any)",
  "Gaps / Open risks",
  "Final status (PASS/FAIL) + who confirmed",
];

const read = (tree: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, TEMPLATE_REL), "utf-8");

/** The bullets between the list header and the fenced skeleton. */
function listedSections(template: string): string[] {
  const start = template.indexOf(LIST_HEADER);
  if (start === -1) {
    throw new Error(`"${LIST_HEADER}" is missing from the template`);
  }
  const fence = template.indexOf("```", start);
  if (fence === -1) {
    throw new Error("the copy/paste skeleton fence is missing from the template");
  }
  return template
    .slice(start + LIST_HEADER.length, fence)
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

/** The `##` headings inside the fenced skeleton. */
function skeletonSections(template: string): string[] {
  const skeleton = /```md\n([\s\S]*?)```/.exec(template)?.[1];
  if (skeleton === undefined) {
    throw new Error("the ```md copy/paste skeleton is missing from the template");
  }
  return skeleton
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim());
}

/**
 * A bullet may annotate its section (`Gaps / Open risks (must be explicit; …)`)
 * but must not rename it, so an annotation is only allowed as a suffix opening
 * a new parenthetical.
 */
const namesSection = (bullet: string, section: string): boolean =>
  bullet === section || bullet.startsWith(`${section} (`);

describe("verify evidence template", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the required-section list names every skeleton heading, in order`, async () => {
      const template = await read(tree);
      const listed = listedSections(template);
      const skeleton = skeletonSections(template);

      expect(skeleton).toEqual(EXPECTED_SECTIONS);
      expect(
        listed.length,
        `the list names ${listed.length} sections, the skeleton carries ${skeleton.length}`,
      ).toBe(skeleton.length);
      skeleton.forEach((section, index) => {
        const bullet = listed[index] ?? "";
        expect(
          namesSection(bullet, section),
          `bullet ${index + 1} is "${bullet}", expected it to name "${section}"`,
        ).toBe(true);
      });
    });

    it(`${tree}: the three formerly unlisted headings are named as required`, async () => {
      // These are the headings SKILL.md's own obligations depend on: it splits
      // gate output into QFAI/Repo buckets and makes "next actions" a
      // completion-checklist item. Dropping them is the regression this guards.
      const listed = listedSections(await read(tree));

      for (const section of ["QFAI gates", "Repo gates", "Next actions (if any)"]) {
        expect(
          listed.some((bullet) => namesSection(bullet, section)),
          `"${section}" is not in the required-section list`,
        ).toBe(true);
      }
    });
  }
});
