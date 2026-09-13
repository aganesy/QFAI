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

  it("takes a region rather than a selection of lines", async () => {
    // A selection would also have to state an order, a separator and a
    // spelling per field, each a further way for two readers to disagree.
    await expectPhrase(
      "The extraction is a **region of the entry**, not a selection of lines out of it",
    );
    await expectPhrase("every line inside it is kept **verbatim**");
    await expectPhrase("The field lists below are what decide **where the region ends**");
  });

  it("ends the region at the first field the subject could not have read", async () => {
    await expectPhrase(
      "the first of the stage-completion fields a reviewer writes at the end of the entry",
    );
    await expectPhrase("for the GREEN subject, the first field written after the GREEN");
    // A mid-entry round verdict is a reviewer field with a later round after
    // it, so stopping there drops round 2 from every reworked row.
    await expectPhrase("**A `Round N: reviewer verdict` is not that boundary.**");
    await expectPhrase("stopping there would drop round 2 from every row that took a REVISE");
  });

  it("drops a reviewer's own verdict line from what that reviewer hashes", async () => {
    await expectPhrase("a reviewer's own `reviewer verdict` line is dropped wherever it falls");
    // Each attempt's pack pair is written after that review too.
    await expectPhrase("records beside each review attempt is dropped the same way");
    // A round with several review attempts qualifies the field name.
    await expectPhrase("**including its `(attempt M)` form**");
    await expectPhrase("the one line that cannot be in its own subject");
  });

  it("synthesizes the heading rather than copying it", async () => {
    // A heading carrying extra text would otherwise move the digest when the
    // text is tidied.
    await expectPhrase("the heading is **synthesized** as `### <TDD-ID>` rather than copied");
  });

  it("carries a field's fenced value with the field", async () => {
    // The recorded output is the observation, so it is inside the region.
    await expectPhrase("opening fence through closing fence");
  });

  it("says the gate computes it this way today", async () => {
    // A contract no tool implements is the state this paragraph was written
    // for: the recorded values were reproducible only by their own run.
    await expectPhrase("computes the completion subject exactly this way");
    await expectPhrase("reproducible only inside the run that wrote it");
  });

  it("enumerates all three reviewer-owned fields before the revision", async () => {
    // Omitting the parity one is how a compliant UI row loses the hash its
    // gate requires.
    await expectPhrase("**Three ledger fields carry an audited evidence hash");
    await expectPhrase("`Prototype parity audited evidence hash`");
    await expectPhrase("The working-tree revision is a fourth value with a fourth name");
  });

  it("says the gate recomputes all three, and when it skips the parity one", async () => {
    // The parity subject reaches captures a fresh clone does not have, so the
    // reference has to say what the gate does without them.
    await expectPhrase("**`npx qfai validate` recomputes all three.**");
    await expectPhrase("reaches past the entry to the captures the row's");
    await expectPhrase("the gate checks the recorded fields and skips the recomputation");
  });
});
