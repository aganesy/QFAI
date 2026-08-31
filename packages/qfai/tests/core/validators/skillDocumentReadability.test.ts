/**
 * A skill document that cannot be read must not vanish from the report.
 *
 * The reachability walk reads every `.md` / `.yml` under `skillsDir`. If a read
 * fails — permissions, a broken mount, an I/O error — dropping the file would
 * remove it from the graph entirely: it cites nothing, is scanned for nothing,
 * and no other validator opens it, so an unusable reference would ship in
 * silence. The failure is reported as its own issue instead.
 */

import type * as FsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../../../src/core/sunset.js";
import { validateAssistantAssets } from "../../../src/core/validators/assistantAssets.js";
import { resolveToolVersion } from "../../../src/core/version.js";

const UNREADABLE_BASENAME = "unreadable.md";
const READ_FAILURE_CODE = "QFAI-SKILLS-014";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof FsPromises>("node:fs/promises");
  return {
    ...actual,
    default: actual,
    readFile: (...args: Parameters<typeof actual.readFile>) =>
      typeof args[0] === "string" && path.basename(args[0]) === "unreadable.md"
        ? Promise.reject(new Error("EACCES: permission denied, open 'unreadable.md'"))
        : actual.readFile(...args),
  };
});

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
      `Follow \`references/${UNREADABLE_BASENAME}\`.`,
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, UNREADABLE_BASENAME), "# Unreadable\n", "utf-8");
  return referencesDir;
}

describe("skill document readability", { timeout: 30000 }, () => {
  it("reports the read failure instead of dropping the document", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-document-readability-"));
    try {
      const referencesDir = await writeSkillFixture(root);
      const { config } = await loadConfig(root);
      const issues = await validateAssistantAssets(root, config);
      const readFailures = issues.filter((entry) => entry.code === READ_FAILURE_CODE);

      expect(readFailures).toHaveLength(1);
      expect(readFailures[0]?.file).toBe(path.join(referencesDir, UNREADABLE_BASENAME));
      // The severity comes from the code's promotion window (P7), not from a
      // literal beside the `issue(...)` call: nothing read these files before,
      // so an unreadable one is discovered by the upgrade rather than caused by
      // it. Asserting the computed value rather than the token of the day keeps
      // this pinned through the promotion instead of failing on the release
      // that performs it.
      expect(readFailures[0]?.severity).toBe(
        newRuleSeverity(
          await resolveToolVersion(),
          RULE_PROMOTIONS.skillDocumentUnreadable.promoteAt,
        ),
      );
      expect(readFailures[0]?.message).toContain("EACCES");
      // The remediation is on the finding, not only in the report catalog.
      expect(readFailures[0]?.suggested_action ?? "").not.toBe("");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
