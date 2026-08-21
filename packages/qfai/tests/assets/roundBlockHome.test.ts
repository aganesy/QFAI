/**
 * Rework evidence for an ATDD-owned row was written as a `### Round N` block
 * into `.qfai/evidence/atdd-<spec-id>.md`, and nothing said which row it
 * belonged to.
 *
 * `### Round N` is the same depth as the per-row `### TDD-NNNN` section, so a
 * round block written after a row's section was that section's *sibling* and
 * terminated it. Two rows reworked in one cycle left two `### Round 2` blocks
 * with nothing structural tying either to a row, while the completion-review
 * audit subject asks for "every `### Round N` block the row carries" — not
 * computable from the document, and the guess lands in `Audited evidence hash`.
 * Appended at the end of the file the block fell under `## Final status`, the
 * one section every audit subject excludes, so it was covered by no hash at all
 * and the exclusion is silent by design.
 *
 * The block now nests one level below the row it belongs to. These tests pin
 * the placement and the three documents that have to agree on it.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD_SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const REVIEW_FIX = "assistant/skills/qfai-atdd/references/review-fix-rounds.md";
const ROUND_EVIDENCE = "assistant/skills/qfai-implement/references/round-evidence.md";
const BASELINE = "assistant/constitution/shared-skill-delegation-baseline.md";

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Every `.md` under the tree's `assistant/` directory, repo-relative. */
async function markdownFiles(tree: string): Promise<string[]> {
  const root = path.join(repoRoot, tree, "assistant");
  const walk = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
      }),
    );
    return nested.flat();
  };
  return walk(root);
}

describe.each(TREES)("%s", (tree) => {
  it("gives a round block a parent: the row's own section, one level down", async () => {
    const reviewFix = flat(await read(tree, REVIEW_FIX));
    expect(reviewFix).toContain(
      "A `#### Round N` block **nested inside the row's own `### TDD-NNNN` section** under `## Ledger rows advanced`",
    );
    // The old wording put it at the same depth as the row heading.
    expect(reviewFix).not.toContain("A `### Round N` block in");
  });

  it("says why the nesting is load-bearing, not a style choice", async () => {
    const reviewFix = flat(await read(tree, REVIEW_FIX));
    expect(reviewFix).toContain("the block is the row section's _sibling_ and terminates it");
    expect(reviewFix).toContain("nothing tying either to a `### TDD-NNNN`");
    // The default placement is the silent one: no audit subject reaches it.
    expect(reviewFix).toContain("`## Final status`, the one section every audit subject excludes");
  });

  it("forbids the duplicate row entry it means, not the section that holds rounds", async () => {
    // "Not a second `## Ledger rows advanced` entry" read as a ban on the only
    // section with per-row entries — the section the round now lives in.
    const reviewFix = flat(await read(tree, REVIEW_FIX));
    expect(reviewFix).toContain("Not a second `### TDD-NNNN` entry for the same row");
    expect(reviewFix).not.toContain("Not a second `## Ledger rows advanced` entry");
    expect(reviewFix).toContain("The row already has an entry; the round goes inside it.");
  });

  it("states the placement in the reference that owns the round shape", async () => {
    const round = flat(await read(tree, ROUND_EVIDENCE));
    expect(round).toContain("**Where a block goes.**");
    expect(round).toContain(
      "A `#### Round N` heading **inside the row's own `### TDD-NNNN` section**",
    );
    expect(round).toContain("The nesting is the whole of the attribution");
  });

  it("makes the completion-review subject extractable per row", async () => {
    const baseline = flat(await read(tree, BASELINE));
    expect(baseline).toContain(
      "from every `#### Round N` block nested in the row's `### <TDD-ID>` section",
    );
    // "every `### Round N` block the row carries" was not computable: nothing
    // said which row carried which block.
    expect(baseline).not.toContain("every `### Round N` block the row carries");
  });

  it("gives the closed ATDD evidence template a home for a round", async () => {
    // `Required sections: the template below is the list` — and none of the 13
    // headings held a round, so a rework had nowhere legal to be written.
    const skill = flat(await read(tree, ATDD_SKILL));
    expect(skill).toContain("Required sections: the template below is the list.");
    expect(skill).toContain(
      "A rework round is a `#### Round N` block nested **inside that row's section**, not a section of its own",
    );
    expect(skill).toContain("Rework rounds nest inside a row's section as `#### Round N`");
    // No new `##` heading was added: the template is still the closed list.
    expect(skill).not.toContain("## Review-fix rounds");
  });

  it("declares no round heading at `###` anywhere in the assistant tree", async () => {
    // A single document left at `###` re-opens the ambiguity for every reader
    // that follows it.
    const offenders: string[] = [];
    for (const file of await markdownFiles(tree)) {
      const body = await readFile(file, "utf-8");
      if (/^### Round (N|\d)/m.test(body)) offenders.push(path.relative(repoRoot, file));
    }
    expect(offenders).toEqual([]);
  });
});
