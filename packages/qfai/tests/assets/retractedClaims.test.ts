/**
 * A retracted claim must appear only inside quotation marks.
 *
 * The failure this enforces recurred in every review round: the stage retracts a statement in one
 * place, writes that it has been removed, and the statement is still standing elsewhere. Round 5's
 * form was the sharpest — the record said four retracted statements "are gone now" while two stood
 * byte-for-byte nine and thirteen lines above that sentence. Prose cannot be trusted to say whether
 * prose was deleted, so the rule is enforced instead of announced: a refuted claim may appear only as
 * a quotation. A record may say `this said "X", and X is wrong`; it may not say X.
 *
 * **This file has now been wrong twice, and both versions were green for the wrong reason.**
 *
 * 1. **Proximity.** The first version looked for a corrective word within 900 characters, in a
 *    document that is largely *about* corrections — so six mutations reinstating retracted claims as
 *    plain assertions reddened nothing.
 * 2. **Literal spaces.** The second matched needles containing spaces against text where the record
 *    has **newlines**, so four live occurrences were invisible to it. Round 6 reported the cause as
 *    `"a guard whose premise is 'prose cannot be trusted' was defeated by running the formatter
 *    ci:lint enforces"`, and this file asserted that sentence as fact for two rounds. **It is false,
 *    and it is quoted here for that reason.** `.prettierignore` excludes `.qfai/evidence/**` and
 *    `.qfai/review/**`, and `.prettierrc.json` sets `proseWrap: "preserve"` for markdown: no formatter
 *    touches these files, and none would reflow them if it did. The line breaks are hand-wrapped, by
 *    the same stage that then blamed a tool for them. The defect was real; the diagnosis was adopted
 *    from a review report without being checked. It also had three narrower holes — a per-entry
 *    `files` list, so a claim asserted in a file the entry did not name was free; a global
 *    quote-parity scan, where one stray `"` inverted every range after it, laundering an assertion
 *    **and** accusing eight correct quotations; and a needle-length rule justified as surviving reflow
 *    that did nothing of the kind.
 *
 * Four changes, each closing one of those:
 *
 * - **whitespace is collapsed** in both haystack and needle, so a line break inside a claim cannot
 *   hide it;
 * - **every claim is searched in every governance file**, so an omission from a list cannot make an
 *   entry vacuous;
 * - **quotations are extracted per paragraph**, so an unbalanced quote can only affect its own
 *   paragraph rather than the rest of the document;
 * - and **`_italics_` are not quotes**, which is what round 6 found `CR-20260820-0012` relying on.
 *
 * **What this list actually tracks is WORDINGS, not claims**, and that residual is the reason the
 * inert-entry test below exists. An entry catches the exact phrase it holds; a claim reasserted in
 * different words walks past it. Round 8 measured the consequence twice in the round that was meant to
 * close it — `"P1d has returned REVISE three times"` was added while the sites it was for said
 * `"sustained across three passes"` and `"sustained four times running"`, and
 * `"defeated by the formatter"` was added against text reading `"defeated by **running** the
 * formatter"`. Both needles matched nothing, both rounds reported the fix applied. Shorter needles
 * help and are used where a subject can be bound safely, but nothing here makes the list semantic.
 *
 * `tdd/test-list.md` is deliberately **not** in the file set. Its `Status` / `DR-ID` / `Evidence`
 * cells belong to `/qfai-implement` under the Drift Protocol, so a retracted claim living there is a
 * handover item for the writer rather than something this stage may edit — and a test that reddens on
 * a file this stage must not touch is a test that cannot be satisfied. It is named in the handover
 * instead.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");

/** Every governance file this stage owns. Each claim is searched in all of them. */
const GOVERNANCE = [
  ".qfai/evidence/atdd-spec-0017.md",
  ".qfai/evidence/coverage-depth-spec-0017.md",
  ".qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md",
  ".qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md",
  ".qfai/decisions/CR-20260820-0011-the-e2e-annotation-ledger-certifies-127-stories-no-test-carries.md",
];

interface Retracted {
  readonly claim: string;
  readonly why: string;
}

/**
 * Claims a review round refuted, in the wording they had.
 *
 * No per-file list: round 6 found an entry naming only the file where the claim had been *corrected*,
 * while the claim stood unquoted in a file the entry did not name — so the suite was green because of
 * the omission. Every claim is now searched everywhere.
 */
