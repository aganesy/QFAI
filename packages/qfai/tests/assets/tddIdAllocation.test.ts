/**
 * `TDD-NNNN` has an allocation rule (#405).
 *
 * The shipped specification for `TDD-ID` was one line — match `TDD-NNNN`, be
 * unique within the spec — while `constitution/workflow.md` mandates worktree
 * separation and `TDDLIST_DUPLICATE_ID` is an `error`. Nothing said who
 * allocates the next value, so a batch of rows could only be landed by the last
 * writer.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const RULES = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("TDD-ID allocation", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the traceability rules state who allocates the next TDD-ID`, async () => {
      const rules = flat(await read(tree, RULES));

      // The uniqueness constraint is still the premise the rule hangs off.
      expect(rules).toContain("`TDD-ID` must match `TDD-NNNN` and be unique within the spec.");
      expect(rules).toContain(
        "**`TDD-ID` allocation is by reserved block, decided before the workers split.**",
      );
      // Serial authoring is unchanged, and says what the maximum ranges over.
      expect(rules).toContain(
        "Take the maximum `TDD-NNNN` over the whole ledger, including retired, `blocked` and `exception` rows",
      );
    });

    it(`${tree}: the rule names the race it closes`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("`TDDLIST_DUPLICATE_ID` is an `error`");
      expect(rules).toContain("worktree separation");
      expect(rules).toContain("stale the moment another author appends");
    });

    it(`${tree}: reservation is one serialized write on the shared branch`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("**Concurrent authoring — reserve first, on the shared branch.**");
      expect(rules).toContain("one serialized write on the branch they all fork from");
      expect(rules).toContain("`## TDD-ID reservations`");
      // The reservation must not be readable as ledger rows.
      expect(rules).toContain(
        "Record it as a bullet list, never a markdown table: `validateTddList` reads every table in the file as ledger rows",
      );
      expect(rules).toContain("- TDD-0065..TDD-0079 — <author or slice>, reserved <YYYY-MM-DD>");
    });

    it(`${tree}: an author with no reservation may take one itself`, async () => {
      const rules = flat(await read(tree, RULES));

      // The observed failure had no dispatcher at all: the rows were parked.
      expect(rules).toContain(
        "If no reservation exists and you need IDs anyway, take one yourself",
      );
      expect(rules).toContain("it serializes where a batch of rows cannot");
    });

    it(`${tree}: gaps are kept and written IDs are never renumbered`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("**A block is a budget, not a promise.**");
      expect(rules).toContain("stops and asks for another one; it does not continue past the");
      expect(rules).toContain("**A written `TDD-ID` is never renumbered.**");
      // Renumbering at merge time is what breaks the out-of-ledger references.
      expect(rules).toContain(".qfai/evidence/atdd-*.md");
      expect(rules).toContain(
        "a merge does not rewrite it, so renumbering at merge time silently breaks those references",
      );
    });

    it(`${tree}: the ledger schema carries the rule where rows are appended`, async () => {
      const ledger = flat(await read(tree, LEDGER));

      // The column gloss no longer stops at "unique".
      expect(ledger).toContain("Allocated per `#tdd-id-allocation`");
      expect(ledger).toContain("## TDD-ID allocation");
      expect(ledger).toContain("`max + 1` over every table in the file when authoring serially");
      expect(ledger).toContain(
        "from a block reserved under `## TDD-ID reservations` when authors run concurrently",
      );
      expect(ledger).toContain("Never renumber an id that has already been written outside");
    });

    it(`${tree}: the SKILL points at the allocation rule before a write`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "Allocating a new `TDD-ID` is governed by `references/execution-ledger.md#tdd-id-allocation`",
      );
      expect(skill).toContain("never guess the next value from a ledger another worktree holds");
    });
  }
});
