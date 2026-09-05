/**
 * Every required spec file ships a template (#394).
 *
 * `qfai-sdd/SKILL.md` lists `_policies/01..11` and the per-spec `01..10` as Mandatory
 * Outputs and says "the canonical file set is defined by skill templates", while
 * Critical Constraint 1 forbids reaching for any non-skill-local template. The
 * tree shipped 7 of 11 `_policies` files and 9 of 10 per-spec files, and all
 * five missing ones are gated at `error` by `E_SPEC_MISSING_FILESET`.
 *
 * This test is the guard the issue asks for: a future required-file addition
 * cannot ship without its template.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_LAYERED_SHARED_FILES_V1421,
  REQUIRED_LAYERED_SPEC_FILES_V1421,
} from "../../src/core/specLayout.js";
import { validateTriageSection } from "../../src/core/validators/specPack.js";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-sdd";
const TEMPLATES = `${SKILL}/templates/specs`;

const readSkillFile = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, SKILL, rel), "utf-8");

const listTemplates = (tree: string, sub: string): Promise<string[]> =>
  readdir(path.join(repoRoot, tree, TEMPLATES, sub));

const readTemplate = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, TEMPLATES, rel), "utf-8");

/**
 * The catalog is the required set; the shipped required file lists come from
 * `specLayout.ts`, which #393 reconciled with `spec_required_files.json`.
 */
const REQUIRED = {
  _policies: REQUIRED_LAYERED_SHARED_FILES_V1421,
  spec: REQUIRED_LAYERED_SPEC_FILES_V1421,
} as const;

describe("qfai-sdd ships a template for every required spec file", () => {
  for (const tree of QFAI_TREES) {
    for (const [sub, required] of Object.entries(REQUIRED)) {
      it(`${tree}: ${sub}/ covers every required file`, async () => {
        const present = new Set(await listTemplates(tree, sub));
        const missing = required.filter((name) => !present.has(name));

        expect(missing).toEqual([]);
      });
    }

    it(`${tree}: 10_Plan.md ships the allowed heading shape`, async () => {
      // `QFAI-PLAN-002/003/004` grade this file's headings at `error`, and the
      // only positive statement of what IS allowed was buried in a validator's
      // suggested_action string. The skeleton makes them satisfiable by
      // construction rather than by trial and error.
      const plan = await readTemplate(tree, "spec/10_Plan.md");

      for (const heading of [
        "## Implementation approach",
        "## Test approach",
        "## NFR approach",
        "## Risk mitigation",
      ]) {
        expect(plan).toContain(heading);
      }
    });

    it(`${tree}: 10_Plan.md's own headings pass its validators`, async () => {
      // A template that trips the gate it exists to satisfy would be worse than
      // no template. These are the three rejecting patterns from
      // `layerCoverage.ts`, applied to the template's headings.
      const plan = await readTemplate(tree, "spec/10_Plan.md");
      const headings = plan
        .split(/\r?\n/)
        .filter((line) => /^#{1,6}\s+\S/.test(line))
        .map((line) => line.replace(/^#{1,6}\s+/, ""));

      const forbidden = [
        /\b(?:changelog|history|updated\s*at|update\s*history)\b|改訂履歴|更新履歴/i,
        /\b(?:release\s*candidate|go\s*\/?\s*no\s*\/?\s*go|rc)\b|リリース可否/i,
        /^(?:status|progress|todo|remaining|done|wip)$/i,
      ];

      for (const heading of headings) {
        for (const pattern of forbidden) {
          expect(pattern.test(heading), `heading "${heading}" trips ${pattern}`).toBe(false);
        }
      }
    });

    it(`${tree}: 10_Plan.md says where progress, history and release live`, async () => {
      const plan = await readTemplate(tree, "spec/10_Plan.md");

      expect(plan).toContain("`tdd/test-list.md`");
      expect(plan).toContain("`09_delta.md`");
      expect(plan).toContain("release\njudgement nowhere in the spec pack");
    });

    it(`${tree}: the four new _policies templates carry authoring rules`, async () => {
      for (const name of [
        "01_Objective.md",
        "02_Initiative.md",
        "06_Glossary.md",
        "07_Constraints.md",
      ]) {
        const text = await readTemplate(tree, `_policies/${name}`);
        expect(text, name).toContain("## Authoring rules");
      }
    });

    it(`${tree}: the _policies templates do not name lower-layer IDs`, async () => {
      // `_policies/**` must not define or own `US`/`AC`/`BR`/`EX`/`TC` items,
      // and `QFAI-LAYER-100` is a token scan — a template that carried one
      // would ship a guaranteed finding.
      //
      // Any digit count counts, not just the four the ban patterns match
      // (#782): a short placeholder such as `EX-01` reads as a reserved-layer
      // ID to the author, and renumbering it to the pack's own four-digit
      // house convention turns the file into a hard `error`.
      for (const name of REQUIRED._policies) {
        const text = await readTemplate(tree, `_policies/${name}`);
        expect(text.match(/\b(?:US|AC|BR|EX|TC)-\d+/g) ?? [], name).toEqual([]);
      }
    });

    it(`${tree}: the delta templates state their multi-run layout`, async () => {
      // `/qfai-sdd` re-runs against an existing spec, but the templates were
      // single-shot, so operators invented dated `## Triage — <date>` headings.
      // `QFAI-TRIAGE-*` binds to the first `## Triage` only, and every row under
      // a duplicate heading is therefore never checked. The templates must state
      // the per-run shape themselves.
      for (const rel of ["spec/09_delta.md", "_policies/10_delta.md"]) {
        const text = await readTemplate(tree, rel);

        expect(text.match(/^## Triage\s*$/gm) ?? [], rel).toHaveLength(1);
        expect(text.match(/^## Change Summary\s*$/gm) ?? [], rel).toHaveLength(1);
        expect(text, rel).toMatch(/^### DELTA-\d{4} \(YYYY-MM-DD\)$/m);
        expect(text, rel).toContain("never opens a second `## Triage` H2");
      }
    });

    it(`${tree}: a re-run's H3 sub-section stays inside the graded ## Triage`, async () => {
      // The H3 shape is only safe because a section ends at a heading of the
      // same or higher level, so per-run sub-tables stay inside the extracted
      // `## Triage`. Grade the shipped template, then grade it again with a
      // second run appended the way the template tells operators to append it.
      const text = await readTemplate(tree, "spec/09_delta.md");
      const secondRun = [
        "### DELTA-0002 (YYYY-MM-DD)",
        "",
        "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| REQ-0002 | second run | spec-0001 | UPDATE | APPEND | - | re-run |",
        "",
        "## Rationale",
      ].join("\n");
      const rerun = text.replace("## Rationale", secondRun);

      expect(validateTriageSection(text, "spec-0001/09_delta.md")).toEqual([]);
      expect(validateTriageSection(rerun, "spec-0001/09_delta.md")).toEqual([]);
    });

    it(`${tree}: Phase 4 states the re-run append rule`, async () => {
      const checklist = await readSkillFile(tree, "references/sdd-phase-checklists.md");

      expect(checklist).toContain(
        "A re-run appends to the existing `## Triage`; never open a second `## Triage` H2.",
      );
    });
  }
});
