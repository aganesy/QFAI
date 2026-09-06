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
// The crosswalk's own terminator, in the topic file that owns it. It used
// to be the heading that happened to follow the section inside `SKILL.md`,
// which stopped meaning anything once the section moved.
const NEXT_HEADING = "### Crosswalk sources";
const FIXED_ORDER_HEADING = "## Stage and Phase Order (Fixed)";

/**
 * Pin on the sequence `## Stage and Phase Order (Fixed)` is expected to declare.
 *
 * The crosswalk is checked against the order parsed out of that section, never
 * against this list, so a rename there cannot keep agreeing with a stale table.
 * This pin exists only so the parser cannot pass vacuously by returning a short
 * or empty list; editing the fixed order means editing this list and the
 * crosswalk together.
 */
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

type Phase = {
  id?: string;
  blocking_agents?: string[];
  mandatory_agents?: string[];
  rerun_policy?: string;
};

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
 * The fixed order as the skill itself declares it: the entries of the fenced
 * block under `## Stage and Phase Order (Fixed)`, in order, with the `(per spec)`
 * annotations dropped.
 *
 * Parsed rather than transcribed. A constant copied out of the same document
 * would keep matching a crosswalk that went stale when only that section was
 * renamed — exactly the drift this suite exists to catch.
 */
