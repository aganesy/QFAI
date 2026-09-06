/**
 * Parallel dispatch is judged on declared seams (#391).
 *
 * The allow conditions are facts about production modules; RED-first guarantees
 * those modules do not exist when `delivery-planner` — the sole authority — has
 * to evaluate them, and the required ledger schema's only path-valued column is
 * `Test file`. The deny condition even demanded "concrete file/module
 * evidence", which is precisely what test-first withholds.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const IMPLEMENT = "assistant/skills/qfai-implement";
const SKILL = `${IMPLEMENT}/SKILL.md`;
const LEDGER = `${IMPLEMENT}/references/execution-ledger.md`;
const POLICY = `${IMPLEMENT}/references/parallelization-policy.md`;
const STRUCTURE = "assistant/catalog/structure.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("declared seam", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the ledger schema documents Owning module`, async () => {
      const ledger = await read(tree, LEDGER);

      expect(ledger).toContain("| Owning module |");
      expect(flat(ledger)).toContain(
        "`Owning module` is a **declaration, not an observation**, and that is the whole point: it exists before the code does.",
      );
    });

    it(`${tree}: the schema states why Test file was not enough`, async () => {
      const ledger = flat(await read(tree, LEDGER));

      expect(ledger).toContain(
        "two items trivially have independent test files and land on the same production module",
      );
      // The declaration is authored where the behaviour's home is already known.
      expect(ledger).toContain("Fill it at ledger-authoring time (`/qfai-sdd` Phase 2b)");
      expect(ledger).toContain("One module per row");
    });

    it(`${tree}: an undeclared row is not eligible for parallel dispatch`, async () => {
      const ledger = flat(await read(tree, LEDGER));
      const policy = flat(await read(tree, POLICY));

      expect(ledger).toContain("A row carrying `-` is **not eligible for parallel dispatch**");
      expect(policy).toContain("A row carrying `-` in that column is not eligible");
    });

    it(`${tree}: the allow/deny conditions are restated over the column`, async () => {
      const policy = flat(await read(tree, POLICY));

      expect(policy).toContain(
        "**Every concurrently dispatched row declares an `Owning module`**, and no two of them declare the same one",
      );
      expect(policy).toContain(
        "Two concurrently dispatched items declare the same `Owning module`, or either of them declares none",
      );
    });

    it(`${tree}: "concrete file/module evidence" points at the column`, async () => {
      const policy = flat(await read(tree, POLICY));

      expect(policy).toContain(
        "Before RED that evidence is the rows' declared `Owning module` values",
      );
      // The honest fallback when the column is absent.
      expect(policy).toContain(
        "**If the ledger carries no `Owning module` column, the allow conditions cannot be evaluated at all**",
      );
      expect(policy).toContain('"The test files differ" is not an independence claim.');
    });

    it(`${tree}: seam reconciliation runs regardless of a green suite`, async () => {
      const policy = flat(await read(tree, POLICY));

      expect(policy).toContain("## Seam reconciliation (after a parallel run)");
      // The gap the integration verify does not close.
      expect(policy).toContain(
        "It does not detect two slices deciding the same thing twice under two names in one module",
      );
      expect(policy).toContain("**independently of whether the merged suite passes**");
      expect(policy).toContain(
        "It is a breach whether or not anything broke: the gate was passed on a claim that turned out to be false",
      );
    });

    it(`${tree}: reconciliation takes its roots from structure steering, not a literal src/`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Step 1's prose and its own command must name the same operand.
      expect(policy).toContain(
        "For each slice, list the paths it actually touched under the production roots `catalog/structure.md` declares",
      );
      // The operand is a named field, not a section the reader has to infer.
      expect(policy).toContain(
        "the `Production roots` field of its `## Key packages / entrypoints` section",
      );
      expect(policy).toContain("substituting `<source root>` from that field rather than assuming");
      expect(policy).not.toContain("list the `src/` paths it actually touched");
    });

    it(`${tree}: structure steering carries an exhaustive Production roots field`, async () => {
      const structure = flat(await read(tree, STRUCTURE));

      // Stage 0 fills `<...>` placeholders, so the field must exist to be filled.
      expect(structure).toContain("## Key packages / entrypoints");
      expect(structure).toContain(
        "- Production roots: <every shipped-source path, exhaustively, as Git pathspecs",
      );
      expect(structure).toContain(
        "Exclude tests, fixtures, build output, config and documentation>",
      );
    });

    it(`${tree}: Production roots expresses pathspecs, so root-level source needs no bare .`, async () => {
      const structure = flat(await read(tree, STRUCTURE));
      const policy = flat(await read(tree, POLICY));

      // A directory-only field leaves `.` as the only value a repo with
      // production source at the root can write, which drags `go.mod`,
      // `package.json`, config, docs and build output into the production list
      // and makes step 5 call each of them an undeclared seam breach.
      expect(structure).toContain(
        "a directory where the whole directory is source (`src/`, `app/`, `lib/`, `internal/`, `cmd/`, `packages/*/src`), a glob where it is not",
      );
      expect(structure).toContain(
        "Production code sitting at the repository root takes globs (`*.go` plus `cmd/` and `internal/`; `*.py` plus the package directory), never a bare `.`",
      );
      expect(structure).toContain(
        "which would sweep `go.mod`, `package.json`, CI config, documentation and build output in as production paths",
      );
      // The consumer has to pass a glob entry through, not re-read it as a dir.
      expect(policy).toContain(
        "The field holds **Git pathspecs, not only directory names** — pass every entry through verbatim",
      );
      expect(policy).toContain("pathspec never has to be a bare `.`");
    });

    it(`${tree}: a legitimately empty diff is not an infinite re-read loop`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Zero paths is ambiguous, and a slice of falsifiability items makes it
      // legal.
      expect(policy).toContain(
        "A zero-path **production** list is not by itself evidence of a clean seam",
      );
      expect(policy).toContain("it is not automatically a mis-read root either");
      expect(policy).toContain(
        "That is what a slice of falsifiability-path items looks like — `references/red-not-observable.md` adds no production code and reverts its mutation",
      );
      // Re-reading the roots is the branch for the *other* case only.
      expect(policy).toContain(
        "Any shipped-source path the production list did not carry is a **mis-read root**",
      );
    });

    it(`${tree}: an empty diff is judged on the whole change record, not the RED route`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Refactor and a no-round REVISE edit production code with no RED of
      // their own, so falsifiability-only RED does not imply an empty diff.
      expect(policy).toContain(
        "it covers every phase of the slice — RED, Green, Refactor and each review-fix round — and depends on no root",
      );
      expect(policy).toContain(
        "both change production code with no RED of their own, so a falsifiability-only RED never implied an empty production diff",
      );
      expect(policy).toContain(
        "The empty production list is legitimate only when no listed path is shipped source",
      );
    });

    it(`${tree}: the empty-diff judgement rests on a diff, not on the evidence schema`, async () => {
      const policy = flat(await read(tree, POLICY));

      // The per-item evidence contract records commands, results and revisions
      // and no per-phase manifest of changed files, so "confirm it from the
      // slice's evidence blocks" asked for a fact nothing recorded — a worker
      // that never mentions a production edit passed unchallenged.
      expect(policy).toContain("**Settle it by observation, not from the evidence blocks.**");
      expect(policy).toContain(
        "records commands, results and revisions and no manifest of changed files",
      );
      expect(policy).toContain(
        "`Refactor verify result` proves the suite was green, not what the refactor edited",
      );
      expect(policy).toContain(
        "a worker who simply never mentions a production edit passes the check",
      );
      // The replacement is root-independent and covers every phase.
      expect(policy).toContain("Take the slice's whole diff with **no pathspec** instead");
      expect(policy).toContain(
        "neither an incomplete `Production roots` nor an unrecorded edit can hide inside it",
      );
      expect(policy).not.toContain("Confirm both from the slice's evidence blocks");
    });

    it(`${tree}: a catalog predating the field gets a derivation, not a src/ fallback`, async () => {
      const policy = flat(await read(tree, POLICY));

      // `assistant/catalog/**` is create-only, so --force never adds the field
      // to an already-initialized project.
      expect(policy).toContain(
        "**A catalog written before that field existed carries no `Production roots` line.**",
      );
      expect(policy).toContain("`assistant/catalog/**` is create-only");
      expect(policy).toContain("Do not fall back to a literal `src/`");
      expect(policy).toContain(
        "**write the derived `Production roots` line back into `catalog/structure.md` in the same pass**",
      );
    });

    it(`${tree}: colocated tests are split out before the ownership comparison`, async () => {
      const policy = flat(await read(tree, POLICY));

      // A positive-only pathspec lists `app/foo.test.ts` as a production path.
      expect(policy).toContain("Step 1's pathspec is positive only");
      expect(policy).toContain("Go's `_test.go` in the package it tests");
      expect(policy).toContain("':(exclude)**/*.test.*'");
      expect(policy).toContain("':(exclude)**/*_test.go'");
      // `Production roots` cannot express this: the tests live inside a root.
      expect(policy).toContain(
        "`Production roots` alone cannot do this: the excluded files sit **inside** a declared root",
      );
      expect(policy).toContain(
        "Compare the production list from step 2 against the slice's declared `Owning module`",
      );
    });

    it(`${tree}: the test and fixture paths get their own duplicate check`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Two slices writing the same test module or shared fixture is a deny
      // condition in its own right, and the merged suite is the least likely
      // place to reveal it: interleaved writes can still compile and still
      // pass. Dropping those paths removed the only check that could catch it.
      expect(policy).toContain("Build **two lists with two commands**");
      expect(policy).toContain("Step 6 checks this list.");
      expect(policy).toContain(
        "Check the test and fixture list from step 2 separately, against each slice's declared `Test file`",
      );
      // Overlap is the breach here; undeclared is not — a slice legitimately
      // writes fixtures its ledger row does not name.
      expect(policy).toContain("A path written by more than one slice is a deny-condition breach");
      expect(policy).toContain("Not being declared by any slice is not a breach here");
    });

    it(`${tree}: the test list has a positive pathspec, not an inverted one`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Git has no pathspec inversion: excludes are applied after the
      // non-excludes, and to the whole tree when there are none — so pairing
      // `<source root>` with a test glob unions them, and an exclude-only
      // pathspec just re-derives the production list.
      expect(policy).toContain("there is no such thing as inverting the first one");
      expect(policy).toContain(
        'Git applies exclude pathspecs after the non-exclude ones and, when there are no non-exclude ones, to the whole tree (`git help glossary`, "pathspec")',
      );
      expect(policy).toContain("adding a test glob beside `<source root>` unions the two");
      expect(policy).toContain(
        "git diff --name-only <base>..<slice-head> -- 'tests/**' '**/*.test.*' '**/*_test.go' '**/__tests__/**' '**/testdata/**'",
      );
      expect(policy).not.toContain("the same pathspec inverted");
    });

    it(`${tree}: the test list is derived independently of Production roots`, async () => {
      const policy = flat(await read(tree, POLICY));

      // The catalog field excludes tests by construction, so in the ordinary
      // src/ + tests/ layout step 1's list never held a test path and
      // subtracting one from the other yields an empty list on every run —
      // step 6 then reports a clean check having compared nothing.
      expect(policy).toContain(
        "**Derive it independently of `Production roots`, never by subtraction from the production list.**",
      );
      expect(policy).toContain("production under `src/`, tests under `tests/`");
      expect(policy).toContain(
        "filtering one out of the other yields an empty test list on every run while step 6 reports a clean check",
      );
      // The repo's own globs and the dispatched rows are what supply it.
      expect(policy).toContain(
        "the `testFileGlobs` of `qfai.config.yaml` and the `Test file` column of the dispatched rows",
      );
      expect(policy).toContain(
        "Two slices both writing `tests/shared-helper.ts` or a shared fixture outside every production root",
      );
    });

    it(`${tree}: production roots are re-established on the merged tree`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Stage 0 refreshed the field before any slice ran, so a root a slice
      // *created* is not in it — and the mis-read-root branch never fires for a
      // slice that also touched a known root, because the diff is non-zero.
      expect(policy).toContain(
        "**Re-establish the roots against the merged tree before using them.**",
      );
      expect(policy).toContain("a root a slice _created_ is not in it");
      expect(policy).toContain(
        "because a slice that also touched a known root produces a non-zero diff",
      );
      expect(policy).toContain("`git diff --name-only <base>..<merge-head>`");
      expect(policy).toContain("Add each new shipped-source root to `Production roots`");
    });

    it(`${tree}: the SKILL carries both the gate note and the reconcile step`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "Under RED-first the source modules do not exist when `delivery-planner` must judge",
      );
      expect(skill).toContain(
        "a ledger without that column supports parallel dispatch only for seams that already exist",
      );
      expect(skill).toContain(
        "diff each slice's touched paths under the production roots `catalog/structure.md` declares against its declared `Owning module`",
      );
      expect(skill).not.toContain("diff each slice's touched `src/` paths");
    });
  }
});
