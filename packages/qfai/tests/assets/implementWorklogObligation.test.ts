/**
 * The work-log obligation used to document its own non-enforcement in the
 * sentence that stated it: "`npx qfai validate` polices that surface but
 * nothing else asks for an entry, so an unwritten one is simply lost." That was
 * accurate — every worklog rule inspected an entry that already existed — and
 * `blocker` / `handoff` are exactly the conditions where the run stops, so the
 * stage that owed the entry is the stage that stopped and nobody is left to
 * notice the omission.
 *
 * `QFAI-TDDLIST-015` closes the half of it that is observable from
 * the artifacts: a `Status=blocked` ledger row with no steering entry naming
 * the spec. These tests pin the skill's text to that detector, and pin the rest
 * of the trigger table as explicitly advisory rather than silently unchecked.
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

/** Collapse soft wraps so assertions pin wording, not the wrap column. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe.each(TREES)("%s", (tree) => {
  it("no longer says an unwritten entry is simply lost in every case", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).not.toContain(
      "`npx qfai validate` polices that surface but nothing else asks for an entry",
    );
  });

  it("names the detector that sees a stop with no entry", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("QFAI-TDDLIST-015");
    expect(skill).toContain("`kind: blocker` / `kind: handoff`");
  });

  it("says plainly that the remaining triggers are advisory", async () => {
    // The old wording read as a constraint and then withdrew it. Stating the
    // advisory half is a different instruction to a reader than documenting a
    // hole.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "**The other triggers are advisory — nothing detects those omissions**",
    );
  });

  it("restates the obligation on the transition that stops the row", async () => {
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("Also write the `.qfai/steering/<id>.md` work-log entry for the stop");
    expect(ledger).toContain("QFAI-TDDLIST-015");
  });

  it("names the work-log entry as the remedy, not a deadline", async () => {
    // Both files have to say what to write and where, because a project meets
    // this on stops recorded before the check existed and works through them.
    const skill = flat(await read(tree, SKILL));
    const ledger = flat(await read(tree, LEDGER));

    expect(skill).not.toContain(
      "reports `QFAI-TDDLIST-015` as an `error`, so this stage's completion command fails",
    );
    expect(ledger).not.toContain("`QFAI-TDDLIST-015` errors while no");
    expect(skill).toContain("a warning inside its migration window");
    expect(ledger).toContain("a warning inside its migration window");
  });

  it("closes the stop entry on the transition that resumes the row", async () => {
    // The detector is satisfied by any OPEN entry naming the spec, so an entry
    // left open after its blocker cleared outlives the stop it described: the
    // next stop of that spec is accounted for by a record of a different one,
    // and a forgotten work-log entry is never reported again. The obligation to
    // write the entry was stated on `todo -> blocked`; the obligation to close
    // it belongs on the edge back.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("**Close the entry that accounted for the stop**");
    expect(ledger).toContain("set its `status:` to `archived` in the same edit that moves the row");
    // And it does not over-reach into entries that still account for something.
    expect(ledger).toContain("An entry that still accounts for something else stays open");
  });
});
