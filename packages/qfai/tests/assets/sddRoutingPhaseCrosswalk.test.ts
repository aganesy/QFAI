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
 * `solution-architect` gates. Two conforming runs could place the same blocking
 * reviewer at different points of the same sequence, which also left
 * `rerun_policy: changed-scope-dependents` with no scope to be evaluated
 * against.
 *
 * The crosswalk is now normative in SKILL.md; this suite is its drift guard.
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

  it("covers all nine fixed-order entries across the spans", async () => {
    const spans = crosswalkRows(await readSddSkill(tree))
      .map((row) => row[1] ?? "")
      .join("\n");
    for (const entry of FIXED_ORDER) {
      expect(spans, `no routing phase spans ${entry}`).toContain(entry);
    }
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

  it("states the scope `rerun_policy` is evaluated against", async () => {
    const flat = (await readSddSkill(tree)).replace(/\s+/g, " ");
    expect(flat).toContain("`rerun_policy` is evaluated against the artifacts produced inside");
    expect(flat).toContain('that span is the "changed scope" of `changed-scope-dependents`');
  });

  it("points the manifest back at the crosswalk", async () => {
    const routing = (await read(tree, "assistant/manifest/agent-routing.yml")).replace(/\s+/g, " ");
    expect(routing).toContain("### Routing Phase Crosswalk (Normative)");
  });
});
