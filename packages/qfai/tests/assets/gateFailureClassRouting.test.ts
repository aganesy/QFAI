/**
 * Every gate-failure class the agent is told to use has a next action (#381).
 *
 * The Autorepair Protocol named five classes, disposed of two, and closed the
 * stop list against the rest. `upstream spec/contract` — the one class the
 * constitution absolutely forbids repairing — appeared in neither the "fix
 * autonomously" clause nor the stop list, and the protocol never referenced
 * `drift-protocol.md`, where the answer lives. With no branch for the bucket it
 * had just been told to use, an agent under a green-gate obligation reached for
 * the nearest available predicate — "the fix is local and non-destructive" —
 * and repaired the upstream artifact.
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

/** The five classes the protocol tells the agent to sort findings into. */
const CLASSES = [
  "skill-owned artifact",
  "upstream spec/contract",
  "code/test defect",
  "environment/tooling",
  "user decision",
];

describe("Gate Failure Autorepair Protocol routes every class it names", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the classification list is unchanged`, async () => {
      // If a class is added or renamed, the routing assertions below must be
      // extended with it — this is the tripwire for that.
      const baseline = flat(await read(tree, BASELINE));
      for (const cls of CLASSES) {
        expect(baseline).toContain(cls);
      }
    });

    it(`${tree}: upstream spec/contract findings route to the drift protocol`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**upstream spec/contract findings: never repair.**");
      expect(baseline).toContain(".qfai/assistant/constitution/drift-protocol.md");
      expect(baseline).toContain("Change Request + owner-skill rerun");
    });

    it(`${tree}: "local and non-destructive" cannot be borrowed for upstream`, async () => {
      // This is the predicate the observed agent actually applied. Naming it
      // and denying it is the fix; a bare prohibition leaves the reasoning
      // path open.
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain(
        "**even when the fix looks local and non-destructive, and even when it is one token and obviously correct**",
      );
      expect(baseline).toContain(
        "it is not a test that upstream artifacts can pass. Ownership, not size, decides",
      );
    });

    it(`${tree}: the stop list is closed over the classification`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**any upstream spec/contract finding**");
      expect(baseline).toContain(
        "the stop list is closed over the classification above, so every class the agent is told to use has a defined next action",
      );
    });

    it(`${tree}: environment/tooling and user decision have dispositions too`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain(
        "environment/tooling findings: repair the environment when it is yours to repair",
      );
      expect(baseline).toContain(
        "Stop for anything needing credentials, network access you do not have, or a change to CI configuration or the host machine",
      );
      expect(baseline).toContain("user decision findings: never decide by default");
      expect(baseline).toContain(
        "a decision taken silently to keep a gate green is the same failure as repairing upstream, one layer up",
      );
    });

    it(`${tree}: the STOP report carries the work counts`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      // Restating the rule does not change the incentive: the agent needs a
      // report shape in which STOP reads as work done, not as surrender.
      expect(baseline).toContain(
        "**the work counts — how many items are complete, how many are blocked, and by which finding**",
      );
      expect(baseline).toContain("Restating the ownership rule does not change the incentive");
      expect(baseline).toContain("Blocked is a status, not a verdict on the run.");
    });

    it(`${tree}: the autorepair permission still names only its two classes`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      // The widening this issue guards against would look like adding a class
      // to the autonomous-fix bullet rather than to the stop list.
      expect(baseline).toContain(
        "fix skill-owned artifacts and code/test defects autonomously when the fix is local and non-destructive",
      );
    });
  }
});
