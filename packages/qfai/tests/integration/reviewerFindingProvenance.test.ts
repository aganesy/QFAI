/**
 * Reviewer-finding provenance contract, as shipped by `qfai init`.
 *
 * The rules live only in prose, so these cases pin the three properties a
 * reviewer's behaviour actually hinges on:
 *   - a demonstrable defect stays blocking without an `AC-*`;
 *   - an advisory that changes an approved obligation does not get a free
 *     pass to `done`;
 *   - the reviewer never writes upstream SSOT itself.
 * Plus: every cross-document anchor these rules use resolves to a real
 * heading (asserted by slug, not by prose).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const assistantDir = path.join(getInitAssetsDir(), ".qfai", "assistant");
const DRIFT_PROTOCOL = path.join(assistantDir, "constitution", "drift-protocol.md");
const DELEGATION_BASELINE = path.join(
  assistantDir,
  "constitution",
  "shared-skill-delegation-baseline.md",
);
const IMPLEMENT_SKILL = path.join(assistantDir, "skills", "qfai-implement", "SKILL.md");
const FINDING_CLASSIFICATION = path.join(
  assistantDir,
  "skills",
  "qfai-implement",
  "references",
  "finding-classification.md",
);
const CONFIGURE_SKILL = path.join(assistantDir, "skills", "qfai-configure", "SKILL.md");
const REVIEW_ARTIFACT_LAYOUT = path.join(
  assistantDir,
  "skills",
  "qfai-implement",
  "references",
  "review-artifact-layout.md",
);
const EVIDENCE_REVISION = path.join(
  assistantDir,
  "skills",
  "qfai-implement",
  "references",
  "evidence-revision.md",
);
const REVIEWER_AGENTS = [
  path.join(assistantDir, "agents", "completion-reviewer.md"),
  path.join(assistantDir, "agents", "implementation-reviewer.md"),
];

const DEFECT_CLASSES = ["defect:correctness", "defect:security", "defect:code-quality"] as const;

/**
 * Simplified GitHub heading slug: lowercase, drop punctuation, spaces to
 * hyphens. It covers the ASCII headings these documents use and does not model
 * GitHub's Unicode normalization or emoji handling.
 */
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Anchor set for a document, including GitHub's duplicate disambiguation: the
 * first heading with a given slug keeps it and each later repeat gets a `-1`,
 * `-2`, … suffix in document order. Without that, a second heading that slugs
 * the same as an earlier one would make this test call a working link broken.
 */
function headingSlugs(markdown: string): Set<string> {
  const occurrences = new Map<string, number>();
  const slugs = new Set<string>();
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    const base = slugify(match[1] ?? "");
    const seen = occurrences.get(base) ?? 0;
    occurrences.set(base, seen + 1);
    slugs.add(seen === 0 ? base : `${base}-${seen}`);
  }
  return slugs;
}

/**
 * The body of one `###` section, so a rule can be asserted against the section
 * that states it rather than against the whole document — several of these
 * documents legitimately use the same tokens elsewhere for a different purpose.
 */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`### ${heading}\n`);
  if (start < 0) return "";
  const rest = markdown.slice(start + heading.length + 5);
  const end = rest.search(/^#{1,3} /m);
  return end < 0 ? rest : rest.slice(0, end);
}

const STAGES_WITHOUT_A_DRAIN = [
  "/qfai-sdd",
  "/qfai-atdd",
  "/qfai-configure",
  "/qfai-verify",
  "/qfai-discussion",
  "/web-research",
] as const;

