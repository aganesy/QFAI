/**
 * Splitting a matrix-shaped `TC-*` had a deadline (`before RED begins`) but no
 * owning phase.
 *
 * `/qfai-sdd` Phase 2b seeded one row per TC and named no split criterion, so a
 * matrix TC reached `/qfai-implement` un-decomposed by construction. Phase Red
 * then ordered the agent to split the row — a write the Drift Protocol reserves
 * for the upstream owner, since `/qfai-implement` owns the `Status`, `DR-ID`
 * and `Evidence` cells and nothing else. Obeying one file broke the other, and
 * the only move that broke neither was to proceed on a RED the rules call
 * invalidated.
 *
 * These tests pin the owner (Phase 2b), the identical criterion wording in both
 * files, and the bounded residual path Phase Red now takes instead of splitting.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CHECKLISTS = "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md";
const TRACE = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const SELECTOR = "assistant/skills/qfai-implement/references/selector-granularity.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
const SDD_SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md";
const SUITE = "assistant/skills/qfai-implement/references/relevant-test-suite.md";
const DRIFT = "assistant/constitution/drift-protocol.md";

/** The prose wraps differently per file, so compare on collapsed whitespace. */
const flat = (value: string): string => value.replace(/\s+/g, " ");

/**
 * A shipped file's text, already flattened.
 *
 * Flattening here and not at the call sites is the point: a caller that reads
 * through this helper cannot forget it, and a second `flat()` on the result is
 * dead weight that suggests the helper does not already do it.
 */
const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

/** The criterion both files must state identically so they cannot drift. */
const CRITERION =
  "MUST be split across multiple TDD rows before RED begins — one falsifying oracle per row, " +
  "one row per independently observable boundary.";

const section = (content: string, start: string, end: string): string => {
  const from = content.indexOf(start);
  expect(from).toBeGreaterThanOrEqual(0);
  const to = content.indexOf(end, from + start.length);
  expect(to).toBeGreaterThan(from);
  return content.slice(from, to);
};

