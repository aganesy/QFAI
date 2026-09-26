import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseRecordTable } from "../../src/core/storyTree/tables.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const ARTICLE = "assistant/rule/thinking.md";
const TEMPLATE = "assistant/skill/qfai-sdd/templates/spec/decisions.md";
const LABELS = ["`Evidence:`", "`Grounds:`", "`Residual risk:`", "`Rollback:`"];
const TEMPLATE_CITATION = "templates/spec/decisions.md";
const SDD_GUIDANCE = [
  "assistant/skill/qfai-sdd/SKILL.md",
  "assistant/skill/qfai-sdd/references/sdd-triage.md",
  "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
  "assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
  "assistant/skill/qfai-sdd/templates/change-request.md",
];

const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, file), "utf-8");

describe("a stage records each decision as a decisions.md row of one form", () => {
  for (const tree of TREES) {
    it(`${tree}: the thinking rule points to decisions.md and its template`, async () => {
      const article = await read(tree, ARTICLE);
      expect(article).toContain("## What the stage records");
      expect(article).toContain("`<paths.specsDir>/decisions.md`");
      expect(article).toContain(`\`.qfai/assistant/skill/qfai-sdd/${TEMPLATE_CITATION}\``);
    });

    it(`${tree}: the reasoning procedure is gone`, async () => {
      // The model reasons before every reply and sets its own depth, so walking
      // it through the steps adds tokens and nothing else.
      const article = await read(tree, ARTICLE);
      expect(article).not.toContain("## Working method");
      expect(article).not.toContain("Restate the goal");
      expect(article).not.toContain("Enumerate unknowns");
    });

    it(`${tree}: the principles and the stop-and-ask list are unchanged`, async () => {
      const article = await read(tree, ARTICLE);
      expect(article).toContain("Prefer **repo evidence** over assumptions");
      expect(article).toContain("write `TBD` and raise an Open Question");
      expect(article).toContain("## When to stop and ask");
    });

    it(`${tree}: the seeded template states the four Approach labels in order`, async () => {
      const template = await read(tree, TEMPLATE);
      const labels = LABELS.map((label) => template.indexOf(`- ${label}`));
      expect(labels.every((index) => index >= 0)).toBe(true);
      expect(labels).toEqual([...labels].sort((a, b) => a - b));
      expect(template).toContain("`file:`");
      expect(template).toContain("`command:`");
      expect(template).toContain("`#L<start>-L<end>`");
      expect(template).toContain("only the last two may take `none — <reason>`");
      // The form sits above the table, so a row appended at the end of the
      // file stays inside the table.
      expect(template.indexOf("`Rollback:`")).toBeLessThan(template.indexOf("| ID"));
    });

    it(`${tree}: the template is still one empty four-column record table`, async () => {
      const parsed = parseRecordTable(await read(tree, TEMPLATE), "decisions");
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows).toEqual([]);
    });

    it(`${tree}: the qfai-sdd guidance on recording a decision cites the template`, async () => {
      for (const file of SDD_GUIDANCE) {
        expect(await read(tree, file), file).toContain(TEMPLATE_CITATION);
      }
    });
  }
});
