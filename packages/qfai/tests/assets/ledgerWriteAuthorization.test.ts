/**
 * Nothing authorised `/qfai-implement` to write its own execution ledger.
 *
 * `tdd/test-list.md` lives inside `.qfai/specs/**`, which the Drift Protocol
 * declares upstream SSOT via an explicitly open-ended list that sweeps in
 * "outputs of discussion/sdd/review stages" — and the ledger's schema is
 * documented in an SDD-stage reference. The one whitelist entry that could
 * have covered the write was conditioned on "when the project workflow
 * explicitly allows downstream updates", a phrase whose only occurrence in the
 * entire shipped tree was that line itself.
 *
 * So an agent obeying the protocol could not satisfy the skill's own gate item
 * 10, and an agent satisfying item 10 was in drift. These tests pin the
 * carve-out, its narrowness, and the removal of the dangling condition.
 *
 * The same deadlock recurs one and two columns over — a row cannot hold the
 * `Status` the carve-out *does* authorise without also writing a `Test file`
 * and a `Selector` it did *not* — so the carve-out now covers five cells: three
 * unconditionally, plus `Test file` and `Selector` while a stated condition
 * holds. The widening is the thing most at risk of quietly growing into "the
 * ledger is downstream-owned", so the cases below pin the conditions and the
 * exclusions with equal weight.
 *
 * Anchor choice: assertions target the section heading, the cell names, the
 * condition polarity and the named predicate — not whole paragraphs. The prose
 * around them is rationale and will be reworded; the cell names and
 * `selectorResolves` are the load-bearing tokens, and the writable enumeration
 * is asserted as a bounded slice so that adding a column to it fails here
 * rather than merely adding text. A condition is asserted contiguous with the
 * cell it qualifies: split into fragments, the pair passes with the two bodies
 * swapped, which is a different and nonsensical authorisation.
 *
 * Not covered here, deliberately: the two trees being byte-identical.
 * `tests/scripts/syncInitStaleDetection.test.ts` runs
 * `sync-init-to-root.mjs --check`, which compares every mirrored path with
 * `Buffer.equals` in both directions. Repeating it would be a second, weaker
 * spelling of an invariant that already fails loudly.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The SSOT tree. `.qfai/` is its byte-identical mirror; see the docblock. */
const ASSET_TREE = "packages/qfai/assets/init/.qfai";

const TREES = [ASSET_TREE, ".qfai"];
const DRIFT = "assistant/constitution/drift-protocol.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const TRACE = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";

// Read as source text, not imported: `selectorResolves` and
// `TEST_FILE_CHECK_STATUSES` are module-private, and exporting them purely to
// let a test observe them would widen the validator's API for no runtime
// reason. `tests/scripts/syncInitStaleDetection.test.ts` reads its subject the
// same way.
const VALIDATOR = "packages/qfai/src/core/validators/tddList.ts";

/** The four statuses at which an absent `Test file` is an error. */
const TEST_FILE_ERROR_STATUSES = ["green", "refactor", "review-fix", "done"];

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

/**
 * The whitelist as a *rule*, excluding the `### Why …` rationale subsections.
 *
 * Bounds are resolved and asserted before slicing: `indexOf` returns -1 on a
 * miss and `slice(-1, …)` would quietly search a different region. Ending at
 * the first rationale heading is what makes the exclusion cases meaningful —
 * every column name appears somewhere in the rationale, so a document-wide
 * search could not tell "named as writable" from "named as staying upstream".
 */
function ruleRegion(drift: string): string {
  const start = drift.indexOf("## Allowed exceptions");
  const end = drift.indexOf("### Why the execution ledger is named here");
  expect(start, "the whitelist heading moved").toBeGreaterThanOrEqual(0);
  expect(end, "the first rationale heading moved").toBeGreaterThan(start);
  return drift.slice(start, end);
}

