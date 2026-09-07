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

const SDD = "assistant/skills/qfai-sdd";
const SDD_SKILL = `${SDD}/SKILL.md`;
const SDD_RULES = `${SDD}/references/spec-traceability-rules.md`;
const SDD_CHECKLISTS = `${SDD}/references/sdd-phase-checklists.md`;
const SDD_TEMPLATE = `${SDD}/templates/specs/spec/tdd/test-list.md`;

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

/**
 * The declaring half of #391 shipped without its producing half: every column
 * the policy adjudicates on is authored by `/qfai-sdd` Phase 2b, and that
 * skill had never heard of `Owning module`. A seeded ledger therefore hit
 * "the allow conditions cannot be evaluated at all" in every project the
 * tooling creates, silently — the column is optional, so nothing warns.
 */
describe("declared seam has a producer", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the seeded ledger header carries the column`, async () => {
      const template = await read(tree, SDD_TEMPLATE);
      const header = template.split(/\r?\n/).find((line) => line.trim().startsWith("|"));

      expect(header).toContain("| Owning module |");
      // Documented in the same file, so a seeded `-` is readable as a decision.
      // main moved the ledger schema out of the template into the rules file
      // and told the template not to restate it, so the column detail is
      // asserted where the schema now lives.
      const rules = flat(await read(tree, SDD_RULES));
      expect(rules).toContain("`Owning module` — the production module the row will write");
      expect(rules).toContain("seeds it at Phase 2b from the TC's");
    });

    it(`${tree}: Phase 2b is told to fill it, from the source the schema names`, async () => {
      const skill = flat(await read(tree, SDD_SKILL));
      const checklists = flat(await read(tree, SDD_CHECKLISTS));

      expect(skill).toContain("Fill each row's optional `Owning module` from the TC's parent `BR`");
      expect(checklists).toContain("Declare each row's `Owning module` from the TC's parent `BR`");
    });

    // "The TC's parent BR" is not a lookup any single table answers, and the
    // two routes are not interchangeable: a normal-case TC names an `EX`, and
    // `05_Examples.md` pins `EX -> BR` 1:1, so that route is exact. `AC-Refs`
    // is the fallback, and it is ambiguous whenever one AC decomposes into
    // several BRs. Naming only the fallback would strand exactly resolvable
    // rows at `-`.
    it(`${tree}: the route from a TC to its parent BR prefers EX-Ref`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      // The route lives with the column detail in the rules file: main emptied the
      // template of the schema this used to restate.
      const rules = flat(await read(tree, SDD_RULES));

      for (const text of [checklists, rules]) {
        expect(text).toContain("`AC-Refs`");
        expect(text).toContain("04_Business-Rules.md");
        expect(text).toContain("`BR-Ref`");
        expect(text).toContain("05_Examples.md");
        expect(text).toMatch(/`EX-Ref` first/);
        // The claim this replaces: EX-Ref does select the parent, exactly.
        expect(text).not.toContain("`EX-Ref` never selects it");
      }
    });

    // The fallback condition is "no `EX` is named", not "the cell holds one
    // specific dash". `layerCoverage.ts` reports a TC (`QFAI-COV-206`) only
    // when `AC-Refs` and `EX-Ref` are *both* empty, so a blank `EX-Ref` beside
    // a filled `AC-Refs` is valid spec that reaches its parent through `AC`.
    // Keying on `—` alone drops that TC out of the AC route and parks a
    // resolvable row at `-`, making it needlessly serial.
    it(`${tree}: an EX-Ref naming no EX falls back, blank as well as em-dash`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const skill = flat(await read(tree, SDD_SKILL));
      const rules = flat(await read(tree, SDD_RULES));

      for (const text of [checklists, skill, rules]) {
        expect(text).toContain("whenever the `EX-Ref` cell names no `EX`");
        expect(text).toMatch(/empty cell/);
        // The narrow condition this replaces, in either file's wording.
        expect(text).not.toMatch(/only when `EX-Ref` is `—`/);
        expect(text).not.toMatch(/only when `EX-Ref`\s*is `—`/);
      }
      for (const text of [checklists, rules]) {
        expect(text).toContain('`—` and `-` all mean "none"');
      }
      expect(checklists).toContain("QFAI-COV-206");
    });

    // Phase 2b copies the template only when the ledger is absent and is a
    // delta otherwise, so a project seeded before this column existed would
    // keep its 8-column header forever without an explicit migration step.
    // `/qfai-implement` appends a `## CHG-*` ledger table per change request
    // (`tests/core/tddLedgerLaterTableChecks.test.ts`), so migrating only the
    // leading table can leave every real row without the column.
    it(`${tree}: every ledger table in a pre-existing file is migrated`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const skill = flat(await read(tree, SDD_SKILL));
      const rules = flat(await read(tree, SDD_RULES));

      expect(checklists).toContain("Migrate a pre-existing ledger in place");
      expect(checklists).toContain("**every** schema-shaped ledger table in the file");
      expect(checklists).toContain("each `## CHG-*` table");
      expect(skill).toContain("A ledger whose header predates the column is migrated here");
      expect(skill).toContain("every ledger table in the file, each `## CHG-*` one included");
      expect(rules).toContain("gains it at the next Phase 2b");
      expect(rules).toContain("`## CHG-*` tables included");
    });

    // A ledger can be mixed: the leading table predating the column while a
    // later `## CHG-*` table already carries it. An unconditional "append to
    // every table" hands that second table a duplicate header cell, and
    // `cell()` in `src/core/validators/tddList.ts` resolves a column with
    // `headers.indexOf` — the FIRST match. The stale `-` stays authoritative
    // and the freshly written module name is never read, so the very row the
    // migration was for remains ineligible for parallel dispatch.
    it(`${tree}: migration is per table — add where missing, fill in place`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const skill = flat(await read(tree, SDD_SKILL));
      const rules = flat(await read(tree, SDD_RULES));

      expect(checklists).toContain("deciding per table");
      expect(checklists).toContain("A table whose own header lacks `Owning module` gains it");
      expect(checklists).toContain(
        "A table that already carries the column is filled in place with its header untouched",
      );
      expect(checklists).toContain("never append a second `Owning module`");
      // The reason, so the rule survives a rewrite that keeps only the prose.
      expect(checklists).toContain("`headers.indexOf`");
      expect(checklists).toMatch(/reads the \*\*first\*\* column of that name/);
      expect(checklists).toContain("Mixed files are the normal case");

      expect(skill).toContain("gains the column only where its own header lacks it");
      expect(skill).toContain("never given a duplicate");

      expect(rules).toContain("added to the header of each ledger table that lacks it");
      expect(rules).toContain(
        "A table already carrying the column is filled in place, never given a second one",
      );
      expect(rules).toMatch(/resolves the \*\*first\*\* column of that name/);
    });

    // The column answers one question — what will this row write in
    // production, before RED makes it observable. It is a necessary input to
    // `delivery-planner`, not the verdict: the test-module, write/read,
    // fixture, schema, external-resource and worktree gates in
    // `parallelization-policy.md` all still have to hold.
    it(`${tree}: the column is not stated as the whole parallel gate`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const rules = flat(await read(tree, SDD_RULES));
      const skill = flat(await read(tree, SDD_SKILL));

      // The template no longer restates the column, so the three documents that
      // do are what must agree that it is necessary and not sufficient.
      for (const text of [checklists, rules, skill]) {
        expect(text).toContain("parallelization-policy.md");
      }
      expect(checklists).toContain("It is not by itself a parallel verdict");
      expect(rules).toContain("necessary for parallel dispatch, never sufficient");
      expect(skill).toContain("not the whole gate");
    });

    it(`${tree}: the traceability rules list it among the optional columns`, async () => {
      const rules = flat(await read(tree, SDD_RULES));

      expect(rules).toContain(
        "Optional columns: `US-Refs`, `CON-API-Refs`, `Blocked-By`, `Owning module`",
      );
      expect(rules).toContain(
        "Optional columns detail: `Owning module` — the production module the row will write",
      );
    });
  }
});
