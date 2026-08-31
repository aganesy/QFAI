/**
 * `Prototype parity` needs a recording obligation, not just a field (#571).
 *
 * `qfai-implement/SKILL.md` makes prototype parity PASS item 9 of the gate and
 * gives it a named field in the per-item evidence contract, but the two
 * passages that oblige a verdict to be *written* to the evidence file — gate
 * item 11 and the completion prohibition — both said "both reviewer verdicts".
 * Two, not three. Since the prohibition also declares itself "the single
 * blocking statement about the evidence file", a UI-affecting item could reach
 * `done` with a gate-passing evidence file that never recorded the parity
 * verdict — the one verdict that cannot be re-derived from the spec and the
 * diff, because it was taken against a rendered surface that has since moved.
 *
 * The field was also weaker than its two siblings: it carried neither
 * `Reviewed revision` nor `Audited evidence hash`, so gate item 10's
 * recompute had nothing to recompute for it.
 *
 * Three follow-ons, each a place where the same contract was stated with a
 * count of two: `references/execution-ledger.md` still told the runner to
 * append "the two reviewer verdicts"; the canonical audit-hash procedure in
 * `shared-skill-delegation-baseline.md` defined the _Completion review_
 * subject for `completion-reviewer` / `implementation-reviewer` only, leaving
 * the parity hash with no defined extent to recompute; and the same-revision
 * rule (`references/evidence-revision.md`) covered the GREEN and "the two
 * reviews", so a parity PASS taken before the UI moved stayed fresh.
 *
 * A fourth followed from defining that subject: it hashes "the surface
 * artifacts the row's entry names", but no field in the phase-authored contract
 * ever made the entry name one. A conforming UI row therefore named none, fell
 * into "a row with no such artifact has no extra record", and had its parity
 * verdict hashed over fields alone — so the screenshots it PASSed on could be
 * replaced with `Reviewed revision` (which excludes `.qfai/evidence/**`) and
 * `Audited evidence hash` both unmoved, and item 10 still passing. The manifest
 * is now a required phase-authored field, named once and read by the reviewer
 * and the gate alike, and an entry without it is refused at the gate.
 *
 * A fifth followed from admitting those artifacts: step 2 of the audit-hash
 * procedure normalized every record in the subject — LF line endings, trailing
 * whitespace stripped — and the manifest names runtime screenshots, which
 * `qfai-prototyping` writes as `.png`. A PNG is an arbitrary byte string with
 * no lines and no trailing whitespace, so that step is not a normalization of
 * it but a rewrite: the reviewer and gate item 10 got different digests for one
 * unchanged image depending on what each used to read it, and two images
 * differing only in the rewritten bytes collapsed onto one digest — the
 * replacement the verdict exists to catch. Step 2 is now scoped to Markdown and
 * HTML, every other record hashes the raw bytes, and the class is the record's
 * extension so neither party has to sniff content to agree.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_REL = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER_REL = "assistant/skills/qfai-implement/references/execution-ledger.md";
const REVISION_REL = "assistant/skills/qfai-implement/references/evidence-revision.md";
const DELEGATION_REL = "assistant/constitution/shared-skill-delegation-baseline.md";

const readAsset = (tree: string, relativePath: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relativePath), "utf-8");

const readSkill = (tree: string): Promise<string> => readAsset(tree, SKILL_REL);

/** Soft-wrapped prose joined back into one line, so a phrase can be matched. */
const flat = (text: string): string => text.replace(/\r?\n\s*/g, " ");

/** The single line of `text` that contains `needle`. */
function lineWith(text: string, needle: string): string {
  const line = text.split(/\r?\n/).find((candidate) => candidate.includes(needle));
  expect(line, `no line contains ${JSON.stringify(needle)}`).toBeDefined();
  return line ?? "";
}

const PHASE_AUTHORED_HEADING = "**Phase-authored (written before the reviewer gate, items 7-8):**";
const GATE_COMPLETED_HEADING = "**Gate-completed (appended after items 7-8 return PASS):**";

/**
 * The phase-authored half of the per-item evidence contract.
 *
 * Sliced, not searched whole: the write point is the property under test. A
 * manifest named only in the gate-completed half would be written after the
 * reviewers have hashed, which puts it in no audit subject and re-opens the
 * same hole from the other side.
 */
function phaseAuthoredContract(skill: string): string {
  const start = skill.indexOf(PHASE_AUTHORED_HEADING);
  const end = skill.indexOf(GATE_COMPLETED_HEADING);
  expect(start, "phase-authored heading missing").toBeGreaterThan(-1);
  expect(end, "gate-completed heading missing").toBeGreaterThan(start);
  return flat(skill.slice(start, end));
}