describe("reviewer finding provenance", () => {
  it("keeps a demonstrable defect blocking without requiring an upstream ID", async () => {
    // Without a defect class, an implementation-reviewer that finds an
    // unhandled rejection or a missing input validation has no ID to cite,
    // the finding degrades to advisory, and the defect can ship as `done`.
    const [drift, baseline] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(DELEGATION_BASELINE, "utf-8"),
    ]);
    for (const cls of DEFECT_CLASSES) {
      expect(drift).toContain(cls);
      expect(baseline).toContain(cls);
    }
    expect(drift).toMatch(/demonstrable from the changed artifacts/i);
  });

  it("does not let an advisory that changes an approved obligation reach done", async () => {
    const drift = await readFile(DRIFT_PROTOCOL, "utf-8");
    // The free-to-continue clause must be conditional, not unconditional.
    expect(drift).toMatch(
      /changes an already-approved obligation[\s\S]{0,400}when-drift-is-detected/,
    );
    expect(drift).toMatch(
      /no `done` for items that\s*\n?\s*depend on the obligation under dispute/,
    );
  });

  it("routes the Open-questions write to the owner phase, not the reviewer", async () => {
    const [drift, skill] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(IMPLEMENT_SKILL, "utf-8"),
    ]);
    // `08_Open-questions.md` is upstream SSOT; a downstream skill with
    // Write/Edit must be told not to touch it.
    expect(drift).toMatch(/does \*\*not\*\* write it into\s*\n?\s*`08_Open-questions\.md`/);
    expect(skill).toMatch(/Do \*\*not\*\* edit `08_Open-questions\.md`/);
    // Wrap-tolerant: the sentence is the rule, its wrap column is not.
    expect(skill).toMatch(/owner phase \(`\/qfai-sdd`\) records and\s*\n?\s*adjudicates/);
  });

  it("keeps the reviewer agent cards aligned with the defect exemption", async () => {
    for (const file of REVIEWER_AGENTS) {
      const card = await readFile(file, "utf-8");
      expect(card).toMatch(/it stays blocking and traces to its `defect:\*` class/);
    }
  });

  it("keeps a record defect out of the blocking class in the constitution", async () => {
    // Before `record:*` existed, "the Evidence cell omits the tier" cited a named
    // constitution rule, so it was a legal *blocking* finding — indistinguishable in
    // authority from "the revoked grant still authorises the request" — and it forced
    // another full review round on a row whose code nobody disputed.
    const [baseline, drift] = await Promise.all([
      readFile(DELEGATION_BASELINE, "utf-8"),
      readFile(DRIFT_PROTOCOL, "utf-8"),
    ]);
    for (const doc of [baseline, drift]) {
      // The rule-name clause admits only rules about what the product does.
      expect(doc).toMatch(
        /named constitution\/catalog\s+rule\s+\*\*that governs the\s+product's behaviour\*\*/,
      );
      expect(doc).toContain("`record:<CODE>`");
      // The ratchet: a record rule worth a round is worth a validator code.
      expect(doc).toMatch(/`record:unchecked` is a bug report against\s+`validateTddList`/);
      expect(doc).toMatch(/record-defect queue/);
    }
    expect(baseline).toMatch(
      /`record:\*` and `none` MUST be recorded as `advisory`;\s+neither can be `blocking` or gate `DONE`/,
    );
    expect(baseline).toMatch(
      /Only `blocking` findings — those citing a behaviour-governing obligation or a defect class/,
    );
    // The reviewer response schema has to offer the value it now requires.
    expect(baseline).toContain("defect:code-quality|record:<CODE>|none>");
    expect(drift).toMatch(/`record:\*` and `none` are not\./);
  });

  it("restates the record class as advisory downstream of the constitution", async () => {
    const classification = await readFile(FINDING_CLASSIFICATION, "utf-8");
    expect(classification).toMatch(
      /named constitution\/catalog rule \*\*that governs the\s+product's behaviour\*\*/,
    );
    // Placement is the assertion: `record:*` sits under Advisory, never under Blocking.
    const advisoryIndex = classification.indexOf("## Advisory");
    expect(classification.indexOf("## Blocking")).toBeGreaterThanOrEqual(0);
    expect(advisoryIndex).toBeGreaterThan(0);
    expect(classification.indexOf("`record:<CODE>`")).toBeGreaterThan(advisoryIndex);
    expect(classification).toMatch(/settles in\s+the spec's record-defect queue/);
    expect(classification).toMatch(
      /`record:unchecked` is a bug report against\s+`validateTddList`/,
    );
    // The sign-off checkbox is where a reviewer actually catches itself.
    for (const file of REVIEWER_AGENTS) {
      const card = await readFile(file, "utf-8");
      expect(card).toMatch(/no blocking finding traces to `none` or `record:\*`/);
    }
  });

  it("gives the record-defect queue a destination, an owner and a drain", async () => {
    // Making `record:*` advisory drops the round it used to force. Without a
    // named queue, a named owner and a point that consumes it, the defect drops
    // with the round: the review returns PASS, the row goes `done`, and nothing
    // ever comes back for the wrong Evidence cell.
    const [drift, classification, skill] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(FINDING_CLASSIFICATION, "utf-8"),
      readFile(IMPLEMENT_SKILL, "utf-8"),
    ]);
    // Destination: a section of the spec's own evidence file, never upstream SSOT.
    expect(drift).toMatch(/^### The record-defect queue$/m);
    for (const doc of [drift, classification]) {
      expect(doc).toContain("## Record defects");
      expect(doc).toContain(".qfai/evidence/implement-<spec-id>.md");
      expect(doc).toContain(".qfai/evidence/atdd-<spec-id>.md");
    }
    expect(drift).toMatch(/Never `08_Open-questions\.md`/);
    // Owner: the orchestrator that dispatched the review, not the reviewer.
    expect(drift).toMatch(/The \*\*orchestrator\*\* that dispatched the review appends it/);
    // Drain: consumed at the spec boundary, and completion is gated on it.
    // Repair is the only close. A validator bug report is what a
    // `record:unchecked` entry additionally owes for the missing check — closing
    // on the report alone would leave the wrong record wrong with the round that
    // found it already spent.
    expect(drift).toMatch(/\*\*repaired in place\*\*[\s\S]{0,120}Repair is the only close/);
    expect(drift).toMatch(/\*\*also\*\* produces a validator bug report/);
    expect(drift).toMatch(/does not stand in for the repair/);
    expect(drift).not.toMatch(/converted to a validator bug report/);
    expect(classification).toMatch(/never closes the entry on its own/);
    // And the one honest way out when repair is impossible: it is an integrity
    // failure, not a record defect, so it goes back to blocking.
    for (const doc of [drift, classification]) {
      expect(doc).toMatch(/cannot be repaired honestly|repaired honestly/);
      expect(doc).toMatch(/`defect:code-quality`/);
    }
    expect(drift).toMatch(
      /an entry closes on a corrected record or on a blocking finding|closes on a corrected record or on a blocking finding/,
    );
    expect(drift.replace(/\s+/g, " ")).toContain(
      "Completion is not declared while an entry is open",
    );
    expect(skill).toMatch(
      /0 blocking reviewer issues remain, and this spec's `## Record defects` queue is drained/,
    );
    // The gate that actually enforces the drain must say the same thing the
    // rule says. It restated the superseded either/or — "repaired in place or
    // converted to a bug report" — so a spec could complete on the report
    // alone with the wrong Evidence cell still wrong, which is exactly what
    // the corrected rule two documents up forbids.
    expect(skill).not.toMatch(/repaired in place or converted to/);
    expect(skill).toMatch(/queue is drained[\s\S]{0,220}\*\*repaired in place\*\*/);
    expect(skill).toMatch(/\*\*also\*\* owes a `validateTddList` bug report/);
    expect(skill).toMatch(/never stands in for the repair/);
    expect(skill).toMatch(/repair is the only close/);
    // …and the no-third-exit clause travels with it.
    expect(skill).toMatch(/cannot be repaired honestly[\s\S]{0,120}`defect:code-quality`/);
    // …while still not gating any individual row's `done`.
    for (const doc of [drift, classification]) {
      expect(doc).toMatch(/never holds an\s*\n?\s*individual row out of `done`/);
    }
  });

  it("re-attests a repaired entry instead of re-running or silently restamping it", async () => {
    // A record defect inside a `Satisfied-by` or a round block sits in the exact
    // bytes a reviewer's `Audited evidence hash` covers, and completion gate
    // item 10 recomputes that hash. Repair in place and a correct PASS reads as
    // stale; skip the recomputation and un-reviewed evidence is accepted. The
    // way out is an evidence-only re-attestation, which runs no code.
    const [baseline, drift, classification] = await Promise.all([
      readFile(DELEGATION_BASELINE, "utf-8"),
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(FINDING_CLASSIFICATION, "utf-8"),
    ]);
    for (const doc of [drift, classification]) {
      expect(doc).toMatch(/record re-attestation/i);
      expect(doc).toMatch(/Audited evidence hash/);
      // Same verdict, same revision — the repair is not a new review.
      expect(doc.replace(/\s+/g, " ")).toContain("same `Reviewed revision`");
      // …and a "repair" that moves the revision is a code change, not a repair.
      expect(doc.replace(/\s+/g, " ")).toContain("is not a record repair");
    }
    // Wrap-tolerant: the sentence is the rule, its wrap column is not.
    expect(drift.replace(/\s+/g, " ")).toContain("of the role that issued the verdict");
    expect(drift).toMatch(/spends no round|costs no round/);
    expect(baseline).toMatch(/re-attested in a new pack where a reviewer hashed it/);
  });

  it("re-attests in a new pack instead of rewriting the sealed one", async () => {
    // A verdict is stored in a `review-<timestamp>/` pack fixed by a
    // `Review pack seal` the completion gate recomputes. Replacing that
    // verdict's `Audited evidence hash` line in place breaks the seal by
    // construction; replacing only the evidence file's copy leaves the sealed
    // reviewer response carrying a hash nothing agrees with. Either way the
    // repair is unverifiable, so the re-attestation needs a pack and a seal of
    // its own that the gate can recompute.
    const [drift, classification, skill, layout, revision] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(FINDING_CLASSIFICATION, "utf-8"),
      readFile(IMPLEMENT_SKILL, "utf-8"),
      readFile(REVIEW_ARTIFACT_LAYOUT, "utf-8"),
      readFile(EVIDENCE_REVISION, "utf-8"),
    ]);
    // The superseded instruction — restamp the verdict's own line — is gone.
    expect(drift).not.toMatch(/It replaces the\s+`Audited evidence hash` line/);
    for (const doc of [drift, classification]) {
      expect(doc).toMatch(/`Review pack seal`/);
      expect(doc.replace(/\s+/g, " ")).toMatch(
        /its own `review-<timestamp>\/` pack|a pack of its own/,
      );
      expect(doc.replace(/\s+/g, " ")).toContain("the pack it supersedes is left untouched");
    }
    // The artifact and its seal exist as named fields, so a validator has
    // something to recompute rather than an untraceable edit.
    for (const doc of [drift, classification, skill, revision]) {
      expect(doc).toContain("Record re-attestation pack seal");
    }
    // The gate recomputes the superseding hash and both seals.
    expect(skill).toMatch(/compared against \*\*that\*\* hash and not the superseded original/);
    // The review pack and its seal are per review ATTEMPT, not per round: a
    // `REVISE` and the `PASS` answering it sit inside one round and seal two
    // packs (`references/round-evidence.md`), so gate item 10 names the
    // attempt's seal. The property pinned here is the one that matters and is
    // unchanged — the re-attestation seal is recomputed BESIDE the review pack
    // seal rather than instead of it — and the second assertion keeps the gate
    // reaching every seal the entry carries rather than only the latest.
    const flatSkill = skill.replace(/\s+/g, " ");
    expect(flatSkill).toContain("beside the attempt's `Review pack seal`");
    expect(flatSkill).toContain(
      "Every `Review pack seal` the entry carries — one per review attempt",
    );
    // The pack layout recognizes the shape, so it is not an ad-hoc directory.
    expect(layout).toMatch(/record re-attestation/i);
    expect(layout).toMatch(/not a round/);
    // It is not a round, so it takes no `Round N:` prefix.
    for (const doc of [drift, classification, revision]) {
      expect(doc).toMatch(/not a `Round N:` pack|no `Round N:` prefix/);
    }
  });

  it("withholds the record class from every stage with no drain, not just web-research", async () => {
    // The baseline is read by every shared stage, but only `/qfai-implement`
    // drains the queue. Barring `/web-research` alone still let a `/qfai-sdd`,
    // `/qfai-atdd`, `/qfai-configure`, `/qfai-verify` or `/qfai-discussion`
    // reviewer file an advisory nothing consumes — the round dropped AND the
    // defect dropped, which is the outcome the queue exists to prevent.
    const [baseline, drift, classification] = await Promise.all([
      readFile(DELEGATION_BASELINE, "utf-8"),
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(FINDING_CLASSIFICATION, "utf-8"),
    ]);
    for (const doc of [baseline, drift, classification]) {
      expect(doc).toMatch(/needs a drain/);
      expect(doc).toMatch(/MUST NOT/);
      for (const stage of STAGES_WITHOUT_A_DRAIN) expect(doc).toContain(stage);
    }
    // The operative rule is a property of the stage's own completion contract,
    // so a stage that adds the drain gains the class without editing this list.
    expect(drift).toMatch(/completion\s+conditions must require this queue drained/);
    expect(drift).toMatch(/gains\s+the class by adding the drain to its completion conditions/);
    // A stage without a drain does not lose the finding — it keeps the class it
    // would otherwise have had.
    expect(baseline).toMatch(/keeps the class it would otherwise have had/);
    expect(drift).toMatch(/blocking under the rule it names/);
  });

  it("names the queue's home from each stage's own evidence file, not a pattern", async () => {
    // `<stage>-<spec-id>.md` generalized a spec-scoped shape onto stages that
    // do not have one: `/qfai-configure`'s only evidence file is
    // `configure-<run-id>.md`, so the queue pointed at a path no run creates
    // and the orchestrator had nowhere to file the entry.
    const [drift, classification, configureSkill] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(FINDING_CLASSIFICATION, "utf-8"),
      readFile(CONFIGURE_SKILL, "utf-8"),
    ]);
    // The shipped path this has to agree with.
    expect(configureSkill).toContain(".qfai/evidence/configure-<run-id>.md");
    expect(configureSkill).not.toContain("configure-<spec-id>.md");
    const queue = section(drift, "The record-defect queue");
    expect(queue).not.toEqual("");
    // The superseded derivation, and the file it invented, are both gone.
    expect(queue).not.toMatch(/`\/qfai-sdd` files in/);
    expect(queue).not.toContain("sdd-<spec-id>.md");
    expect(queue).toMatch(/Do not derive the path from a\s+`<stage>-<spec-id>\.md` pattern/);
    for (const doc of [queue, classification]) {
      expect(doc).toContain(".qfai/evidence/configure-<run-id>.md");
      // The home is read off the stage's own completion contract instead.
      expect(doc).toMatch(/names its own evidence file/);
    }
    // …and the one stage that does drain still names its real files.
    expect(queue).toContain(".qfai/evidence/implement-<spec-id>.md");
    expect(queue).toContain(".qfai/evidence/atdd-<spec-id>.md");
  });

  it("keeps an evidence-integrity violation blocking instead of record class", async () => {
    // Copied evidence, an anchor pointing at another run and a false
    // independence attestation are all defects "in the record". Classing them
    // `record:*` would make them advisory, and an advisory-only review returns
    // PASS — releasing `done` over exactly the evidence `qa-gatekeeper.md` and
    // the response rules exist to refuse.
    const [baseline, drift, classification] = await Promise.all([
      readFile(DELEGATION_BASELINE, "utf-8"),
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(FINDING_CLASSIFICATION, "utf-8"),
    ]);
    for (const doc of [baseline, drift, classification]) {
      // Wrap-tolerant: the sentence is the rule, its wrap column is not.
      expect(doc).toMatch(/copied from a(nother| previous)\s+round or a sibling row/);
      expect(doc).toMatch(/`Authored\/edited under review` attestation/);
      expect(doc).toMatch(/`defect:code-quality`/);
      expect(doc).toContain("qa-gatekeeper.md");
    }
    expect(baseline).toMatch(/\*\*Integrity is not record class\.\*\*/);
    expect(drift).toMatch(
      /A record that misrepresents the run is not a record defect[\s\S]{0,900}MUST NOT be filed as `record:\*`/,
    );
  });

  it("links only to anchors that exist in the target document", async () => {
    const [drift, baseline, skill, classification] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(DELEGATION_BASELINE, "utf-8"),
      readFile(IMPLEMENT_SKILL, "utf-8"),
      // Most of the skill's cross-document links moved here with the
      // classification detail; without it they would go unchecked.
      readFile(FINDING_CLASSIFICATION, "utf-8"),
    ]);
    const slugsByDoc = new Map<string, Set<string>>([
      ["drift-protocol.md", headingSlugs(drift)],
      ["shared-skill-delegation-baseline.md", headingSlugs(baseline)],
    ]);
    const sources = [
      drift,
      baseline,
      skill,
      classification,
      ...(await Promise.all(REVIEWER_AGENTS.map((f) => readFile(f, "utf-8")))),
    ];
    const broken: string[] = [];
    let checked = 0;
    for (const source of sources) {
      for (const match of source.matchAll(
        /(drift-protocol\.md|shared-skill-delegation-baseline\.md)#([\w-]+)/g,
      )) {
        const slugs = slugsByDoc.get(match[1] ?? "");
        const anchor = match[2] ?? "";
        if (!slugs) continue;
        checked += 1;
        if (!slugs.has(anchor)) broken.push(`${match[1]}#${anchor}`);
      }
      // Same-document `#anchor` references inside drift-protocol.
      if (source === drift) {
        for (const match of source.matchAll(/[^\w-]#([a-z][\w-]*)`/g)) {
          const anchor = match[1] ?? "";
          checked += 1;
          if (!headingSlugs(drift).has(anchor)) broken.push(`drift-protocol.md#${anchor}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(broken).toEqual([]);
  });
});
