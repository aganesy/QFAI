/**
 * What an adopter's agent loads because `qfai init` installed it stays within a budget.
 *
 * Measured on the shipped init tree, in code points. The section init owns in `AGENTS.md`, the
 * skill listing and the reminders reach the agent whether or not the task needs them, and each is
 * paid for again on every turn, so each has a ceiling here. A skill body is loaded only when the
 * skill is invoked; its ceiling is the doctor's, held in `aiReadableMarkdown.test.ts`.
 *
 * The figures themselves are pinned in `always-loaded-footprint.pins.json` beside this file, so
 * any change to this text shows up as a number in the diff even while it stays inside its ceiling.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  computeFootprint,
  DEFAULT_TREE,
  FREQUENCY,
  fsSource,
  measure,
  pinView,
  splitFrontmatter,
  TREE_PATHS,
} from "../../../../scripts/lib/always-loaded-footprint.mjs";
import { skillBodyCharacters } from "../../src/core/doctor/assetLineBudget.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const initTree = path.join(repoRoot, DEFAULT_TREE);
const PIN = path.join(here, "always-loaded-footprint.pins.json");

/** The ceilings, in code points unless the name says lines. */
const BUDGET = {
  managedSectionLines: 50,
  managedSectionChars: 5_000,
  briefFormChars: 200,
  firstPromptChars: 1_200,
  singleReminderChars: 512,
  perSessionChars: 4_000,
  skillListingChars: 3_000,
  skillListingPerSkillChars: 400,
} as const;

const footprint = computeFootprint(fsSource(initTree));

describe("the always-loaded footprint init installs stays within its budget", () => {
  // QFAI:EX-0003-0032-03
  it("keeps the AGENTS.md section init owns within its ceilings", () => {
    // QFAI:AC-0003-0032-02
    expect(footprint.agents.managed.chars).toBeGreaterThan(0);
    expect(footprint.agents.managed.lines).toBeLessThanOrEqual(BUDGET.managedSectionLines);
    expect(footprint.agents.managed.chars).toBeLessThanOrEqual(BUDGET.managedSectionChars);
  });

  // QFAI:EX-0003-0032-03
  it("runs every reminder from a hook and keeps each text, brief form and total in its ceiling", () => {
    // QFAI:AC-0003-0032-02
    const unwired = footprint.reminders.filter((reminder) => !reminder.wired);
    expect(
      unwired.map((reminder) => reminder.key),
      "a reminder no hook runs",
    ).toEqual([]);

    const over = footprint.reminders
      .filter((reminder) => reminder.chars > BUDGET.singleReminderChars)
      .map((reminder) => `${reminder.key}: ${reminder.chars}`);
    expect(over).toEqual([]);

    const briefs = footprint.reminders.filter((reminder) => reminder.briefChars !== undefined);
    expect(briefs.map((reminder) => reminder.key)).toContain("free-text-entry");
    expect(briefs.every((reminder) => reminder.frequency === FREQUENCY.brief)).toBe(true);
    const overBrief = briefs
      .filter((reminder) => (reminder.briefChars ?? 0) > BUDGET.briefFormChars)
      .map((reminder) => `${reminder.key}: ${reminder.briefChars}`);
    expect(overBrief).toEqual([]);

    // The reminders the first prompt of a session can carry, every conditional one firing.
    expect(footprint.reminderTotals.firstPrompt).toBeLessThanOrEqual(BUDGET.firstPromptChars);
    expect(footprint.reminderTotals.perSession).toBeLessThanOrEqual(BUDGET.perSessionChars);
  });

  // QFAI:EX-0003-0032-03
  it("keeps the listing of model-invocable skills within its ceilings", () => {
    // QFAI:AC-0003-0032-02
    const listed = footprint.skillListing.skills.map((skill) => skill.name);
    expect(listed).toContain("qfai-run");
    // A skill only the user can invoke is not listed to the model.
    expect(listed).not.toContain("qfai-grill");

    const over = footprint.skillListing.skills
      .filter((skill) => skill.chars > BUDGET.skillListingPerSkillChars)
      .map((skill) => `${skill.name}: ${skill.chars}`);
    expect(over).toEqual([]);
    expect(footprint.skillListing.total).toBeLessThanOrEqual(BUDGET.skillListingChars);
  });

  it("measures a skill body the way doctor does", async () => {
    for (const skill of footprint.skillBodies) {
      const text = await readFile(
        path.join(initTree, ...TREE_PATHS.skills.split("/"), skill.name, "SKILL.md"),
        "utf-8",
      );
      expect(skill.chars, skill.name).toBe(skillBodyCharacters(text));
    }
    // The shapes no shipped skill has: a byte order mark, an empty frontmatter, a lone carriage
    // return, CRLF, a frontmatter that never closes and one closed on the last line.
    for (const text of [
      "\uFEFF---\nname: x\n---\nabc",
      "\uFEFF---\r\nname: x\r\n---\r\nabc",
      "---\n---\nbody",
      "---\nname: x\n---\na\rb",
      "---\nname: x\nbody",
      "---\nname: x\n---",
      "plain",
    ]) {
      expect(measure(splitFrontmatter(text).body).chars, JSON.stringify(text)).toBe(
        skillBodyCharacters(text),
      );
    }
  });

  it("pins the figures, so a change to the always-loaded text shows up in the diff", async () => {
    const pinned: unknown = JSON.parse(await readFile(PIN, "utf-8"));
    expect(
      pinned,
      "the always-loaded footprint changed: run `pnpm footprint:pin` and commit " +
        "packages/qfai/tests/integration/always-loaded-footprint.pins.json",
    ).toEqual(pinView(footprint));
  });
});
