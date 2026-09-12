/**
 * The audit hash's step 1 says what the extraction produces, not only which
 * fields it reads.
 *
 * Naming the fields settles which lines are taken and leaves open what they
 * become. Six choices were each open — the list marker, the `Round N: ` prefix,
 * the fenced value, the heading line, the field order, and the separator — so
 * two readers taking the same fields computed different digests, and a recorded
 * value meant something only inside the run that wrote it. A hash nobody else
 * can recompute is not a check; it is a number.
 *
 * The pins below anchor on the clauses that settle each choice, and on the
 * sentence that separates this value from the tree address it is repeatedly
 * confused with. They are deliberately short: the rule is the subject, and a
 * reword of the surrounding prose must not redden this file.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const REFERENCE = "assistant/constitution/references/audited-evidence-hash.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe.each(TREES)("%s — the audit hash's extraction is one text", (tree) => {
  const reference = (): Promise<string> => readFile(path.join(repoRoot, tree, REFERENCE), "utf-8");

  const expectPhrase = async (phrase: string): Promise<void> => {
    expect(unwrap(await reference())).toContain(unwrap(phrase));
  };

  it("says the extraction has an output, not only an input", async () => {
    await expectPhrase("**What the extraction produces, exactly.**");
    await expectPhrase("two readers taking the same fields can still compute different digests");
  });

  it("settles the marker, the prefix and the separator in one clause", async () => {
    // All three are spelling, and a rule that rewrites any of them is a rule
    // two readers implement differently.
    await expectPhrase("the entry's own lines, **selected and never rewritten**");
    await expectPhrase("the leading `- ` list marker stays, the `Round N: ` prefix stays");
    await expectPhrase("keep whatever separator the entry wrote them with");
  });

  it("carries a field's fenced value with the field", async () => {
    // The recorded output is the observation. Taking the field line alone
    // leaves the output free to change after the verdict.
    await expectPhrase("opening fence through closing fence");
    await expectPhrase(
      "a subject that took the field line alone let the output be rewritten after the verdict with the digest unmoved",
    );
  });

  it("takes the entry's order rather than the contract's", async () => {
    // A selection that also reorders is a rewrite, and the two readings gave
    // one entry two digests.
    await expectPhrase("**in the order the entry writes them**, not the order this contract lists");
    await expectPhrase("a selection cannot also reorder without rewriting");
  });

  it("opens the text with the row's heading line", async () => {
    await expectPhrase("opened by the row's `### <TDD-ID>` heading line");
    await expectPhrase("an entry moved under another id is a different subject");
  });

  it("says the gate computes it this way today", async () => {
    // A contract no tool implements is the state this paragraph was written
    // for: the recorded values were reproducible only by their own run.
    await expectPhrase("gate item 10 computes the completion subject this way today");
    await expectPhrase("reproducible only inside the run that wrote it");
  });

  it("separates the three values that share these words", async () => {
    await expectPhrase('**Two fields share the words "audited evidence hash" and are not the same');
    await expectPhrase("computed by these same four steps");
    await expectPhrase("Neither is the working-tree revision");
  });
});
