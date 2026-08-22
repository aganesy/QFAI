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
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "A `## Cross-spec obligations` entry in this spec's evidence file is still open",
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