describe.each(TREES)("%s", (tree) => {
  it("gives Phase 2b the split criterion, in the rules file's own words", async () => {
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain(CRITERION);
    // Without this the split would produce rows that no longer cover the TC.
    expect(phase2b).toContain("carries that `TC-*` in `TC-Refs`");
  });

  it("states the same criterion in the rules file that defines the ledger", async () => {
    expect(await read(tree, TRACE)).toContain(CRITERION);
  });

  it("names Phase 2b as the only phase that may create a row", async () => {
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain("only one that may add, remove or re-scope a row");
    expect(phase2b).toContain(
      "`Status`, `DR-ID`, `Evidence` and `Blocked-By` cells unconditionally",
    );
    // The exclusion is the load-bearing half: the Drift Protocol also carves
    // out `Test file` / `Selector` conditionally, so "cells, never rows" is
    // what actually keeps the split upstream.
    expect(phase2b).toContain("and no rows at all");
  });

  it("seeds the split criterion on the two surfaces Phase 2b actually follows", async () => {
    // The checklist reference is the detailed guide; the numbered process in
    // SKILL.md and the copied template are what a Phase 2b run reads first, and
    // both said "one row per coverage-target TC" with no split criterion — so a
    // matrix TC still reached RED as a single row by construction.
    const skill = await read(tree, SDD_SKILL);
    expect(skill).toContain("**A matrix-shaped TC takes more than one row**");
    expect(skill).toContain("one row per independently observable boundary");

    const template = await read(tree, TEMPLATE);
    expect(template).toContain("**matrix-shaped TC takes more than one row**");
    expect(template).toContain("row per independently observable boundary");
    // The rows are still one-per-TC in the common case; the split is the addition.
    expect(template).toContain("**one row per coverage-target TC**");
  });

  it("defines what happens to a matrix row that has already progressed", async () => {
    // The delta rule keeps an unchanged TC's cells, so without this a `done`
    // matrix row could neither be split (delta) nor reach the residual CR path
    // (Phase Red never re-selects it).
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain("already past `todo` is the delta rule's exception");
    expect(phase2b).toContain("and `done` included");
    expect(phase2b).toContain("the one boundary its recorded RED observed");
    expect(phase2b).toContain("one new `todo` row is appended per remaining boundary");
  });

  it("picks the kept boundary from the record when the row never ran a RED", async () => {
    // The residual path blocks the row at selection, ahead of RED, so the
    // common `blocked` case has no observation to narrow to; demanding one
    // either stalls Phase 2b or invites a fabricated observation.
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain("**A `blocked` row has no such observation");
    expect(phase2b).toContain("Do not demand a recorded RED there and do not invent one");
    expect(phase2b).toContain("the driving `CR-*` names first among the ones it says the row");
    expect(phase2b).toContain("`06_Test-Cases.md` lists them under that `TC-*`");
    // A `falsifiability` row records a mutation trio in place of a natural RED,
    // so `red` and `done` rows on that branch have no first failing assert either.
    expect(phase2b).toContain(
      "**Read the row's evidence branch before assuming a natural RED exists at all**",
    );
    expect(phase2b).toContain("Keep the boundary the predicate its `Satisfied-by` names covers");
  });

  it("carries the unobserved-RED selection rules into project_memory", async () => {
    // The short form is what a Phase 2b run summarises from, and it demanded
    // "the boundary its RED observed" unconditionally — which the two normal
    // cases cannot supply: a `blocked` row was parked at selection ahead of
    // RED, and a `falsifiability` row records a mutation trio in place of one.
    const skill = await read(tree, SDD_SKILL);
    const memory = skill.slice(skill.indexOf("project_memory:"));

    expect(memory).toContain("an observation is never invented");
    expect(memory).toContain("have no first failing assert at all");
    // `CR-*` is escaped as `CR-\*` by the markdown formatter here, so pin the
    // ordering rule around it rather than the literal token.
    expect(memory).toContain("so the kept boundary is the one the driving CR");
    expect(memory).toContain("names first, in the order that row's obligation source lists them");
    expect(memory).toContain("the boundary the predicate its Satisfied-by names covers");
    // The unconditional form the detailed checklist had already dropped.
    expect(memory).not.toContain("narrow its Selector to the boundary its RED observed");
  });

  it("re-scopes a legal non-TC row here too, rather than nowhere", async () => {
    // Phase Red judges the selector of whatever row it selected, and `E2E` /
    // `API` rows are legal in this ledger. Scoped to `TC-*`, the owner's split
    // procedure could not execute the approved `CR-*` those rows arrive on, and
    // no other actor may: `/qfai-atdd` never writes the ledger and
    // `/qfai-implement` owns cells, not rows.
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain("**The shape rule is not `TC-*`-only");
    expect(phase2b).toContain(
      "**originating a row and re-scoping one are different writes, and this phase owns both at every `Layer`**",
    );
    // The boundaries have to come from the column the row's layer selects.
    expect(phase2b).toContain("`US-Refs` from that `US-*`'s acceptance criteria");
    expect(phase2b).toContain("`CON-API-Refs` from the operation its contract declares");
    // And the split must not move an obligation into a column its layer rejects.
    expect(phase2b).toContain("`TDDLIST_OBLIGATION_LAYER_MISMATCH`");
    // Seeding is unchanged: only coverage-target TCs originate rows.
    expect(phase2b).toContain("Seeding still runs off coverage-target TCs alone");
    expect(await read(tree, SDD_SKILL)).toContain(
      "re-scoping is this phase's write at every Layer",
    );
  });

  it("names the ledger parking as step 2's one exception in the protocol itself", async () => {
    // Phase Red places the `todo -> blocked` write at Drift Protocol step 2,
    // whose own text called creating the CR file "the only write this step
    // makes". Obeying one left the row looping at `todo` across the approval
    // wait; obeying the other broke a mandatory protocol.
    const drift = await read(tree, DRIFT);

    expect(drift).toContain(
      "Creating this file is the only write this step makes **outside the raiser's own whitelisted cells**",
    );
    expect(drift).toContain(
      "The one exception is **parking this CR's blocked set in the execution ledger**",
    );
    // Bounded: the whitelisted cell pair, on the enumerated rows, and nothing else.
    expect(drift).toContain("writes nothing else: no other cell, no other file, and no row added");
    expect(drift).toContain("`#allowed-exceptions-minimal-whitelist`");
    // And placed at step 2 for the reasons Phase Red gives, not by preference.
    expect(drift).toContain("Step 3's wait for approval spans sessions");
    expect(drift).toContain("after the owner rerun the write has no correct target");

    // The downstream instruction now points back at that named exception.
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );
    expect(red).toContain("the parking is named there as its single exception");
  });

  it("migrates an existing ledger's columns instead of only seeding new ones", async () => {
    // The template is copied only when the ledger is absent, so an upgraded
    // project keeps its eight-column table and the residual path's
    // `Blocked-By` write has no cell to land in.
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain(
      "**Migrate an existing ledger's columns to the template's, every run.**",
    );
    expect(phase2b).toContain("`TDDLIST_BLOCKED_MISSING_REF`");
    expect(await read(tree, SDD_SKILL)).toContain(
      "**migrate an existing ledger's columns to the template's**",
    );
    expect(await read(tree, TEMPLATE)).toContain("Phase 2b's column migration");
  });

  it("re-issues status, evidence and verdicts together on a narrowed row", async () => {
    // Narrowing `Selector` changes the row's identity, which completion item 10
    // matches against the evidence entry and the verdicts hash over; keeping the
    // status would leave evidence naming a selector the row no longer has.
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain(
      "in every case — including when its recorded RED/GREEN would still hold against the narrowed selector",
    );
    expect(phase2b).toContain("`Audited evidence hash`");
    expect(phase2b).not.toContain("unless its recorded RED/GREEN still holds");
    // The reset itself is a cell write, so it stays with the cells' owner.
    expect(phase2b).toContain("**This phase does not write that reset**, only the row identity");
    // Relative to `qfai-sdd/references/`, so the sibling skill needs `../../`.
    expect(phase2b).toContain("`../../qfai-implement/references/change-request-reset.md`");
  });

  it("carries the Phase 2b exceptions into project_memory", async () => {
    // The short form is what a Phase 2b run summarises from; left at
    // "one row per coverage-target TC" it re-derives the un-split ledger.
    const skill = await read(tree, SDD_SKILL);
    const memory = skill.slice(skill.indexOf("project_memory:"));

    expect(memory).toContain("one row per independently observable boundary");
    expect(memory).toContain("always have the kept row re-executed");
    expect(memory).toContain("columns are migrated to the template's");
  });

  it("keeps every downstream row-creation path upstream too", async () => {
    // Phase 2b claims to be the only row author, so the two paths that used to
    // open rows downstream have to hand off, or the claim is false where an
    // agent actually reads it.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("this skill does not open it");
    expect(skill).not.toContain("A newly discovered scope gap opens a **new** `test-list.md` row");

    const suite = await read(tree, SUITE);
    expect(suite).toContain("**filed upstream, not here**");
    expect(suite).toContain("This skill owns cells, never rows.");
  });

  it("makes the blocked row writable by the skill the whitelist binds", async () => {
    // `Status = blocked` with no blocker is `TDDLIST_BLOCKED_MISSING_REF`, and
    // the seeded ledger carried no `Blocked-By` column, so the residual path
    // asked for a write no shipped rule allowed.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("`Status`, `DR-ID`, `Evidence` and `Blocked-By` cells unconditionally");
    const trace = await read(tree, TRACE);
    expect(trace).toContain(
      "owns the `Status`, `DR-ID`, `Evidence` and `Blocked-By` cells unconditionally",
    );
    // `Test file` / `Selector` are separately carved out, but only while their
    // stated condition holds; the exclusion sentence is what still keeps rows
    // out of the owned set.
    expect(trace).toContain("It owns nothing else");

    const template = await read(tree, TEMPLATE);
    // Seeded by the row owner, so blocking a row fills a cell, never adds a column.
    // The seeded header carries the column; its position is not the claim —
    // main's ledger grew US-Refs / CON-API-Refs / Owning module between
    // `Evidence` and it.
    expect(template).toContain("| Blocked-By |");
    expect(template).toContain("`Blocked-By` is an **optional** column, seeded here");
  });

  it("stops Phase Red ordering the split it has no authority to write", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    // The instruction that contradicted the Drift Protocol whitelist.
    expect(red).not.toContain("Split the row per `#selector-granularity-must` before continuing");
    expect(red).toContain("**This skill does not split it.**");
    expect(red).toContain("Never split in place");

    // Step 3c offered the same in-place split as a way to get one trio per
    // selector entry, which routed around the rule the rest of the phase states.
    expect(red).not.toContain("or split the row before the handoff");
    expect(red).toContain("**and never split the row here to get one**");
  });

  it("routes the residual matrix shape through a Change Request and a blocked row", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    // Fully qualified: `#when-drift-is-detected` is not a heading of SKILL.md,
    // so a bare fragment resolves to nothing and drops the template, the wait
    // for approval and the owner rerun.
    expect(red).toContain(
      "`.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected`",
    );
    expect(red).toContain("wait for explicit user approval");
    expect(red).toContain("write `todo -> blocked` with that `CR-*` in `Blocked-By`");
  });

  it("blocks the residual row before the approval wait, not after the rerun", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    // The approval wait spans sessions: a row left at `todo` across it is
    // re-selected every pass, and after the rerun Phase 2b has already
    // re-scoped the row the write was aimed at.
    expect(red).toContain(
      "at the protocol's step 2, ahead of its step 3 wait for approval, never after the owner rerun",
    );
    expect(red).toContain("The row leaves `blocked` only through that owner rerun");
    expect(red).toContain("returns it to `todo`");
  });

  it("leaves the blocked row's reset with the cells' owner, after the rerun", async () => {
    // Phase 2b writes row identity only, so the `blocked -> todo` reset and the
    // `DR-ID` / `Blocked-By` cells it comes with belong to this skill's
    // Change-Request preflight — running one without the other either has
    // `/qfai-sdd` write cells it does not own or strands the row at `blocked`.
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    expect(red).toContain("**and the preflight that follows it**, in that order");
    expect(red).toContain("Phase 2b writes row identity alone");
    expect(red).toContain("Stage 0 Change-Request preflight then returns it to `todo`");
    expect(red).toContain("`references/change-request-reset.md`");
  });

  it("reports an already-blocked named row instead of re-judging its shape", async () => {
    // The named-row rule selects by id whatever the status, so a retry during
    // the approval wait would otherwise file a second `CR-*` for the same
    // matrix and aim a `todo -> blocked` write at a row that is not `todo`.
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    expect(red).toContain(
      "**A named `TDD-ID` that is already `blocked` is reported, never re-judged.**",
    );
    expect(red).toContain("Return that row's existing `Blocked-By` as this id's outcome");
    // Scoped to the shape judgement: step 1 also selects `review-fix` rows,
    // which are not `todo` and must still reach step 3b and Phase Green.
    expect(red).toContain("this narrows that judgement and nothing else");
    expect(red).toContain("a `review-fix` row selected for rework is not a `todo` row");
  });

  it("requires the `Blocked-By` column to exist before the row is blocked", async () => {
    // An upgraded eight-column ledger only gains the column on a `/qfai-sdd`
    // pass, so a `/qfai-implement` rerun straight after the upgrade would write
    // a blocker with no cell to hold it.
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    expect(red).toContain("check it is there before writing");
    expect(red).toContain("a table-shape write only Phase 2b may make");
    expect(red).toContain("asking for that column migration");
  });

  it("keeps the row blocked while another open CR still names it", async () => {
    // Blocked sets compose per CR: a row on two of them resumes only when both
    // release, so clearing `Blocked-By` on the matrix CR alone re-runs a test
    // whose other approved change has not landed.
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    expect(red).toContain("**but only when no other open `CR-*` still names the row**");
    expect(red).toContain("recomposes every open CR's set before it writes");
  });

  it("reverts the falsifiability mutation before the residual handoff", async () => {
    // Step 3c's own revert sits after the gatekeeper's answer, but the residual
    // path stops at an approval wait that spans sessions — so the deliberately
    // broken predicate would outlive the run.
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    expect(red).toContain(
      "**revert the mutation and re-run for the restored GREEN before that handoff**",
    );
  });

  it("stops the delivery-planner role card opening the row itself", async () => {
    // The role that owns item scope is where a post-PASS gap is actually found;
    // left at "open a new ledger row instead" it bypasses Phase 2b's ownership.
    const card = await read(tree, "assistant/agents/delivery-planner.md");

    expect(card).toContain("**this role does not open one**");
    expect(card).toContain("only `/qfai-sdd` Phase 2b adds, removes or re-scopes a row");
    expect(card).not.toContain("that round — open a new ledger row instead");
  });

  it("judges the shape at selection, ahead of the `todo -> red` write", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    // A matrix selector normally fails as expected on its first assert, so a
    // judgement placed under step 5 ("if the test unexpectedly passes") never
    // runs and the row reaches Green on an invalidated RED.
    const judgement = red.indexOf("Judge the selected row's selector shape here");
    const toRed = red.indexOf("2. Transition status to `red`");
    expect(judgement).toBeGreaterThanOrEqual(0);
    expect(toRed).toBeGreaterThan(judgement);
    expect(red).toContain("while it is still `todo` and before step 2 writes `todo -> red`");
    expect(red).toContain("**A matrix selector is judged in step 1, not here.**");
    expect(await read(tree, SELECTOR)).toContain("Phase Red **step 1** stops such a row");
  });

  it("keeps a named-row invocation inside the ids it was handed", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    // Blocking a named row must not fall back to open selection: `/qfai-atdd`
    // hands over an ordered id list and nothing else may be processed.
    expect(red).toContain(
      "take only the remaining named ids in the order given and return to the caller when that queue is empty",
    );
    expect(red).toContain("never an unnamed `todo` row");
  });

  it("names the owner in the references Phase Red sends the agent to", async () => {
    expect(await read(tree, SELECTOR)).toContain(
      "**The decomposition is `/qfai-sdd` Phase 2b's write, not this skill's**",
    );
    expect(await read(tree, LEDGER)).toContain("by `/qfai-sdd` Phase 2b, which owns the rows");
  });
});

