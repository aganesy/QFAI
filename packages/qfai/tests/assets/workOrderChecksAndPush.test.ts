/**
 * A delegated agent left to choose its own checks ran the whole suite locally
 * and stalled, and agents told in prose not to push pushed and opened
 * duplicate pull requests. The work order carries both answers as fields, and
 * the steering rule checks the first actions against them.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const WORK_ORDER = path.join("assistant", "rule", "references", "worker-edit-boundary.md");
const STEERING = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  ".agents",
  "rules",
  "delegation-steering.md",
);

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("work order names local checks and push permission", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the template carries Local checks and Push lines`, async () => {
      const text = await readFile(path.join(repoRoot, tree, WORK_ORDER), "utf-8");

      expect(text).toContain("Local checks: <the commands the worker runs itself, or none>");
      expect(text).toContain("lists at least the selector it turns RED then GREEN");
      expect(text).toContain("every other check runs in CI after the session agent pushes");
      expect(text).toContain("Push: no | <what the worker may push");
      expect(text).toContain("no, or no Push line: it neither pushes nor opens a pull request");
    });
  }

  it("delegation-steering checks the first actions against both lines", async () => {
    const text = flat(await readFile(STEERING, "utf-8"));

    expect(text).toContain("Hold them against the work order's `Local checks` and `Push` lines");
    expect(text).toContain("a push or pull request it did not allow, is off course");
  });
});
