/**
 * A summary that replaces earlier context says what it must keep.
 *
 * A long stage continues from a summary once its context window fills, and
 * whatever the summary dropped is simply absent afterwards. The baseline names
 * six general items and the stage state no reading of the code recovers: the
 * ledger, the open questions, the clarification budget spent, the labelled
 * assumptions, and the reviewer verdicts with their rounds.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("context summary contract", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the baseline carries the contract`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("## Context Summary Contract (Mandatory)");
      expect(baseline).toContain("Every summary that replaces earlier context keeps these six:");
    });

    it(`${tree}: the six general items are listed`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      for (const item of [
        "1. Difficulties that came up, and how each was resolved.",
        "2. Options raised, tried or set aside, and why.",
        "established as a constraint — in the exact words.",
        "4. Where things stand: what is covered, settled or complete.",
        "5. What is still open, promised or expected next.",
        "6. Details that are hard to reconstruct: names, numbers, dates, exact wording, references.",
      ]) {
        expect(baseline).toContain(item);
      }
    });

    it(`${tree}: the stage state is named alongside the six`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      for (const state of [
        "The execution ledger (`.qfai/specs/<spec-id>/tdd/test-list.md`)",
        "Every open question, with its owner, status and due date",
        "The clarification budget spent in this invocation",
        "Every assumption recorded under `--auto`",
        "Each reviewer verdict, the round it came in",
      ]) {
        expect(baseline).toContain(state);
      }
    });

    it(`${tree}: the user's words are kept, the agent's reasoning may be condensed`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("Keep what the user said close to their own words.");
      expect(baseline).toContain(
        "Your own reasoning may be condensed to what it concluded, as long as nothing listed above is dropped.",
      );
      expect(baseline).toContain(
        "Be complete on these items even when that makes the summary longer.",
      );
    });
  }
});