describe.each(TREES)("%s", (tree) => {
  it("names the ledger and its three unconditional cells in the whitelist", async () => {
    const drift = await read(tree, DRIFT);
    const start = drift.indexOf("## Allowed exceptions");
    const end = drift.indexOf("## When drift is detected");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const whitelist = drift.slice(start, end);
    expect(whitelist).toContain("`.qfai/specs/<spec-id>/tdd/test-list.md`");
    // "unconditionally" is the word that distinguishes these three from the two
    // conditional cells below. It is not decoration: dropping it would read as
    // the whole entry being conditional.
    expect(whitelist).toContain("`Status`, `DR-ID` and `Evidence` cells unconditionally");
  });

  it("keeps the rows upstream, so the carve-out is not a licence over the file", async () => {
    // Which obligations exist is an upstream decision; only their execution
    // state is downstream. Without this the entry would hand `/qfai-implement`
    // the power to invent or delete obligations.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain(
      "adding, removing or re-scoping a row is an upstream change and takes the",
    );
  });

  it("drops the condition that could never be satisfied", async () => {
    const drift = await read(tree, DRIFT);
    // Present only as quoted history in the rationale, never as a live rule.
    const rule = drift.slice(
      drift.indexOf("## Allowed exceptions"),
      drift.indexOf("### Why the execution ledger is named here"),
    );
    expect(rule).not.toContain("only when the project workflow explicitly allows");
  });

  it("covers Evidence, not only progress status", async () => {
    // Gate item 10 requires the Evidence column and the hard rules forbid the
    // status-only substitute, so a status-scoped permission is unusable.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("`Evidence` cells unconditionally");
  });

  it("names `Test file` and `Selector` as writable only while a condition holds", async () => {
    // The widening is conditional or it is nothing: without "only while", the
    // entry hands the writing stage two columns outright.
    const rule = ruleRegion(await read(tree, DRIFT));
    expect(rule).toContain("cells that are writable **only** while a stated condition holds");
    expect(rule).toContain("the `Test file` cell, only while");
    expect(rule).toContain("the `Selector` cell, only while");
  });

  it("binds each condition to the cell it qualifies", async () => {
    const rule = ruleRegion(await read(tree, DRIFT));
    // Each bullet is asserted as one contiguous string, cell name included.
    // Asserted as independent fragments these two cases pass with the bodies
    // swapped — a cross-wired rule authorises a different, nonsensical set of
    // writes — because every fragment still occurs somewhere in the region.
    //
    // Condition 1: the seeded cell is a placeholder, so filling it destroys
    // nothing. Detached from `Test file`, this would authorise overwriting a
    // path an earlier phase chose.
    expect(rule).toContain(
      "the `Test file` cell, only while the seeded value is empty or a dash placeholder",
    );
    // Condition 2: named after the validator predicate, so a reviewer can run
    // the check instead of judging it.
    expect(rule).toContain(
      "the `Selector` cell, only while the seeded value does not resolve against",
    );
    // `is false` carries the polarity, kept contiguous with the predicate it
    // qualifies — inverted, the rule would authorise rewriting selectors that
    // already work.
    expect(rule).toContain("`selectorResolves` predicate is false");
  });

  it("keeps both conditions machine-checkable and one-way", async () => {
    // One-way is what stops a conditional cell becoming an unconditional one
    // after its first write: the condition is false forever after.
    const rule = ruleRegion(await read(tree, DRIFT));
    expect(rule).toContain("machine-checkable");
    expect(rule).toContain("rewriting it is no longer covered");
  });

  it("does not widen the columns carrying the row's obligation identity", async () => {
    const rule = ruleRegion(await read(tree, DRIFT));
    // Bounded at the sentence that turns the entry back around, so this reads
    // the *writable* enumeration only. Adding a column to it fails here.
    // Both bounds are asserted before slicing: on an `indexOf` miss the -1
    // would silently widen the slice to nearly the whole rule.
    const entry = rule.indexOf("`.qfai/specs/<spec-id>/tdd/test-list.md`");
    const closing = rule.indexOf("Every other column of that file");
    expect(entry, "the ledger entry moved").toBeGreaterThanOrEqual(0);
    expect(closing, "the sentence closing the enumeration moved").toBeGreaterThan(entry);
    const writable = rule.slice(entry, closing);
    for (const column of ["TC-Refs", "Layer", "US-Refs", "CON-API-Refs"]) {
      expect(writable, `${column} must not be writable`).not.toContain(`\`${column}\``);
      // …and each is still named as staying upstream, so the exclusion is
      // explicit rather than an absence a reader has to notice.
      expect(rule, `${column} must stay upstream`).toContain(`\`${column}\``);
    }
    expect(rule).toContain("stays upstream SSOT");
  });

  it("stops the skill contradicting itself in Non-goals", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain("- Writing spec artifacts (use `/qfai-sdd`).");
    expect(skill).toContain(
      "Writing spec artifacts other than this skill's own `tdd/test-list.md` ledger",
    );
  });

  it("matches the write instructions to what the gate actually reads", async () => {
    const skill = await read(tree, SKILL);
    // The emphasis is `ledgerWriteOwnership.test.ts`'s, which asserts the same
    // sentence bolded. What matters here is that the instruction names both
    // columns and fires per phase, so the assertion tracks the shipped spelling.
    expect(skill).toContain(
      "update `test-list.md` **Status and Evidence** after each phase completes",
    );
    expect(skill).toContain("final Status, DR-ID and Evidence values");
  });
});

