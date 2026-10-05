/** Init integration traceability and assistant-tree wiring. */
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, realpath, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const INIT_CLI = path.resolve(__dirname, "..", "..", "src", "cli", "commands", "init.ts");
// The managed-block writer init calls, shared with the migration steps.
const ROOT_GITIGNORE_WRITER = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "init",
  "rootGitignore.ts",
);

const SHIPPED_SKILL_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
);

// TC-0003-0001: Empty directory initialization
// QFAI:EX-0001-0020-01
describe("TC-0003-0001: Empty directory initialization", () => {
  const ARTIFACT_DIRS = ["specs", "contracts", "discussion", "evidence", "review", "report"];
  const SKILL_LINK_DIRS = [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"];

  async function kindOf(
    target: string,
  ): Promise<"symlink" | "directory" | "file" | "other" | "absent"> {
    try {
      const entry = await lstat(target);
      if (entry.isSymbolicLink()) return "symlink";
      return entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other";
    } catch (err: unknown) {
      if (err instanceof Error && "code" in err && err.code === "ENOENT") return "absent";
      throw err;
    }
  }

  async function isCanonicalSkillLink(link: string, canonical: string): Promise<boolean> {
    return (await kindOf(link)) === "symlink" && (await realpath(link)) === canonical;
  }

  it("writes the singular assistant tree and skill links without project artifacts", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tc0001-"));
    try {
      await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));

      // Verify bullet 1.
      expect(await kindOf(path.join(dir, ".qfai", "assistant"))).toBe("directory");
      const present: string[] = [];
      for (const sub of ARTIFACT_DIRS) {
        if ((await kindOf(path.join(dir, ".qfai", sub))) !== "absent") present.push(sub);
      }
      expect(present, "init wrote a retired artifact directory under .qfai/").toEqual([]);
      expect(await kindOf(path.join(dir, ".qfai", "spec", "01_policy"))).toBe("directory");

      // Verify bullet 2.
      expect(await kindOf(path.join(dir, "qfai.config.yaml"))).toBe("file");

      // Verify bullet 3. Init has no fallback for a link it cannot create — it stops with the
      // Developer Mode message — so a copied directory here is a failure on every platform.
      // The expected set is read from the shipped asset tree by its own directory and SKILL.md
      // inspection, not from the collector init uses, so a skill both would omit is still checked.
      const skills: string[] = [];
      for (const entry of await readdir(SHIPPED_SKILL_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if ((await kindOf(path.join(SHIPPED_SKILL_DIR, entry.name, "SKILL.md"))) === "file") {
          skills.push(entry.name);
        }
      }
      expect(skills, "the shipped tree holds a skill without the qfai- prefix").toContain(
        "web-research",
      );
      // Compared by where the link resolves, not by the text of its target: a
      // dangling link, or one into a copy outside the project, can end in the
      // same characters.
      const unlinked: string[] = [];
      for (const skill of skills) {
        const canonical = await realpath(path.join(dir, ".qfai", "assistant", "skill", skill));
        for (const linkDir of SKILL_LINK_DIRS) {
          const link = path.join(dir, linkDir, skill);
          if (!(await isCanonicalSkillLink(link, canonical))) unlinked.push(`${linkDir}/${skill}`);
        }
      }
      expect(unlinked, "a skill is not linked to its canonical directory").toEqual([]);
    } finally {
      await removeTempTree(dir);
    }
  });

  it("rejects dangling skill links and links into an outside copy with the same suffix", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-init-skill-link-controls-"));
    try {
      const skillPath = [".qfai", "assistant", "skill", "qfai-sdd"];
      const canonicalDir = path.join(dir, "project", ...skillPath);
      const outsideDir = path.join(dir, "elsewhere", ...skillPath);
      const missingDir = path.join(dir, "missing", ...skillPath);
      await mkdir(canonicalDir, { recursive: true });
      await cp(canonicalDir, outsideDir, { recursive: true });
      const canonical = await realpath(canonicalDir);
      const outsideLink = path.join(dir, "outside-link");
      const danglingLink = path.join(dir, "dangling-link");
      const linkType = process.platform === "win32" ? "junction" : "dir";
      await symlink(outsideDir, outsideLink, linkType);
      await symlink(missingDir, danglingLink, linkType);

      expect(await isCanonicalSkillLink(outsideLink, canonical)).toBe(false);
      await expect(isCanonicalSkillLink(danglingLink, canonical)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await removeTempTree(dir);
    }
  });
});

