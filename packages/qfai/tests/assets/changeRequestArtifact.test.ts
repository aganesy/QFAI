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
        "- Superseded by:",
      ]) {
        expect(template).toContain(field);
      }
      expect(template).toContain("open | approved | rejected | superseded");
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

    it(`${tree}: "unresolved" is defined at the completion gate`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain('"unresolved"');
      expect(skill).toContain("`.qfai/decisions/CR-*.md` whose `Status` is `open`");
    });
  }
});
