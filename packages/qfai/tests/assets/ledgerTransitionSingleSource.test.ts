/**
 * `references/execution-ledger.md#allowed-transitions` is the ledger's
 * transition table. `qfai-implement/SKILL.md` summarised it four times, and the
 * summaries fell behind it: three of them claimed a *unique* re-entry
 * (`refactor` -> `red`), so `blocked` -> `todo`, `exception` -> `todo` and the
 * reviewer loop read as illegal to anyone working from the skill alone. The
 * `project_memory` restatement was the worst placed of them, because it is the
 * line most likely to be carried into a delegated work order.
 *
 * `TDDLIST_EXCEPTION_PARKED` then remediates via `exception` -> `todo`, an edge
 * the skill never named — so the tool appeared to ask for something the skill
 * forbids.
 *
 * These tests pin the reference as the single source: the skill may state the
 * forward spine, but it must not claim the set of re-entries is smaller than it
 * is, and the finding must cite where the real list lives.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe.each(TREES)("%s", (tree) => {
  it("no longer claims a single or only re-entry", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).not.toContain("The single re-entry is");
    expect(skill).not.toContain("with one recorded re-entry");
  });

  it("routes the reader to the reference for the complete list", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("`references/execution-ledger.md#allowed-transitions` is the complete");
    expect(skill).toContain(
      "**Never infer that an edge does not exist from its absence in this summary**",
    );
  });

  it("names the anomaly exit and says it needs no Change Request", async () => {
    // The gap that let a parked row sit forever: SKILL.md contained no
    // `exception -> todo` at all, so its "backward transitions need an approved
    // CR" sentence was the only nearby rule and read as a prohibition.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("leaves via `exception` -> `todo` once the anomaly is resolved");
    expect(skill).toContain("That exit needs no Change Request");
  });

  it("keeps the CR reset as the sanctioned backward transition, and defines the term", async () => {
    // The reset sentence stays — under the reference's vocabulary a resumption
    // and an anomaly exit are re-entries rather than backward transitions, so
    // the sentence is true. What was missing is that the term is narrower than
    // "moves to an earlier status", which is how a reader takes it.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "The only exception is an approved Change Request reset (see Status Lifecycle).",
    );
    expect(skill).toContain('"Backward" is the reference\'s term of art');
  });

  it("the reference still carries every edge the summary defers to it", async () => {
    const ledger = flat(await read(tree, LEDGER));
    for (const edge of [
      "`blocked` -> `todo`",
      "`exception` -> `todo`",
      "`refactor` -> `review-fix`",
      "`review-fix` -> `refactor`",
      "`refactor` -> `red`",
    ]) {
      expect(ledger).toContain(edge);
    }
  });
});
