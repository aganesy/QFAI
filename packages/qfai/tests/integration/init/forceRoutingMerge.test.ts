/**
 * Integration: `qfai init --force` adds the shipped routing entries a project's
 * `agent-routing.yml` lacks through the add-only merge, and leaves every entry the project
 * declares, their order and a reviewer the project dropped as they were.
 */
// QFAI:SPEC-0003:TC-0003-0087
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  ABSENT_ROUTE,
  DROPPED_REVIEWER,
  ROUTING,
  assistantFile,
  conflictBlock,
  initQuietly,
  withInstall,
} from "./upgradeStates.js";

/** The project's routing entries, in the order its manifest declares them. */
async function routingEntries(root: string): Promise<unknown[]> {
  const document: unknown = parseYaml(await readFile(assistantFile(root, ROUTING), "utf-8"));
  const routing =
    typeof document === "object" && document !== null && "routing" in document
      ? document.routing
      : undefined;
  if (!Array.isArray(routing)) throw new Error("the routing manifest has no routing list");
  return routing;
}

function skillOf(entry: unknown): unknown {
  return typeof entry === "object" && entry !== null && "skill" in entry ? entry.skill : undefined;
}

describe("--force merges the absent routing entries", () => {
  it("TC-0003-0087: --force adds the absent entry and keeps the project's own", async () => {
    await withInstall(["absent-route", "dropped-reviewer"], async (root) => {
      const before = await routingEntries(root);
      expect(before.map(skillOf)).not.toContain(ABSENT_ROUTE);

      await initQuietly(root, true);
      const after = await routingEntries(root);

      expect(after.map(skillOf)).toContain(ABSENT_ROUTE);
      expect(after.filter((entry) => skillOf(entry) !== ABSENT_ROUTE)).toEqual(before);

      const { entries } = conflictBlock(await initQuietly(root));
      const { skill, phase, agent } = DROPPED_REVIEWER;
      expect(entries).toEqual([
        `  .qfai/assistant/${ROUTING}: ${skill} phase ${phase} no longer blocks on ${agent} (reviewer-missing)`,
      ]);
    });
  });
});