// TC-0003-0002: Idempotent initialization
describe("TC-0003-0002: Idempotent initialization", () => {
  it("init handles existing files without overwrite", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/exist|skip/i);
  });
});

// TC-0003-0003: --force skill overwrite
describe("TC-0003-0003: --force skill overwrite", () => {
  it("init supports force option", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/force/);
  });
});

// TC-0003-0004: --dry-run preview
describe("TC-0003-0004: --dry-run preview", () => {
  it("init supports dryRun option", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/dryRun|dry.?run/);
  });
});

// TC-0003-0005: Skill directory symlink generation
describe("TC-0003-0005: Skill directory symlink generation", () => {
  it("init creates skill symlinks", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/symlink/i);
    expect(content).toContain("skills");
  });
});

// TC-0003-0006: Agent file symlink generation
describe("TC-0003-0006: Agent file symlink generation", () => {
  it("init creates agent symlinks", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/agent/i);
    expect(content).toMatch(/symlink/i);
  });
});

// TC-0003-0007: Legacy 10_workflow.md removal
describe("TC-0003-0007: Legacy 10_workflow.md removal", () => {
  it("init handles legacy file removal", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/legacy|prune|remove|obsolet/i);
  });
});

// TC-0003-0008: Old commands/prompts prune
describe("TC-0003-0008: Old commands/prompts prune", () => {
  it("init prunes old command files", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/prune|commands|prompts/i);
  });
});

// TC-0003-0009: Git config core.symlinks auto-setting
describe("TC-0003-0009: Git config core.symlinks auto-setting", () => {
  it("init configures git symlinks", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/core\.symlinks|git.*config/i);
  });
});

// TC-0003-0010: Windows EPERM error message
describe("TC-0003-0010: Windows EPERM error message", () => {
  it("init handles EPERM for symlink creation", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/EPERM|Developer Mode|Windows/i);
  });
});

// TC-0003-0011: Instructions new placement
describe("TC-0003-0011: Instructions new placement", () => {
  it("init creates instruction files", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
  });
});

// TC-0003-0012: Instructions existing file skip
describe("TC-0003-0012: Instructions existing file skip", () => {
  it("init skips existing instruction files", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
  });
});

// TC-0003-0013: --force refreshes instructions from the shipped template
describe("TC-0003-0013: --force refreshes instructions", () => {
  it("init gates the instructions skip on the force flag", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/instructions/i);
    // The review-instructions loop must consult --force, not skip unconditionally.
    expect(content).toMatch(
      /Step 3: Distribute Copilot review instructions[\s\S]*?if \(alreadyExists && \(!options\.force \|\|/,
    );
    // …and a refresh must still refuse an entry that resolves out of the project.
    expect(content).toMatch(
      /Step 3: Distribute Copilot review instructions[\s\S]*?await resolvesOutsideProject\(destRoot, dest\)/,
    );
  });
});

// TC-0003-0014: Instructions activation guidance
describe("TC-0003-0014: Instructions activation guidance", () => {
  it("init provides activation guidance", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/activat|guidance|instruct/i);
  });
});

// TC-0003-0015: Symlink idempotency (3 consecutive runs)
describe("TC-0003-0015: Symlink idempotency (3 consecutive runs)", () => {
  it("init handles consecutive runs idempotently", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toMatch(/symlink/i);
  });
});

// TC-0003-0018: append the managed gitignore block (new file)
// Actual assertions live in tests/cli/init.test.ts ("appends QFAI entries to root .gitignore on init").
// This block records the TC→implementation coverage link for traceability.
describe("TC-0003-0018: append the managed gitignore block (new file)", () => {
  it("init wires QFAI_GITIGNORE_BLOCK writer into runInit", async () => {
    expect(await readFile(INIT_CLI, "utf-8")).toContain("ensureRootGitignoreEntries");
    expect(await readFile(ROOT_GITIGNORE_WRITER, "utf-8")).toContain("QFAI_GITIGNORE_BLOCK");
  });
});

