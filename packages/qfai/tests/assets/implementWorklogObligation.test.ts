/**
 * The work-log obligation used to document its own non-enforcement in the
 * sentence that stated it: "`npx qfai validate` polices that surface but
 * nothing else asks for an entry, so an unwritten one is simply lost." That was
 * accurate — every worklog rule inspected an entry that already existed — and
 * `blocker` / `handoff` are exactly the conditions where the run stops, so the
 * stage that owed the entry is the stage that stopped and nobody is left to
 * notice the omission.
 *
 * `TDDLIST_BLOCKED_NO_WORKLOG` closes the half of it that is observable from
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
    expect(skill).toContain("TDDLIST_BLOCKED_NO_WORKLOG");
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
    expect(ledger).toContain("TDDLIST_BLOCKED_NO_WORKLOG");
  });

  it("does not claim the finding is an error before its promotion", async () => {
    // Both files said the finding is an `error` and that the completion command
    // fails until the entry exists. It is a new rule shipping behind a
    // promotion window (`RULE_PROMOTIONS`, P7) — it is a warning until the
    // pinned release — so as written they told the reader their build was
    // already failing on stops recorded before the check existed, and sent them
    // to backfill entries under a deadline nothing was enforcing.
    const skill = flat(await read(tree, SKILL));
    const ledger = flat(await read(tree, LEDGER));

    expect(skill).not.toContain(
      "reports `TDDLIST_BLOCKED_NO_WORKLOG` as an `error`, so this stage's completion command fails",
    );
    expect(ledger).not.toContain("`TDDLIST_BLOCKED_NO_WORKLOG` errors while no");
    expect(skill).toContain("a warning inside its migration window");
    expect(ledger).toContain("a warning inside its migration window");
  });
});
