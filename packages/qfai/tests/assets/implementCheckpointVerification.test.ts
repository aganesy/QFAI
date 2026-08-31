import { readFile } from "node:fs/promises";
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

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});
