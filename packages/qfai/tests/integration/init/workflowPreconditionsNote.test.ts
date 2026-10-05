/**
 * Integration: init adds one line when a repository fact the shipped workflows rely on is not met,
 * and nothing otherwise.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initQuietly, withEmptyRepo } from "./upgradeStates.js";

function noteLines(output: string): string[] {
  return output.split("\n").filter((line) => line.startsWith("Shipped workflows:"));
}

describe("the shipped-workflow preconditions note", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  // QFAI:EX-0003-0011-21
  it("names how many facts are unmet and points at doctor", async () => {
    // QFAI:AC-0003-0011-09
    await withEmptyRepo(async (root) => {
      await writeFile(path.join(root, "pnpm-lock.yaml"), "", "utf-8");
      await writeFile(path.join(root, "package-lock.json"), "{}", "utf-8");

      const lines = noteLines(await initQuietly(root));

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("2");
      expect(lines[0]).toContain("qfai doctor");
    });
  });

  // QFAI:EX-0003-0011-21
  it("prints nothing when every fact is met", async () => {
    // QFAI:AC-0003-0011-09
    await withEmptyRepo(async (root) => {
      expect(noteLines(await initQuietly(root))).toEqual([]);
    });
  });
});