function fixedOrder(skill: string): string[] {
  const start = skill.indexOf(FIXED_ORDER_HEADING);
  expect(start, `heading not found: ${FIXED_ORDER_HEADING}`).toBeGreaterThan(-1);
  const fenced = /```\r?\n([\s\S]*?)```/.exec(skill.slice(start));
  expect(fenced?.[1], `no fenced block under ${FIXED_ORDER_HEADING}`).toBeTruthy();
  const entries = (fenced?.[1] ?? "")
    .split("->")
    .map((entry) =>
      entry
        .replace(/\(per spec\)/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((entry) => entry.length > 0);
  // Guards the partition assertion below against passing on an empty parse.
  expect(entries.length, `${FIXED_ORDER_HEADING} parsed to too few entries`).toBeGreaterThan(1);
  return entries;
}

/**
 * Every fixed-order entry named in a span cell, ordered by where it appears.
 * Repeats are all returned, so a duplicated entry fails the partition
 * assertion instead of collapsing into a single hit.
 */
function spanEntries(cell: string, order: readonly string[]): string[] {
  const hits: { entry: string; at: number }[] = [];
  for (const entry of order) {
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

/**
 * The skill's contract text and the crosswalk topic file, in that order.
 *
 * The crosswalk is normative but it is not contract text: it is detail, which
 * is where a `SKILL.md` puts it (`assets.test.ts` — "move a topic into
 * references/"), and `SKILL.md` points at it rather than restating it. This
 * guard's subject spans both — the table lives in the topic file, the fixed
 * order it partitions lives in `SKILL.md` — so it reads both. Skill first, so
 * a section extraction still ends at the next `SKILL.md` heading rather than
 * running into the appended file.
 */
const readSddSkill = async (tree: string): Promise<string> => {
  const [skill, crosswalk] = await Promise.all([
    read(tree, "assistant/skills/qfai-sdd/SKILL.md"),
    read(tree, "assistant/skills/qfai-sdd/references/sdd-routing-phase-crosswalk.md"),
  ]);
  return `${skill}
${crosswalk}`;
};

describe.each(QFAI_TREES)("%s — qfai-sdd routing phases resolve to fixed-order phases", (tree) => {
  it("gives every routing phase ID exactly one crosswalk row", async () => {
    const [phases, skill] = await Promise.all([sddRoutingPhases(tree), readSddSkill(tree)]);
    const ids = phases.map((phase) => phase.id);
    expect(ids).toEqual(["slice-and-scope", "design", "review"]);

    const rows = crosswalkRows(skill);
    expect(rows.map((row) => row[0])).toEqual(ids.map((id) => `\`${id}\``));
  });

  it("reads the fixed order from the section the crosswalk cites", async () => {
    // Fails if `## Stage and Phase Order (Fixed)` is edited on its own: the pin
    // names what the parse must yield, and the partition below then re-checks the
    // crosswalk against the parsed sequence rather than against the pin.
    expect(fixedOrder(await readSddSkill(tree))).toEqual(FIXED_ORDER);
  });

  it("partitions the nine fixed-order entries across the spans, in order", async () => {
    const skill = await readSddSkill(tree);
    const order = fixedOrder(skill);
    const spanned = crosswalkRows(skill).flatMap((row) => spanEntries(row[1] ?? "", order));
    // One assertion covers all three invariants the section states: every entry
    // is spanned, none is spanned twice, and the spans concatenate back into the
    // fixed order, so no span may be reordered or interleaved with another.
    expect(spanned).toEqual(order);
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

  it("keeps the spec drafter routed into the span where it drafts", async () => {
    // Span membership is a floor, not an exclusive assignment. The Triage span
    // ends before any spec edit, so a `requirements-analyst` mandatory only
    // there could never perform the drafting `Stage minimum roles` assigns it.
    const [phases, skill] = await Promise.all([sddRoutingPhases(tree), readSddSkill(tree)]);
    const mandatory = (id: string): string[] =>
      phases.find((phase) => phase.id === id)?.mandatory_agents ?? [];
    expect(mandatory("slice-and-scope")).toContain("requirements-analyst");
    expect(mandatory("design")).toContain("requirements-analyst");

    const flat = skill.replace(/\s+/g, " ");
    expect(flat).toContain("Span membership partitions the fixed order, not the agent roster");
    expect(flat).toContain("never a ban on running in another span");
  });

  it("routes a Triage `REVISE` back to the author of the table", async () => {
    // `failed-agents-only` re-ran the blocking planner alone against a table
    // only `requirements-analyst` can amend, so the same verdict repeated.
    const [phases, skill] = await Promise.all([sddRoutingPhases(tree), readSddSkill(tree)]);
    expect(phases.find((phase) => phase.id === "slice-and-scope")?.rerun_policy).toBe(
      "changed-scope-dependents",
    );
    expect(skill.replace(/\s+/g, " ")).toContain(
      "returns the table to `requirements-analyst`, its author, and the planner re-evaluates the amended table",
    );
  });

  it("keeps a serial repair path for shared contracts in batch mode", async () => {
    // Phase 2c MUST fix the contract or the obligation in place; the batch
    // prohibition on editing shared artifacts would otherwise leave a worker
    // whose fix belongs to the contract with nothing but a weakened obligation.
    const flat = (await readSddSkill(tree)).replace(/\s+/g, " ");
    expect(flat).toContain("neither edits the contract nor weakens the obligation to fit");
    expect(flat).toContain(
      "re-runs Phase 2 Slice through Phase 2c for every spec whose obligations read the amended contract",
    );
  });

  it("delegates the shared-contract repair to the role that drafts contracts", async () => {
    // `Stage minimum roles` reserves contract drafting for one agent and bars the
    // orchestrator from drafting a primary artifact, so a repair path the
    // orchestrator applies itself would break the mandatory delegation. The
    // drafter is read out of that list rather than named here, so renaming the
    // role there cannot leave this path pointing at an agent that no longer
    // drafts contracts.
    const skill = await readSddSkill(tree);
    const drafter = /- `([a-z-]+)` drafts structural \/ contract \/ architecture sections/.exec(
      skill,
    )?.[1];
    expect(drafter, "`Stage minimum roles` names no contract drafter").toBeTruthy();

    const flat = skill.replace(/\s+/g, " ");
    expect(flat).toContain(
      `the orchestrator suspends the fan-out and delegates the contract fix once to \`${drafter ?? ""}\``,
    );
    expect(flat).toContain(
      "the orchestrator integrates that output and never drafts the amendment",
    );
  });

  it("points the manifest back at the crosswalk", async () => {
    const routing = (await read(tree, "assistant/manifest/agent-routing.yml")).replace(/\s+/g, " ");
    expect(routing).toContain("### Routing Phase Crosswalk (Normative)");
  });
});