const RETRACTED: readonly Retracted[] = [
  {
    claim: "All 71 Integration rows are already at refactor",
    why: "the ledger holds 63 refactor, 6 blocked and 2 todo (round 1)",
  },
  {
    claim: "because the workflow changes are unmerged",
    why: "ci-pass exists and has run; the obstacle is CR-20260820-0012 (rounds 3-5)",
  },
  {
    claim: "there is no run history to mutate",
    why: "true of clause 2, wrong about clause 1, which is unsatisfied (round 4)",
  },
  {
    claim: "degenerate against this runner",
    why: "maxConcurrency is project-scoped, so a per-project tuning change is expressible (round 4)",
  },
  {
    claim: "degenerate rather than satisfied",
    why: "the variant wording of the same refuted reading; the DR records unsatisfied (round 6)",
  },
  {
    claim: "0 misclassified",
    why: "measured only against a corpus this stage chose, and wrong at every version (rounds 3-6)",
  },
  {
    claim: "rebuilt the scan around the verb",
    why: "it was a closed package-manager list, not a verb anchor (round 2)",
  },
  {
    claim: "wrong about clause 1 three times",
    why: "two wrong readings and one correction; this counted the correct statement as an error (round 5)",
  },
  {
    claim: "Three packs",
    why: "there were four pack directories when this was written, and there are six now (round 4)",
  },
  {
    claim: "becomes implementable once the pull request has three green",
    why: "that exit is unreachable — the run it waits for is gated on the annotation it would justify (P1d pass 1)",
  },
  {
    claim: "P1d has returned REVISE three times",
    why: "six passes: five REVISE and a PASS at pass 6 (round 7)",
  },
  {
    claim: "rebuilt the scan around",
    why: "shorter than the earlier entry so a one-word drift cannot escape it (round 7)",
  },
  {
    claim: "defeated by",
    why: "no formatter defeated anything: .qfai/evidence/** is prettier-ignored and proseWrap is preserve, so the line breaks are hand-wrapped (round 7, self-disclosed; round 8 found the longer needle matching nothing)",
  },
  {
    claim: "P1d has run three times",
    why: "six passes: five REVISE and a PASS at the sixth (round 8)",
  },
  {
    claim: "transition itself is still owed a P1d PASS",
    why: "P1d passed at its sixth pass; this stood inside the entry step 3b reads (round 8)",
  },
  {
    claim: "Rebuilt around the verb",
    why: "round 1 widened a closed five-member package-manager list; `make build`, `turbo run build`, `cargo build` and six more stayed invisible, so nothing was rebuilt around the verb (round 2, restated by round 8 after two entries missed this site)",
  },
  {
    claim: "re-route of P1d is owed",
    why: "P1d ruled on the revision at its sixth pass and passed it; the sentence outlived the gate it describes (round 8)",
  },
  {
    claim: "NOT BLOCKED by a CR",
    why: "the negation of the `Blocked-By: CR-20260820-0012` the row is being given (P1d round 7 `A1`)",
  },
  {
    claim: "no filters",
    why: "the seal is LF-normalised, not unfiltered; the unfiltered value reproduced only on one machine (round 8)",
  },
];

/**
 * Claims whose wording carries a NUMBER that drifts as the count changes.
 *
 * Round 7 found `Three packs` in the list while the record asserted "**Four** packs" against seven
 * directories — the same claim with the numeral incremented, which a fixed needle cannot catch. These
 * are matched by shape, and the number must agree with what the tree holds.
 */
const COUNTED_CLAIMS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly actual: () => Promise<number>;
  readonly why: string;
}> = [
  {
    // `Nine packs — one per round` and `Nine review packs, one per round` both escaped the first
    // needle, which required the exact string `packs, one per round`. The separator is now any
    // punctuation or none, and a word may sit between the numeral and `packs`.
    pattern:
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:\w+\s+)?packs\s*[,—–-]?\s*one per round\b/gi,
    actual: async () => {
      const { readdir } = await import("node:fs/promises");
      const entries = await readdir(path.join(ROOT, ".qfai/review"), { withFileTypes: true });
      return entries.filter(
        (entry) =>
          entry.isDirectory() &&
          /^review-\d+$/.test(entry.name) &&
          entry.name >= "review-20260820200000000",
      ).length;
    },
    why: "the pack count said Three, then Four, against four and then seven directories",
  },
];

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Claims whose wording has been removed from the records outright rather than quoted.
 *
 * An entry here is dormant by design: nothing matches it, and that is the intended end state. Keeping
 * it listed is what lets the check above tell "deleted" from "needle broken" — round 8 found two inert
 * entries and nothing was reporting either.
 */
