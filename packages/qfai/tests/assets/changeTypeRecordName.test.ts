/**
 * The mandatory Change Type points at a record that exists (#616, #682, #787).
 *
 * `workflow.md` made declaring a Change Type the hard-stop first action of every
 * stage ("Do not proceed without a declared Change Type") and then filed it in
 * `09_delta.md` "Change Log (latest CL entry)". Neither name existed: the shipped
 * `09_delta.md` template names the slot `## Change Summary` and identifies entries
 * `DELTA-NNNN`, and `specPack.ts` keys its only heading-aware check on the layered
 * delta off `Change Summary`. An agent following the sentence literally wrote a
 * `## Change Log` that no template, validator or reviewer checklist knows about,
 * which also suppressed the QFAI-TRIAGE-001 warning.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const WORKFLOW = "assistant/constitution/workflow.md";
const SPEC_DELTA_TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/09_delta.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("the mandatory Change Type names a record that is actually shipped", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: workflow.md files the Change Type under the template's own names`, async () => {
      const workflow = await read(tree, WORKFLOW);

      expect(workflow).toContain("- `09_delta.md` `## Change Summary` (latest `DELTA-NNNN` entry)");
      expect(workflow).toContain("Do not proceed without a declared Change Type.");
    });

    it(`${tree}: workflow.md no longer names the orphan Change Log / CL- record`, async () => {
      const workflow = await read(tree, WORKFLOW);

      // Both terms were framework-wide orphans: `Change Log` had exactly one hit
      // (the line that named it) and `CL-NNNN` had none.
      expect(workflow).not.toContain("Change Log");
      expect(workflow).not.toMatch(/\bCL[- ]?entry\b/i);
      expect(workflow).not.toMatch(/\bCL-\d/);
    });

    it(`${tree}: the pointer resolves — the shipped delta template has that slot`, async () => {
      const template = await read(tree, SPEC_DELTA_TEMPLATE);

      expect(template).toContain("## Change Summary");
      expect(template).toContain("- Change ID: DELTA-0001");
      // The Change Type values themselves live in this section, so the pointer
      // lands on fields the agent can fill.
      expect(template).toContain("- Primary:");
      expect(template).toContain("- Tags:");
    });
  }
});