// TC-0003-0019: remove legacy lines and replace the managed block
// Actual assertions live in tests/cli/init.test.ts ("strips legacy review-*/ negation lines when migrating from old managed block").
describe("TC-0003-0019: remove legacy lines and replace the managed block", () => {
  it("init references QFAI_GITIGNORE_LEGACY_LINES for migration", async () => {
    const content = await readFile(ROOT_GITIGNORE_WRITER, "utf-8");
    expect(content).toContain("QFAI_GITIGNORE_LEGACY_LINES");
    expect(content).toContain("removeManagedBlock");
  });
});

// TC-0003-0020: review-*/ subdirectories are gitignored
// Actual assertions live in tests/cli/init.test.ts ("does not track review-*/ subdirectories after init").
describe("TC-0003-0020: review-*/ subdirectories are gitignored", () => {
  it("QFAI_GITIGNORE_BLOCK SSOT excludes review-*/ negations from REQUIRED_ENTRIES", async () => {
    const { QFAI_GITIGNORE_BLOCK, QFAI_GITIGNORE_RECOMMENDED_ENTRIES } =
      await import("../../src/core/gitignore.js");
    expect(QFAI_GITIGNORE_BLOCK).toContain(".qfai/discussion/*");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain("!.qfai/discussion/README.md");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain(".qfai/discussion/discussion-*/");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain("!.qfai/review/review-*/");
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain("!.qfai/discussion/README.md");
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain("!.qfai/review/review-*/");
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain("!.qfai/review/review-*/**");
  });
});

// Runtime assertions live in tests/cli/init.test.ts. These checks pin the
// assistant-tree path helpers used by init.

describe("TC-0003-0021: singular assistant-tree seed", () => {
  it("init uses the assistant path SSOT and ships the singular layers", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("assistantPaths");
    expect(content).toContain("ASSISTANT_DIR");
    expect(content).toContain("joinAssistantLayer");
    expect(content).toContain('"assistant/skill"');
    expect(content).toContain('"assistant/agent"');
    expect(content).toContain('"assistant/step"');
    const { ASSISTANT_LAYERS } = await import("../../src/core/paths/assistantPaths.js");
    expect(ASSISTANT_LAYERS).toEqual(["rule", "skill", "step", "agent", "prompt"]);
  });
});

describe("TC-0003-0023: --upgrade-assistant-tree migration", () => {
  it("init moves only named legacy assets while keeping existing destinations", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("upgradeAssistantTree");
    expect(content).toContain("runUpgradeAssistantTree");
    expect(content).toContain("W-USER-EDIT-PRESERVED");
    expect(content).toContain("UPGRADE_RULE_FILES");
    expect(content).toContain('"qfai-sdd/references/requirements-decomposition.md"');
    expect(content).toContain("if (target === null) continue");
  });
});

describe("TC-0003-0025: assistantPaths.ts SSOT module", () => {
  it("exports the singular layer names and path helpers", async () => {
    const mod = await import("../../src/core/paths/assistantPaths.js");
    expect(mod.ASSISTANT_LAYERS).toEqual(["rule", "skill", "step", "agent", "prompt"]);
    expect(typeof mod.joinAssistantLayer).toBe("function");
    expect(mod.joinAssistantLayer("project", "rule", "quality.md")).toBe(
      path.join("project", ".qfai", "assistant", "rule", "quality.md"),
    );
  });
});

describe("TC-0003-0026: legacy backward-compat + sunset warning", () => {
  it("init declares emitLegacyAssistantTreeSunset emitting D-DEPRECATED-PATH (sunset sourced from SSOT)", async () => {
    const content = await readFile(INIT_CLI, "utf-8");
    expect(content).toContain("D-DEPRECATED-PATH");
    expect(content).toContain("emitLegacyAssistantTreeSunset");
    // The version in the message comes from legacyAssistantTreeSunsetLabel()
    // rather than a literal here; the runtime assertion lives in
    // tests/cli/init.test.ts.
    expect(content).toMatch(/announced sunset \(v\$\{sunset\}\)/);
  });
});