const RETIRED: readonly string[] = [
  // Removed from the records outright rather than quoted, which is the better end state: nothing can
  // read them as assertions because they are not there. Each was verified absent across all five
  // governance files before being listed, and the second assertion below still catches reintroduction.
  // Two entries left this list in round 8: the W-family record in `## Execution logs` now quotes
  // both, so they are live-and-quoted rather than absent. The second assertion below is what
  // noticed — writing that record made a retired declaration false in the same commit.
  "P1d has run three times",
  "transition itself is still owed a P1d PASS",
  "no filters",
];

/**
 * Two flattenings, because one is not enough and each earlier version proved it.
 *
 * A zero-width character can be placed where a space belongs — round 7 laundered a claim that way, and
 * deleting the character welds the two words together so the needle stops matching. Or it can be placed
 * INSIDE a word — round 8 laundered a claim that way, after the repair had switched to substituting a
 * space, which then split the word. Neither single normalisation covers both placements.
 *
 * So both are produced and a claim is sought in each. U+00AD and U+2060 were absent from the stripped
 * range entirely.
 *
 * The wrapping is also collapsed here, and the reason is worth stating precisely because an earlier
 * version got it wrong: the line breaks inside these records are **hand-wrapped**. `.prettierignore`
 * excludes `.qfai/evidence/**` and `.prettierrc.json` sets `proseWrap: "preserve"` for markdown, so no
 * formatter touches or reflows them. The claim that one did came from a review report and was adopted
 * here without checking.
 */
const ZERO_WIDTH = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;

