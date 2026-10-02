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
  "assistant/step/common-grilling-record/STEP.md",
  "assistant/skill/qfai-sdd/references/sdd-triage.md",
  "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
  "assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
  "assistant/skill/qfai-sdd/templates/change-request.md",
];
const EVIDENCE_GUIDANCE = [
  "assistant/step/common-grilling-record/STEP.md",
  "assistant/skill/qfai-implement/references/parallelization-policy.md",
];

const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, file), "utf-8");

describe("every decision a stage records carries one form", () => {
  for (const tree of TREES) {
    it(`${tree}: the thinking rule scopes decisions.md rows to its owner`, async () => {
      const article = await read(tree, ARTICLE);
      expect(article).toContain("## What the stage records");
      expect(article).toContain(
        "The stage that owns `<paths.specsDir>/decisions.md`, `qfai-sdd`, records each",
      );
      expect(article).toContain("Every other stage records each decision in its own");
      expect(article).toContain(`\`.qfai/assistant/skill/qfai-sdd/${TEMPLATE_CITATION}\``);
      // The rule points to the schema and does not copy it.
      for (const label of LABELS) expect(article).not.toContain(label);
    });

    it(`${tree}: the template applies the form to evidence records too`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "A stage that does not own this file records its decisions in its own evidence",
      );
    });

    it(`${tree}: the shared evidence guidance cites the template`, async () => {
      for (const file of EVIDENCE_GUIDANCE) {
        const text = await read(tree, file);
        expect(text, file).toContain(`\`.qfai/assistant/skill/qfai-sdd/${TEMPLATE_CITATION}\``);
        for (const label of LABELS) expect(text, file).not.toContain(label);
      }
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
      expect(template.replace(/\s+/g, " ")).toContain(
        "No item is empty, and only the last two may take `none — <reason>`.",
      );
      // The form sits above the table, so a row appended at the end of the
      // file stays inside the table.
      expect(template.indexOf("`Rollback:`")).toBeLessThan(template.indexOf("| ID"));
    });

    it(`${tree}: the template is still one empty four-column record table`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toMatch(
        /^<!--\r?\n[\s\S]+?\r?\n-->\s*# Decisions\s+## Decisions\s+\|\s*ID\s*\|\s*Content\s*\|\s*Approach\s*\|\s*Status\s*\|\s+\|\s*---\s*\|\s*-------\s*\|\s*--------\s*\|\s*------\s*\|\s*$/,
      );
      const parsed = parseRecordTable(template, "decisions");
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows).toEqual([]);
    });

    it(`${tree}: the guidance on recording a decision cites the template`, async () => {
      for (const file of SDD_GUIDANCE) {
        expect(await read(tree, file), file).toContain(TEMPLATE_CITATION);
      }
    });
  }
});
