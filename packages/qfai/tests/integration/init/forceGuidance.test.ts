/**
 * Integration: a plain upgrade names `qfai init --force` for a shipped routing entry the project's
 * `agent-routing.yml` lacks, which `--force` adds, and never for a reviewer the project dropped,
 * which `--force` does not restore. This is the init side of FAULT-023.
 */
// QFAI:SPEC-0003:TC-0003-0086
import { describe, expect, it } from "vitest";

import {
  ABSENT_ROUTE,
  DROPPED_REVIEWER,
  ROUTING,
  conflictBlock,
  initQuietly,
  lockConflicts,
  withInstall,
} from "./upgradeStates.js";

describe("the --force guidance", () => {
  it("TC-0003-0086: --force named for an absent entry, not a dropped reviewer", async () => {
    await withInstall(["absent-route"], async (root) => {
      const { entries } = conflictBlock(await initQuietly(root));

      expect(entries).toEqual([
        `  .qfai/assistant/${ROUTING}: has no routing entry for ${ABSENT_ROUTE}, which qfai init --force adds (reviewer-missing)`,
      ]);
      expect(await lockConflicts(root)).toEqual([
        {
          path: ROUTING,
          trigger: "reviewer-missing",
          difference: `has no routing entry for ${ABSENT_ROUTE}, which qfai init --force adds`,
        },
      ]);
    });

    await withInstall(["dropped-reviewer"], async (root) => {
      const { entries } = conflictBlock(await initQuietly(root));
      const { skill, phase, agent } = DROPPED_REVIEWER;
      const difference = `${skill} phase ${phase} no longer blocks on ${agent}`;

      expect(entries).toEqual([`  .qfai/assistant/${ROUTING}: ${difference} (reviewer-missing)`]);
      expect(entries.join("\n")).not.toContain("--force");
      expect(await lockConflicts(root)).toEqual([
        { path: ROUTING, trigger: "reviewer-missing", difference },
      ]);
    });
  });
});
