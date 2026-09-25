/**
 * Integration: on a plain run `manifest/` is create-only, so a customized `agent-routing.yml` is
 * left byte-identical. This is the init side of FAULT-023.
 */
// QFAI:SPEC-0003:TC-0003-0085
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { ROUTING, assistantFile, initQuietly, withInstall } from "./upgradeStates.js";

describe("a plain run merges no manifest", () => {
  it("TC-0003-0085: Plain upgrade leaves a customized agent-routing.yml untouched", async () => {
    await withInstall(["absent-route"], async (root) => {
      const file = assistantFile(root, ROUTING);
      const before = await readFile(file);
      expect(before.toString("utf-8")).not.toContain("- skill: qfai-maintain");

      await initQuietly(root);

      expect(await readFile(file)).toEqual(before);
    });
  });
});