function flattenings(text: string): [string, string] {
  const base = text.replace(/[*_`]/g, "");
  const removed = base.replace(ZERO_WIDTH, "").replace(/\s+/g, " ").toLowerCase();
  const spaced = base.replace(ZERO_WIDTH, " ").replace(/\s+/g, " ").toLowerCase();
  return [removed, spaced];
}

/** The primary flattening, used where only one representation is needed. */
function flatten(text: string): string {
  return flattenings(text)[0];
}

/**
 * Quoted spans, computed per paragraph.
 *
 * Paragraph-scoped because a global parity scan is unbounded: round 6 planted one stray `"` and it
 * inverted every range after it — laundering an assertion in one place and accusing eight correct
 * quotations elsewhere, which reddened a required CI leg.
 */
/**
 * The spans a claim may appear inside, per paragraph.
 *
 * Quotation marks are the obvious one. Two more were measured as **false accusations** — a correct edit
 * turning this suite red, and `tests/assets/**` runs in the `e2e` project, a required CI leg:
 *
 * - a **fenced code block** carries no quote mark at all, and quoting a prior version's wording verbatim
 *   inside a fence is the most faithful way to record it;
 * - a **blockquote** is markdown's own quotation construct.
 *
 * Both were reported twice before being fixed here. Fences and blockquote runs are marked wholesale,
 * because a claim anywhere inside one is being shown rather than asserted.
 */
function quotedSpans(paragraph: string): Array<[number, number]> {
  const marks: number[] = [];
  for (let index = 0; index < paragraph.length; index += 1) {
    const char = paragraph[index];
    if (char === '"' || char === "“" || char === "”") marks.push(index);
  }

  const spans: Array<[number, number]> = [];
  const pairFrom = (start: number): void => {
    for (let i = start; i + 1 < marks.length; i += 2) {
      const open = marks[i];
      const close = marks[i + 1];
      if (open !== undefined && close !== undefined) spans.push([open, close]);
    }
  };
  pairFrom(0);
  // With an ODD number of marks one of them is stray, and pairing from the left puts every span in the
  // wrong place after it — which accused a **correct** quotation that happened to follow a lone `"`
  // earlier in the paragraph. The alternate pairing is added rather than substituted, so a paragraph
  // with one stray mark is read both ways and a claim quoted under either reading is accepted. That
  // does widen what counts as quoted; a launder would have to introduce a stray quote mark to use it,
  // and accusing a correct edit in a required CI leg is the worse failure of the two.
  if (marks.length % 2 === 1) pairFrom(1);

  return spans;
}

/**
 * Fenced-block and blockquote regions of a whole document, as `[start, end)` offsets into `text`.
 *
 * Computed over the raw document before flattening, then mapped by paragraph in `occurrences`.
 */
function shownSpans(paragraph: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let fenceStart: number | undefined;
  let offset = 0;
  for (const line of paragraph.split(/\r?\n/)) {
    const end = offset + line.length;
    if (/^\s*(?:```|~~~)/.test(line)) {
      if (fenceStart === undefined) fenceStart = offset;
      else {
        spans.push([fenceStart, end]);
        fenceStart = undefined;
      }
    } else if (/^\s*>/.test(line)) {
      spans.push([offset, end]);
    }
    offset = end + 1;
  }
  // An unterminated fence runs to the end of the paragraph, which is what a fence split across the
  // paragraph boundary looks like from here.
  if (fenceStart !== undefined) spans.push([fenceStart, paragraph.length]);
  return spans;
}

interface Occurrence {
  readonly file: string;
  readonly claim: string;
  readonly quoted: boolean;
}

/**
 * Every occurrence of every claim, searched over the WHOLE document with quotedness judged per
 * paragraph.
 *
 * Two coordinate systems and one mapping between them, because the two requirements pull apart. The
 * search must span paragraph boundaries — round 7 laundered a claim by putting a blank line inside it,
 * and an earlier version here argued that away rather than fixing it. Quote pairing must NOT span
 * them — round 6 planted one stray `"` and a global parity scan inverted every range after it,
 * accusing eight correct quotations and reddening a required CI leg.
 *
 * So paragraphs are flattened and joined with a single space, each paragraph's offset in the joined
 * text is recorded, and its quote spans are computed locally and shifted into joined coordinates. An
 * occurrence that straddles two paragraphs then falls inside no span at all, which is the right
 * answer: nothing quoted it.
 */
async function occurrences(): Promise<Occurrence[]> {
  const found: Occurrence[] = [];
  for (const file of GOVERNANCE) {
    const raw = await readFile(path.join(ROOT, file), "utf8");

    // One pass per flattening. A claim laundered by a zero-width character is visible in exactly one of
    // the two, so both are searched and the occurrences merged.
    for (const variant of [0, 1] as const) {
      let joined = "";
      const spans: Array<[number, number]> = [];
      for (const paragraph of raw.split(/\r?\n[ \t]*\r?\n/)) {
        const flat = flattenings(paragraph)[variant];
        const offset = joined.length;
        for (const [start, end] of quotedSpans(flat)) spans.push([offset + start, offset + end]);
        // Shown spans are computed on the UNFLATTENED paragraph, because they are line-structural and
        // flattening collapses the lines. A whole flattened paragraph containing a fence or a blockquote
        // is marked, which is coarser than the quote spans and correct for the same reason: a claim
        // inside one is being displayed.
        if (shownSpans(paragraph).length > 0) spans.push([offset - 1, offset + flat.length + 1]);
        joined += `${flat} `;
      }

      for (const entry of RETRACTED) {
        const needle = flattenings(entry.claim)[variant];
        let index = joined.indexOf(needle);
        while (index !== -1) {
          const to = index + needle.length;
          const quoted = spans.some(([start, end]) => start < index && to <= end);
          found.push({ file, claim: entry.claim, quoted });
          index = joined.indexOf(needle, to);
        }
      }
    }
  }
  return found;
}

describe("retracted claims are quoted, never asserted", () => {
  it("finds every occurrence inside a quotation", async () => {
    const unquoted = (await occurrences())
      .filter((entry) => !entry.quoted)
      .map((entry) => {
        const why = RETRACTED.find((candidate) => candidate.claim === entry.claim)?.why ?? "";
        return `${entry.file} asserts "${entry.claim}" — ${why}`;
      });

    expect(
      [...new Set(unquoted)].sort(),
      "a claim a review round refuted, standing as an assertion rather than a quotation",
    ).toEqual([]);
  });

  it("sees a claim a line break falls inside", () => {
    // Round 6's decisive finding: `"rebuilt the scan **around the\nverb**"` was invisible, and so were
    // three more, because the needle had a space where the record has a hand-wrapped newline — not, as
    // this comment said for two rounds, where a formatter had put one. This is that shape.
    const wrapped = 'That round 2 "rebuilt the scan **around the\nverb**" is withdrawn.';
    const flat = flatten(wrapped);
    expect(
      flat.includes(flatten("rebuilt the scan around the verb")),
      "reflow must not hide it",
    ).toBe(true);

    const asserted = "Round 2 rebuilt the scan **around the\nverb** and re-measured.";
    const flatAsserted = flatten(asserted);
    const at = flatAsserted.indexOf(flatten("rebuilt the scan around the verb"));
    expect(
      quotedSpans(flatAsserted).some(([start, end]) => start < at && at <= end),
      "and the same words unquoted must not pass",
    ).toBe(false);
  });

  it("treats italics as emphasis rather than quotation", () => {
    // `CR-20260820-0012` relied on `_degenerate against this runner_` reading as a quotation. It is
    // not one; round 6 found the assertion standing behind it.
    const italic =
      "An earlier version called clause 1 _degenerate against this runner_; that is false.";
    const flat = flatten(italic);
    const at = flat.indexOf(flatten("degenerate against this runner"));
    expect(
      quotedSpans(flat).some(([start, end]) => start < at && at <= end),
      "italics are not quotes",
    ).toBe(false);
  });

  it("bounds an unbalanced quote to its own paragraph", () => {
    // Round 6 planted one stray `"` and inverted every range after it, accusing eight correct
    // quotations. Paragraph scoping is what stops that reaching the rest of the document.
    const stray = 'A paragraph with one " quote mark.';
    const later = 'A later paragraph saying "because the workflow changes are unmerged", quoted.';
    const flat = flatten(later);
    const at = flat.indexOf(flatten("because the workflow changes are unmerged"));
    expect(
      quotedSpans(flat).some(([start, end]) => start < at && at <= end),
      "the later paragraph is judged on its own quotes",
    ).toBe(true);
    expect(quotedSpans(flatten(stray)).length, "and the stray one pairs with nothing").toBe(0);
  });

  it("keeps a counted claim's number equal to what the tree holds", async () => {
    // A fixed needle cannot catch `Three packs` becoming `Four packs`; round 7 found exactly that, and
    // the record was two counts behind. The number is compared to the directories on disk.
    const wrong: string[] = [];
    for (const counted of COUNTED_CLAIMS) {
      const actual = await counted.actual();
      for (const file of GOVERNANCE) {
        const raw = await readFile(path.join(ROOT, file), "utf8");
        for (const match of raw.replace(/[*_`]/g, "").matchAll(counted.pattern)) {
          const stated = WORDS[(match[1] ?? "").toLowerCase()] ?? Number(match[1]);
          if (stated !== actual) {
            wrong.push(
              `${file}: states ${match[1] ?? "?"} where the tree holds ${String(actual)} — ${counted.why}`,
            );
          }
        }
      }
    }
    expect(wrong, "a counted claim whose number the tree does not hold").toEqual([]);
  });

  it("has no entry that matches nothing, in either direction", async () => {
    // Round 8 found two of thirteen entries matching nowhere: one needle was longer than the sentence
    // it retracts ("defeated by the formatter" against "defeated by **running** the formatter"), and
    // restoring that sentence left the suite green. An entry that matches nothing enforces nothing, and
    // nothing was reporting it.
    //
    // A claim fully DELETED from the records also matches nothing, and that is the right outcome — so
    // this cannot simply demand a match. What it demands is that each entry be **live or explicitly
    // retired**: a claim still present in the records must be found, and one that has been removed
    // outright must be listed here so a reader knows the entry is dormant by design.
    const found = await occurrences();
    const matched = new Set(found.map((entry) => entry.claim));
    const dormant = RETRACTED.filter((entry) => !matched.has(entry.claim)).map(
      (entry) => entry.claim,
    );

    expect(
      dormant.filter((claim) => !RETIRED.includes(claim)),
      "an entry matching nothing and not declared retired — it may be a needle longer than the text " +
        "it means to catch, which is how round 8 found two of thirteen inert",
    ).toEqual([]);
    expect(
      RETIRED.filter((claim) => matched.has(claim)),
      "an entry declared retired that the records still carry",
    ).toEqual([]);
  });

  it("keeps every entry in a form the search can match", () => {
    expect(RETRACTED.length, "one entry per retraction, at least one per round").toBeGreaterThan(8);
    for (const entry of RETRACTED) {
      expect(
        entry.claim,
        `${entry.claim} must carry no emphasis markers, which flatten() would strip anyway`,
      ).toBe(entry.claim.replace(/[*_`]/g, ""));
      expect(entry.why, `${entry.claim} must record why it is retracted`).not.toBe("");
    }
    expect(GOVERNANCE.length, "every governance file this stage owns is searched").toBeGreaterThan(
      4,
    );
  });
});
