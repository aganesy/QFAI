/**
 * `[RE-OPEN]` gated four reviewer agents and four skill completion reports
 * while existing only as a phrase in the Delta Rejected Guard.
 *
 * The guard demanded a record that "references the prior DR-ID, states what
 * changed, and includes explicit approval", but `07_Decisions.md` had no status
 * value for it and no field for any of the three, and `09_delta.md`'s
 * `## Rejected` block — the section the guard is about — had no slot pointing at
 * one. A reviewer told to block without a RE-OPEN had nothing to look at, so the
 * gate degraded to prose inspection.
 *
 * These cases hold the shipped shape in both trees: the templates carry the
 * fields, and the baseline states the gate in a form a reviewer can check.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const DECISIONS = "assistant/skills/qfai-sdd/templates/specs/spec/07_Decisions.md";
const DELTA = "assistant/skills/qfai-sdd/templates/specs/spec/09_delta.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function read(tree: string, rel: string): Promise<string> {
  return flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));
}

describe.each(QFAI_TREES)("%s", (tree) => {
  it("gives the re-open record a status value and its three fields", async () => {
    const decisions = await read(tree, DECISIONS);
    expect(decisions).toContain("rejected | re-open");
    expect(decisions).toContain("- Re-opens:");
    expect(decisions).toContain("- Approved by:");
    expect(decisions).toContain("- Approved at:");
  });

  it("names the codes that make the record checkable", async () => {
    const decisions = await read(tree, DECISIONS);
    for (const code of [
      "QFAI-DECISION-001",
      "QFAI-DECISION-002",
      "QFAI-DECISION-003",
      "QFAI-DECISION-004",
      "QFAI-DECISION-005",
      // The candidate cross-check and the duplicate-id check: the guard's own
      // sentence is enforced by matching the two candidate lists, not only by
      // reading the back-reference someone remembered to write.
      "QFAI-DECISION-006",
      "QFAI-DECISION-007",
    ]) {
      expect(decisions).toContain(code);
    }
  });

  it("tells the delta which code fires when a rejected candidate is re-adopted", async () => {
    const delta = await read(tree, DELTA);
    expect(delta).toContain("QFAI-DECISION-006");
  });

  it("puts the back-reference in the `## Rejected` block the guard is about", async () => {
    const delta = await read(tree, DELTA);
    // Bounds are resolved before slicing: an `indexOf` miss returns -1 and
    // `slice(-1, …)` would search a different region than this case is about.
    const start = delta.indexOf("## Rejected");
    const end = delta.indexOf("## Impact");
    expect(start, "the Rejected heading moved").toBeGreaterThanOrEqual(0);
    expect(end, "the section after Rejected moved").toBeGreaterThan(start);
    const rejected = delta.slice(start, end);
    expect(rejected).toContain("- Re-opened by:");
    expect(rejected).toContain("Status: re-open");
  });

  it("states the gate in a form a reviewer can verify", async () => {
    const baseline = await read(tree, BASELINE);
    expect(baseline).toContain("`Status: re-open`");
    expect(baseline).toContain("`Re-opens:`");
    expect(baseline).toContain(
      "no candidate listed under a spec's `## Rejected` may appear under `## Adopted`",
    );
    // The failure mode the issue named: an assertion made outside the record.
    expect(baseline).toContain("does not satisfy the guard");
  });
});