describe.each(TREES)(
  "%s (the parking and the split are reachable from the states they meet)",
  (tree) => {
    const RESET = "assistant/skills/qfai-implement/references/change-request-reset.md";

    it("parks only the rows the ledger lets it park", async () => {
      // A blocked set routinely names rows past `todo` — a post-RED scope gap is
      // raised from `red` or later, a checkpoint regression from `done` — and
      // `todo -> blocked` is the only inbound edge, so "write it on each row"
      // asked for an illegal move on exactly the rows this PR routes here.
      const drift = await read(tree, DRIFT);
      expect(drift).toContain("on **each row of the blocked set that is at `todo`**");
      expect(drift).toContain("**Only a `todo` row is parked, because only a `todo` row can be.**");
      // The two shapes it cannot park have answers rather than silence.
      expect(drift).toContain("**A row another open `CR-*` already parked**");
      expect(drift).toContain("takes this CR's ID **appended** to `Blocked-By`");
      expect(drift).toContain("**A row past `todo`, and a `done` row**");
      expect(drift).toContain("**left exactly as they are**");
    });

    it("keeps an unparkable row out of selection while its CR is open", async () => {
      // Without this the row stays selectable across an approval that spans
      // sessions — and a `review-fix` row is re-selected ahead of every `todo`
      // row, so it would be picked up on every run until the CR resolves.
      const reset = await read(tree, RESET);
      expect(reset).toContain("**Both the approved and the still-open ones**");
      expect(reset).toContain(
        "**A row named in an open in-scope CR's blocked set is not selected**, whatever its status",
      );
      expect(reset).toContain("a `review-fix` row is re-selected ahead of every `todo` row");
    });

    it("re-evaluates every open blocked set before releasing a row", async () => {
      // The preflight returned every row the approved CR enumerated, so a row
      // also held by a second, unresolved CR went back into selection and could
      // run and complete over that unresolved change.
      const reset = await read(tree, RESET);
      expect(reset).toContain("Recompute the **union** of the blocked sets of every CR still open");
      expect(reset).toContain("**A row still in the union stays where it is.**");
      expect(reset).toContain("Remove only this CR's ID from `Blocked-By`");
      expect(reset).toContain("**A row no longer in the union** takes the reset below in full");
    });

    it("raises a Change Request for a legacy progressed row before splitting it", async () => {
      // The split rule reads the driving `CR-*` twice — for the boundary order
      // and for the approved actions the reset is enumerated under — and a row
      // first noticed during an ordinary reseed has neither. Phase Red never
      // re-selects a `done` row, so nothing downstream would ever raise one.
      const checklists = await read(tree, CHECKLISTS);
      expect(checklists).toContain(
        "**A progressed matrix row this phase finds on its own has no driving `CR-*` yet, and needs one before it is touched.**",
      );
      expect(checklists).toContain("**wait for approval** and leave the row untouched meanwhile");
      expect(checklists).toContain(
        "Narrowing its `Selector` first would be an un-approved re-scope of recorded work",
      );
    });

    it("breaks the tie when a multi-entry selector observed several REDs", async () => {
      // Phase Red runs each `Selector` entry separately and records each failure,
      // so "the boundary its recorded RED observed" names a set. It is neither
      // the `blocked` case nor the `falsifiability` one: the observations are
      // real, there are simply several.
      const checklists = await read(tree, CHECKLISTS);
      expect(checklists).toContain(
        "**A `Selector` holding several entries observed more than one**",
      );
      expect(checklists).toContain("Break the tie by the same order those cases use");
      expect(checklists).toContain(
        "two runs of this phase would keep the `TDD-ID` on different rows",
      );
    });
  },
);