/**
 * Tree-independent, for the reason the docblock gives: the mirror is
 * byte-identical, so reading the SSOT once is the whole fact. Asserting the
 * same prose against both trees doubles the executions without adding an
 * outcome — the second copy can only differ if `--check` is already failing.
 * The `describe.each` block above predates that reasoning; new prose cases go
 * here rather than growing it further.
 */
describe("the skills spell the carve-out the same way the protocol does", () => {
  it("states in Non-goals which cells are unconditional and which are not", async () => {
    // Bounded to Non-goals: `unconditionally` and both cell names occur in the
    // Completion section too, so a document-wide search could not tell a
    // corrected Non-goals entry from an uncorrected one.
    const skill = await read(ASSET_TREE, SKILL);
    const start = skill.indexOf("## Non-goals");
    const end = skill.indexOf("## Execution Ledger: test-list.md");
    expect(start, "the Non-goals heading moved").toBeGreaterThanOrEqual(0);
    expect(end, "the section after Non-goals moved").toBeGreaterThan(start);
    const nonGoals = skill.slice(start, end);
    // The entry used to state the three-cell rule as exhaustive, which
    // contradicted the protocol it cites. Both halves are asserted contiguous
    // with their cell lists so that widening one silently is not possible.
    expect(nonGoals).toContain(
      "`Status` / `DR-ID` / `Evidence` cells are carved out unconditionally",
    );
    expect(nonGoals).toContain("its `Test file` / `Selector` cells conditionally");
  });

  it("states in Completion that the two conditional cells are written on sight", async () => {
    // The completion step is where a stage that deferred its ledger writes
    // would try to write all five cells at once. Recording that the two
    // conditional cells are already covered *and* that their condition is
    // one-way is what makes the deferral visibly wrong.
    const skill = await read(ASSET_TREE, SKILL);
    const heading = "### Completion";
    expect(skill, "the Completion heading moved").toContain(heading);
    const completion = skill.slice(skill.indexOf(heading));
    expect(completion).toContain(
      "final Status, DR-ID and Evidence values — the three cells the Drift Protocol carve-out covers unconditionally",
    );
    expect(completion).toContain(
      "`Test file` and `Selector` are covered too, but only while their stated condition still holds",
    );
  });

  it("enumerates the owned cells where the schema is defined, not just the heading", async () => {
    // Asserting `**Ownership split.**` alone is blind to what the bullet says:
    // the pre-correction text claimed the three cells and "nothing else", and
    // the heading-only assertion passed either way.
    const trace = await read(ASSET_TREE, TRACE);
    const start = trace.indexOf("**Ownership split.**");
    const end = trace.indexOf("- `Evidence` is a **pointer**");
    expect(start, "the ownership-split bullet moved").toBeGreaterThanOrEqual(0);
    expect(end, "the bullet closing the ownership split moved").toBeGreaterThan(start);
    const split = trace.slice(start, end);

    expect(split).toContain("owns the `Status`, `DR-ID` and `Evidence` cells unconditionally");
    // Each conditional cell contiguous with its own condition, for the same
    // reason as the protocol case above: swapped bodies must not read green.
    expect(split).toContain("`Test file` while the seeded value is empty or a dash placeholder");
    expect(split).toContain(
      "`Selector` while the seeded value does not resolve against the row's named test file",
    );

    // The exclusion is what keeps this a split rather than a licence. Bounded
    // before slicing, as above: on a miss the -1 would search a region that
    // happens to name every column.
    const closing = split.indexOf("It owns nothing else");
    expect(closing, "the sentence closing the owned enumeration moved").toBeGreaterThan(0);
    const owned = split.slice(0, closing);
    for (const column of ["TC-Refs", "Layer", "US-Refs", "CON-API-Refs"]) {
      expect(owned, `${column} must not be owned downstream`).not.toContain(`\`${column}\``);
      expect(split, `${column} must be named as staying upstream`).toContain(`\`${column}\``);
    }
    expect(split).toContain("stay upstream");
  });
});

