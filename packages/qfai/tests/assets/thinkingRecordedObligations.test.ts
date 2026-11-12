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
  "assistant/skill/qfai-sdd/references/sdd-triage.md",
  "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
  "assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
];
const EVIDENCE_GUIDANCE = ["assistant/skill/qfai-implement/references/parallelization-policy.md"];

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

    it(`${tree}: the template applies the form to final-report records too`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "A stage that does not own this file records its decisions in its own final",
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

    it(`${tree}: the seeded template states the short record form`, async () => {
      const template = (await read(tree, TEMPLATE)).replace(/\s+/g, " ");
      expect(template).toContain("Write each row as a short decision record.");
      expect(template).toContain("in one to three short sentences");
      expect(template).toContain("Content and Approach together stay within 600 characters");
      const optional = ["`Considered:`", "`Consequences:`", "`Rollback:`"];
      const marks = optional.map((label) => template.indexOf(`- ${label}`));
      expect(marks.every((index) => index >= 0)).toBe(true);
      // The new form drops the four labelled items a legacy row still carries.
      for (const label of LABELS.slice(0, 3)) expect(template).not.toContain(`- ${label}`);
      // The form sits above the table, so a row appended at the end of the
      // file stays inside the table.
      expect(template.indexOf("`Rollback:`")).toBeLessThan(template.indexOf("| ID"));
    });

    it(`${tree}: the template is still one empty three-column record table`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toMatch(
        /^<!--\r?\n[\s\S]+?\r?\n-->\s*# Decisions\s+## Decisions\s+\|\s*ID\s*\|\s*Content\s*\|\s*Approach\s*\|\s+\|\s*---\s*\|\s*-------\s*\|\s*--------\s*\|\s*$/,
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
