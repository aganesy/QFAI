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
      expect(evidence).toContain("together with the `Revision` that run was made against");
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

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});
