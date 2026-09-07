import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its root mirror. */
const SKILL_DIRS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement"),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-implement"),
];

/** The authoring side of the `Selector` contract, shipped surface plus mirror. */
const SDD_SKILL_DIRS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd"),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-sdd"),
];

/** GitHub's heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) {
      slugs.add(slug(match[1]));
    }
  }
  return slugs;
}

/** The body between a heading and the next H2. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  expect(start, `${heading} must be a heading in the document`).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** One numbered line of the 12-point gate. */
function gateItem(skill: string, n: number): string {
  const body = section(skill, "### Item completion checklist (12-point gate)");
  const line = body.split(/\r?\n/).find((entry) => entry.startsWith(`${n}. `));
  expect(line, `gate item ${n} must be a numbered line in qfai-implement/SKILL.md`).toBeDefined();
  return flat(line ?? "");
}

/** The spec completion condition that recomputes the spec-level seal. */
function specSealCondition(skill: string): string {
  const line = skill
    .split(/\r?\n/)
    .find((entry) =>
      entry.startsWith("- Checkpoint verification passed at the spec-level boundary"),
    );
  expect(line, "the spec completion conditions must recompute the spec-level seal").toBeDefined();
  return flat(line ?? "");
}

describe("qfai-implement checkpoint verification contract", () => {
  it("reaches the spec-level boundary before the all-done early exit", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      // The bare "all done -> nothing to do" exit skipped the per-spec boundary
      // permanently: an interrupted run, or a re-run of a complete ledger, could
      // never record it afterwards.
      expect(skill).not.toMatch(
        /^- When all items are `done`, report "nothing to do" and exit\.$/m,
      );
      expect(skill).toContain("spec-level checkpoint boundary");
      // A ledger whose last row went to `exception` is terminal too — gating the
      // recovery on "all done" left that path with no way to record the boundary.
      expect(skill).toContain("terminal (`done` or a valid `exception`)");
      expect(skill).toContain(
        "references/checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger",
      );

      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(headingSlugs(reference)).toContain(
        "spec-level-boundary-on-an-already-complete-ledger",
      );
    }
  });

  it("resolves every same-file anchor the skill body points at", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const slugs = headingSlugs(skill);

      const anchors = Array.from(skill.matchAll(/\(see `#([a-z0-9-]+)`\)/g), (m) => m[1]);
      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        expect(slugs, `${anchor} must be a heading in qfai-implement/SKILL.md`).toContain(anchor);
      }
    }
  });

  // The per-item command is FILE-SCOPED, and the earlier prescription it replaces
  // is the reason: `-t` / `-k` hand the ledger's `Selector` to a REGEX matcher, so
  // a selector in the common `TC-NNNN-NNNN (TDD-NNNN): title` shape has its
  // parentheses read as a capture group, matches nothing, reports `1 skipped` — and
  // EXITS 0. Exit code is what the surrounding procedure reads, so that failure is
  // invisible exactly where it is consumed. Hence both halves are pinned here: the
  // prescribed form is present AND the defective one is gone.
  it("prescribes the file-scoped run and demotes the name option behind its regex caveat", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("run **file-scoped, with no test-name option**");
      // The fenced command itself, EOL-agnostic so a CRLF checkout reads the same.
      expect(reference).toMatch(/```bash\r?\n\s*<test runner> <Test file>\r?\n\s*```/);
      expect(reference).not.toContain("<test runner> <Test file> -t '<Selector>'");

      // The caveat must name the MECHANISM and the SILENCE, not merely counsel
      // care: a reader told only "mind the quoting" reproduces the exit-0 skip.
      expect(reference).toContain("reads as a capture group, not as characters");
      expect(reference).toContain("**exits 0**");
      // Narrowing survives as an OPTION, with the check that makes it safe.
      expect(reference).toContain("**If you do narrow**");
      expect(reference).toContain("A skipped count is not a pass.");
    }
  });

  // `go test` selects by package, not by file: handing it a lone `*_test.go`
  // switches it into file mode and drops the rest of the package from the
  // build, so the item's test normally fails on undefined symbols. This guidance
  // SURVIVES the file-scoped prescription — only its `-run` flag left with `-t`,
  // which is why the last assertion pins the flag's absence separately.
  it("derives a package, not a file, for package-selecting runners", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**The unit of selection is not always a file.**");
      expect(reference).toContain("Package-selecting runners (`go test`) take a");
      expect(reference).toMatch(/```bash\r?\n\s*go test \.\/<dir of Test file>\r?\n\s*```/);
      expect(reference).toContain("drops the rest of the package from the build");
      expect(reference).toContain("Derive the package from the `Test file`'s directory");
      expect(reference).not.toContain("-run '<Selector>'");
    }
  });

  // A `Selector` may legally hold several entries. The name options take a
  // substring, an expression or a regex — never a list, never a shell glob — so
  // interpolating the whole cell once selects zero tests and still exits 0: the
  // checkpoint would pass having run none of the row's tests. Step 1's default is
  // file-scoped, which cannot hit that; this rule governs the narrowing the
  // file-scoped prescription keeps as an explicit option, so it is pinned inside
  // that branch and not as a lettered decision of a mandatory name option.
  it("emits one step 1 command per selector entry", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**One command per `Selector` entry.**");
      expect(reference).toContain("emit one command per entry");
      expect(reference).toContain("Checkpoint verification command");
      // The silent form, which the flag shape turns into a no-op rather than an error.
      expect(reference).toContain("exits 0");
      // A glob is not a shell glob to any of these runners.
      expect(reference).toContain("translated into the runner's own name language");
      expect(reference).toContain("-run '^test_rejects_expired_token_'");
      // It hangs off "If you do narrow", so it must not re-announce a mandatory
      // name option — no count of lettered decisions may survive anywhere.
      expect(reference).toContain("**If you do narrow**");
      expect(reference).not.toContain("runner-specific decisions");
    }
  });

  // `-k` is a substring expression, so a prefix glob translated into it also
  // collects names that merely embed the prefix — the checkpoint would pass on a
  // test the row never named.
  it("keeps a glob's prefix semantics when translating it per runner", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("only where that language can anchor the prefix");
      expect(reference).toContain("-t '^test_rejects_expired_token_'");
      expect(reference).not.toContain("-k 'test_rejects_expired_token_' for pytest");
      expect(reference).toMatch(/pytest's `-k` is a\s+substring expression with no anchor/);
      expect(reference).toContain("test_other_test_rejects_expired_token_shadow");
      expect(reference).toMatch(/pytest, and any nested vitest\/jest name — enumerate/);
    }
  });

  // Step 1 exiting 0 having selected zero tests is exactly the failure mode a
  // per-entry command set exists to prevent, so exit code alone cannot pass it.
  it("requires step 1's output to name the entry it ran", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**Step 1 is not settled by its exit code, in either form.**");
      expect(reference).toContain("the recorded output names that entry as having run");
      expect(reference).toMatch(/an exit 0\s+whose output names no test is a FAIL/);
    }
  });

  // The reference is loaded on demand; the body is always in context. While the
  // body still defined PASS as "every command exits 0" and the completion
  // prohibition still spoke only of a non-zero exit, an agent reading the body
  // alone would record a zero-selection step 1 as PASS and advance to `done` —
  // the exact outcome the reference now calls a FAIL.
  it("carries step 1's output condition in the skill body too", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      // Evidence definition: the recorded command set is per-entry, not one command.
      expect(skill).toContain("one command per `Selector` entry, each recorded literally");
      // Pass criteria, in both places the body states them.
      expect(skill).toContain(
        "every step 1 run's recorded output names the `Selector` entry it ran",
      );
      expect(skill).toContain("**step 1 is not settled by its exit code**");
      // Completion prohibition: a nameless exit 0 blocks completion as a non-zero
      // exit does. NOT scoped to the narrowed form any more — the file-scoped
      // default cannot select nothing out of the *file*, but when several rows
      // share that file it can still run none of THIS row's tests.
      expect(skill).toContain(
        "or a step 1 command exited 0 without its recorded output naming the `Selector` entries that run had to observe",
      );
      // The bare exit-code definitions must not survive anywhere unqualified.
      expect(skill).not.toContain("(PASS only when every command exits 0)");
      expect(skill).not.toMatch(
        /verification command set exits 0; a partial run is not\r?\na pass\. /,
      );
    }
  });

  // pytest and `go test` print no test name by default, so the criterion above
  // would FAIL every correct run unless the command asks for the names. The
  // examples interpolate an ENTRY, not the whole `Selector` cell: a multi-entry
  // cell handed to one name option matches nothing, and the file-scoped
  // prescription pins the absence of the raw `-run '<Selector>'` form separately.
  it("makes step 1's command print the names it ran", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**The option that makes the run visible.**");
      // pytest's example selects by node ID: `-k` is an expression, not a literal
      // (see "selects a pytest entry by node ID" below).
      expect(reference).toContain("pytest '<Test file>::<node id>' --verbosity=1");
      expect(reference).toContain("go test ./<dir of Test file> -v -run '^<entry>$'");
      expect(reference).toContain("--reporter=verbose");
      expect(reference).toContain("--verbose");
      // The fallback for a runner with no such option.
      expect(reference).toMatch(/count of tests it reports as selected or run/);
    }
  });

  // pytest's `-v` is a counter, not a level: against a project that configures
  // `addopts = -q` it only cancels the `-q` and lands back on the nameless
  // default, so every correct run would FAIL the output-names-the-entry
  // criterion. Only an absolute level is independent of the project's config.
  it("sets pytest's verbosity absolutely so a configured -q cannot mute it", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("--verbosity=1");
      // The relative form must not survive as the prescribed pytest command.
      expect(reference).not.toContain("pytest <Test file> -v -k");
      expect(reference).not.toContain('`-v` for pytest ("Increase verbosity")');
      // The reason, so a later edit cannot quietly revert to the counter.
      expect(reference).toContain("one that sets the level, never one");
      expect(reference).toMatch(/addopts = -q/);
      expect(reference).toMatch(/PYTEST_ADDOPTS/);
      // `go test -v`, vitest and jest are booleans / named reporters already.
      expect(reference).toContain("are already absolute");
    }
  });

  // A `Selector` cell was contracted as "a comma-separated list", but a comma is
  // legal inside a single vitest/jest name — this repo has several. Splitting a
  // bare cell on commas turns one name into entries that each match nothing, and
  // a name option that matches nothing still exits 0.
  it("splits a selector cell by its entry form, never on a bare cell's commas", async () => {
    // The name below is a real one from this repo, kept assembled here so the
    // fixture cannot drift into looking like a list.
    const commaName = "falls back to the built-in set, and labels it, when the file is absent";

    for (const dir of SKILL_DIRS) {
      const granularity = await readFile(
        path.join(dir, "references", "selector-granularity.md"),
        "utf-8",
      );
      // The split rule has one home, stated as a parse and not a guess.
      expect(headingSlugs(granularity)).toContain("entry-form");
      expect(granularity).toContain("parses as a JSON array of strings");
      expect(granularity).toContain("**one entry per element**");
      expect(granularity).toContain("**Never split a bare cell on commas.**");
      expect(granularity).toContain(commaName);
      // Writing rules, so the form can be produced as well as read.
      expect(granularity).toContain("**Writing.**");
      expect(granularity).toMatch(/JSON's own\s+escaping/);
      expect(granularity).toContain("written as a one-element array");
      // The ambiguous contract must be gone from the contract's home.
      expect(granularity).not.toContain("a comma-separated list or a glob");

      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("selector-granularity.md#entry-form");
      expect(reference).toContain("**Do not split on commas**");
      expect(reference).toContain(commaName);
      expect(reference).not.toContain("comma-separated list or a glob");

      // The other two statements of the same contract must not disagree with it.
      const ledger = await readFile(path.join(dir, "references", "execution-ledger.md"), "utf-8");
      expect(ledger).toContain("a JSON array of names or a glob");
      expect(ledger).not.toContain("as a comma-separated list or a glob");

      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill).toContain("a JSON array of names or a glob");
      expect(skill).not.toContain("a comma-separated list or a glob");
    }

    // The row is authored by `/qfai-sdd`; a read rule the write side does not
    // know is a rule no ledger obeys.
    for (const dir of SDD_SKILL_DIRS) {
      const rules = await readFile(
        path.join(dir, "references", "spec-traceability-rules.md"),
        "utf-8",
      );
      expect(rules).toContain("a JSON array of entries, or a glob pattern");
      expect(rules).toContain("selector-granularity.md#entry-form");
      expect(rules).not.toContain("a comma-separated list, or a glob pattern");
    }
  });

  // The reference lets a runner that prints no names pass on a positive
  // selected/run count. That exception was never copied into the body, so an
  // agent reading the body alone blocked every such runner at `refactor`.
  it("mirrors the run-count fallback into the skill body", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      // Completion prohibition: a nameless exit 0 is blocking only when the
      // count is missing too — and the count stands in for a name on a NARROWED
      // run only, since file-scoped the siblings sharing the file supply it.
      expect(skill).toContain(
        "on a runner with no option that prints names, a positive selected/run count recorded in its place accepted for a **narrowed** run only",
      );
      // Evidence definition (`Checkpoint verification result`).
      expect(skill).toContain(
        "records a positive selected/run count in its place; an exit 0 with neither selected nothing and is a FAIL",
      );
      // Body pass criteria.
      expect(skill).toContain(
        "reports a positive selected/run count instead — because a run that selected zero tests exits 0 as well",
      );
      // The name-only forms must not survive: they are what blocked the runner.
      expect(skill).not.toContain(
        "or a step 1 command exited 0 with no test named in its recorded output",
      );
      expect(skill).not.toContain(
        "entry it ran; an exit 0 naming no test selected nothing and is a FAIL",
      );
    }
  });

  // "It over-runs ... it can only execute more than the row, never less" is true
  // of the FILE, not of the row. Several rows share a test file routinely; when
  // this row's tests are deleted or renamed the file-scoped run executes the
  // siblings' and exits 0, the full suite passes for the same reason, and step 4
  // lets it through because TDDLIST_SELECTOR_UNRESOLVED is a warning and the gate
  // is --fail-on error. Every command in the set reported success on a row whose
  // test did not exist.
  it("checks the row's own Selector even on the file-scoped default", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain(
        "**It can still run none of the row's own tests, so exit 0 is not the whole of it here either.**",
      );
      // The failure path is named, so the rule cannot be read as belt-and-braces.
      expect(reference).toContain("`TDDLIST_SELECTOR_UNRESOLVED` is a");
      expect(reference).toContain("`--fail-on error` lets it through by design");
      // The obligation itself, and its escape hatch for nameless runners.
      expect(reference).toContain("names **every**\n   `Selector` entry among the tests it ran");
      expect(reference).toContain("narrow per entry instead");
      // Pass criteria must agree — the old text settled the file-scoped form on
      // its exit code alone, which is exactly the hole above.
      expect(reference).toContain("**Step 1 is not settled by its exit code, in either form.**");
      expect(reference).not.toContain(
        "File-scoped it\ncannot select nothing, so there exit 0 is the whole of it",
      );
    }
  });

  // A Selector may hold any character a test name may hold. This repo's own suite
  // has names carrying an apostrophe, and `-k 'this row's ...'` is a shell syntax
  // error, so the checkpoint cannot be run at all.
  it("passes a Selector entry as an argument rather than pasting it into a shell line", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain(
        "**The entry is an argument, not a fragment of a command line.**",
      );
      expect(reference).toContain("Pass it as one argv element");
      // The concrete escape, for when a shell line is unavoidable.
      expect(reference).toContain("rewrite each embedded `'` as `'\\''`");
      // The two layers must not be conflated: regex-escaping is not shell-escaping.
      expect(reference).toContain(
        "the shell and\n   the regex are two layers, and getting one right does not settle the other",
      );
    }
  });

  // `-k` is a substring EXPRESSION pytest evaluates, so a name is not a legal
  // value for it: a parameter ID containing a comma exits 4 with "Wrong
  // expression passed to '-k'", which no amount of shell escaping repairs.
  it("selects a pytest entry by node ID rather than interpolating it into -k", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**pytest selects by node ID, not by `-k`.**");
      expect(reference).toContain("pytest --collect-only -q '<Test file>'");
      expect(reference).toContain("pytest '<Test file>::<node id>' --verbosity=1");
      expect(reference).toContain("Wrong expression passed to '-k'");
      // Over-correction pin: `-k` keeps its one legitimate use, and the regex
      // runners are untouched.
      expect(reference).toContain("Use `-k` only for a glob entry pytest can express");
      expect(reference).toContain(
        "Runners whose name option is a regex (`-t`, `-run`) keep taking the escaped-for-regex entry",
      );
      // The superseded example must not survive.
      expect(reference).not.toContain("pytest <Test file> --verbosity=1 -k '<entry>'");
    }
  });

  // The array form was legal only from this change onward; before it the contract
  // said "comma-separated list", so persisted ledgers hold cells that mean two
  // names and now read as one. Handed to a name option the joined string selects
  // zero tests and still exits 0, and the row can never advance again.
  it("gives a cell written under the old comma rule a way forward", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "selector-granularity.md"),
        "utf-8",
      );
      expect(reference).toContain("### Reading a cell written under the old comma rule");
      // The disambiguation is evidence-driven and ordered, so it can never invent
      // entries out of one comma-bearing name.
      expect(reference).toContain("**This branch wins**");
      expect(reference).toContain("If **every**\n   part names a test in that file");
      expect(reference).toContain("it is one entry — and the entry names no test");
      // Over-correction pin: this is a migration, not a second syntax. The
      // writing rule and the bare-cell rule both stand.
      expect(reference).toContain("Nothing here\nchanges **Writing**");
      expect(reference).toContain("**Never split a bare cell on commas.**");
    }
  });

  // The authoring surface has to name the enforcement, or a row author learns the
  // array form from one file and the per-entry requirement from neither.
  it("tells the ledger's author that every array element must resolve", async () => {
    for (const dir of SDD_SKILL_DIRS) {
      const rules = await readFile(
        path.join(dir, "references", "spec-traceability-rules.md"),
        "utf-8",
      );
      expect(rules).toContain("requires **every** element to name a test in the row's `Test file`");
      expect(rules).toContain("a surviving element cannot vouch for a deleted sibling");
      expect(rules).toContain(
        "selector-granularity.md#reading-a-cell-written-under-the-old-comma-rule",
      );
    }
  });

  // The reviewers PASS before the per-item checkpoint, so a fix made because
  // the checkpoint failed is code no reviewer has judged.
  it("requires a fresh reviewer PASS after a checkpoint fix", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**A fix invalidates the reviewer PASS that preceded it.**");
      expect(reference).toContain("re-submit to every routed blocking reviewer");
      expect(reference).toContain("obtain a fresh PASS **before** re-running the command set");
      expect(reference).toContain("carrying code no reviewer ever saw");
    }
  });

  it("defines one reproducible field-only checkpoint seal", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("The seal input is canonical and machine-recomputable");
      expect(reference).toContain(
        "`Revision: <value>`, `Checkpoint verification command: <value>`, and",
      );
      expect(reference).toContain(
        "Do not wrap this field-only seal in a file-path manifest record",
      );
    }
  });

  // A spec-level re-run has no "item just completed" to build step 1 from.
  it("defines a per-spec command set without the item selector", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("## Verification command set (per item)");
      expect(reference).toContain("## Verification command set (per spec)");
      expect(reference).toContain("step 1 is dropped");
    }
  });

  // A per-item gate can only be discharged by properties of the row it gates.
  // `npx qfai validate` and the static gates report the *spec's* defects — another
  // row's empty Evidence cell, a `.qfai/contracts/**` file no spec owns, an ATDD
  // finding this skill declares out of scope — none of which the gated row caused
  // or may fix. Carried per item, one unrelated defect anywhere in the spec holds
  // every row at `refactor` for good, and `refactor -> done` never fires again.
  it("keeps the spec-wide commands out of the per-item command set", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const perItem = section(reference, "## Verification command set (per item)");
      const perSpec = section(reference, "## Verification command set (per spec)");

      // Per item: the row's own selector and the suite its change could break.
      expect(perItem).toMatch(/^1\. The item's own test/m);
      expect(perItem).toMatch(/^2\. The full test suite/m);
      // The prose names the command to say it is *not* run here; the invocation
      // itself, and any step past 2, must be absent.
      expect(perItem).not.toContain("qfai validate --profile");
      expect(perItem).not.toContain("--fail-on error");
      expect(perItem).not.toMatch(/^3\.\s/m);
      expect(perItem).not.toMatch(/^4\.\s/m);
      expect(flat(perItem)).toContain(
        "they sit in the per-spec set below and are **not** run here",
      );

      // Per spec: the two commands whose findings that boundary's owner can act on.
      expect(perSpec).toMatch(/^3\. The project's static gates/m);
      expect(perSpec).toContain("npx qfai validate --profile tdd --fail-on error --spec");
      expect(flat(perSpec)).toContain(
        "the spec-level set is step 2 above plus steps 3 and 4 below",
      );
    }
  });

  // "A partial run is not a pass" must not read as "the per-item set owes step 4".
  it("scopes the zero-`QFAI-TEST-001` criterion to the set that runs step 4", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );
      expect(criteria).toContain("the per-spec set, the only one that includes it");
      expect(criteria).toContain("A step outside the applicable set is not owed");
      expect(criteria).toContain("A partial run of the applicable set is not a pass.");
    }
  });

  // Moving the static gates to the per-spec set means a lint/format/type defect
  // over a `done` row's code first surfaces where no row can be re-opened:
  // `done` has one exit (the approved upstream reset) and the skill skips `done`
  // rows on re-execution. Without a stated repair path the failure is unfixable.
  it("gives the per-spec FAIL a legal repair path", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const criteria = flat(section(reference, "## Pass criteria"));

      expect(headingSlugs(reference)).toContain("repairing-a-per-spec-fail");
      // The failure mode the section exists for, named.
      expect(criteria).toContain("formatter, linter or type-check failure");
      expect(criteria).toContain("skips `done` rows on re-execution");
      // The repair: fix in place, no status moves, fresh reviewer verdicts first.
      expect(criteria).toContain("**A per-spec FAIL is not a ledger event.**");
      expect(criteria).toContain("leave every `Status` where it is");
      expect(criteria).toContain("re-run the **whole** per-spec set");
      // A fix that moves the obligation is the one case that does reopen a row,
      // and it goes through the existing approved reset rather than a new edge.
      expect(criteria).toContain("that is a Change Request");
      expect(criteria).toContain("change-request-reset.md");
    }
  });

  // The repair moves the tree, so the affected rows' GREEN (item 5), reviewer
  // verdicts and per-item checkpoint (item 12) all describe the pre-fix tree.
  // Re-taking the verdicts alone left nothing saying the row's test still passes
  // and still discriminates — on rows the item loop skips, so nothing supplies it
  // later. The row's own entry is not rewritten: that is how the shared-fixture
  // case already pairs a `done` row with a record that is still open.
  it("pairs every repaired row with a re-verification at the boundary", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain(
        "**Re-verify each affected `done` row, and record it at the boundary.**",
      );
      expect(criteria).toContain("A `done` row's own entry is not rewritten");
      expect(criteria).toContain("qfai-atdd/references/shared-test-artifacts.md");
      expect(criteria).toContain("`## Shared-artifact re-verify` heading");
      // What each line carries: the re-run, and the proof that still discriminates.
      expect(criteria).toContain("the row's own selector re-run");
      expect(criteria).toContain("`Oracle proof` mutation re-taken against the repaired tree");
      expect(criteria).toContain("A passing re-run alone is not enough on a row that has a proof");
      expect(criteria).toContain("evidence-revision.md#what-makes-evidence-stale");
      // The record is sealed with the boundary it belongs to.
      expect(criteria).toContain("`Checkpoint verification seal` is taken over this block");
    }
  });

  // A repair that edits a test file moves the `RED test manifest`, so item 10's
  // `RED test hash` recomputation mismatches by construction on a handed-over row
  // — and a `done` row cannot take a fresh RED. The re-verify line carries the new
  // manifest and hash, which is the evidence that recomputation looks for.
  it("clears the RED test hash a test-touching repair moves, without re-taking item 3", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain("any artifact its `RED test manifest` names");
      expect(criteria).toContain("the `RED test hash` recomputation at item 10");
      expect(criteria).toContain("**Item 3 is not re-taken**");
      expect(criteria).toContain("a RED addresses the manifest as it was when it was observed");
    }
  });

  // `product-surface-reviewer` sits in `conditional_agents`, never in
  // `blocking_agents`, yet gate item 9 requires its PASS on a UI-affecting row.
  // Re-running the blocking list alone carries a pre-fix surface verdict onto
  // display logic that was changed to satisfy a linter or the type checker.
  it("re-runs every required reviewer after a repair, not just the blocking list", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain("every **required** reviewer whose scope the fix touches");
      expect(criteria).toContain('"Required" is wider than `blocking_agents`');
      expect(criteria).toContain("`product-surface-reviewer` on a UI-affecting row");
      expect(criteria).toContain("lists only under `conditional_agents`");
      expect(criteria).toContain("item 9 still requires its prototype parity PASS");
    }
  });

  // A parked row never reached Phase Green: it has no GREEN, no `Oracle proof`
  // and no checkpoint to re-take, and no gate checks its evidence. Demanding them
  // made a per-spec FAIL unclearable on any ledger holding an `exception` row.
  it("keeps exception rows out of the in-place re-verification", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain("**`exception` rows are outside all of this.**");
      expect(criteria).toContain("it owes no GREEN, no `Oracle proof`");
      // Its own approval-free exit is the edge that reopens it, not a CR.
      expect(criteria).toContain(
        "`exception -> todo` is that row's own exit and needs no approval",
      );
    }
  });

  // A formatter/linter/type fix inside a `done` row's test file — and a corrected
  // expected value that never matched its acceptance criterion — change the test
  // without moving the obligation. Treating either as a Change Request demanded a
  // reset `change-request-reset.md` may only grant for an approved *upstream*
  // change, so the row was left holding a static gate it could never clear.
  it("keeps an obligation-preserving test fix out of the approved reset", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain("**A test edit alone is not a Change Request.**");
      expect(criteria).toContain("the **obligation** moving");
      expect(criteria).toContain("not the test text changing");
      // The corrected-assertion case: no upstream artifact moved, so no CR exists.
      expect(criteria).toContain(
        "correcting an expected value that never matched the criterion it was written from",
      );
      expect(criteria).toContain("approved **upstream** change invalidating rows");
      // The reset stays for the repair that really does move the obligation.
      expect(criteria).toContain("without moving the obligation itself");
    }
  });

  // A correction that moves what an assertion asserts is still in-place, but the
  // row's recorded `Oracle proof` was chosen against the assertion the correction
  // replaced, and `evidence-revision.md` invalidates the original RED as soon as a
  // later change touches the test. Nothing then says the corrected assertion would
  // have failed before the production code existed — which is what item 3 is.
  it("requires fresh falsifiability evidence for a correction that moves the assertion", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      // The re-taken proof alone is explicitly not enough here.
      expect(criteria).toContain("and more than a re-taken `Oracle proof`");
      expect(criteria).toContain("chosen against the assertion the correction replaced");
      expect(criteria).toContain(
        "nothing says the corrected assertion would have failed before the production code existed",
      );
      // What it takes instead: item 3's own substitute, against the new assertion.
      expect(criteria).toContain("**falsifiability evidence for the corrected assertion.**");
      expect(criteria).toContain("an assertion failure raised by the corrected assertion");
      expect(criteria).toContain("`RED failure mode: falsifiability`");
      expect(criteria).toContain("route `qa-gatekeeper` on the mutation run");
      // Over-correction pin: a non-semantic edit still owes none of it, and item 3
      // is still not re-taken for one — that is the previous finding's fix.
      expect(criteria).toContain("**Item 3 is not re-taken**");
      expect(criteria).toContain(
        "**That is the rule for an edit that leaves every assertion asserting what it asserted**",
      );
      expect(criteria).toContain(
        "An edit that leaves every assertion asserting what it asserted owes none of this.",
      );
    }
  });

  // Step 4 already says `QFAI-TEST-001` has no spec owner, and a sibling's
  // `it.todo` fails this gate. Left out of the record-and-wait branch, it fell to
  // the in-place repair, which would edit a spec this run is not processing.
  it("routes a QFAI-TEST-001 this spec does not own to the record-and-wait branch", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain(
        "**and a `QFAI-TEST-001` this spec does not own** — it is not repaired from here at all",
      );
      expect(criteria).toContain("the boundary stays unpassed until its owner clears it");
      // The sibling case, named: its file belongs to another spec's ledger.
      expect(criteria).toContain(
        "A stub in a test file no row of this ledger names in `Test file`",
      );
      expect(criteria).toContain(
        "repairing it from here would edit a spec this run is not processing",
      );
    }
  });

  // `every QFAI-TEST-001` also swept up a stub in a file this spec's own ledger
  // names. Every row is terminal and skipped at this boundary, so "wait for the
  // owner" named this spec itself with no repair subject in it: the boundary could
  // never be passed. Ownership is decided by the file and the obligation, not by
  // the rule id.
  it("splits QFAI-TEST-001 by the file and obligation that own it", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );

      expect(criteria).toContain(
        "**A `QFAI-TEST-001` is split by the file it names, not by the rule id.**",
      );
      // Owned by this spec, obligation already carried: scaffolding, repaired here.
      expect(criteria).toContain(
        "one standing for an obligation a row of this spec already carries is scaffolding a `done` row left behind",
      );
      expect(criteria).toContain("the in-place re-verification above is the whole of its repair");
      // Owned by this spec, obligation carried by no row: a missing row, upstream.
      expect(criteria).toContain(
        "one standing for an obligation no row carries is a **missing row**, and rows are upstream",
      );
      expect(criteria).toContain("the boundary waits for that row to exist and run");
    }
  });

  // The static gates take no `--spec`: `prettier -c .`, `eslint .` and `tsc -b`
  // are whole-tree, so a sibling spec's or another package's in-flight file fails
  // them at this boundary. Sending those findings to the in-place repair would
  // rewrite a spec this run is not processing.
  it("classifies static-gate findings by ownership before repairing them", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const perSpec = flat(section(reference, "## Verification command set (per spec)"));
      const criteria = flat(section(reference, "## Pass criteria"));

      expect(perSpec).toContain("**These take no `--spec`**");
      expect(perSpec).toContain("`prettier -c .`, `eslint .`, `tsc -b`");
      expect(perSpec).toContain("Classify every static finding by the file it names");
      // What this boundary owns, and what it does not.
      expect(perSpec).toContain(
        "a file a `done` row of **this** spec produced, or a test file this spec's ledger names in `Test file`, is this boundary's to repair",
      );
      expect(perSpec).toContain("takes the record-and-wait branch instead");
      expect(perSpec).toContain("leave the boundary unpassed until that owner clears it");
      // The repair section only receives what the classification kept.
      expect(criteria).toContain("**Everything below is about a finding this spec owns**");
      expect(criteria).toContain("never enters this path");
    }
  });

  // The re-verification is written beside the boundary, not into the `done` row's
  // entry. Item 10 read that entry for items 5 and 7-9, so the re-verified row
  // stayed stale however correctly the block was written — the gate was looking at
  // the fields the repair invalidated. It must consume the block as the substitute.
  it("makes gate item 10 consume the boundary re-verification block", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const item10 = gateItem(skill, 10);

      expect(item10).toContain(
        "**A `## Shared-artifact re-verify` entry naming this row is read in place of the per-item observations it re-took**",
      );
      expect(item10).toContain("not only to clear the `RED test hash` mismatch above");
      expect(item10).toContain(
        "items 5, 7-9 and 12 are satisfied by what it carries at the `Revision` it names",
      );
      // The block's revision is the one the substituted items agree on.
      expect(item10).toContain("That `Revision` is then the one those items agree on.");
      // Over-correction pin: the entry is still not rewritten, and item 3 keeps its own.
      expect(item10).toContain("that row's own entry is deliberately not rewritten");

      // The reference states the same rule from the boundary's side.
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );
      expect(criteria).toContain(
        "**The gate consumes it as the substitute for the observations the repair invalidated**",
      );
      expect(criteria).toContain(
        "gate items 5, 7-9 and 12 are verified from what the block carries at the `Revision` it names",
      );
    }
  });

  // The reference seals the spec-level boundary over four inputs; the completion
  // conditions recomputed over three. A hash over three inputs never matches one
  // taken over four, so any spec that used the repair path was uncompletable.
  it("recomputes the spec-level seal over the inputs it was taken over", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const evidence = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Evidence",
        ),
      );
      const condition = specSealCondition(skill);

      // Taken over: command, result, block, revision.
      expect(evidence).toContain("`Checkpoint verification command`");
      expect(evidence).toContain("`Checkpoint verification result`");
      expect(evidence).toContain("any `## Shared-artifact re-verify` block this boundary wrote");
      // The fourth input is the boundary's OWN address, not a round block's
      // `Revision`: that boundary has no row, so there is no round to take one
      // from. `evidenceRevision.test.ts` owns the rename; this row owns the
      // arity, and the two must name the same fourth input or a seal taken
      // here can never match the recomputation over there (#501).
      expect(evidence).toContain(
        "together with a `Checkpoint verification revision` of its own, recorded beside them",
      );
      expect(evidence).toContain(
        "**Those four inputs are the whole subject, and the recomputation takes the same four.**",
      );

      // Recomputed over the same four — the block included.
      for (const input of [
        "command",
        "result",
        "**any `## Shared-artifact re-verify` block that boundary wrote**",
        "revision",
      ]) {
        expect(condition).toContain(input);
      }
      expect(condition).toContain(
        "a recomputation over three of them can never match a seal taken over four",
      );
      // A boundary with no repair still seals the other three.
      expect(condition).toContain("Where no repair ran the boundary wrote no block");
      expect(evidence).toContain("the boundary wrote no block and the subject is the other three");
    }
  });

  it("launches the CLI through npx, which is how a project dependency resolves", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      // The claim is the launcher, not the whole invocation: the command also
      // carries `--spec <spec-id>`, because this skill runs one spec at a time
      // and an unscoped checkpoint fails on a sibling's in-flight work.
      expect(reference).toContain("`npx qfai validate --profile tdd --fail-on error --spec");
      // A bare launcher exits 127 on a normal local install, failing every checkpoint.
      expect(reference).not.toMatch(/^\d+\.\s+`qfai /m);
    }
  });

  // `QFAI-TEST-002` is `info`, so `--fail-on error` exits 0 on it. A project
  // still carrying the `testFileGlobs: []` that `qfai init` ships scans zero
  // files, `QFAI-TEST-001` cannot fire, and gates phrased as "zero
  // QFAI-TEST-001" passed on a stub scan that never ran. Every gate that names
  // the one code must name the other.
  it("blocks completion on QFAI-TEST-002, not only on QFAI-TEST-001", async () => {
    for (const dir of SKILL_DIRS) {
      const checkpoint = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(checkpoint).toContain(
        "reports zero `QFAI-TEST-001` **and** zero `QFAI-TEST-002` findings",
      );
      expect(checkpoint).toContain("Reading that exit 0 as a pass passes a gate that");
      // A waiver leaves the finding in the output with `suppressed=true`
      // (`waivers.ts:applyWaiversToFindings`), so a gate phrased as a flat
      // "zero QFAI-TEST-002" would be unsatisfiable on the very repositories
      // the waiver route exists for — an unscannable extension reports the
      // code on every run.
      expect(checkpoint).toContain("A waiver does not remove the finding");
      expect(checkpoint).toContain("`suppressed=true`");

      const checklist = await readFile(path.join(dir, "references", "final-checklist.md"), "utf-8");
      expect(checklist).toContain("a waiver has not marked `suppressed=true`");
      expect(checklist).toContain("Do **not** tick the");

      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill).toContain("**Or the run reports a `QFAI-TEST-002` no waiver marked");
    }
  });

  // The boundary cadence was stated three times: this file denied the counted
  // rule that `relevant-test-suite.md` and gate item 12 both assume, so an agent
  // ran either ~1 full suite per row or ~1 per 10 depending on which document it
  // opened. The cadence now lives in one file; the other two cite its anchor.
  it("defers the boundary cadence to relevant-test-suite.md instead of restating it", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const cadence = await readFile(
        path.join(dir, "references", "relevant-test-suite.md"),
        "utf-8",
      );

      // Neither the reference nor the skill may deny the counted rule again.
      for (const [name, document] of [
        ["checkpoint-verification.md", reference],
        ["SKILL.md", skill],
      ] as const) {
        expect(document, `${name} must not deny the counted cadence`).not.toContain(
          'There is no "every N items" rule',
        );
        expect(document, `${name} must not claim a boundary per row`).not.toContain(
          "Every item has exactly one",
        );
        // Nor may either re-derive the condition. "The last row a run completes
        // is always a boundary" is false for a run that completes one named row
        // while others are still `todo` — the ordinary `/qfai-atdd` handoff.
        expect(document, `${name} must not re-derive the condition`).not.toContain(
          "always a boundary",
        );
      }

      expect(reference).toContain("**Not every row is one.**");
      expect(reference).toContain("`relevant-test-suite.md#checkpoint-boundaries`");
      expect(skill).toContain("**Not every row is one**");
      expect(skill).toContain("`references/relevant-test-suite.md#checkpoint-boundaries`");

      // The cited anchor has to resolve, and the cadence has to stay in the one
      // file that owns it.
      expect(headingSlugs(cadence)).toContain("checkpoint-boundaries");
      // Scoped to the per-item tier: that anchor owns which ROWS are boundaries.
      // The spec-level boundary has no row and is defined in THIS file, so the
      // anchor must not claim to be the single definition of every full-suite
      // run — that claim is what made its "only at" read as licence to skip the
      // per-spec run this file separately requires.
      expect(cadence).toContain(
        "**This list is the single definition of the PER-ITEM boundary cadence",
      );
      expect(cadence).not.toContain(
        "**This list is the single definition of the boundary cadence.**",
      );
      expect(cadence).toContain("is defined there, not here");
      expect(cadence).toContain("every **N-th** completed row, with `N = 10` by default");

      // The off-boundary record takes the narrow command set VERBATIM and is
      // sealed over it, so the resolution-step label cannot live inside that
      // field: mixing it in changes the sealed bytes. It has a home already —
      // `relevant-test-suite.md` requires the step in the item's evidence.
      expect(reference).toContain("never inside `Checkpoint verification command`");
      expect(reference).toContain("changes the sealed bytes");
      expect(reference, "the label's location is left to the reader again").not.toContain(
        "Label the entry with the\nresolution step used",
      );

      // `qfai-atdd` hands branch-1 rows to this skill, and its own reference
      // restated the cadence as one full suite per row. Two skills, two
      // frequencies — the same contradiction one directory over.
      // `red-provenance.md` and the stage-handover topic it points at. The
      // handover protocol moved out when the file crossed the shipped-asset
      // line ceiling, and the cadence deferral travelled with it — the subject
      // here is that the ATDD side states no cadence of its own, which is a
      // property of the pair, not of whichever file currently holds the words.
      const provenance = (
        await Promise.all(
          ["red-provenance.md", "stage-handover.md"].map(async (name) =>
            readFile(path.join(dir, "..", "qfai-atdd", "references", name), "utf-8"),
          ),
        )
      ).join("\n");
      expect(provenance, "red-provenance.md must not restate the cadence").not.toContain(
        "every row's checkpoint runs the full suite",
      );
      expect(provenance).toContain(
        "../../qfai-implement/references/relevant-test-suite.md#checkpoint-boundaries",
      );
      // Nor may it re-derive one. "The last row a run completes is always a
      // boundary" is false for the single-row handoff P1c makes while other
      // `todo` rows are still open, and reading it that way puts every
      // ATDD-driven run back on one full suite per row.
      expect(provenance, "red-provenance.md must state no cadence condition").toContain(
        "this file states no condition of its own",
      );
    }
  });

  // Off a boundary nothing is re-run, but item 12 still recomputes the seal over
  // all three checkpoint fields on every row. Without a stated source for those
  // fields an off-boundary row either cannot reach `done` or has to fabricate a
  // full-suite command it never executed.
  it("gives an off-boundary row a completable checkpoint evidence contract", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      expect(reference).toContain("**A row between boundaries records the same three fields.**");
      expect(reference).toContain("recomputes the seal on every row");
      expect(reference).toContain("invent a full-suite command it never ran");
      expect(reference).toContain("takes the narrow relevant-suite command set of Phase: Refactor");

      expect(skill).toContain(
        "**Off a boundary nothing is re-run, and the three fields are still required**",
      );
      expect(skill).toContain("`references/checkpoint-verification.md#evidence`");
      expect(headingSlugs(reference)).toContain("evidence");
    }
  });

  // Gate item 12 runs `npx qfai validate` at every per-item boundary and again
  // per spec, and a partial command set is not a pass. A blanket "running
  // validation gates is a non-goal" therefore denies the skill's most frequent
  // command: honour it and no item leaves `refactor`.
  it("does not disown the scoped validate run its own gate requires", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      const nonGoals = /^## Non-goals$\n([\s\S]*?)(?=^## )/m.exec(skill)?.[1];
      expect(nonGoals, "qfai-implement/SKILL.md must keep a `## Non-goals` section").toBeDefined();
      if (nonGoals === undefined) continue;

      // The blanket form. `/qfai-verify` may own the full scan; it may not own
      // the scoped run gate item 12 mandates.
      expect(nonGoals).not.toMatch(/^-\s+Running validation gates \(use `\/qfai-verify`\)\.$/m);
      // Whatever the section reserves for `/qfai-verify`, it must say the
      // scoped run belongs here.
      expect(nonGoals).toContain("npx qfai validate --profile tdd --fail-on error --spec");
      expect(nonGoals).toContain("references/checkpoint-verification.md");
    }
  });

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});

