/**
 * The `/qfai-sdd` instructions must agree with the validator and with each
 * other.
 *
 * None of these disagreements stops a run. Each one makes an agent pick a
 * reading and then defend it in review, which is the most expensive way for a
 * document to be wrong: the cost lands on whoever arrives last.
 *
 * Three are pinned here. The fourth — the `slice-and-scope` rerun policy — is
 * already held by `sddRoutingPhaseCrosswalk.test.ts`.
 *
 * 1. Repeated `## Triage`. The delta templates and the Phase 4 checklist said
 *    only the first `## Triage` heading is read. Every section is, so an agent
 *    that followed them merged headings in an append-only ledger — rewriting
 *    past entries and conflicting with parallel branches. What those documents
 *    say is held by `sddTemplateCoverage.test.ts`; what is checked here is the
 *    behaviour they now describe, read off the validator itself.
 * 2. Work Orders Summary columns. The evidence template fixed its own 6-column
 *    schema while citing the shared 7-column one as its source, dropping
 *    `Agent instance` — the column that makes an author-reviewer collision
 *    detectable from the evidence alone.
 * 3. When UI roles are owed. Two sites said "UI-bearing" and neither said what
 *    decides it, so the target spec's surface and the files a run edited were
 *    both defensible readings.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateTriageSection } from "../../src/core/validators/specPack.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SDD = "assistant/skills/qfai-sdd";
const EVIDENCE_TEMPLATE = `${SDD}/templates/evidence/sdd-spec.md`;
const SKILL = `${SDD}/SKILL.md`;
const BASELINE = "assistant/constitution/shared-skill-delegation-baseline.md";

function read(tree: string, relative: string): Promise<string> {
  return readFile(path.join(repoRoot, tree, relative), "utf-8");
}

/** The `| Step | …` header of the first Work Orders table in a document. */
function workOrdersColumns(markdown: string): string[] {
  const header = /^\|\s*Step\s*\|.*\|\s*$/m.exec(markdown)?.[0];
  if (!header) return [];
  return header
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

describe("the delta instructions match the Triage validator", () => {
  // The oracle, not a string match: three canonical sections, each naming its
  // round, with the operation grammar broken in the LAST one. A validator that
  // read only the first would return nothing.
  it("reports a broken row in the third `## Triage` section", () => {
    const row = (sub: string) =>
      [
        "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| -------- | ------- | ------------- | --------- | ------ | ----------- | --------- |",
        `| REQ-0001 | a thing | spec-0001     | UPDATE    | ${sub} | -           | why       |`,
      ].join("\n");
    const text = [
      "# 09 Delta",
      "",
      "## Change Summary",
      "",
      "- a change",
      "",
      "## Triage (2026-01-01)",
      "",
      row("APPEND"),
      "",
      "## Triage (2026-01-02)",
      "",
      row("APPEND"),
      "",
      "## Triage (2026-01-03)",
      "",
      row("SIDEWAYS"),
      "",
    ].join("\n");

    const codes = validateTriageSection(text, "spec-0001/09_delta.md").map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRIAGE-004");
  });

  // The heading grammar the instructions now tell an author to use. A trailer
  // in any other form is read by no Triage validator, which is the failure the
  // instructions exist to prevent.
  it("accepts a parenthesised round and rejects any other trailer", () => {
    const canonical = "# 09 Delta\n\n## Change Summary\n\n- a change\n\n## Triage (2026-01-01)\n";
    const dashed = "# 09 Delta\n\n## Change Summary\n\n- a change\n\n## Triage — 2026-01-01\n";

    // A canonical section with no table is a section the validator read.
    expect(validateTriageSection(canonical, "spec-0001/09_delta.md").map((i) => i.code)).toContain(
      "QFAI-TRIAGE-002",
    );
    // A dashed trailer is no section at all, and is reported as unchecked.
    const dashedCodes = validateTriageSection(dashed, "spec-0001/09_delta.md").map((i) => i.code);
    expect(dashedCodes).toContain("QFAI-TRIAGE-008");
    expect(dashedCodes).not.toContain("QFAI-TRIAGE-002");
  });
});

describe("the spec evidence template carries the shared Work Orders schema", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: its columns are the baseline's, in the baseline's order`, async () => {
      const [template, baseline] = await Promise.all([
        read(tree, EVIDENCE_TEMPLATE),
        read(tree, BASELINE),
      ]);
      const expected = workOrdersColumns(baseline);

      expect(expected).toContain("Agent instance");
      expect(workOrdersColumns(template)).toEqual(expected);
    });

    it(`${tree}: it admits PENDING rather than forcing an unrun gate to REVISE`, async () => {
      const text = await read(tree, EVIDENCE_TEMPLATE);
      expect(text).toMatch(/`Status` accepts exactly `PASS`, `REVISE` or `PENDING`/);
      expect(text).not.toMatch(/no `PENDING`/);
    });

    it(`${tree}: SKILL.md does not call the shared schema a 6-column one`, async () => {
      expect(await read(tree, SKILL)).not.toMatch(/6-column/);
    });
  }
});

describe("the UI trigger is stated once and routed on", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: SKILL.md keys it on the target spec, not on what the run edited`, async () => {
      const text = await read(tree, SKILL);
      expect(text).toMatch(/UI-bearing \(MUST\) is a property of the \*\*target spec\*\*/);
      expect(text).toMatch(/surface_type:\s*\n?ui-bearing/);
      expect(text).toMatch(/qfai\.config\.yaml#prototyping\.primarySpecId/);
    });

    it(`${tree}: neither role site restates the condition in its own words`, async () => {
      const text = await read(tree, SKILL);
      expect(text).toContain(
        "`product-experience-architect` is added when the target spec is UI-bearing (below).",
      );
      expect(text).toContain(
        "`product-surface-reviewer` (the target spec is UI-bearing, as `Stage minimum roles` above defines it)",
      );
    });

    it(`${tree}: the routing manifest names the same condition beside the key`, async () => {
      const text = await read(tree, "assistant/manifest/agent-routing.yml");
      const sdd = text.slice(text.indexOf("- skill: qfai-sdd"), text.indexOf("- skill: qfai-atdd"));
      expect(sdd).toMatch(/TARGET SPEC is\s*\n?\s*#\s*UI-bearing/);
      expect(sdd).toContain("This key says");
    });
  }
});
