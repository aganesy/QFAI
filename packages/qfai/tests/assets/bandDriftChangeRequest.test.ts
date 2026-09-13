/**
 * The band drift is recorded where the Drift Protocol looks for it.
 *
 * `QFAI-AUD-020` lost its lower bound as product work: the validator, its
 * tests, the shipped documents and the changelog moved, and the spec packs and
 * the decision records that chose the band did not. A spec stating the opposite
 * of the product is not a bug in either of them — it is settled input the work
 * revealed to be wrong, and the protocol's answer to that is a Change Request.
 *
 * **These assertions hold across the record's lifecycle.** A Change Request is
 * approved, rejected or superseded in place, and the protocol's own step 3
 * rewrites `Status`, `Approved option` and the impact scope when that happens —
 * so pinning today's `open` / `-` would redden this file on the very resolution
 * it exists to make possible. What is pinned instead is the shape a record of
 * this drift must have whatever its status: the contradiction it states, the
 * rows it blocks, the question it puts, and the fields the Decisions layout
 * gives an owner to answer it with.
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

  it("carries the header fields the protocol reads, at a legal value", async () => {
    // The values move as the record is resolved; that they exist and are legal
    // is what a reader and `QFAI-DRIFT-001` both depend on.
    const text = await changeRequest();
    await expectPhrase("- ID: `CR-20260913-0001`");
    await expectPhrase("- Class: `intent`");
    expect(text).toMatch(/^- Status: `(open|approved|rejected|superseded)`$/m);
    expect(text).toMatch(/^- Approved option: `(-|[123][ab]?)`$/m);
  });

  it("states both sides of the contradiction by artifact", async () => {
    await expectPhrase("`QFAI-AUD-020` is a ceiling today");
    await expectPhrase("count == 1 emits nothing");
    await expectPhrase("fewer than 3 or more than 7");
  });

  it("blocks the rows whose obligation the product contradicts", async () => {
    await expectPhrase("| `spec-0013/TDD-0027` | `ledger-row` |");
    await expectPhrase("| `spec-0013/TDD-0028` | `ledger-row` |");
    // The two packs share the decision, so settling it for one leaves the
    // shared record and one of its readers disagreeing.
    await expectPhrase("| `spec-0004/TDD-0050` | `ledger-row` |");
  });

  it("resets those rows whichever option is approved", async () => {
    // Restoring the floor rewrites the validators and tests the rows certify,
    // and a done row is selected again only once a Change Request resets it.
    await expectPhrase("3. Downstream ledger sweep, **under every option**.");
    await expectPhrase("**So the reset is owed under option 3 as well**");
  });

  it("names an invocation per artifact class, with its mode", async () => {
    // A bare invocation cannot reach a spec-local file and a scoped one cannot
    // reach the policy record.
    await expectPhrase("| `/qfai-sdd spec-0013` |");
    await expectPhrase("| `/qfai-sdd spec-0004` |");
    await expectPhrase("naming one invocation would leave part of the record unwritten");
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
    await expectPhrase("**supersede** the three decisions");
    await expectPhrase("**rewrite** the three decisions in place");
    await expectPhrase("Restore the floor in the product");
  });

  it("supersedes through the fields the Decisions layout defines", async () => {
    // `Superseded by` is not one of them, and the protocol forbids inventing
    // a layout, so an owner could not have carried out that instruction.
    await expectPhrase("there is no `Superseded by` field to write");
  });

  it("links a superseded record through a value `Related` may hold", async () => {
    // Neither Decisions template admits a `DR-*` in `Related`, and both admit
    // a `CR-*`. Naming the new decision there would write a value the layout
    // forbids; naming this record, which names the new decision, does not.
    await expectPhrase("`Related` cannot hold");
    await expectPhrase("names\n`CR-20260913-0001` in `Related`");
  });

  it("supersedes only the band choice of the composite record", async () => {
    // `Status` belongs to the whole record, and the composite adopts two
    // decisions this record does not reach. Setting it would withdraw them.
    await expectPhrase("`DR-0004-0014` is not superseded as a record.");
    await expectPhrase("The other two\nadoptions are not touched.");
  });

  it("keeps the authorization list conditioned on the outcome while it is open", async () => {
    // `QFAI-DRIFT-001` reads a path here and not the condition beside it, so
    // the section is narrowed before the status leaves `open` — which removes
    // the conditional prose this asserts. Pinning it past `open` would redden
    // this file on the very resolution the record exists to make possible.
    const text = await changeRequest();
    if (!/^- Status: `open`$/m.test(text)) return;
    await expectPhrase("**Under option 3 it reduces to the three delta files**");
    await expectPhrase("reduced to the approved outcome before `Status: approved` is written");
  });
});
