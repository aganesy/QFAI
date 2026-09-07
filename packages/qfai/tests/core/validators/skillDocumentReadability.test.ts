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
const UNREADABLE_SKILL_DIR = "unreadable-skill";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof FsPromises>("node:fs/promises");
  return {
    ...actual,
    default: actual,
    readFile: (...args: Parameters<typeof actual.readFile>) => {
      // Literals, not the consts below: `vi.mock` is hoisted above them.
      const target = typeof args[0] === "string" ? args[0] : "";
      const denied =
        path.basename(target) === "unreadable.md" ||
        target.split(path.sep).includes("unreadable-skill");
      return denied
        ? Promise.reject(new Error(`EACCES: permission denied, open '${path.basename(target)}'`))
        : actual.readFile(...args);
    },
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

/** A skill whose own `SKILL.md` cannot be read. */
async function writeUnreadableSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", UNREADABLE_SKILL_DIR);
  await mkdir(skillDir, { recursive: true });
  const skillFile = path.join(skillDir, "SKILL.md");
  await writeFile(skillFile, "# unreadable-skill\n\n[DRIFT-PROTOCOL:MANDATORY]\n", "utf-8");
  return skillFile;
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

  it("reports an unreadable SKILL.md instead of rejecting the whole validator", async () => {
    // `SKILL.md` was read twice: once unguarded by the marker / Reviewer-Gate
    // loop, and once by the reference graph. The unguarded read ran first, so
    // an unreadable `SKILL.md` rejected `validateAssistantAssets` outright and
    // `QFAI-SKILLS-014` never got the chance to report the one file it most
    // needed to. The whole run died with it — every other finding included.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skillmd-readability-"));
    try {
      const skillFile = await writeUnreadableSkillFixture(root);
      const { config } = await loadConfig(root);

      // Resolving at all is half the assertion.
      const issues = await validateAssistantAssets(root, config);
      const readFailures = issues.filter((entry) => entry.code === READ_FAILURE_CODE);

      // Exactly one: the file is read once now, so it is reported once.
      expect(readFailures.map((entry) => entry.file)).toEqual([skillFile]);
      expect(readFailures[0]?.message).toContain("EACCES");
      // And the checks that need its bytes stay silent rather than guessing.
      // `SKILL.md` carries the marker, but no reader could have seen it.
      expect(issues.filter((entry) => entry.file === skillFile).map((entry) => entry.code)).toEqual(
        [READ_FAILURE_CODE],
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
