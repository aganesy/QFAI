/**
 * The 12-point gate spends its reader's attention on the software, not on the
 * record.
 *
 * Every row pays reviewer attention in proportion to the gate's text, and
 * nothing item 10 — evidence-file bookkeeping — reports means the software is
 * wrong. So the item states its obligation and cites
 * `references/record-contract.md` for the rule, and the assertions here hold it
 * under a quarter of the gate and below items 3 and 5 combined: RED
 * admissibility, and GREEN with the oracle proof, which are the entirety of
 * what TDD buys.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { gateItems } from "../helpers/gateItems.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const RECORD = "assistant/skills/qfai-implement/references/record-contract.md";
const MIGRATION = "assistant/skills/qfai-implement/references/pre-split-evidence-migration.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const flat = (s: string): string => s.replace(/\s+/g, " ");

describe("gateItems (what a gate item's body is)", () => {
  const section = [
    "### Item completion checklist (12-point gate)",
    "",
    "1. first item",
    "2. short head",
    "   wrapped tail that carries the weight",
    "",
    "   an indented second paragraph, still item 2",
    "",
    "Sequencing note: prose about the gate, not an item.",
    "",
    "### Next section",
    "",
    "3. not part of the gate",
  ].join("\n");

  it("counts an item's continuation lines as its body", () => {
    // Without this, moving item 10's text below its numbered line hides it
    // from the ratio the budget is expressed as.
    const items = gateItems(section);
    expect(items.get(2)).toBe(
      "short head wrapped tail that carries the weight an indented second paragraph, still item 2",
    );
  });

  it("stops at the prose that follows the list and at the next heading", () => {
    const items = gateItems(section);
    expect(items.get(2)).not.toContain("Sequencing note");
    expect([...items.keys()]).toEqual([1, 2]);
  });

  it("does not resume on a numbered line in the prose after the list", () => {
    // The list ends at the first unindented line after a blank one. Reading on
    // from there takes a numbered step in a note below — a migration
    // procedure, a sequencing rule — as a gate item, which moves the count and
    // every ratio measured against it.
    const items = gateItems(
      [
        "### Item completion checklist (12-point gate)",
        "",
        "1. first item",
        "",
        "Sequencing note: the steps below are not gate items.",
        "",
        "2. a numbered step in the note",
      ].join("\n"),
    );
    expect([...items.keys()]).toEqual([1]);
  });

  it("refuses a gate that numbers an item twice", () => {
    // `Map#set` would replace the first silently, and the callers count
    // numbers rather than lines: twelve items would still be twelve.
    expect(() =>
      gateItems(
        [
          "### Item completion checklist (12-point gate)",
          "",
          "1. first item",
          "2. second item",
          "2. second item again",
        ].join("\n"),
      ),
    ).toThrow("gate item 2 is numbered twice");
  });
});

describe.each(TREES)("%s (the gate's attention budget)", (tree) => {
  it("keeps the record item from dominating the gate", async () => {
    const items = gateItems(await read(tree, SKILL));
    expect(items.size).toBe(12);

    const total = [...items.values()].reduce((sum, body) => sum + body.length, 0);
    const record = items.get(10)?.length ?? 0;

    // 25% is generous — the item was at 66.7%. What the ceiling encodes is
    // that the gate line states the obligation and the reference carries the
    // rule, which is the only shape that keeps this number down.
    expect(record / total).toBeLessThan(0.25);
  });

  it("spends more of the gate on RED and the oracle proof than on the record", async () => {
    // These two are what distinguishes a discriminating test from one that
    // cannot fail. Ranked below the bookkeeping, they were read last.
    const items = gateItems(await read(tree, SKILL));
    const red = items.get(3)?.length ?? 0;
    const green = items.get(5)?.length ?? 0;
    const record = items.get(10)?.length ?? 0;

    expect(red).toBeGreaterThan(0);
    expect(green).toBeGreaterThan(0);
    expect(red + green).toBeGreaterThan(record);
  });

  it("cites the record contract from the gate line", async () => {
    // Moved out without a citation, the rule would be unreachable from the
    // only place that applies it.
    const items = gateItems(await read(tree, SKILL));
    expect(items.get(10)).toContain("`references/record-contract.md`");
    expect(items.get(10)).toContain("the evidence file its `Layer` owns");
  });

  it("keeps the moved rules whole in the reference", async () => {
    // Condensing the gate must not drop a rule. Each of the four topics item
    // 10 carried is checked by the sentence that states it.
    const record = flat(await read(tree, RECORD));

    expect(record).toContain("`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API`");
    expect(record).toContain("**Identify it by a marker, not by its status**");
    expect(record).toContain("Every `Review pack seal` the entry carries");
    expect(record).toContain("`Audited evidence hash` is **recomputed** here");
    expect(record).toContain(
      "Of the item's four sub-agent observations (items 3, 5, 7, 8), **only items 7 and 8 judge the final tree**",
    );
    // The fourth topic — writing the marker — is a one-off pass over an
    // existing ledger rather than a rule a row is built against, so it is a
    // phase's work and lives in its own reference. Whole there, not here.
    const migration = flat(await read(tree, MIGRATION));
    expect(migration).toContain("**Write it once, from the history**");
  });

  it("routes the auditor to item 10's checks that are stated elsewhere", async () => {
    // Three of item 10's checks are written beside the fields they constrain,
    // not here. Claiming this file was the whole rule meant an audit that read
    // it never ran them, and each guards a swap the revision cannot see.
    const record = flat(await read(tree, RECORD));

    expect(record).not.toContain("this file is the whole rule");
    expect(record).toContain("## The item 10 checks written elsewhere");
    expect(record).toContain(
      "constitution/shared-skill-delegation-baseline.md#reviewer-response-template",
    );
    expect(record).toContain("SKILL.md#per-item-evidence-contract-fresh-evidence-required");
    expect(record).toContain("`DR-ID` the row currently carries");
  });

  it("keeps the one-off migration out of the gate and out of the contract", async () => {
    // It is a pass over an existing ledger, not a rule a new row is built
    // against, so neither the gate line nor the record contract carries the
    // procedure. Both name who runs it, and the reference states what it is.
    const items = gateItems(await read(tree, SKILL));
    expect(items.get(10)).toContain("it never writes one");
    expect(items.get(10)).toContain("`references/pre-split-evidence-migration.md`");

    const record = flat(await read(tree, RECORD));
    expect(record).toContain("## Who writes the marker");
    expect(record).not.toContain("**Write it once, from the history**");

    // The heading is where a reader who never had a pre-split row learns this
    // is a one-off rather than a rule a new row is built against.
    const migration = flat(await read(tree, MIGRATION));
    expect(migration).toContain("# Pre-split evidence marker pass (one-time, per repository)");
    expect(migration).toContain("runs **once per repository**, not once per session");
  });
});
