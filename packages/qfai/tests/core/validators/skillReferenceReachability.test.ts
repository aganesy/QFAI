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
import { RULE_PROMOTIONS, newRuleSeverity } from "../../../src/core/sunset.js";
import { validateAssistantAssets } from "../../../src/core/validators/assistantAssets.js";
import type { Issue } from "../../../src/core/types.js";
import { resolveToolVersion } from "../../../src/core/version.js";

const REACHABILITY_CODE = "QFAI-SKILLS-013";
const READ_FAILURE_CODE = "QFAI-SKILLS-014";
const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its generated root mirror. */
const SHIPPED_ROOTS = [path.join(repoRoot, "packages/qfai/assets/init"), repoRoot];

async function reachabilityIssues(root: string): Promise<Issue[]> {
  const { config } = await loadConfig(root);
  const issues = await validateAssistantAssets(root, config);
  return issues.filter((entry) => entry.code === REACHABILITY_CODE);
}

/**
 * Both findings the reference graph can produce about a shipped file.
 *
 * The shipped-tree case below is the regression net for the whole graph, and
 * filtering it to `QFAI-SKILLS-013` alone left half of that net missing: a
 * shipped document that became unreadable raises `QFAI-SKILLS-014`, and the
 * assertion would still have seen an empty list and passed. An unreadable
 * shipped reference is at least as bad as an uncited one — it is the state the
 * graph cannot even judge.
 */
async function skillGraphIssues(root: string): Promise<Issue[]> {
  const { config } = await loadConfig(root);
  const issues = await validateAssistantAssets(root, config);
  return issues.filter(
    (entry) => entry.code === REACHABILITY_CODE || entry.code === READ_FAILURE_CODE,
  );
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

/**
 * A second skill owning a file whose basename the first skill also cites.
 *
 * `demo-skill/SKILL.md` says `references/cited.md`, meaning its own; the
 * namesake here has no inbound citation from any `other-skill` document and
 * must still be reported.
 */
async function writeNamesakeSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "other-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    ["# other-skill", "", "[DRIFT-PROTOCOL:MANDATORY]", "", "Nothing else to read.", ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "cited.md"), "# Namesake\n", "utf-8");
  return referencesDir;
}

/**
 * A skill whose reference file names are not lowercase ASCII.
 *
 * `collectFiles` compares only the lower-cased extension and puts no
 * constraint on the stem, so these are documents like any other; the citation
 * parser has to read them the same way the collector does.
 */
async function writeCharsetSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "charset-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# charset-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "設計は `references/設計.md`、手順は `references/Guide.MD` を読む。",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "設計.md"), "# 設計\n", "utf-8");
  await writeFile(path.join(referencesDir, "Guide.MD"), "# Guide\n", "utf-8");
  await writeFile(path.join(referencesDir, "orphan.md"), "# Orphan\n", "utf-8");
  return referencesDir;
}

/**
 * A skill whose reference names carry a space.
 *
 * No path-ish token can cross the space, so these are found by their own path
 * — in prose as written, and in a Markdown link in its percent-encoded form.
 */
async function writeSpacedNameSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "spaced-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# spaced-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "Read `references/My Guide.md` first.",
      "",
      "Then [the appendix](references/My%20Appendix.md).",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "My Guide.md"), "# My Guide\n", "utf-8");
  await writeFile(path.join(referencesDir, "My Appendix.md"), "# My Appendix\n", "utf-8");
  await writeFile(path.join(referencesDir, "My Orphan.md"), "# My Orphan\n", "utf-8");
  return referencesDir;
}

/**
 * A skill citing its non-ASCII reference through a percent-encoded link.
 *
 * `[設計](references/%E8%A8%AD%E8%A8%88.md)` is how a Markdown link spells the
 * very path the previous fixture writes literally, so it has to reach the same
 * file.
 */
async function writePercentEncodedSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "encoded-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# encoded-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "まず [設計](references/%E8%A8%AD%E8%A8%88.md) を読む。",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "設計.md"), "# 設計\n", "utf-8");
  await writeFile(path.join(referencesDir, "orphan.md"), "# Orphan\n", "utf-8");
  return referencesDir;
}

/**
 * A reference whose name carries a URI-reserved character.
 *
 * `#` has to be written `%23` in a link target, and the surrounding brackets
 * keep any path-ish token from spanning the name — so the file is found only
 * if the spelling searched for is the one a link actually carries.
 */
async function writeReservedCharSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "reserved-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# reserved-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "Read [the guide](references/Guide(1)%232.md) first.",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "Guide(1)#2.md"), "# Guide\n", "utf-8");
  await writeFile(path.join(referencesDir, "Orphan(1)#2.md"), "# Orphan\n", "utf-8");
  return referencesDir;
}

/**
 * A skill whose only citation of a reference sits in a generator template.
 *
 * A run opens `<skillsDir>/<skill>/SKILL.md` and nothing else by that name, so
 * a copy under `templates/` cannot make a reference readable.
 */
async function writeTemplateRootSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "template-skill");
  const referencesDir = path.join(skillDir, "references");
  const templateDir = path.join(skillDir, "templates", "scaffold");
  await mkdir(referencesDir, { recursive: true });
  await mkdir(templateDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    ["# template-skill", "", "[DRIFT-PROTOCOL:MANDATORY]", "", "Nothing else to read.", ""].join(
      "\n",
    ),
    "utf-8",
  );
  await writeFile(
    path.join(templateDir, "SKILL.md"),
    ["# scaffold", "", "Read `references/template-only.md`.", ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "template-only.md"), "# Template only\n", "utf-8");
  return referencesDir;
}

