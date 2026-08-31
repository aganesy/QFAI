/**
 * The 12-point gate spends its reader's attention on the software, not on the
 * record (#500).
 *
 * Item 10 — evidence-file bookkeeping — was 3,907 of the gate's 5,857
 * characters: 66.7%. Items 3 and 5, RED admissibility and GREEN plus the oracle
 * proof, which are the entirety of what TDD buys, were 11.7% combined. Every
 * row pays reviewer attention in proportion to that text, and nothing item 10
 * reports means the software is wrong. The record rule now lives in
 * `references/record-contract.md`, addressed to whoever audits a record, and
 * the gate line cites it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const RECORD = "assistant/skills/qfai-implement/references/record-contract.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const flat = (s: string): string => s.replace(/\s+/g, " ");

/**
 * The body of each numbered item in the 12-point gate, keyed by its number.
 *
 * An item's body is its numbered line **plus every continuation line** up to
 * the next numbered item. Reading only the numbered line would let the budget
 * be satisfied by wrapping item 10 the way ordinary Markdown wraps a list
 * item: a short first line and the rest of the text in continuation lines,
 * uncounted, with the gate no lighter to read than before.
 *
 * The list ends where Markdown ends it — a blank line followed by an
 * unindented line — so the sequencing note after item 12 is excluded: it is
 * prose about the gate, not part of item 12. An indented block after a blank
 * line is still the item's own, and counts.
 */
function gateItems(skill: string): Map<number, string> {
  const start = skill.indexOf("### Item completion checklist (12-point gate)");
  if (start === -1) throw new Error("gate section not found");
  const rest = skill.slice(start);
  const end = rest.indexOf("\n### ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);

  const items = new Map<number, string>();
  let current: number | undefined;
  let afterBlank = false;

  for (const line of section.split(/\r?\n/)) {
    const match = /^(\d{1,2})\.\s+(.*)$/.exec(line);
    if (match) {
      const [, number, body] = match;
      if (number === undefined || body === undefined) continue;
      current = Number(number);
      items.set(current, body.trim());
      afterBlank = false;
      continue;
    }
    if (current === undefined) continue;
    if (line.trim() === "") {
      afterBlank = true;
      continue;
    }
    if (afterBlank && !/^\s/.test(line)) {
      current = undefined;
      continue;
    }
    items.set(current, `${items.get(current) ?? ""} ${line.trim()}`.trim());
    afterBlank = false;
  }
  return items;
}

describe("gateItems (what the budget counts)", () => {
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
    expect(record).toContain("**Write it once, from the history**");
    expect(record).toContain("`Review pack seal` is recomputed here");
    expect(record).toContain("`Audited evidence hash` is **recomputed** here");
    expect(record).toContain(
      "item's four sub-agent observations (items 3, 5, 7, 8) all name the **same** revision",
    );
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

  it("dates the one-off migration instead of leaving it in the gate", async () => {
    // It is a pass over an existing ledger, not a rule a new row is built
    // against — the reader who never had a pre-split row needs to know that
    // from the heading.
    const record = flat(await read(tree, RECORD));
    expect(record).toMatch(
      /## Migration: writing the marker \(one pass, opened \d{4}-\d{2}-\d{2}\)/,
    );
    expect(record).toContain("not a rule a new row is built against");
  });
});
