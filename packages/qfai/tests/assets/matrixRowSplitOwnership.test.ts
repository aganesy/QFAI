/**
 * Splitting a matrix-shaped `TC-*` had a deadline (`before RED begins`) but no
 * owning phase.
 *
 * `/qfai-sdd` Phase 2b seeded one row per TC and named no split criterion, so a
 * matrix TC reached `/qfai-implement` un-decomposed by construction. Phase Red
 * then ordered the agent to split the row — a write the Drift Protocol reserves
 * for the upstream owner, since `/qfai-implement` owns the `Status`, `DR-ID`
 * and `Evidence` cells and nothing else. Obeying one file broke the other, and
 * the only move that broke neither was to proceed on a RED the rules call
 * invalidated.
 *
 * These tests pin the owner (Phase 2b), the identical criterion wording in both
 * files, and the bounded residual path Phase Red now takes instead of splitting.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CHECKLISTS = "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md";
const TRACE = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const SELECTOR = "assistant/skills/qfai-implement/references/selector-granularity.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

/** The prose wraps differently per file, so compare on collapsed whitespace. */
const flat = (value: string): string => value.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

/** The criterion both files must state identically so they cannot drift. */
const CRITERION =
  "MUST be split across multiple TDD rows before RED begins — one falsifying oracle per row, " +
  "one row per independently observable boundary.";

const section = (content: string, start: string, end: string): string => {
  const from = content.indexOf(start);
  expect(from).toBeGreaterThanOrEqual(0);
  const to = content.indexOf(end, from + start.length);
  expect(to).toBeGreaterThan(from);
  return content.slice(from, to);
};

describe.each(TREES)("%s", (tree) => {
  it("gives Phase 2b the split criterion, in the rules file's own words", async () => {
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain(CRITERION);
    // Without this the split would produce rows that no longer cover the TC.
    expect(phase2b).toContain("carries that `TC-*` in `TC-Refs`");
  });

  it("states the same criterion in the rules file that defines the ledger", async () => {
    expect(await read(tree, TRACE)).toContain(CRITERION);
  });

  it("names Phase 2b as the only phase that may create a row", async () => {
    const phase2b = section(
      await read(tree, CHECKLISTS),
      "## Phase 2b: Seed `tdd/test-list.md`",
      "## Phase 2c",
    );

    expect(phase2b).toContain("only one that may add, remove or re-scope a row");
    expect(phase2b).toContain("`Status`, `DR-ID` and `Evidence` cells and nothing else");
  });

  it("stops Phase Red ordering the split it has no authority to write", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    // The instruction that contradicted the Drift Protocol whitelist.
    expect(red).not.toContain("Split the row per `#selector-granularity-must` before continuing");
    expect(red).toContain("**This skill does not split it.**");
    expect(red).toContain("Never split in place");
  });

  it("routes the residual matrix shape through a Change Request and a blocked row", async () => {
    const red = section(
      await read(tree, SKILL),
      "### Phase: Red (Write Failing Test)",
      "### Phase: Green",
    );

    expect(red).toContain("#when-drift-is-detected");
    // `todo -> blocked` is the only inbound edge `blocked` has, so the shape has
    // to be judged before step 2 writes `todo -> red`.
    expect(red).toContain("while the row is still `todo`");
    expect(red).toContain("write `todo -> blocked` with that `CR-*` in `Blocked-By`");
  });

  it("names the owner in the references Phase Red sends the agent to", async () => {
    expect(await read(tree, SELECTOR)).toContain(
      "**The decomposition is `/qfai-sdd` Phase 2b's write, not this skill's**",
    );
    expect(await read(tree, LEDGER)).toContain("by `/qfai-sdd` Phase 2b, which owns the rows");
  });
});
