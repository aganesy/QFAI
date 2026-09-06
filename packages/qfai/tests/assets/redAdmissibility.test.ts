/**
 * "Confirm the test actually fails for the expected reason" was the entire RED
 * admissibility standard qfai shipped.
 *
 * The phrase occurred three times in the assistant tree, always as an
 * obligation and never as a definition, and no validator adjudicated it. Under
 * the skill's own Red-then-Green ordering, the first failure for any row that
 * introduces a new module or symbol is a load error **by construction** — which
 * proves the seam was absent and says nothing about whether the assertions
 * discriminate. The evidence contract could not record the difference and
 * explicitly blessed truncated output, so the strongest RED and the emptiest
 * one were indistinguishable at every gate.
 */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const ADMISSIBILITY = "assistant/skills/qfai-implement/references/red-admissibility.md";
const ROUND_EVIDENCE = "assistant/skills/qfai-implement/references/round-evidence.md";
const GATEKEEPER = "assistant/agents/qa-gatekeeper.md";
const PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";
// The audit subject moved out of the delegation baseline into its own reference
// while this branch was open; the baseline cites it rather than restating it.
const DELEGATION = "assistant/constitution/references/audited-evidence-hash.md";
const WORKFLOW = "assistant/constitution/workflow.md";
const AGENTS_DIR = "assistant/agents";
const CODEX_GATEKEEPER = ".codex/agents/qa-gatekeeper.toml";

/**
 * A backtick-quoted doc reference in a shipped agent whose target is decidable:
 * written from the project root (`.qfai/assistant/…`), or explicitly relative to
 * the agent's own directory (`./`, `../`, `references/`). Bare first segments
 * are excluded — `uiux/40_screen_contracts.md` names a spec artifact, not a
 * sibling file — as are placeholder paths (`<spec-id>`, `spec-*`), which address
 * runtime artifacts no template tree holds.
 */
const AGENT_DOC_REF =
  /`((?:\.qfai\/assistant\/|\.{1,2}\/|references\/)[^`\s<>*#]+\.(?:md|ya?ml))(?:#[^`]*)?`/g;

const flat = (s: string): string => s.replace(/\s+/g, " ");

