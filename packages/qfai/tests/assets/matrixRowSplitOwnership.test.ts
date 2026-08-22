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
      "`Status`, `DR-ID`, `Evidence` and `Blocked-By` cells and nothing else",
    );
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
    expect(drift).toContain("`Status`, `DR-ID`, `Evidence` and `Blocked-By` cells only");
    expect(await read(tree, TRACE)).toContain(
      "`Status`, `DR-ID`, `Evidence` and `Blocked-By` cells and nothing else",
    );

    const template = await read(tree, TEMPLATE);
    // Seeded by the row owner, so blocking a row fills a cell, never adds a column.
    expect(template).toContain("| Status | DR-ID | Evidence | Blocked-By |");
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
