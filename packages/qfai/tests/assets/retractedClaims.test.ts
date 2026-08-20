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
 * 2. **Literal spaces.** The second matched needles containing spaces against text where Prettier had
 *    put **newlines**. Round 6 measured four live occurrences invisible to it, and made the point that
 *    lands hardest: a guard whose premise is "prose cannot be trusted" was defeated by running the
 *    formatter `ci:lint` enforces. It also had three narrower holes — a per-entry `files` list, so a
 *    claim asserted in a file the entry did not name was free; a global quote-parity scan, where one
 *    stray `"` inverted every range after it, laundering an assertion **and** accusing eight correct
 *    quotations; and a needle-length rule justified as surviving reflow that did nothing of the kind.
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
];

/** Collapse whitespace and drop emphasis, so reflow and `**` cannot hide a claim. */
function flatten(text: string): string {
  return text.replace(/[*_`]/g, "").replace(/\s+/g, " ");
}

/**
 * Quoted spans, computed per paragraph.
 *
 * Paragraph-scoped because a global parity scan is unbounded: round 6 planted one stray `"` and it
 * inverted every range after it — laundering an assertion in one place and accusing eight correct
 * quotations elsewhere, which reddened a required CI leg.
 */
function quotedSpans(paragraph: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let open: number | undefined;
  for (let index = 0; index < paragraph.length; index += 1) {
    const char = paragraph[index];
    if (char !== '"' && char !== "“" && char !== "”") continue;
    if (open === undefined) {
      open = index;
      continue;
    }
    spans.push([open, index]);
    open = undefined;
  }
  return spans;
}

interface Occurrence {
  readonly file: string;
  readonly claim: string;
  readonly quoted: boolean;
}

/** Every occurrence of every claim, paragraph by paragraph. */
async function occurrences(): Promise<Occurrence[]> {
  const found: Occurrence[] = [];
  for (const file of GOVERNANCE) {
    const raw = await readFile(path.join(ROOT, file), "utf8");
    for (const paragraph of raw.split(/\r?\n\s*\r?\n/)) {
      const flat = flatten(paragraph);
      const spans = quotedSpans(flat);
      for (const entry of RETRACTED) {
        const needle = flatten(entry.claim);
        let index = flat.indexOf(needle);
        while (index !== -1) {
          const to = index + needle.length;
          const quoted = spans.some(([start, end]) => start < index && to <= end);
          found.push({ file, claim: entry.claim, quoted });
          index = flat.indexOf(needle, to);
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
    // three more, because the needle had a space where Prettier had a newline. This is that shape.
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
