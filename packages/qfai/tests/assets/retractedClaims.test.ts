/**
 * A retracted claim must appear only inside quotation marks.
 *
 * This is the fifth recurrence of one failure, and the only one every round found: the stage retracts
 * a statement in one place, writes that it has been removed, and the statement is still standing
 * somewhere else in the same file.
 *
 * - Round 2 corrected the handover table and not the prose below it.
 * - Round 3 found the same section false again.
 * - Round 4 found it false again, and found the previous repair had touched the table only.
 * - Round 5 found it false again — and this time the false part was **the repair claim itself**: the
 *   record said four retracted statements "are gone now" while two stood byte-for-byte nine and
 *   thirteen lines above that sentence. Both gates proved it with `git diff`.
 *
 * Prose cannot be trusted to say whether prose was deleted, so the rule is enforced instead of
 * announced: a claim a review round refuted may appear **only as a quotation**. A record is free to
 * say `this said "X", and X is wrong`; it is not free to say X.
 *
 * **The first version of this file used proximity and was completely vacuous** — six mutations that
 * reinstated retracted claims as plain assertions reddened nothing. It looked for a retraction word
 * ("wrong", "false", "said") within 900 characters, in a document that is largely *about* corrections,
 * so almost every position in it had one nearby. Proximity cannot separate assertion from quotation
 * here. Enclosure can, and it is a syntactic property rather than a guess.
 *
 * Recorded because the vacuity was caught by running an oracle **before** shipping the guard, which is
 * the countermeasure five rounds of findings converged on.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");

interface Retracted {
  readonly claim: string;
  readonly why: string;
  readonly files: readonly string[];
}

const EVIDENCE = ".qfai/evidence/atdd-spec-0017.md";
const MATRIX = ".qfai/evidence/coverage-depth-spec-0017.md";
const DR =
  ".qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md";
const CR =
  ".qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md";

/**
 * Claims this stage retracted, in the wording they had.
 *
 * Adding an entry is how a retraction becomes enforced rather than announced. The wording is stored
 * without emphasis or code markers, because the search normalises those away — round 5 left one entry
 * in this list that could never match anything, since the text it named carried `**` inside it.
 */
const RETRACTED: readonly Retracted[] = [
  {
    claim: "All 71 Integration rows are already at refactor",
    why: "the ledger holds 63 refactor, 6 blocked and 2 todo (round 1)",
    files: [EVIDENCE],
  },
  {
    claim: "because the workflow changes are unmerged",
    why: "ci-pass exists and has run twelve times; the obstacle is CR-20260820-0012 (rounds 3-5)",
    files: [EVIDENCE, DR],
  },
  {
    claim: "there is no run history to mutate",
    why: "true of clause 2, wrong about clause 1, which is unsatisfied rather than unfalsifiable (round 4)",
    files: [EVIDENCE, DR],
  },
  {
    claim: "degenerate against this runner",
    why: "maxConcurrency is project-scoped, so a per-project tuning change is expressible (round 4)",
    files: [DR, CR],
  },
  {
    claim: "0 misclassified",
    why: "measured only against a corpus this stage chose, and wrong at every version (rounds 3-5)",
    files: [EVIDENCE, MATRIX],
  },
  {
    claim: "rebuilt the scan around the verb",
    why: "it was a closed package-manager list, not a verb anchor (round 2)",
    files: [EVIDENCE, MATRIX],
  },
  {
    claim: "wrong about clause 1 three times",
    why: "two wrong readings and one correction; this counted the correct statement as an error (round 5)",
    files: [DR],
  },
  {
    claim: "Three packs",
    why: "there were four pack directories, and there are five now (round 4)",
    files: [EVIDENCE],
  },
];

/** Strip emphasis and code markers, so `**around the verb**` matches `around the verb`. */
function normalise(text: string): string {
  return text.replace(/[*_`]/g, "");
}

/**
 * Character ranges enclosed in straight double quotes.
 *
 * Markdown in this repository uses `"` for quotation; the records are Prettier-formatted, which leaves
 * them straight. Curly quotes are accepted too so a hand edit does not silently escape the rule.
 */
function quotedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let open: number | undefined;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== '"' && char !== "“" && char !== "”") continue;
    if (open === undefined) {
      open = index;
      continue;
    }
    ranges.push([open, index]);
    open = undefined;
  }
  return ranges;
}

function isQuoted(
  ranges: ReadonlyArray<readonly [number, number]>,
  from: number,
  to: number,
): boolean {
  return ranges.some(([start, end]) => start < from && to <= end);
}

describe("retracted claims are quoted, never asserted", () => {
  it("finds every retracted claim inside a quotation", async () => {
    const unquoted: string[] = [];

    for (const entry of RETRACTED) {
      const needle = normalise(entry.claim);
      for (const file of entry.files) {
        const text = normalise(await readFile(path.join(ROOT, file), "utf8"));
        const ranges = quotedRanges(text);
        let index = text.indexOf(needle);
        while (index !== -1) {
          if (!isQuoted(ranges, index, index + needle.length)) {
            const line = text.slice(0, index).split(/\r?\n/).length;
            unquoted.push(`${file}:${String(line)} asserts "${entry.claim}" — ${entry.why}`);
          }
          index = text.indexOf(needle, index + needle.length);
        }
      }
    }

    expect(
      unquoted,
      "a claim a review round refuted, standing as an assertion rather than a quotation",
    ).toEqual([]);
  });

  it("rejects a bare assertion and accepts the same words quoted", () => {
    // The oracle, in the test rather than a scratch script. The first version of this guard passed
    // this check by accident — proximity to any corrective word — and reddened on none of six
    // reinstated claims. Enclosure is checkable, so it is checked here directly.
    const claim = "because the workflow changes are unmerged";

    const bare = `The row cannot go green ${claim} on this branch.`;
    expect(
      isQuoted(quotedRanges(bare), bare.indexOf(claim), bare.indexOf(claim) + claim.length),
      "a plain assertion must not pass",
    ).toBe(false);

    const quoted = `This paragraph read "${claim}", which is false.`;
    expect(
      isQuoted(quotedRanges(quoted), quoted.indexOf(claim), quoted.indexOf(claim) + claim.length),
      "the same words inside quotes must pass",
    ).toBe(true);

    // A corrective word nearby must NOT be enough — that is exactly what made the first version
    // vacuous.
    const nearbyOnly = `That reading is false. The row cannot go green ${claim} on this branch.`;
    expect(
      isQuoted(
        quotedRanges(nearbyOnly),
        nearbyOnly.indexOf(claim),
        nearbyOnly.indexOf(claim) + claim.length,
      ),
      "proximity to a corrective word must not launder an assertion",
    ).toBe(false);
  });

  it("keeps each entry in a form the search can actually match", () => {
    expect(RETRACTED.length, "one entry per retraction, at least one per round").toBeGreaterThan(4);
    for (const entry of RETRACTED) {
      expect(
        entry.claim,
        `${entry.claim} must be stored without emphasis markers, or it matches nothing`,
      ).toBe(normalise(entry.claim));
      expect(
        entry.claim.length,
        "short enough to survive the record being rewrapped by Prettier",
      ).toBeLessThan(80);
      expect(entry.files.length, `${entry.claim} must name where it was asserted`).toBeGreaterThan(
        0,
      );
      expect(entry.why, `${entry.claim} must record why it is retracted`).not.toBe("");
    }
  });
});
