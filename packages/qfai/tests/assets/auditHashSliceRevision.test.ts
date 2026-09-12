/**
 * Which matrix the coverage-depth slice is taken from.
 *
 * Step 3 adds a record for the part of `coverage-depth-<spec-id>.md` that
 * belongs to the row's obligation, and said nothing about when that part is
 * read. Two roles derived opposite values from the same record — one taking
 * the matrix as it stood at the verdict, one taking it as it stood at the
 * verdict's `Reviewed revision` — and both readings followed from the text.
 *
 * The values differ by the presence of a whole record, so an undetermined
 * answer is a gate that cannot function: every hash in a spec splits on a
 * reading whenever a change adds an obligation to the matrix.
 *
 * These pins hold the answer and the two consequences that make it usable: the
 * staleness it accepts, and the path that closes it.
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

describe.each(TREES)("%s — the slice has one reading", (tree) => {
  const expectPhrase = async (phrase: string): Promise<void> => {
    const text = await readFile(path.join(repoRoot, tree, REFERENCE), "utf-8");
    expect(unwrap(text)).toContain(unwrap(phrase));
  };

  it("takes the matrix as it stands when the verdict is taken", async () => {
    await expectPhrase(
      "**The slice is taken from the matrix as it stands when the verdict is taken**",
    );
    await expectPhrase("not from the matrix at the verdict's `Reviewed revision`");
  });

  it("says why the other reading has nothing to read", async () => {
    // The revision excludes the evidence tree, so it addresses no state of the
    // matrix at all.
    await expectPhrase("addresses no state of the matrix at all");
    await expectPhrase("the reviewer hashes what the gate will hash");
  });

  it("accepts the staleness as the slice's price rather than a defect", async () => {
    await expectPhrase("A matrix that later names this row's obligation therefore stales");
    await expectPhrase(
      "Hashing the file whole would stale every verdict in the spec when any obligation's cell moved",
    );
  });

  it("names the path that closes it, and what that path is not", async () => {
    // The revision has not moved, so a re-attestation is available — and it
    // re-signs a judgement over a subject that has grown.
    await expectPhrase(
      "**A re-attestation closes it, and a re-attestation is not a rubber stamp.**",
    );
    await expectPhrase("**reads the slice that is now in its subject**");
    await expectPhrase("a role that would now answer differently records that answer instead");
  });
});
