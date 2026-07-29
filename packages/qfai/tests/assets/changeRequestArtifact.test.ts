import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const TEMPLATE = "assistant/skills/qfai-sdd/templates/change-request.md";

describe("a Change Request is a defined artifact", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the template carries the approval-record fields`, async () => {
      const template = await read(tree, TEMPLATE);
      for (const field of [
        "- ID: `CR-YYYYMMDD-NNNN`",
        "- Status: `open`",
        "- Approved by:",
        "- Approved at:",
        "- Approved option:",
        "- Applied at:",
        "- Superseded by:",
      ]) {
        expect(template).toContain(field);
      }
      expect(template).toContain("open | approved | rejected | superseded");
    });

    it(`${tree}: Applied at separates "approved" from "carried out"`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "`Status: approved` records the operator's decision; `Applied at` records that",
      );

      const drift = await read(tree, "assistant/constitution/drift-protocol.md");
      expect(drift).toContain("fill `Resolution` and set `Applied at`");

      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("`Applied at` is populated — approval alone");
    });

    it(`${tree}: the approved CR reset is a stated exception to forward-only status`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain(
        "The only exception is an approved Change Request reset (see Status Lifecycle).",
      );
      expect(skill).toContain(
        "Completed items (`done`) are skipped on re-execution, unless an approved Change Request reset them.",
      );
      expect(skill).toContain("`references/change-request-reset.md`");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("the\n   only sanctioned backward status transition");
    });

    it(`${tree}: the reset reference states its preconditions and what stays prohibited`, async () => {
      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain(
        "# Approved Change Request reset (the only sanctioned backward transition)",
      );
      expect(reference).toContain("may reset the rows that change invalidates back to `todo`");
      expect(reference).toContain("records that CR's ID in its `DR-ID` column");
      expect(reference).toContain("A CR at `Status: open` authorises nothing.");
      expect(reference).toContain('"Backward transition prohibited: green -> red"');
      expect(reference).toContain("An `approved` CR without\n`Applied at` is still unresolved");
    });

    it(`${tree}: the template carries the six contents the protocol mandates`, async () => {
      const template = await read(tree, TEMPLATE);
      for (const heading of [
        "## Context (what conflicts)",
        "## Proposed change",
        "## Options (at least 3) and recommendation",
        "## Impact scope",
        "## Decision needed from user",
        "## Approved actions (owner skill rerun plan)",
      ]) {
        expect(template).toContain(heading);
      }
    });

    it(`${tree}: the drift protocol pins a path and an ID pattern`, async () => {
      const drift = await read(tree, "assistant/constitution/drift-protocol.md");
      expect(drift).toContain(".qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md");
      expect(drift).toContain("`CR-\\d{8}-\\d{4}`");
      expect(drift).toContain("templates/change-request.md");
    });

    it(`${tree}: DR-ID is documented as the CR carrier`, async () => {
      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain(
        "`DR-ID` carries Decision Record (`DR-*`) **and** Change Request (`CR-*`)",
      );
    });

    it(`${tree}: "unresolved" has one definition at the completion gate`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      // A single positive definition of "resolved": everything else is
      // unresolved, so a half-filled record cannot slip through.
      expect(skill).toContain("is **resolved** only when every condition below");
      expect(skill).toContain("**unresolved** and blocks completion");
      expect(skill).toContain("`Status` is `approved`, `rejected` or `superseded` (never `open`)");
    });
  }
});