/** The Codex copy stores the same prose as an escaped TOML string. */
const flatToml = (s: string): string => flat(s.replace(/\\n/g, "\n"));

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("defines admissibility positively and negatively", async () => {
    const doc = await read(tree, ADMISSIBILITY);
    // Positive: what a RED must be.
    expect(doc).toContain("The test module **imports and loads successfully**");
    expect(doc).toContain("executing inside the row's own `Selector`");
    expect(doc).toContain("names the predicate the row owns");
    // Negative: the forms that prove only that a seam was missing.
    for (const excluded of [
      "collection / import / module-resolution error",
      "syntax error",
      "missing symbol or missing export",
      "fixture, factory or test-harness setup error",
    ]) {
      expect(doc).toContain(excluded);
    }
  });

  it("states the vacuity test the whole gate exists for", async () => {
    // If the run would fail identically with every assertion deleted, the
    // observation carries no information about the assertions.
    expect(await read(tree, ADMISSIBILITY)).toContain(
      "Deleting every assertion in the test would make the run **pass**",
    );
  });

  it("gives criterion 4 an evidence field, so it is not a conjunct nothing can evaluate", async () => {
    // Criteria 1-3 are readable off the recorded RED pair. Criterion 4 is a
    // counterfactual: `RED failure mode: assertion` is written with the same
    // three characters whether the assertion-stripped run happened or not, so
    // with no field of its own no gate could ever fail a row on it.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("`RED assertion-stripped result` — criterion 4's evidence");
    expect(doc).toContain("Re-run the `RED command` unchanged");
    expect(doc).toContain("**Restore immediately.**");
    // A falsifiability row has no RED pair to strip; its mutation answers it.
    expect(doc).toContain("A `falsifiability` row has no RED pair to strip");
    // Criterion 4 itself must point at where the obligation is discharged.
    expect(doc).toContain(
      "discharged by a second run and recorded as `RED assertion-stripped result`",
    );
  });

  it("carries the field in the per-item contract and in Phase Red", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "`RED assertion-stripped result` — **required wherever a RED pair is present**",
    );
    // The obligation must also be reachable at the point of action, not only
    // in the field list the reviewers audit.
    expect(skill).toContain("record both as `RED assertion-stripped result`");
  });

  it("defines a strip that still compiles, so a Go row can obtain the field", async () => {
    // `assert.Equal(t, want, got)` deleted outright leaves `want`, `got` and
    // the assert import unused — a build error in Go, in Rust under
    // deny(warnings) and in a linted Java build. The reject condition above
    // reads that as "the stripped run still fails", so the deletion wording
    // made the field unobtainable for a perfectly ordinary RED.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("### A neutralization that still compiles");
    expect(doc).toContain("every symbol and import the original test used is still used");
    // The worked example has to satisfy that bullet itself: `_ = want; _ = got`
    // alone leaves `testify/assert` unused, which is the same build error the
    // section exists to avoid, so the example must keep the library referenced.
    expect(doc).toContain("**The assertion library is one of those symbols.**");
    expect(doc).toContain("`_ = want; _ = got; _ = assert.Equal`");
    expect(doc).toContain("is an unused import, which Go rejects at build time");
    // A build error is a botched strip, not criterion 4's answer — and not an
    // exemption from the field either.
    expect(doc).toContain(
      "A stripped run that fails to build, collect or resolve is a **botched strip**, " +
        "not a criterion-4 failure.",
    );
    // The procedure's own step 1 must not still say "delete".
    expect(doc).toContain("**Neutralize every assertion** the row's `Selector` executes");
  });

  it("records the strip before the restore, and that the selector actually ran", async () => {
    // The gatekeeper reads this field after the restore, when the stripped
    // tree no longer exists. A passing line alone is equally producible by a
    // skipped selector, a deleted test body, an expectation moved to whatever
    // the code returns, or a production edit.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("**Take the diff before the restore.**");
    expect(doc).toContain("A diff that reaches anything else");
    expect(doc).toContain("show the row's `Selector` **executing and passing**");
    const gate = await read(tree, GATEKEEPER);
    expect(gate).toContain("**Judge the strip, not only its exit code.**");
    expect(gate).toContain("REVISE when the diff is absent, when it touches production source");
    // Emptying the selector's body reaches nothing outside the `Test file`,
    // keeps the `Selector` named and still reports it passing, so every
    // condition phrased as "what the diff may reach" admits it.
    expect(doc).toContain("**Nor is one that removes more than the assertions' verdicts.**");
    expect(doc).toContain(
      "the diff must leave the call under test, its arguments and the control flow " +
        "preceding the assertions standing",
    );
    expect(gate).toContain(
      "**REVISE too when the diff removes more than the assertions' verdicts**",
    );
    expect(gate).toContain(
      "require the call under test, its arguments and the control flow before the " +
        "assertions to be still standing in the diff",
    );
    expect(gate).toContain(
      "**Do not require the selector by name where the runner does not print it on success**",
    );
    // And the producer's contract must ask for the diff, or nothing takes it.
    expect(await read(tree, SKILL)).toContain(
      "the **strip diff** taken before the restore, its **passing** output",
    );
  });

  it("accepts a selector shown by the command where the runner names none on success", async () => {
    // `go test ./pkg -run '^TestFoo$'` names TestFoo when it fails and prints
    // bare `ok <package>` when it passes. Requiring the name in the stripped
    // run's output would REVISE every such RED, and the only way to obtain it —
    // adding `-v` — breaks "the RED command unchanged", which is a reject
    // condition of its own. The command's own filter plus a success line with
    // no zero-selected marker is the showing there.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("**Not necessarily by name.**");
    expect(doc).toContain(
      "the `RED command`'s own selector filter pins which tests could run, and the " +
        "success line carries no zero-selected or skipped marker",
    );
    expect(doc).toContain("`ok <package> [no tests to run]`");
  });

  it("grandfathers a round whose RED was observed before the field existed", async () => {
    // A row resumed at green / refactor / review-fix has a Round 1 RED taken
    // under the previous contract and its production code already in the tree,
    // so the stripped run is no longer takeable. Required retroactively, the
    // field strands a legitimately evidenced row — and contradicts the same
    // file's "Nothing existing becomes non-conformant".
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).toContain("## A round whose RED predates a field");
    expect(doc).toContain("Nothing existing becomes non-conformant.");
    expect(doc).toContain("records the field as `pre-contract`");
    // Narrow, or it is a bypass: only a round that already has its GREEN pair.
    expect(doc).toContain("The round must already hold a complete GREEN pair.");
    expect(doc).toContain(
      "`pre-contract` on a RED being submitted for `red`-phase review is a REVISE",
    );
    const gate = await read(tree, GATEKEEPER);
    expect(gate).toContain("**`pre-contract` is the one admissible absence.**");
    expect(gate).toContain(
      "Accept it **only** on a round that already holds a complete GREEN pair",
    );
  });

  it("makes the pre-contract warrant checkable, so a new round cannot claim it", async () => {
    // A complete GREEN pair does not show the RED predates the field: take the
    // RED now, skip the strip, write production code and a GREEN pair, and the
    // condition holds. And `working-tree+<content hash>` has no position in
    // history at all, so it orders against nothing. Either way criterion 4
    // stays optional for a new round unless the warrant is a commit shown to
    // precede the field.
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).toContain("**checkable against the update**");
    expect(doc).toContain(
      "`<git rev>` is a commit — never `working-tree+<content hash>`. A content hash has no " +
        "position in history, so it cannot show the RED came first.",
    );
    // Strict ancestry: `--is-ancestor` alone is also true when the RED was
    // taken *on* the field commit — a tree that already carried the field, so
    // the stripped run was takeable there.
    expect(doc).toContain("The ancestry must be **strict**");
    expect(doc).toContain(
      "`git merge-base --is-ancestor <git rev> <field commit>` plus `<git rev> != <field commit>`",
    );
    // And there has to be a stated way back, or the tightening strands a row.
    expect(doc).toContain(
      "The way back is a fresh observation, not a weaker warrant: the rework opens round N+1",
    );
    const gate = await read(tree, GATEKEEPER);
    expect(gate).toContain(
      "**and** whose `RED revision` is a commit shown to be a **strict** ancestor of the " +
        "commit that added this field",
    );
  });

  it("finds the field commit on a project that was updated, not initialized", async () => {
    // An existing project receives the field as a *modification* of the
    // reference file, so `--diff-filter=A` matches no commit there and
    // `pre-contract` would be unavailable on every updated project.
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).not.toContain("git log --diff-filter=A");
    expect(doc).toContain(
      "`git log --reverse --format=%H -S'RED assertion-stripped result' -- <this file>`",
    );
    expect(doc).toContain("**Do not filter that log to added files.**");
  });

  it("gives an unwarrantable round a migration path instead of a dead end", async () => {
    // Where the project does not track `.qfai`, or the round's RED revision is
    // `working-tree+<content hash>`, no warrant can exist — and "What opens a
    // round" lets only a REVISE needing new production behaviour open the next
    // round, so a missing strip trail alone could open none.
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).toContain("## The evidence-migration round");
    expect(doc).toContain("One further round is opened by no reviewer at all");
    expect(doc).toContain(
      "Neither is stranded by that: both take the **evidence-migration round**",
    );
    // It re-takes the RED on a tree the production behaviour is out of, so it
    // produces the field rather than excusing it.
    expect(doc).toContain("check out the parent of the commit that made the row GREEN");
    expect(doc).toContain("`pre-contract` is **not** available on a migration round");
    const gate = await read(tree, GATEKEEPER);
    expect(gate).toContain(
      "the row is not stranded and `pre-contract` is still refused: it takes the " +
        "**evidence-migration round**",
    );
  });

  it("sends the migration round's RED through the ordinary gate, before the restore", async () => {
    // The numbered procedure recorded the pair, the strip and `RED revision`
    // and then restored the production code — without `RED test hash` and its
    // manifest, which the round block requires and which address a tree the
    // restore destroys, and without submitting anything. The gatekeeper judges
    // a migration round as an ordinary round and completion re-asks for that
    // verdict, so the round closed with the one part nobody had judged.
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).toContain("**the whole of this round's RED subject**");
    expect(doc).toContain("`RED test hash` with its manifest wherever the row owes one");
    expect(doc).toContain(
      "**Submit that RED to `qa-gatekeeper`, routing phase `red`, and obtain its verdict here — " +
        "before the restore.**",
    );
    // Ordering is the whole point: a submission after the restore shows the
    // gatekeeper a tree the RED was not observed on.
    const submit = doc.indexOf("Submit that RED to `qa-gatekeeper`");
    const restore = doc.indexOf("Restore the production code and re-run to take this round's");
    expect(submit).toBeGreaterThan(-1);
    expect(restore).toBeGreaterThan(submit);
    // And the receiving side says what it now expects to arrive.
    expect(await read(tree, GATEKEEPER)).toContain(
      "it submits its own RED here before it restores the production code",
    );
  });

  it("points the grandfather and migration clauses at a path that resolves", async () => {
    // Read from `assistant/agents/`, `references/round-evidence.md` resolves to
    // `assistant/agents/references/round-evidence.md`, which no tree holds — so
    // the shipped gatekeeper could not reach the procedure it delegates
    // `pre-contract` and the migration round to.
    const gate = await read(tree, GATEKEEPER);
    expect(gate).toContain(`\`.qfai/${ROUND_EVIDENCE}\``);
    expect(gate).not.toContain("`references/round-evidence.md`");
    // Same prose, third depth: the catalog embeds this agent's instructions.
    const catalog = await read(tree, "assistant/manifest/agent-catalog.yml");
    expect(catalog).toContain(`\`.qfai/${ROUND_EVIDENCE}\``);
    expect(catalog).not.toContain("`references/round-evidence.md`");
  });

  it("keeps every shipped agent's assistant-tree reference resolvable", async () => {
    // The over-correction pin for the clause above: a differently-shaped path
    // is not a fix unless it addresses a file that exists. This resolves every
    // unambiguous reference in every shipped agent — root-relative, and the
    // directory-relative forms `./`, `../` and `references/` — so the whole
    // class is covered rather than the one string the review named. The
    // legitimately relative `../skills/…` references already in these files
    // resolve and must keep doing so.
    const dir = path.join(repoRoot, tree, AGENTS_DIR);
    const files = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
    expect(files.length).toBeGreaterThan(0);

    const unresolvable: string[] = [];
    let checked = 0;
    for (const file of files) {
      const text = await readFile(path.join(dir, file), "utf-8");
      for (const match of text.matchAll(AGENT_DOC_REF)) {
        const ref = match[1];
        checked += 1;
        const target = ref.startsWith(".qfai/")
          ? path.join(repoRoot, tree, ref.slice(".qfai/".length))
          : path.resolve(dir, ref);
        if (!existsSync(target)) unresolvable.push(`${file}: ${ref}`);
      }
    }
    expect(unresolvable).toEqual([]);
    expect(checked).toBeGreaterThan(0);
  });

  it("makes the ATDD producer take the stripped run its handover form requires", async () => {
    // The handover table requires the field on every observed-red entry, and
    // /qfai-implement step 3b consumes such a row without running its own
    // step 4 — the only place that skill strips a RED. So branch 1 has to take
    // it, or a natural ATDD RED reaches the gatekeeper structurally incomplete.
    const doc = await read(tree, PROVENANCE);
    expect(doc).toContain(
      "**Take the assertion-stripped run here, before step 4 submits the pair.**",
    );
    expect(doc).toContain("consumes a handed-over row **without running its own step 4**");
    // One procedure, not a restatement that can drift from the canonical one.
    expect(doc).toContain(
      "the reject conditions are the one in " +
        "`../../qfai-implement/references/red-admissibility.md` — do not restate them here",
    );
    // And it must reach the gatekeeper with the pair it is judged on.
    expect(doc).toContain(
      "**Submit that run — the RED pair and its assertion-stripped run — to `qa-gatekeeper`",
    );
  });

  it("makes the field per round, since each round strips its own RED", async () => {
    // round-evidence.md claims its list is the whole of the round block, so a
    // RED field missing from it is a field with two contradictory homes.
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).toContain("`Round N: RED assertion-stripped result`");
    expect(doc).toContain("the RED pair and its assertion-stripped run");
  });

  it("makes it adjudicable — the gatekeeper can fail a row on it", async () => {
    // Without a clause here the field would be recorded and never judged,
    // which is the same unenforceability in a new place.
    const doc = await read(tree, GATEKEEPER);
    expect(doc).toContain("`RED assertion-stripped result` records the `RED command` re-run");
    expect(doc).toContain("REVISE when it is absent, when the stripped run still fails");
  });

  it("keeps the producer and the audit subject in step with the new field", async () => {
    // A handed-over row's RED is taken by /qfai-atdd, so requiring the field
    // only on the consumer side would hand over an incomplete row; and a field
    // outside the audit subject can be back-filled after the PASS.
    expect(await read(tree, PROVENANCE)).toContain(
      // Both round fields carry the `Round N:` prefix the closed list requires
      // (#654), so the handover row names them prefixed.
      "`Round 1: RED failure mode`, `Round 1: RED assertion-stripped result`",
    );
    expect(await read(tree, DELEGATION)).toContain(
      "RED pair with its `RED assertion-stripped result`",
    );
  });

  it("does not let the seam throw, which would be the same non-observation", async () => {
    // An unasserted exception fails the run before any assertion executes, so
    // it shows the seam is unfinished — not that the assertions discriminate.
    // The seam telling the author to throw would have contradicted the
    // criterion in the same file.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("Do **not** make the seam throw");
    expect(doc).toContain("a test whose oracle _is_ an expected-exception check");
  });

  it("makes the admissible form reachable under the skill's own ordering", async () => {
    // Without a seam step, a new-symbol row can only ever produce a load error
    // at Red time, so the gate is vacuous exactly where it matters most.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("#### Red 3a — Minimal seam");
    expect(skill).toContain("Create the **minimal seam** the test needs to reach its assertion");
    expect(skill).toContain(
      "This is not Phase Green's production code: it implements no predicate",
    );
    // An HTTP row reaches its surface by route, not by import. Leaving the seam
    // defined as "module, export or signature" sent `/qfai-atdd` here for a
    // registration this step did not describe, so the test kept 404ing on the
    // resolution error `red-provenance.md` calls inadmissible.
    expect(skill).toContain("for an HTTP test a **registered route**");
    expect(skill).toContain("**Register it with a status the row does not contract for.**");
  });

  it("carries the criterion in Phase Red, not only in the reference", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("is a **missing seam**, not a RED");
    // An expected-exception check is admissible too; step 4 must not read as
    // assertion-only, or a correct exception test is judged a missing seam.
    expect(skill).toContain("an assertion — or an expected-exception check — inside this row");
    expect(skill).not.toContain(
      "Run the test and **watch it fail** — confirm the test actually fails for the expected reason",
    );
  });

  it("adds a failure-mode field so the distinction is recorded, not inferred", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "`Round N: RED failure mode` — `assertion` | `expected-error` | `falsifiability`",
    );
    expect(skill).toContain("There is no admissible value for a load error");
  });

  it("narrows the truncation allowance for the part that proves admissibility", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain(
      "result completeness is best-effort; truncated output is acceptable",
    );
    expect(skill).toContain(
      "never for the assertion message and its location: that is what demonstrates admissibility",
    );
  });

  it("mirrors the criterion into gate item 3", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`qa-gatekeeper` confirmed an **admissible** failure");
  });

  it("mirrors it into the constitution, which restated the obligation with no criterion", async () => {
    const workflow = await read(tree, WORKFLOW);
    expect(workflow).toContain("A RED is admissible only when an assertion — or an");
    expect(workflow).toContain("red-admissibility.md");
  });

  it("routes the genuinely-unobservable case to its own path, not to a load error", async () => {
    // The one legitimate case for no assertion-level RED already has evidence
    // rules of its own; admitting a load error instead would be a second,
    // unaudited escape.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("`Round N: RED failure mode: falsifiability`");
    expect(doc).toContain("red-not-observable.md");
    expect(doc).toContain(
      "Never weaken a correct test until it fails in order to manufacture a RED.",
    );
  });
});

describe(CODEX_GATEKEEPER, () => {
  it("carries the same resolvable reference as the canonical agent", async () => {
    // This copy embeds the gatekeeper's instructions verbatim at a third depth,
    // and it is not covered by the `.qfai` mirror the sync script maintains, so
    // it drifts silently. A path relative to the canonical file would resolve
    // to `.codex/agents/references/…` here; only the root-relative form is
    // right in all three copies.
    const toml = flatToml(await readFile(path.join(repoRoot, CODEX_GATEKEEPER), "utf-8"));
    expect(toml).toContain(`\`.qfai/${ROUND_EVIDENCE}\``);
    expect(toml).not.toContain("`references/round-evidence.md`");
    expect(toml).toContain("it submits its own RED here before it restores the production code");
  });
});
