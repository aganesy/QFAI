/**
 * `qfai-sdd`'s routing phase IDs matched none of its nine fixed phases.
 *
 * `agent-routing.yml` declares `slice-and-scope`, `design` and `review` for
 * this skill, while `skills/qfai-sdd/SKILL.md` declares a fixed order of nine
 * stages and phases and repeats it as a memory invariant. Nothing related the
 * two vocabularies: `slice-and-scope` appeared exactly once in the whole tree,
 * in the manifest that introduced it.
 *
 * Routing is what makes an agent mandatory and blocking, so an orchestrator had
 * no rule saying which of the nine phases `design`'s blocking
 * `solution-architect` gates, and two conforming runs could place the same
 * blocking reviewer at different points of the same sequence.
 *
 * The crosswalk is now normative in SKILL.md; this suite is its drift guard. It
 * pins the partition (each fixed-order entry in exactly one span, spans in
 * order), the two exceptions that bound the gates, and the fact that the spans
 * scope blocking only — `rerun_policy` keeps the manifest's own semantics.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CROSSWALK_HEADING = "### Routing Phase Crosswalk (Normative)";
const NEXT_HEADING = "### Reviewer Gate (MUST)";

/** The nine entries `## Stage and Phase Order (Fixed)` declares, in order. */
const FIXED_ORDER = [
  "Stage 0 Preflight",
  "Stage 1 Triage",
  "Phase 0 Contracts-first",
  "Phase 1 Outline",
  "Phase 2 Slice",
  "Phase 2b Seed tdd/test-list.md",
  "Phase 2c Obligation reconciliation",
  "Phase 3 Plan finalize",
  "Phase 4 Delta update",
];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

type Phase = { id?: string; blocking_agents?: string[] };

async function sddRoutingPhases(tree: string): Promise<Phase[]> {
  const raw = await read(tree, "assistant/manifest/agent-routing.yml");
  const parsed: unknown = parseYaml(raw);
  const routing =
    typeof parsed === "object" && parsed !== null && "routing" in parsed
      ? (parsed as { routing?: unknown }).routing
      : undefined;
  expect(Array.isArray(routing), `${tree}: agent-routing.yml has no routing list`).toBe(true);
  const routes = Array.isArray(routing) ? routing : [];
  const route = routes.find(
    (entry): entry is { skill: string; phases?: Phase[] } =>
      typeof entry === "object" &&
      entry !== null &&
      "skill" in entry &&
      (entry as { skill?: unknown }).skill === "qfai-sdd",
  );
  expect(route, `${tree}: agent-routing.yml has no qfai-sdd route`).toBeDefined();
  return route?.phases ?? [];
}

/** Splits a markdown table row into trimmed cells. */
const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

/**
 * Every `FIXED_ORDER` entry named in a span cell, ordered by where it appears.
 * Repeats are all returned, so a duplicated entry fails the partition
 * assertion instead of collapsing into a single hit.
 */
function spanEntries(cell: string): string[] {
  const hits: { entry: string; at: number }[] = [];
  for (const entry of FIXED_ORDER) {
    for (let at = cell.indexOf(entry); at !== -1; at = cell.indexOf(entry, at + entry.length)) {
      hits.push({ entry, at });
    }
  }
  return hits.sort((a, b) => a.at - b.at).map((hit) => hit.entry);
}

/**
 * Returns the crosswalk table's data rows (header and separator dropped).
 * Both markers are asserted before slicing so a renamed heading names the
 * section that moved instead of surfacing as a confusing row count.
 */
function crosswalkRows(skill: string): string[][] {
  const start = skill.indexOf(CROSSWALK_HEADING);
  const end = skill.indexOf(NEXT_HEADING);
  expect(start, `heading not found: ${CROSSWALK_HEADING}`).toBeGreaterThan(-1);
  expect(end, `heading not found or out of order: ${NEXT_HEADING}`).toBeGreaterThan(start);
  return skill
    .slice(start, end)
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .map(cells)
    .slice(2);
}

const readSddSkill = (tree: string): Promise<string> =>
  read(tree, "assistant/skills/qfai-sdd/SKILL.md");

describe.each(QFAI_TREES)("%s — qfai-sdd routing phases resolve to fixed-order phases", (tree) => {
  it("gives every routing phase ID exactly one crosswalk row", async () => {
    const [phases, skill] = await Promise.all([sddRoutingPhases(tree), readSddSkill(tree)]);
    const ids = phases.map((phase) => phase.id);
    expect(ids).toEqual(["slice-and-scope", "design", "review"]);

    const rows = crosswalkRows(skill);
    expect(rows.map((row) => row[0])).toEqual(ids.map((id) => `\`${id}\``));
  });

  it("partitions the nine fixed-order entries across the spans, in order", async () => {
    const spanned = crosswalkRows(await readSddSkill(tree)).flatMap((row) =>
      spanEntries(row[1] ?? ""),
    );
    // One assertion covers all three invariants the section states: every entry
    // is spanned, none is spanned twice, and the spans concatenate back into the
    // fixed order, so no span may be reordered or interleaved with another.
    expect(spanned).toEqual(FIXED_ORDER);
  });

  it("names each phase's blocking agent in the row that owns it", async () => {
    const [phases, skill] = await Promise.all([sddRoutingPhases(tree), readSddSkill(tree)]);
    const rows = crosswalkRows(skill);
    for (const [index, phase] of phases.entries()) {
      const gate = rows[index]?.[2] ?? "";
      expect(phase.blocking_agents ?? [], `phase ${phase.id ?? index}`).not.toHaveLength(0);
      for (const agent of phase.blocking_agents ?? []) {
        expect(gate, `phase ${phase.id ?? index} gate cell`).toContain(`\`${agent}\``);
      }
    }
  });

  it("keeps `changed-scope-dependents` scoped by input dependency, not by span", async () => {
    const flat = (await readSddSkill(tree)).replace(/\s+/g, " ");
    expect(flat).toContain(
      "`changed-scope-dependents` re-runs every agent whose inputs the changed artifacts touched",
    );
    expect(flat).toContain("so a span boundary never caps the scope");
  });

  it("exempts contract-scoped runs from the `slice-and-scope` Triage gate", async () => {
    const flat = (await readSddSkill(tree)).replace(/\s+/g, " ");
    expect(flat).toContain("Contract-scoped runs carry no Triage gate.");
    expect(flat).toContain("the `delivery-planner` Triage gate does not apply");
    expect(flat).toContain(
      "A Triage table persisted by an earlier run MUST NOT be replayed to satisfy it",
    );
  });

  it("fans out only the per-spec tail of the `design` span in batch mode", async () => {
    const flat = (await readSddSkill(tree)).replace(/\s+/g, " ");
    expect(flat).toContain("Batch mode fans out only the per-spec tail of `design`.");
    expect(flat).toContain(
      "Phase 0 Contracts-first and Phase 1 Outline are shared work run once per batch",
    );
    expect(flat).toContain("only Phase 2 Slice through Phase 4 Delta update fan out per spec");
  });

  it("points the manifest back at the crosswalk", async () => {
    const routing = (await read(tree, "assistant/manifest/agent-routing.yml")).replace(/\s+/g, " ");
    expect(routing).toContain("### Routing Phase Crosswalk (Normative)");
  });
});