/** `### Item completion checklist (N-point gate)` — the arity in the gate's own name. */
const GATE_HEADING = /^#{1,6}\s+Item completion checklist \((\d+)-point gate\)\s*$/;

/** Every spelling of the gate's size, wherever it is named. */
const GATE_LABEL = /(\d+)-point (?:reviewer )?gate/g;

/** Manifest comments that name the gate, relative to `assistant/`. */
const GATE_NAMING_MANIFESTS = ["manifest/agent-routing.yml", "manifest/review-profiles.yml"];

/** The arity the checklist heading claims, and the ordinals actually listed under it. */
function gateArity(skill: string): { named: number; ordinals: number[] } {
  const lines = skill.split(/\r?\n/);
  const start = lines.findIndex((line) => GATE_HEADING.test(line));
  if (start === -1) {
    return { named: 0, ordinals: [] };
  }
  const named = Number(GATE_HEADING.exec(lines[start] ?? "")?.[1]);
  const ordinals: number[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) {
      break;
    }
    const ordinal = /^(\d+)\.\s/.exec(line);
    if (ordinal?.[1]) {
      ordinals.push(Number(ordinal[1]));
    }
  }
  return { named, ordinals };
}

/** Absolute paths of every prose/manifest file in the skill directory. */
async function gateNamingFiles(skillDir: string): Promise<string[]> {
  const entries = await readdir(skillDir, { recursive: true });
  return entries.filter((entry) => /\.(md|ya?ml)$/.test(entry)).map((e) => path.join(skillDir, e));
}

