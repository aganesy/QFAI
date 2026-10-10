/**
 * What a skill loads before it does any work.
 *
 * A skill reads its `SKILL.md` and the shared baselines it cites, and a loaded
 * file stays loaded for the whole run. Splitting a baseline helps only while
 * the text that moved stays out of that start-up read, so each skill has a
 * budget, in characters: its `SKILL.md` body plus the baselines it names. A
 * section moved to a reference file is not counted, because a pointer sends
 * the agent there only when its condition holds.
 *
 * A budget is the measured total rounded up to the next thousand. A skill that
 * grows past it either moves a section out or raises its own number here, which
 * a reviewer sees.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const assistantDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
);

const BASELINES: ReadonlyArray<readonly [string, string]> = [
  ["shared-skill-operating-baseline", "rule/shared-skill-operating-baseline.md"],
  ["shared-skill-delegation-baseline", "rule/shared-skill-delegation-baseline.md"],
];

/** Characters a skill may load at start. */
const START_LOAD_BUDGET: Readonly<Record<string, number>> = {
  "qfai-configure": 66_000,
  "qfai-discussion": 52_000,
  "qfai-grill": 55_000,
  "qfai-grilling": 70_000,
  "qfai-implement": 53_000,
  "qfai-maintain": 31_000,
  "qfai-migration-v1-to-v2": 57_000,
  "qfai-prototyping": 50_000,
  "qfai-run": 52_000,
  "qfai-sdd": 50_000,
  "qfai-triage": 50_000,
  "qfai-verify": 51_000,
  "web-research": 60_000,
};

const length = (text: string): number => [...text].length;

/** The text after the front matter, which is what the character limit counts. */
function body(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

async function startLoad(skill: string): Promise<number> {
  const entry = await readFile(path.join(assistantDir, "skill", skill, "SKILL.md"), "utf-8");
  let total = length(body(entry));
  for (const [name, file] of BASELINES) {
    if (entry.includes(name)) {
      total += length(await readFile(path.join(assistantDir, file), "utf-8"));
    }
  }
  return total;
}

describe("what a skill loads at start", () => {
  it("has a budget for every shipped skill and no budget for a skill that is gone", async () => {
    const skills = (await readdir(path.join(assistantDir, "skill"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(Object.keys(START_LOAD_BUDGET).sort()).toEqual(skills);
  });

  it.each(Object.entries(START_LOAD_BUDGET))(
    "keeps %s within %i characters",
    async (skill, budget) => {
      expect(await startLoad(skill)).toBeLessThanOrEqual(budget);
    },
  );
});
