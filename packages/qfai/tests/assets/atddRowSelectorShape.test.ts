/**
 * An ATDD-owned row's selector reaches a shape judgement.
 *
 * The judgement in Phase Red step 1 reads the cell the ledger holds. On a row
 * `/qfai-sdd` Phase 2b seeded for an `E2E` / `API` / `Integration` layer that
 * cell is `-` — the acceptance test does not exist yet — so the judgement is
 * vacuous, and step 3b then wrote the selector and advanced the row in one
 * edit. A handover bundling several independent boundaries could therefore
 * reach `green` with a RED the granularity rule calls invalidated.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const IMPLEMENT = "assistant/skills/qfai-implement/SKILL.md";
const PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The body of a `#### ` section, up to the next heading of any level. */
const subsection = (content: string, heading: string): string => {
  const start = content.indexOf(`\n${heading}\n`);
  if (start < 0) {
    return "";
  }
  const after = start + heading.length + 2;
  const next = content.indexOf("\n#", after);
  return next < 0 ? content.slice(after) : content.slice(after, next);
};

describe.each(QFAI_TREES)("%s", (tree) => {
  it("judges the handover's selector in the step that reads it", async () => {
    const step3b = flat(
      subsection(await read(tree, IMPLEMENT), "#### Red 3b — Handed-over provenance"),
    );

    expect(step3b).toContain(
      "**Judge that entry's `Selector` shape before the copy, and before any status write.**",
    );
    // The rule is the one step 1 applies, cited rather than restated.
    expect(step3b).toContain("`references/selector-granularity.md#entry-form`");
  });

  it("says why step 1's judgement cannot reach this row", async () => {
    const step3b = flat(
      subsection(await read(tree, IMPLEMENT), "#### Red 3b — Handed-over provenance"),
    );

    expect(step3b).toContain("on a seeded acceptance row that cell is `-`");
    expect(step3b).toContain("the copy is what would make an unjudged selector its own");
  });

  it("keeps a matrix-shaped row out of `red` and off the copy", async () => {
    const step3b = flat(
      subsection(await read(tree, IMPLEMENT), "#### Red 3b — Handed-over provenance"),
    );

    expect(step3b).toContain("**On a matrix shape take step 1's residual path**");
    expect(step3b).toContain("write `todo -> blocked` with that `CR-*` in `Blocked-By`");
    // The copy is what attributes the RED, so refusing it is the whole point.
    expect(step3b).toContain("**Copy neither cell, and write no `red`**");
  });

  it("names the stage that re-authors the tests once the split lands", async () => {
    const step3b = flat(
      subsection(await read(tree, IMPLEMENT), "#### Red 3b — Handed-over provenance"),
    );
    const provenance = await read(tree, PROVENANCE);

    expect(step3b).toContain(
      "`../qfai-atdd/references/red-provenance.md#a-split-row-comes-back-as-a-fresh-handover`",
    );
    expect(provenance).toContain("\n## A split row comes back as a fresh handover\n");

    const section = flat(subsection(provenance, "## A split row comes back as a fresh handover"));
    expect(section).toContain(
      "**The tests a split row needs are this stage's to write, one per new row.**",
    );
    expect(section).toContain("one test per row, one branch per row, one entry per row");
  });

  it("does not re-use the refused handover's evidence", async () => {
    const section = flat(
      subsection(await read(tree, PROVENANCE), "## A split row comes back as a fresh handover"),
    );

    // Its RED was observed against the whole of the selector the split removed,
    // which is the observation the refusal rejected.
    expect(section).toContain("it is not re-used and not amended");
    expect(section).toContain("Re-run each new row's own selector for its own RED");
  });
});
