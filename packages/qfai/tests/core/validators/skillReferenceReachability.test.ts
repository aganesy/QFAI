/**
 * A reference nothing names is never read.
 *
 * Skills load by progressive disclosure, so `references/*.md` reaches an agent
 * only through a chain of citations rooted at `SKILL.md`. Five files under
 * `skills/qfai-discussion/references/` shipped with no inbound citation at all
 * — `qfai init` installed them into every consuming repository and no run
 * could open them, because the edge that would have led there was never
 * written. This is the inverse of the dangling-citation check: there the
 * citation exists and the target is missing, here the target exists and the
 * citation does not.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import { validateAssistantAssets } from "../../../src/core/validators/assistantAssets.js";
import type { Issue } from "../../../src/core/types.js";

const REACHABILITY_CODE = "QFAI-SKILLS-013";
const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its generated root mirror. */
const SHIPPED_ROOTS = [path.join(repoRoot, "packages/qfai/assets/init"), repoRoot];

async function reachabilityIssues(root: string): Promise<Issue[]> {
  const { config } = await loadConfig(root);
  const issues = await validateAssistantAssets(root, config);
  return issues.filter((entry) => entry.code === REACHABILITY_CODE);
}

async function writeSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "demo-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# demo-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "Follow `references/cited.md`.",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(referencesDir, "cited.md"),
    ["# Cited", "", "Details live in `two-hop.md`.", ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "two-hop.md"), "# Two hop\n", "utf-8");
  await writeFile(path.join(referencesDir, "orphan.md"), "# Orphan\n", "utf-8");
  return referencesDir;
}

describe("skill reference reachability", { timeout: 30000 }, () => {
  it("reports only the reference no reachable document names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-reachability-"));
    try {
      const referencesDir = await writeSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.file).toBe(path.join(referencesDir, "orphan.md"));
      // Soft rule text, so the finding must not stop a run that gates on error.
      expect(issues[0]?.severity).toBe("warning");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps every shipped reference reachable from a SKILL.md", async () => {
    for (const root of SHIPPED_ROOTS) {
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => path.relative(root, entry.file ?? ""))).toEqual([]);
    }
  });
});
