/**
 * Integration: after the copy, init runs the correspondence check `start` enforces. In mode
 * `active` each conflicting file is named once, with its difference and trigger, in place of the
 * plain mode line, and the run still exits 0.
 */
// QFAI:SPEC-0003:TC-0003-0081
// QFAI:SPEC-0003:TC-0003-0082
// QFAI:SPEC-0003:TC-0003-0083
// QFAI:SPEC-0003:TC-0003-0084
import { afterEach, describe, expect, it } from "vitest";

import {
  DROPPED_REVIEWER,
  EDITED_PLAN,
  ROUTING,
  conflictBlock,
  initQuietly,
  lockConflicts,
  modeLines,
  setWorkflowMode,
  withInstall,
} from "./upgradeStates.js";

const CLOSING =
  "Workflow mode: active is configured and will not start until these conflicts are resolved";
const { skill, phase, agent } = DROPPED_REVIEWER;

// The two installs of TC-0003-0081, one per trigger, with the one line each must report.
const TRIGGERS: [string, string][] = [
  [
    "edited-plan",
    `  .qfai/assistant/${EDITED_PLAN}: differs from the shipped plan (contract-undeclared)`,
  ],
  [
    "dropped-reviewer",
    `  .qfai/assistant/${ROUTING}: ${skill} phase ${phase} no longer blocks on ${agent} (reviewer-missing)`,
  ],
];

describe("the conflict report", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("TC-0003-0081: Active mode: an edited plan and a dropped reviewer reported", async () => {
    for (const [overlay, line] of TRIGGERS) {
      await withInstall([overlay], async (root) => {
        const output = await initQuietly(root);

        expect(conflictBlock(output), overlay).toEqual({ entries: [line], closing: CLOSING });
        expect(modeLines(output), overlay).toEqual([CLOSING]);
      });
    }
  });

  it("TC-0003-0082: Shadow and off modes print the plain mode line", async () => {
    for (const [overlay] of TRIGGERS) {
      for (const mode of ["shadow", "off"]) {
        await withInstall([overlay], async (root) => {
          await setWorkflowMode(root, mode);
          const output = await initQuietly(root);

          expect(modeLines(output), `${overlay} ${mode}`).toEqual([`Workflow mode: ${mode}`]);
          expect(conflictBlock(output), `${overlay} ${mode}`).toEqual({ entries: [] });
        });
      }
    }
  });

  it("TC-0003-0083: Exit 0 on every conflicted upgrade", async () => {
    // One install per state: an overlay, or an invalid `workflow.mode` on an unmodified install.
    const states: [string[], string | undefined][] = [
      [["edited-plan"], undefined],
      [["absent-route"], undefined],
      [["dropped-reviewer"], undefined],
      [[], "bogus"],
    ];
    for (const [overlays, mode] of states) {
      const name = mode ?? overlays.join(",");
      await withInstall(overlays, async (root) => {
        if (mode !== undefined) await setWorkflowMode(root, mode);
        await initQuietly(root);

        expect(process.exitCode ?? 0, name).toBe(0);
      });
    }
  });

  it("TC-0003-0084: A benign manifest customization is not a conflict", async () => {
    await withInstall(["benign-manifest"], async (root) => {
      const output = await initQuietly(root);

      expect(conflictBlock(output)).toEqual({ entries: [] });
      expect(modeLines(output)).toEqual(["Workflow mode: active"]);
      expect(await lockConflicts(root)).toEqual([]);
    });
  });
});