describe("prototype parity is recorded, not merely required", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: no evidence obligation hard-codes a count of two verdicts`, async () => {
      // The defect in one line: every passage that obliges verdicts to be
      // written said "both", which excludes the third reviewer by arithmetic.
      expect(await readSkill(tree)).not.toContain("both reviewer verdicts");
    });

    it(`${tree}: gate item 11 obliges every routed reviewer's verdict`, async () => {
      const item11 = lineWith(await readSkill(tree), "11. The item's evidence file (item 10)");

      expect(item11).toContain("every routed reviewer's");
      expect(item11).toContain("`Prototype parity`");
      // Item 11 stays scoped to the post-7-8 append; it must not become a
      // second statement about the file's existence.
      expect(item11).toContain("after items 7-8 returned PASS");
    });

    it(`${tree}: the completion prohibition covers the parity verdict`, async () => {
      const prohibition = lineWith(
        await readSkill(tree),
        "single blocking statement about the evidence file",
      );

      expect(prohibition).toContain("every routed reviewer's");
      expect(prohibition).toContain("`Prototype parity`");
    });

    it(`${tree}: the parity field carries the revision and audit hash its siblings do`, async () => {
      const skill = await readSkill(tree);
      const parity = lineWith(skill, "- `Prototype parity` — product-surface-reviewer result");

      // Item 10 recomputes "each reviewer verdict's `Audited evidence hash`";
      // without these two fields there is nothing to recompute for this one.
      expect(parity).toContain("`Reviewed revision`");
      expect(parity).toContain("`Audited evidence hash`");
      expect(lineWith(skill, "- `Spec review` —")).toContain("`Audited evidence hash`");
      expect(lineWith(skill, "- `Code quality review` —")).toContain("`Audited evidence hash`");
    });

    it(`${tree}: the ledger reference states the same count as gate item 11`, async () => {
      // The detailed procedure item 11 points at carried the old contract:
      // "append the two reviewer verdicts to that file". Two files disagreeing
      // about how many verdicts a `done` row must hold makes the verdict
      // depend on which one the runner read.
      const ledger = flat(await readAsset(tree, LEDGER_REL));

      expect(ledger).not.toContain("append the two reviewer verdicts");
      expect(ledger).toContain("append **every routed reviewer's** verdict");
      expect(ledger).toContain("`Prototype parity`");
      expect(ledger).toContain("`product-surface-reviewer`");
    });

    it(`${tree}: the audit-hash procedure defines the parity subject`, async () => {
      // Requiring an `Audited evidence hash` from a third reviewer without
      // naming its subject leaves the reviewer and gate item 10 free to hash
      // different extents — two honest parties then fail the row exactly as
      // tampering would.
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      expect(delegation).toContain(
        "**Completion review** (`completion-reviewer` / `implementation-reviewer` / `product-surface-reviewer`",
      );
      expect(delegation).toContain("`product-surface-reviewer` takes that same subject");
      // What it adds is named: the surface evidence the revision excludes.
      expect(delegation).toContain("`.qfai/evidence/**`");
      expect(delegation).toContain("contribute no record");
      // And the skill points at that procedure rather than at its siblings.
      expect(flat(await readSkill(tree))).toContain(
        "_Completion review_ subject lists `product-surface-reviewer` beside the other two",
      );
    });

    it(`${tree}: item 9's revision is inside the freshness rule`, async () => {
      // A hash that recomputes proves the evidence did not move; it says
      // nothing about the UI. Without item 9 in the same-revision set, a parity
      // PASS taken before the surface changed still carries the row to `done`.
      const skill = flat(await readSkill(tree));
      const revision = flat(await readAsset(tree, REVISION_REL));

      expect(skill).toContain("on a UI-affecting row item 9's `Reviewed revision` shares it too");
      expect(revision).toContain("**A UI-affecting row has a fifth: gate item 9**");
      expect(revision).toContain("must equal `Revision`");
      expect(revision).not.toContain("leaves `Revision` for the GREEN and the two reviews");
    });

    it(`${tree}: a UI-affecting row must name its surface artifacts before the review`, async () => {
      // The subject can only hash artifacts the entry names. Without a field
      // that makes it name them, every conforming UI entry named none and the
      // parity hash was taken over fields alone.
      const contract = phaseAuthoredContract(await readSkill(tree));

      expect(contract).toContain("`Surface artifacts`");
      expect(contract).toContain("UI-affecting row");
      expect(contract).toContain("`.qfai/evidence/**`");
    });

    it(`${tree}: completion is refused when the manifest is absent or empty`, async () => {
      // Required-but-unenforced is the same hole with a field in it: the gate
      // has to reject the entry, and it has to reject an empty manifest too,
      // which is otherwise indistinguishable from a row that legitimately has
      // no artifact.
      const prohibition = lineWith(
        await readSkill(tree),
        "single blocking statement about the evidence file",
      );

      expect(prohibition).toContain("`Surface artifacts`");
      expect(prohibition).toContain("no path under it");
    });

    it(`${tree}: reviewer and gate read one named manifest, not two readings`, async () => {
      // Structural half of the fix: the subject, the serialize step and the
      // skill all name the same field, so the reviewer's list and gate item
      // 10's list cannot be two different sets of files.
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      expect(delegation).toContain("row's phase-authored `Surface artifacts` manifest names");
      expect(delegation).toContain("the entry's `Surface artifacts` manifest names");
      expect(flat(await readSkill(tree))).toContain(
        "this row's phase-authored `Surface artifacts` manifest names",
      );
    });

    it(`${tree}: the empty-manifest escape is closed, the prototype exclusion kept`, async () => {
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      // The sentence that made the record class vacuous for a conforming row.
      expect(delegation).not.toContain("A row with no such artifact has no extra record");
      expect(delegation).toContain('has no "no such artifact" state');
      // Over-correction pin: the fix must not start hashing the artifacts that
      // sit inside the revision — `prototype-handoff.yaml` and the winner
      // prototype are already pinned by `Reviewed revision`, and a second hash
      // over them would stale this verdict on an unrelated prototype edit.
      expect(delegation).toContain("contribute no record");
      expect(delegation).toContain("`.qfai/contracts/design/prototype-handoff.yaml`");
    });

    it(`${tree}: a binary surface artifact is hashed raw, not text-normalized`, async () => {
      // Step 2 applied to every record in the subject, and the record class
      // added above carries `.png` screenshots. LF conversion and the
      // trailing-whitespace strip have no meaning over arbitrary bytes: they
      // rewrite whatever happens to look like a line ending inside a
      // compressed stream, so one unchanged image hashed differently for the
      // reviewer and for gate item 10.
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      expect(delegation).not.toContain("**Normalize.** LF line endings");
      expect(delegation).toContain("**Normalize — a Markdown or HTML record only.**");
      expect(delegation).toContain("skips this step and hashes the artifact's raw bytes");
      // The format the parity capture actually writes is named, not implied.
      expect(delegation).toContain("`.png`");
    });

    it(`${tree}: the record's class is its extension, not sniffed content`, async () => {
      // Structural half: one rule both parties apply without reading the
      // bytes. "Binary if it looks binary" is two readings again, which is the
      // same failure the named subject was introduced to end.
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      expect(delegation).toContain("The class is the record's extension, never sniffed content");
      expect(delegation).toContain("`.md` and `.html` normalize");
      // The serialize step hashed "that artifact's normalized bytes" for every
      // record; left as it was, a reader arriving at step 3 first would
      // normalize the screenshot anyway and the carve-out would not hold.
      expect(delegation).not.toContain("SHA-256 of that artifact's normalized bytes");
      expect(delegation).toContain("normalized where that step applies and raw where it does not");
    });

    it(`${tree}: text records still normalize (over-correction pin)`, async () => {
      // Hashing everything raw is the opposite defect: a CRLF checkout of the
      // same evidence file would take a different digest from an LF one and
      // every verdict would go stale on a line-ending change. This case passes
      // before the fix as well — it exists to hold the text half in place.
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      expect(delegation).toContain(
        "LF line endings; strip trailing whitespace from every line; " +
          "drop leading and trailing blank lines; end with exactly one newline.",
      );
      // The two subjects that delegate their normalization to step 2.
      expect(delegation).toContain("step 2 normalizes it");
      expect(delegation).toContain("normalized by step 2 as well");
    });

    it(`${tree}: the gate item the recording serves is still there`, async () => {
      // The alternative fix was to drop item 9 / the field entirely. It was not
      // taken, so both must survive — otherwise this change is half-applied.
      //
      // What is pinned is that item 9 still demands a `product-surface-reviewer`
      // PASS on a UI-affecting row, not the sentence that says so: item 9 has
      // since grown a second branch — a cli-only target substitutes a surface
      // review of the captured command output for parity, because
      // `/qfai-prototyping` rejects `cli` and leaves no prototype to compare
      // against. Pinning the old wording would have made that widening look
      // like the deletion this row exists to catch.
      const skill = await readSkill(tree);

      expect(skill).toContain("UI-affecting items have `product-surface-reviewer` PASS");
      expect(skill).toContain("- `Prototype parity` — product-surface-reviewer result");
    });
  }
});