describe("the stated conditions are the ones the shipped validator implements", () => {
  // Tree-independent: the mirror is byte-identical (see the docblock), so the
  // asset copy is read once rather than asserting the same source fact twice.
  const validator = async (): Promise<string> => readFile(path.join(repoRoot, VALIDATOR), "utf-8");

  it("names a predicate that exists", async () => {
    // A condition phrased as "the validator's own `selectorResolves` predicate"
    // is only checkable while that predicate is there to run. If it is renamed
    // or inlined, the protocol is citing something that does not exist and the
    // reviewer has nothing to verify the precondition with.
    expect(await validator()).toContain("function selectorResolves(");
  });

  it("agrees with the validator about when a missing Test file is an error", async () => {
    // The rationale claims `TDDLIST_TEST_FILE_MISSING` fires at error for four
    // statuses. That claim is the justification for widening `Test file`, so it
    // is pinned against the set the validator actually gates on — parsed, not
    // string-matched, so reformatting the literal does not fail the case.
    const source = await validator();
    const match = /const TEST_FILE_CHECK_STATUSES = new Set\(\[([^\]]*)\]\)/.exec(source);
    if (match === null) {
      throw new Error(`TEST_FILE_CHECK_STATUSES literal not found in ${VALIDATOR}`);
    }
    const statuses = (match[1] ?? "")
      .split(",")
      .map((entry) => entry.trim().replace(/^"|"$/g, ""))
      .filter((entry) => entry.length > 0);
    expect(new Set(statuses)).toEqual(new Set(TEST_FILE_ERROR_STATUSES));

    const drift = await read(ASSET_TREE, DRIFT);
    const heading = "### Why `Test file` and `Selector` are conditional";
    expect(drift, "the rationale subsection is missing").toContain(heading);
    const rationale = drift.slice(drift.indexOf(heading));
    for (const status of TEST_FILE_ERROR_STATUSES) {
      expect(rationale, status).toContain(`\`${status}\``);
    }
  });

  it("names both rule ids the deadlock is built from", async () => {
    const source = await validator();
    const drift = await read(ASSET_TREE, DRIFT);
    for (const code of ["TDDLIST_TEST_FILE_MISSING", "TDDLIST_SELECTOR_UNRESOLVED"]) {
      expect(drift, `${code} must be cited by the protocol`).toContain(code);
      expect(source, `${code} must still be emitted`).toContain(`"${code}"`);
    }
  });
});

describe("the dangling condition is gone from the shipped tree", () => {
  it("no live rule still depends on an undefined 'project workflow' permission", async () => {
    // The original defect was a condition with no referent anywhere. If a
    // future edit reintroduces the phrase as a rule, this fails.
    const files = await fg("**/*.md", {
      cwd: path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant"),
      absolute: true,
    });
    const offenders: string[] = [];
    for (const file of files) {
      // Flattened: the phrase is prose and wraps, so a raw scan misses it.
      const text = flat(await readFile(file, "utf-8"));
      if (/only when the project workflow explicitly allows/.test(text)) {
        offenders.push(path.relative(repoRoot, file).replace(/\\/g, "/"));
      }
    }
    // The rationale in drift-protocol.md quotes it inside a "used to sit here"
    // sentence; that is history, not a rule, and it reads as such.
    expect(offenders).toEqual([
      "packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md",
    ]);
  });
});
