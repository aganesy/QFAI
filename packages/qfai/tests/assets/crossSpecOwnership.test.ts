/**
 * Two shipped rules collided with no way to satisfy both.
 *
 * `/qfai-implement` constrains execution to one spec and scopes every artifact
 * it writes to that spec — but the codebase is not partitioned at all, and the
 * Refactor phase actively **mandates** duplication removal. qfai defines no
 * module → owning-spec index, `done` has no outbound edge, and the Drift
 * Protocol's upstream list contains no code or test artifacts, so the
 * STOP → Change Request → owner-rerun route never fired for them.
 *
 * So when implementing spec B correctly required changing something spec A's
 * `done` rows certify, both outcomes violated a shipped rule — and neither left
 * any trace under `.qfai/**`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/cross-spec-ownership.md";
const DRIFT = "assistant/constitution/drift-protocol.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("detects the collision where it happens — before the edit, in Refactor", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("**Before editing a production file or a test file");
    expect(skill).toContain("against every other spec's `tdd/test-list.md`");
    expect(skill).toContain("the file is named in that row's `Owning module`");
  });

  it("triggers the check on test-file edits too, not only production ones", async () => {
    // `Test file` is the column that covers a shared test, so a trigger scoped
    // to production files alone left that branch unreachable.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("Before editing a production file **or a test file**");
  });

  it("runs the check in every phase, not only Refactor", async () => {
    // Phase Red writes the test before Refactor is ever reached, so a shared
    // test amended there and not touched again was never checked.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "in **any phase**, not only Refactor, because Phase Red writes to a test file before Refactor is ever reached",
    );
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "**Before editing a production file or a test file — here or in any other phase**",
    );
    // Red writes the test and Green writes the production code, both before
    // Refactor; a run that never refactors reached the guard after the fact.
    expect(skill).toContain(
      "When the test goes into a file that already exists, run the cross-spec check of `references/cross-spec-ownership.md` before writing it",
    );
    expect(skill).toContain(
      "When it goes into a file that already exists, run the cross-spec check of `references/cross-spec-ownership.md` before writing it",
    );
  });

  it("checks the Red-phase seam before it writes to an existing production file", async () => {
    // Phase Red's preflight covered the *test* write only, while the seam step
    // right after it registers a route on an existing router or adds an export
    // to an existing module — and a seam-only invocation ends there, so the
    // Green and Refactor copies of the check were never reached.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "**When the seam goes into a file that already exists — a route registered on an existing router, an export or signature added to an existing module — run the cross-spec check of `references/cross-spec-ownership.md` before writing it**",
    );
    expect(skill).toContain(
      "**a seam-only invocation stops at this step**, so the Green and Refactor copies of that check are never reached",
    );
    // The reference states the same reason, so the two do not drift.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "its seam step writes to a **production** file in that same phase, a route registered on an existing router or an export added to an existing module, on a path that can end there without reaching Green or Refactor at all",
    );
    // Over-correction pin: the preflight stays conditioned on an *existing*
    // file — a seam in a new module no other spec can own must not be gated —
    // and the seam's own contract is untouched.
    expect(skill).toContain("**Register it with a status the row does not contract for.**");
    expect(skill).toContain("build the seam, leave the row at `todo`, and return");
  });

  it("counts a reverse-dependency match as cross-spec, not only a named one", async () => {
    // A reverse hit names the edited file in neither column, so a recording
    // condition of "if it is named" let exactly the case the closure exists to
    // catch skip the obligation and the re-review.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("**A match either way makes the edit cross-spec**");
    expect(skill).toContain(
      "named directly in one of those two columns, or reached only through that closure, which names it in neither",
    );
    expect(skill).not.toContain("If it is named, the edit is cross-spec");
    // Same condition as the reference it summarises.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "A `done` row matches in either of two ways, and either one means the edit is cross-spec",
    );
    // Over-correction pin: widening *what counts as a match* must not widen
    // *which rows are read*. Only `done` rows carry a certification, and the
    // direct branch stays a direct branch.
    expect(skill).toContain("over its `Status = done` rows only");
    expect(skill).toContain("the file is named in that row's `Owning module`");
  });

  it("reaches a shared test artifact through the test import graph", async () => {
    // A fixture or assertion helper is in no `Test file` cell and no production
    // module imports it, so the production-graph walk returns an *empty*
    // closure — nothing unresolved, so the package fallback never fires either
    // and a weakened helper passed detection with no row matched.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("**A shared test artifact is reached through the test graph.**");
    expect(reference).toContain("the closure comes back **empty** rather than short");
    expect(reference).toContain(
      "walk the **test** import graph backwards as well — the test modules that import it",
    );
    expect(reference).toContain("When no test import graph can be resolved");
  });

  it("widens to the package when the reverse walk cannot complete", async () => {
    // Dynamic imports, DI wiring and generated code leave the closure short,
    // and `relevant-test-suite.md` already answers that with a package
    // fallback — detection has to take the same one or it under-detects.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("**When the walk cannot be completed, widen.**");
    expect(reference).toContain(
      "Take the **package fallback** `relevant-test-suite.md` defines for exactly that case",
    );
    expect(reference).toContain("an unresolvable edge is unknown reach, not absent reach");
  });

  it("compares path against path whole, aliasing only for dotted modules", async () => {
    // `src/parser.ts` and `src/parser.py` are two modules two specs may own.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("**Path against path is compared whole**, extension included");
    expect(reference).toContain("`src/parser.ts` and `src/parser.py` are two modules");
    expect(reference).toContain("alias used only to line a dotted module up with a path");
  });

  it("lets the evidence record a reverse-dependency hit", async () => {
    // The reverse branch hits rows that name the file in neither column, so a
    // `Blocked TDD-IDs` defined as "rows that name the file" was unfillable.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "the ones naming the file directly, and the ones whose `Test file` the reverse-dependency walk reached",
    );
  });

  it("re-runs the blocked selectors before handing them to the reviewer", async () => {
    // `completion-reviewer` audits evidence and executes nothing, so on the
    // recorded GREEN alone it re-ratifies a run that predates the edit.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("**Re-run, then re-review.**");
    expect(reference).toContain(
      "re-run each `Blocked TDD-ID`'s `Selector` against the changed tree, read-only",
    );
    expect(reference).toContain("with those fresh results as its input");
    expect(reference).toContain("The reviewer audits phase-authored evidence; it executes nothing");
  });

  it("scopes detection to the rows that actually carry a certification", async () => {
    // A `todo` / `red` / `green` row still has its run ahead of it, so an
    // obligation opened against it would block completion for nothing.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("reading only the rows at `Status = done`");
    expect(reference).toContain(
      "a `todo` / `red` / `green` row has its run still ahead of it and needs no obligation",
    );
    const skill = await read(tree, SKILL);
    expect(skill).toContain("over its `Status = done` rows only");
  });

  it("matches a dotted `Owning module` against the file being edited", async () => {
    // `execution-ledger.md` allows either form in that column, so a literal
    // string compare missed every ledger that used the dotted one.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("Decide which form the cell holds **before** touching its dots");
    // A repo-relative `src/foo.bar.ts` must not collapse onto `src/foo/bar.ts`
    // and manufacture a hit against an unrelated row.
    expect(reference).toContain("read `.` as a separator **only** in the dotted form");
    expect(reference).toContain(
      "`shirube.domain.notification` and `src/shirube/domain/notification.ts` are the same module",
    );
    const skill = await read(tree, SKILL);
    expect(skill).toContain("matched on the normalized form so a dotted module path counts");
  });

  it("strips the source root so the dotted alias actually lines up", async () => {
    // Extension removal and separator conversion alone leave
    // `shirube/domain/notification` against `src/shirube/domain/notification`,
    // so the pair the paragraph declares identical never matched.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("**Strip the source root before comparing that alias.**");
    expect(reference).toContain(
      "a dotted module path starts at a **source root**, a repo-relative path starts at the repository",
    );
    expect(reference).toContain(
      "Drop the path's source-root prefix — `src/`, `lib/`, `app/`, or whatever the project's build config declares",
    );
    // Unknowable source roots must widen, not silently miss the row.
    expect(reference).toContain(
      "the alias matches when the path's segment sequence **ends with** the dotted one, on a segment boundary",
    );
  });

  it("re-runs the blocked row's own mutation, not just its selector", async () => {
    // A weakened helper, snapshot or expected-value fixture keeps the selector
    // passing while making it tautological, so a fresh GREEN alone re-approves
    // a test that has lost its discriminating power.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "**A passing selector is not enough on a blocked row that carries a proof.**",
    );
    expect(reference).toContain(
      "also re-run its **original** mutation against the changed artifact",
    );
    expect(reference).toContain("capture the failure, revert, and re-run for the restored GREEN");
    // The identical rule already binds the stage-level side of this edit.
    expect(reference).toContain("`../../qfai-atdd/references/shared-test-artifacts.md`");
  });

  it("does not demand an owner rerun for every shared-file edit", async () => {
    // The upstream list's blanket "every artifact requires an owner rerun"
    // contradicted the same file's code/test bullet, which routes through
    // record-and-re-review and escalates only when the obligation breaks.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain(
      "**Every artifact in this list requires an owner rerun by definition — except the code and test artifacts of the last bullet, which carry their own route in that bullet.**",
    );
    expect(drift).toContain(
      "the record and re-review of `cross-spec-ownership.md` are the whole route",
    );
    expect(drift).toContain(
      "the owner rerun is owed exactly when the edit becomes drift in the full sense",
    );
  });

  it("keys detection on the only column that holds a production path", async () => {
    // The trigger is editing a production file, so keying the lookup on
    // `Test file` compared a production path against a column of test paths and
    // never hit. `Owning module` is the column that holds production paths.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "**A production module another spec's ledger names in `Owning module` is that spec's to certify.**",
    );
    expect(reference).toContain(
      "that row's `Owning module` — the only column that holds a production path",
    );
    // `Test file` survives only for the narrower case it can actually cover.
    expect(reference).toContain("where the file being edited is itself that spec's test");
  });

  it("does not let an undeclared `Owning module` pass detection silently", async () => {
    // The column is optional and `-` is legal, and no real ledger declares it
    // today — so its absence must restrict, the way it does for parallel
    // dispatch, rather than clear the edit.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("An undeclared seam is a restriction, not a clearance");
    expect(reference).toContain(
      "Detection never passes silently just because the column is absent",
    );
  });

  it("applies the reverse-dependency fallback to every unmatched `done` row", async () => {
    // `-` is legal row by row, and the ordinary `shared <- service <- service
    // test` shape leaves a *declared* row unmatched too — so scoping the
    // fallback to ledgers that declare nothing left both cases undetected.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("`-` is legal **per row**");
    expect(reference).toContain("This applies to **every `done` row that did not match directly**");
    expect(reference).toContain(
      "the fallback leaves a row that declares `src/service.ts` unmatched exactly as it leaves an undeclared one",
    );
    expect(reference).toContain("a ledger's declared rows never clear its undeclared ones");
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "every `done` row that did not match directly is still checked through the reverse dependency closure",
    );
  });

  it("gives the evidence file a place to record it", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`## Cross-spec obligations` (if any)");
    expect(skill).toContain("the obligation left unverified");
  });

  it("makes an open obligation block completion", async () => {
    // Without this the record is a note; with it, a run cannot report clean
    // while knowingly leaving another spec's assertion unverified.
    //
    // The condition names the **code-ownership** kind since `/qfai-atdd` began
    // writing its non-blocking contract residue into the same section of the
    // same `atdd-<spec-id>.md`; that qualifier narrows which entries block, and
    // this case pins that the kind recorded HERE still does.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "A `## Cross-spec obligations` entry of the **code-ownership** kind in this spec's evidence file is still open",
    );
    expect(skill).toContain("this run changed a file another spec's ledger names in `Test file`");
    expect(skill).toContain(
      "A clean completion here would certify an obligation this run knowingly left unmet (`references/cross-spec-ownership.md`)",
    );
  });

  it("states the rule as record-and-re-review, not permission", async () => {
    // Requiring approval for every shared-file edit would make the mandated
    // duplication removal one line above unperformable.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "Editing such a file does not require permission — it requires a record and a re-review",
    );
  });

  it("names the field that carries the actual risk", async () => {
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("`Obligation at risk` is the load-bearing field");
    expect(reference).toContain('"Changed a shared helper" is not a record');
  });

  it("escalates to the Change Request path when the obligation truly broke", async () => {
    // Re-review can confirm an assertion still holds; it cannot ratify a
    // behaviour change the other spec never agreed to.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("that is upstream drift");
    expect(reference).toContain("only its owner can");
  });

  it("is honest about what it does not fix", async () => {
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("It does not partition the codebase");
    expect(reference).toContain("does not give `done` an outbound edge");
  });

  it("puts the artifact class on the Drift Protocol's upstream list", async () => {
    // The list contained no code or test artifacts, which is why the existing
    // escalation route never applied to them.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain(
      "**test or production artifacts another spec's completed implement run certifies**",
    );
    expect(drift).toContain("Changing one is not forbidden");
  });

  it("names the shared artifact class in the whitelist the core rule points at", async () => {
    // The last upstream bullet says the edit is not forbidden, while the
    // whitelist below it ended with "any exception beyond this list requires
    // explicit user approval" and did not carry the class — so the same file
    // both allowed the shared-file route and demanded approval for it.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain("- **another spec's certified code or test artifact**");
    expect(drift).toContain(
      "the edit is recorded and re-reviewed per `skills/qfai-implement/references/cross-spec-ownership.md`",
    );
    // Conditional, not blanket: approval is still owed once the obligation goes.
    expect(drift).toContain("Approval is owed the moment the obligation stops holding");
    // Over-correction pin: the closing sentence still governs everything else.
    expect(drift).toContain("Any exception beyond this list requires explicit user approval.");
  });

  it("points the proof rerun at the record that actually holds the mutation", async () => {
    // `Satisfied-by` names the sibling row, the production path and symbol, or
    // the artifact plus its property — never the mutation, which
    // `red-not-observable.md` step 2 records as `Falsifiability command`. A row
    // completed that way could not restore the change the rerun re-applies.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "a row completed through `references/red-not-observable.md` has it in `Falsifiability command`",
    );
    expect(reference).toContain("Not `Satisfied-by`:");
    // Over-correction pin: the ordinary route still reads its Oracle proof.
    expect(reference).toContain("an ordinary row's is its `Oracle proof` plan");
  });

  it("keeps the constitution's ownership columns in step with this rule", async () => {
    // The reference keys production ownership on `Owning module`; while the
    // Drift Protocol still defined upstream by `Test file` alone, a module
    // declared only in `Owning module` was cross-spec here and not upstream
    // there, so the CR route could be skipped for it.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain(
      "a production module in that row's `Owning module` column, a test in its `Test file` column",
    );
    expect(drift).toContain(
      "a production file declared there is upstream even though no `Test file` cell names it",
    );
  });
});
