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
    expect(drift).toMatch(/repaired in place[\s\S]{0,400}converted to a validator bug report/);
    expect(drift).toMatch(/Completion is not\s*\n?\s*declared while an entry is open/);
    expect(skill).toMatch(
      /0 blocking reviewer issues remain, and this spec's `## Record defects` queue is drained/,
    );
    // …while still not gating any individual row's `done`.
    for (const doc of [drift, classification]) {
      expect(doc).toMatch(/never holds an\s*\n?\s*individual row out of `done`/);
    }
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