describe("qfai-implement gate arity naming", () => {
  // The twelfth item was inserted without renaming the gate, so nine lines went
  // on calling it the 11-point gate. Counting the list is the only check that
  // does not itself have to be kept in sync by hand.
  it("names the gate by the number of items it actually has, everywhere", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const { named, ordinals } = gateArity(skill);

      expect(named).toBeGreaterThan(0);
      expect(ordinals).toEqual(Array.from({ length: named }, (_, index) => index + 1));

      const assistant = path.resolve(dir, "..", "..");
      const files = [
        ...(await gateNamingFiles(dir)),
        ...GATE_NAMING_MANIFESTS.map((rel) => path.join(assistant, rel)),
      ];
      for (const file of files) {
        const content = await readFile(file, "utf-8");
        for (const [label, arity] of content.matchAll(GATE_LABEL)) {
          const where = `${path.relative(repoRoot, file)} calls it the ${label}`;
          expect(Number(arity), where).toBe(named);
        }
      }
    }
  });

  // Item 11 was not deleted, it means something else now: a citation left on the
  // old ordinal resolves to the reviewer-verdict append and looks satisfied, so
  // the checkpoint the sentence exists to require is never located in the gate.
  it("cites checkpoint verification by the item that carries it, not the one it displaced", async () => {
    const citing = ["references/volume-policy.md", "references/relevant-test-suite.md"];
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const { named } = gateArity(skill);
      const last = `${named}. Checkpoint verification passed`;
      const lines = skill.split(/\r?\n/);
      expect(
        lines.some((line) => line.startsWith(last)),
        `gate item ${named} is "${last}"`,
      ).toBe(true);

      for (const rel of citing) {
        const content = await readFile(path.join(dir, rel), "utf-8");
        expect(content).toContain("`SKILL.md#checkpoint-verification`");
        expect(content).toContain(`item ${named} of the ${named}-point gate`);
        expect(content, `${rel} cites the pre-insertion ordinal`).not.toMatch(/\bitem 11\b/);
      }
    }
  });
});
