/**
 * An unattended run may not end its turn while work is still owed.
 *
 * Under `--auto` a message with no tool call ends the turn, and the ended turn
 * stops the run. The Completion Contract says what a stage must deliver before
 * it is complete; it cannot catch a run that simply stopped short of it. The
 * baseline therefore names the endings that are not allowed, the two that are,
 * and points the `--auto` bullet every skill already follows at that section.
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

/** The body of one level-2 section, up to the next level-2 heading. */
const section = (doc: string, heading: string): string => {
  const start = doc.indexOf(`\n${heading}\n`);
  expect(start, `missing section ${heading}`).toBeGreaterThanOrEqual(0);
  const next = doc.indexOf("\n## ", start + heading.length + 1);
  return next === -1 ? doc.slice(start) : doc.slice(start, next);
};

describe("unattended runs: ending a turn", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the --auto bullet points at the section`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain(
        "report it as a blocker instead of asking or guessing. How such a run may end its turn: `#unattended-runs-ending-a-turn` below.",
      );
    });

    it(`${tree}: names why a text-only turn stops the run`, async () => {
      const body = flat(section(await read(tree, BASELINE), "## Unattended Runs: Ending a Turn"));

      expect(body).toContain(
        "A message with no tool call in it ends the turn, and an ended turn stops the run whether or not the work is done.",
      );
    });

    it(`${tree}: forbids the four endings while work is owed`, async () => {
      const body = flat(section(await read(tree, BASELINE), "## Unattended Runs: Ending a Turn"));

      expect(body).toContain("While work is still owed, a turn MUST NOT end with any of these:");
      expect(body).toContain("1. A summary that announces the next step and does not take it.");
      expect(body).toContain("2. An offer to carry on unless the user would prefer otherwise.");
      expect(body).toContain(
        "3. A list of decisions for the user when, by the agent's own account, none of them blocks the rest of the work.",
      );
      expect(body).toContain("4. A stop because the turn has run long or a milestone is done.");
    });

    it(`${tree}: allows only the two endings, as a stop report`, async () => {
      const body = flat(section(await read(tree, BASELINE), "## Unattended Runs: Ending a Turn"));

      expect(body).toContain("- nothing can move without the user");
      expect(body).toContain(
        "- the thing blocking the run is deliberately protected from the agent",
      );
      expect(body).toContain(
        "That ending is a stop report under `#gate-failure-autorepair-protocol`, not a completion claim.",
      );
    });

    it(`${tree}: keeps status notes with the next action, and bounds its own reach`, async () => {
      const body = flat(section(await read(tree, BASELINE), "## Unattended Runs: Ending a Turn"));

      expect(body).toContain("It goes in the same message as the next action.");
      expect(body).toContain(
        "This section does not relax the confirmation an irreversible action needs, and it does not apply where a person is there to answer.",
      );
    });
  }
});