/** A skill that spells its citation with the native separator of Windows. */
async function writeWindowsPathSkillFixture(root: string): Promise<string> {
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "windows-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# windows-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "Read `references\\guide.md` before starting.",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "guide.md"), "# Guide\n", "utf-8");
  await writeFile(path.join(referencesDir, "orphan.md"), "# Orphan\n", "utf-8");
  return referencesDir;
}

/**
 * A `paths.skillsDir` that is absolute and outside the project.
 *
 * A document there names its neighbours by full path, which is the only
 * spelling that reaches them — nothing under the project root does.
 */
async function writeExternalSkillsDirFixture(root: string, skillsDir: string): Promise<string> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    ["paths:", `  skillsDir: ${skillsDir}`, ""].join("\n"),
    "utf-8",
  );
  const skillDir = path.join(skillsDir, "demo-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# demo-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      `Read \`${path.join(referencesDir, "guide.md")}\` before starting.`,
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "guide.md"), "# Guide\n", "utf-8");
  await writeFile(path.join(referencesDir, "orphan.md"), "# Orphan\n", "utf-8");
  return referencesDir;
}

/** A project that moved `paths.skillsDir` away from the default location. */
async function writeRelocatedSkillFixture(root: string): Promise<string> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    ["paths:", "  skillsDir: .custom/skills", ""].join("\n"),
    "utf-8",
  );
  const skillDir = path.join(root, ".custom", "skills", "demo-skill");
  const referencesDir = path.join(skillDir, "references");
  await mkdir(referencesDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "# demo-skill",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "Read `.custom/skills/demo-skill/references/guide.md` before starting.",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(referencesDir, "guide.md"), "# Guide\n", "utf-8");
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
      // Soft rule text, so the finding must not stop a run that gates on error
      // — and the severity that says so is the code's promotion window (P7),
      // read here rather than written as the literal of the day so the pin
      // survives the release that promotes it.
      expect(issues[0]?.severity).toBe(
        newRuleSeverity(
          await resolveToolVersion(),
          RULE_PROMOTIONS.skillReferenceUnreachable.promoteAt,
        ),
      );
      expect(issues[0]?.suggested_action ?? "").not.toBe("");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let one skill's citation reach another skill's namesake file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-namesake-"));
    try {
      const referencesDir = await writeSkillFixture(root);
      const namesakeDir = await writeNamesakeSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([
        path.join(referencesDir, "orphan.md"),
        path.join(namesakeDir, "cited.md"),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves citations of non-ASCII names and upper-case extensions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-charset-"));
    try {
      const referencesDir = await writeCharsetSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "orphan.md")]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves citations of reference names that contain a space", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-spaced-"));
    try {
      const referencesDir = await writeSpacedNameSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "My Orphan.md")]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves a root-relative citation against the configured skillsDir", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-relocated-"));
    try {
      const referencesDir = await writeRelocatedSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "orphan.md")]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves a percent-encoded link target back to its Unicode file name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-encoded-"));
    try {
      const referencesDir = await writePercentEncodedSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "orphan.md")]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves a link target whose file name carries a URI-reserved character", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-reserved-"));
    try {
      const referencesDir = await writeReservedCharSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([
        path.join(referencesDir, "Orphan(1)#2.md"),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not root the walk at a SKILL.md no skill run opens", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-template-root-"));
    try {
      const referencesDir = await writeTemplateRootSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([
        path.join(referencesDir, "template-only.md"),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves a citation written with a backslash separator", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-windows-"));
    try {
      const referencesDir = await writeWindowsPathSkillFixture(root);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "orphan.md")]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves an absolute citation inside a skillsDir outside the project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-external-root-"));
    const skillsDir = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-external-skills-"));
    try {
      const referencesDir = await writeExternalSkillsDirFixture(root, skillsDir);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "orphan.md")]);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(skillsDir, { recursive: true, force: true });
    }
  });

  /**
   * The character that stops the token scan is in the machine's path, not the
   * project's.
   *
   * Written with an explicit `~` so a Linux-only matrix runs it: on Windows it
   * arrives for free, because `os.tmpdir()` is the 8.3 short form
   * (`C:\Users\RUNNER~1\AppData\Local\Temp`) and every sandbox in this file
   * already sits under it — which is why the case above fails there and cannot
   * fail in CI. The reference's own project-relative spelling is clean, so
   * nothing about the *document* says it needs the by-path pass.
   */
  it("resolves an absolute citation whose machine prefix no path token can span", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "qfai-reference-prefix-"));
    const enclosing = path.join(base, "skills~home");
    await mkdir(enclosing, { recursive: true });
    try {
      const root = await mkdtemp(path.join(enclosing, "root-"));
      const skillsDir = await mkdtemp(path.join(enclosing, "skills-"));
      const referencesDir = await writeExternalSkillsDirFixture(root, skillsDir);
      const issues = await reachabilityIssues(root);

      expect(issues.map((entry) => entry.file)).toEqual([path.join(referencesDir, "orphan.md")]);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("keeps every shipped reference reachable from a SKILL.md, and readable", async () => {
    for (const root of SHIPPED_ROOTS) {
      const issues = await skillGraphIssues(root);

      // Code and path together: an unreachable file and an unreadable one are
      // different repairs, and a bare path list said which file but not which.
      expect(
        issues.map((entry) => `${entry.code} ${path.relative(root, entry.file ?? "")}`),
      ).toEqual([]);
    }
  });
});
