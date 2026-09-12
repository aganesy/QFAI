/**
 * The band drift is recorded where the Drift Protocol looks for it.
 *
 * `QFAI-AUD-020` lost its lower bound as product work: the validator, its
 * tests, the shipped documents and the changelog moved, and the spec pack and
 * the two decision records that chose the band did not. A spec stating the
 * opposite of the product is not a bug in either of them — it is settled input
 * the work revealed to be wrong, and the protocol's answer to that is a Change
 * Request.
 *
 * This file pins the Change Request's shape rather than its prose: that it
 * exists, that it is `intent` class and `open`, that its blocked set names the
 * two ledger rows whose obligations the product contradicts and says which rows
 * it leaves alone, and that its options put the decision-record question — the
 * one a rerun cannot settle by following the product — to the user.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CHANGE_REQUEST = path.join(
  repoRoot,
  ".qfai/decisions/CR-20260913-0001-spec-0013-keeps-the-primary-tasks-lower-bound-the-validator-dropped.md",
);

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("the primary_tasks band drift has a Change Request", () => {
  const changeRequest = (): Promise<string> => readFile(CHANGE_REQUEST, "utf-8");

  const expectPhrase = async (phrase: string): Promise<void> => {
    expect(unwrap(await changeRequest())).toContain(unwrap(phrase));
  };

  it("is open, intent-class, and names no approved option yet", async () => {
    // The protocol reads these fields; a record that pre-answers its own
    // question is not a request.
    await expectPhrase("- ID: `CR-20260913-0001`");
    await expectPhrase("- Class: `intent`");
    await expectPhrase("- Status: `open`");
    await expectPhrase("- Approved option: `-`");
  });

  it("states both sides of the contradiction by artifact", async () => {
    await expectPhrase("`QFAI-AUD-020` is a ceiling today");
    await expectPhrase("count == 1 emits nothing");
    await expectPhrase("fewer than 3 or more than 7");
  });

  it("blocks the two rows whose obligation the product contradicts", async () => {
    await expectPhrase("| `spec-0013/TDD-0027` | `ledger-row` |");
    await expectPhrase("| `spec-0013/TDD-0028` | `ledger-row` |");
  });

  it("says which rows it does not block, and why", async () => {
    // A halt nobody can check the edge of stops more than it was meant to.
    await expectPhrase("Not blocked by this CR: the other ten `done` rows");
    await expectPhrase(
      "writing evidence for a row whose obligation the product states the opposite of records the contradiction rather than discharging it",
    );
  });

  it("puts the decision-record question rather than answering it", async () => {
    // Following the product settles the spec statements. It does not settle
    // what becomes of a decision the product overturned.
    await expectPhrase("whether a reversed decision is rewritten in place or left standing");
    await expectPhrase("**supersede** the two decisions");
    await expectPhrase("**rewrite** `DR-0267` and `DR-0013-0003` in place");
    await expectPhrase("Restore the floor in the product");
  });

  it("keeps the authorization list conditioned on the outcome", async () => {
    // `QFAI-DRIFT-001` reads a path here and not the condition beside it.
    await expectPhrase("**Under option 3 this list is empty**");
    await expectPhrase("reduced to the approved outcome before `Status: approved` is written");
  });
});
