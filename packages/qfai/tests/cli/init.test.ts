import {
  access,
  chmod,
  chown,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  rename,
  rm,
  stat,
  writeFile,
  symlink,
} from "node:fs/promises";
import { execFile as execFileCb } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { isMap, isSeq, parseDocument } from "yaml";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { runInit } from "../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../src/cli/lib/fs.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";
import {
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
} from "../../src/core/gitignore.js";
import { removeTempTree } from "../helpers/tempTree.js";

const REQUIRED_SKILLS = [
  "qfai-configure",
  "qfai-discussion",
  "qfai-sdd",
  "qfai-atdd",
  "qfai-prototyping",
  "qfai-implement",
  "qfai-verify",
];

const execFile = promisify(execFileCb);

/**
 * A wrapper body shaped like the ones qfai used to ship: the delegation line
 * pointing at the canonical doc of the same stem is what marks the file as
 * init's own, so prune keys on it rather than on the basename.
 */
function legacyWrapperBody(stem: string): string {
  return [
    "---",
    `description: "QFAI: ${stem}"`,
    "---",
    "Follow the canonical QFAI prompt exactly:",
    `@.qfai/assistant/prompts/${stem}.md`,
    "",
  ].join("\n");
}

/** The bullet form `.github/prompts/*.prompt.md` shipped with, not the `@` one. */
function legacyPromptWrapperBody(stem: string): string {
  return [
    "---",
    `description: "QFAI: ${stem}"`,
    "---",
    "1) Open and follow the canonical QFAI prompt:",
    `- .qfai/assistant/prompts/${stem}.md`,
    "",
  ].join("\n");
}

async function expectSymlink(linkPath: string): Promise<void> {
  const stat = await lstat(linkPath);
  expect(stat.isSymbolicLink()).toBe(true);
}

async function expectSymlinkTarget(linkPath: string, expectedFragment: string): Promise<void> {
  const target = await readlink(linkPath);
  const normalized = target.replace(/\\/g, "/");
  expect(normalized).toContain(expectedFragment);
}

/** The `qfai-atdd` phases sequence of an `agent-routing.yml` document. */
function atddPhases(doc: ReturnType<typeof parseDocument>) {
  const routing = doc.get("routing");
  if (!isSeq(routing)) throw new Error("agent-routing.yml has no routing sequence");
  const atdd = routing.items.find((item) => isMap(item) && item.get("skill") === "qfai-atdd");
  if (!isMap(atdd)) throw new Error("agent-routing.yml has no qfai-atdd entry");
  const phases = atdd.get("phases");
  if (!isSeq(phases)) throw new Error("qfai-atdd has no phases");
  return phases;
}

/** Roll a routing table back to a package that had no ATDD `red` gate. */
function withoutAtddRedPhase(source: string): string {
  const doc = parseDocument(source);
  const phases = atddPhases(doc);
  phases.items = phases.items.filter((item) => !(isMap(item) && item.get("id") === "red"));
  return doc.toString({ lineWidth: 0 });
}

function atddPhaseIds(source: string): string[] {
  const ids: string[] = [];
  for (const item of atddPhases(parseDocument(source)).items) {
    const id = isMap(item) ? item.get("id") : null;
    if (typeof id === "string") ids.push(id);
  }
  return ids;
}

// This suite exercises end-to-end init flows with extensive filesystem I/O
// (temp dirs, template copying, globbing), so we use a higher timeout to
// avoid flaky failures on slow or heavily loaded CI runners.
describe("qfai init", { timeout: 60000 }, () => {
  it("treats a dangling symlink at the destination as occupied", async () => {
    // `access` follows the link, so a dangling one answered "free" and the copy
    // that followed wrote through it — `copyFile` resolves the symlink and
    // creates the target, turning a create-only init into a writer of fixed
    // content at whatever path the link named.
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-src-"));
    const destRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-dest-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
    try {
      await writeFile(path.join(sourceRoot, "README.md"), "shipped\n", "utf-8");
      const escapee = path.join(outside, "written-through.md");
      try {
        await symlink(escapee, path.join(destRoot, "README.md"), "file");
      } catch {
        return; // No symlinks here (Windows without Developer Mode).
      }

      await expect(
        copyTemplateTree(sourceRoot, destRoot, { force: false, dryRun: false }),
      ).rejects.toThrow();
      // And nothing was written through the link.
      await expect(readFile(escapee, "utf-8")).rejects.toThrow();
    } finally {
      await removeTempTree(sourceRoot);
      await removeTempTree(destRoot);
      await removeTempTree(outside);
    }
  });

  it("fails with guidance when conflicts exist and --force is missing", async () => {
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-src-"));
    const destRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-dest-"));
    try {
      await mkdir(path.join(sourceRoot, "nested"), { recursive: true });
      await writeFile(path.join(sourceRoot, "nested", "template.txt"), "sample");

      await copyTemplateTree(sourceRoot, destRoot, {
        force: false,
        dryRun: false,
      });

      await expect(
        copyTemplateTree(sourceRoot, destRoot, { force: false, dryRun: false }),
      ).rejects.toThrow(/--force/);
    } finally {
      await removeTempTree(sourceRoot);
      await removeTempTree(destRoot);
    }
  });

  it("appends QFAI entries to root .gitignore on init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const gitignorePath = path.join(root, ".gitignore");
      const content = await readFile(gitignorePath, "utf-8");

      expect(content).toContain(QFAI_GITIGNORE_MARKER);
      expect(content).toContain(".qfai/report/*");
      expect(content).not.toContain("!.qfai/report/README.md");
      expect(content).toContain(".qfai/evidence/*");
      expect(content).not.toContain("!.qfai/evidence/README.md");
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/README.md");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");

      // No subdirectory .gitignore files should be created
      await expect(access(path.join(root, ".qfai", "review", ".gitignore"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(path.join(root, ".qfai", "report", ".gitignore"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".qfai", "evidence", ".gitignore")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".qfai", "discussion", ".gitignore")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await removeTempTree(root);
    }
  });

  // TC-0003-0001 (alias) — qfai init ships GitHub Actions workflow for qfai validate
  it("ships .github/workflows/qfai-validate.yml on init (spec-0003)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-workflow-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const workflowPath = path.join(root, ".github", "workflows", "qfai-validate.yml");
      await expect(access(workflowPath)).resolves.toBeUndefined();

      const content = await readFile(workflowPath, "utf-8");
      // The lane's subcommand / --profile value / --fail-on threshold used to
      // be asserted here as one ad-hoc string — the same literal the asset
      // suite carried. Subsumed and replaced (DTC-26) by the declared shape's
      // dimension-5 pins in
      // tests/integration/shippedWorkflowShapeGate.test.ts, which is now their
      // one oracle; this it keeps its TC-0003-0001 alias annotation for the
      // init-written checks that remain.
      // DTC-26 co-change (TC-0003-0030): the shipped set is SHA-pinned, so
      // the former floating-major expectations are asserted in pin form.
      expect(content).toMatch(/actions\/checkout@[0-9a-f]{40}\b/);
      expect(content).toMatch(/actions\/setup-node@[0-9a-f]{40}\b/);
      expect(content).toContain("QFAI-TEST-001");
    } finally {
      await removeTempTree(root);
    }
  });

  it("ignores every discussion child on init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await execFile("git", ["init"], { cwd: root });
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const discussionDir = path.join(root, ".qfai", "discussion");
      const directUiuxFile = path.join(discussionDir, "uiux", "40_screen_contracts.md");
      const generatedPackFile = path.join(
        discussionDir,
        "discussion-20260423174107000",
        "uiux",
        "40_screen_contracts.md",
      );

      await mkdir(path.dirname(directUiuxFile), { recursive: true });
      await mkdir(path.dirname(generatedPackFile), { recursive: true });
      await writeFile(directUiuxFile, "direct uiux");
      await writeFile(generatedPackFile, "generated pack uiux");

      const checkIgnore = async (relativePath: string): Promise<string | null> => {
        try {
          const { stdout } = await execFile("git", ["check-ignore", "-v", "--", relativePath], {
            cwd: root,
          });
          return stdout.trim();
        } catch (error: unknown) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: number }).code === 1
          ) {
            return null;
          }
          throw error;
        }
      };

      expect(await checkIgnore(".qfai/discussion/README.md")).toContain(".qfai/discussion/*");
      expect(await checkIgnore(".qfai/discussion/uiux/40_screen_contracts.md")).toContain(
        ".qfai/discussion/*",
      );
      expect(
        await checkIgnore(
          ".qfai/discussion/discussion-20260423174107000/uiux/40_screen_contracts.md",
        ),
      ).toContain(".qfai/discussion/*");
    } finally {
      await removeTempTree(root);
    }
  });

  it("does not duplicate QFAI entries on repeated init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const markerCount = content.split(QFAI_GITIGNORE_MARKER).length - 1;
      expect(markerCount).toBe(1);
    } finally {
      await removeTempTree(root);
    }
  });

  it("preserves existing .gitignore content when appending", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const gitignorePath = path.join(root, ".gitignore");
      await writeFile(gitignorePath, "node_modules/\ndist/\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(gitignorePath, "utf-8");
      expect(content).toMatch(/^node_modules\/\n/);
      expect(content).toContain(".qfai/report/*");
    } finally {
      await removeTempTree(root);
    }
  });

  it("creates template additions with symlinks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Regular files (canonical sources)
      const expectedRegularFiles = [
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "constitution", "constitution.md"),
        path.join(root, ".qfai", "assistant", "agents", "delivery-planner.md"),
        path.join(root, ".qfai", "assistant", "catalog", "review-gate.rules.yml"),
        path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml"),
        path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml"),
        path.join(root, ".qfai", "assistant", "manifest", "review-profiles.yml"),
        path.join(
          root,
          ".qfai",
          "assistant",
          "skills",
          "qfai-discussion",
          "references",
          "rcp_footer.md",
        ),
        path.join(root, ".qfai", "assistant", "skills", "qfai-sdd", "references", "rcp_footer.md"),
        // README files are regular files
        path.join(root, ".claude", "agents", "README.md"),
        path.join(root, ".github", "agents", "README.md"),
        path.join(root, ".github", "copilot-instructions.md"),
        path.join(root, ".codex", "README.md"),
        path.join(root, ".agents", "README.md"),
      ];

      for (const filePath of expectedRegularFiles) {
        await access(filePath);
      }

      // Skill directory symlinks
      const skillSymlinks = [
        path.join(root, ".claude", "skills", "qfai-configure"),
        path.join(root, ".agents", "skills", "qfai-configure"),
        path.join(root, ".codex", "skills", "qfai-configure"),
        path.join(root, ".github", "skills", "qfai-configure"),
      ];

      for (const symlinkPath of skillSymlinks) {
        await expectSymlink(symlinkPath);
        await expectSymlinkTarget(symlinkPath, ".qfai/assistant/skills/qfai-configure");
      }

      // Skill symlink resolves to actual skill directory (SKILL.md is accessible)
      const skillMdViaSymlink = path.join(root, ".claude", "skills", "qfai-configure", "SKILL.md");
      await access(skillMdViaSymlink);

      // Agent file symlinks
      const claudeAgent = path.join(root, ".claude", "agents", "delivery-planner.md");
      await expectSymlink(claudeAgent);
      await expectSymlinkTarget(claudeAgent, ".qfai/assistant/agents/delivery-planner.md");

      const githubAgent = path.join(root, ".github", "agents", "delivery-planner.agent.md");
      await expectSymlink(githubAgent);
      await expectSymlinkTarget(githubAgent, ".qfai/assistant/agents/delivery-planner.md");

      // commands/ and prompts/ are NOT generated
      await expect(access(path.join(root, ".qfai", "assistant", "prompts"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      for (const skillId of REQUIRED_SKILLS) {
        await expect(
          access(path.join(root, ".claude", "commands", `${skillId}.md`)),
        ).rejects.toMatchObject({
          code: "ENOENT",
        });
        await expect(
          access(path.join(root, ".github", "prompts", `${skillId}.prompt.md`)),
        ).rejects.toMatchObject({
          code: "ENOENT",
        });
      }

      await expect(access(path.join(root, ".qfai", "report", "README.md"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await removeTempTree(root);
    }
  });

  it("does not create artifact scaffold outside assistant assets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const scaffoldFiles = await fg(
        [
          ".qfai/specs/**/*",
          ".qfai/discussion/**/*",
          ".qfai/report/**/*",
          ".qfai/review/**/*",
          ".qfai/contracts/**/*",
          ".qfai/evidence/**/*",
        ],
        {
          cwd: root,
          onlyFiles: true,
          dot: true,
        },
      );
      expect(scaffoldFiles).toEqual([]);

      await expect(access(path.join(root, ".qfai", "specs", "_policies"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(path.join(root, ".qfai", "specs", "spec-XXXX"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(
        access(path.join(root, ".qfai", "assistant", "skills.local")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });

      await expect(access(path.join(root, ".qfai", "discussions"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await removeTempTree(root);
    }
  });

  it("is create-only for root/ and .qfai/ (skips existing files)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const existingConfig = path.join(root, "qfai.config.yaml");
      await writeFile(existingConfig, "custom config\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readFile(existingConfig, "utf-8");
      expect(after).toBe("custom config\n");

      const existingConstitution = path.join(
        root,
        ".qfai",
        "assistant",
        "constitution",
        "constitution.md",
      );
      await writeFile(existingConstitution, "custom constitution\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const constitutionAfter = await readFile(existingConstitution, "utf-8");
      expect(constitutionAfter).toBe("custom constitution\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps every existing root asset across --force, not just DESIGN.md", async () => {
    // The root assets are create-only in full: a `force: false` literal is
    // what saves every one of them, so DESIGN.md is not singled out. The
    // shipped workflow reaches disk through its own create-only copy rather
    // than the root-tree one, but by the same literal and the same rule —
    // the ownership contract that calls it load-bearing is stating, for the
    // workflow, what holds for the whole root surface. Lock all three
    // shipped root files so a future widening of --force cannot quietly
    // overwrite a project's authored DESIGN.md, its `qfai-configure`-tuned
    // qfai.config.yaml, or its CI workflow.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const rootAssets = [
        "DESIGN.md",
        "qfai.config.yaml",
        path.join(".github", "workflows", "qfai-validate.yml"),
      ];
      for (const relative of rootAssets) {
        await writeFile(path.join(root, relative), `authored ${relative}\n`, "utf-8");
      }

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      for (const relative of rootAssets) {
        const after = await readFile(path.join(root, relative), "utf-8");
        expect(after).toBe(`authored ${relative}\n`);
      }
    } finally {
      await removeTempTree(root);
    }
  });

  it("overwrites skills only when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const skillSample = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "SKILL.md",
      );
      await writeFile(skillSample, "custom skills\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterNoForce = await readFile(skillSample, "utf-8");
      expect(afterNoForce).toBe("custom skills\n");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      const afterForce = await readFile(skillSample, "utf-8");

      const template = await readFile(
        path.join(
          getInitAssetsDir(),
          ".qfai",
          "assistant",
          "skills",
          "qfai-discussion",
          "SKILL.md",
        ),
        "utf-8",
      );

      expect(afterForce).toBe(template);
      expect(afterForce).not.toBe("custom skills\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("recreates symlinks with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Verify symlinks exist
      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      await expectSymlink(skillLink);

      // Run again with --force
      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      // Symlinks should still be valid
      await expectSymlink(skillLink);
      await expectSymlinkTarget(skillLink, ".qfai/assistant/skills/qfai-configure");

      // Content accessible through symlink
      const skillMd = path.join(skillLink, "SKILL.md");
      await access(skillMd);
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes deprecated commands/prompts wrappers on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Create legacy commands/prompts files
      const deprecatedClaude = path.join(root, ".claude", "commands", "qfai-spec.md");
      const deprecatedGithub = path.join(root, ".github", "prompts", "qfai-spec.prompt.md");
      const deprecatedCanonicalClaude = path.join(root, ".claude", "commands", "qfai-configure.md");
      const deprecatedCanonicalGithub = path.join(
        root,
        ".github",
        "prompts",
        "qfai-configure.prompt.md",
      );

      await mkdir(path.dirname(deprecatedClaude), { recursive: true });
      await mkdir(path.dirname(deprecatedGithub), { recursive: true });
      await writeFile(deprecatedClaude, legacyWrapperBody("qfai-spec"), "utf-8");
      await writeFile(deprecatedGithub, legacyPromptWrapperBody("qfai-spec"), "utf-8");
      await writeFile(deprecatedCanonicalClaude, legacyWrapperBody("qfai-configure"), "utf-8");
      await writeFile(
        deprecatedCanonicalGithub,
        legacyPromptWrapperBody("qfai-configure"),
        "utf-8",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      // Every wrapper basename qfai itself once shipped there should be removed
      await expect(access(deprecatedClaude)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(deprecatedGithub)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(deprecatedCanonicalClaude)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(deprecatedCanonicalGithub)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes agent wrappers naming a retired agent on --force, keeping the canonical file", async () => {
    // A retired agent used to leave three files nothing removed: the canonical
    // document and one wrapper per integration dir, each carrying a different
    // suffix. `--force` recreated the current roster around them and pruned
    // nothing, so `QFAI-LINK-001` reported them forever with a manual `rm` as
    // the only remedy.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const canonical = path.join(root, ".qfai", "assistant", "agents", "retired-agent.md");
      await writeFile(canonical, "# retired agent\n", "utf-8");

      const claudeWrapper = path.join(root, ".claude", "agents", "retired-agent.md");
      const githubWrapper = path.join(root, ".github", "agents", "retired-agent.agent.md");
      await symlink("../../.qfai/assistant/agents/retired-agent.md", claudeWrapper, "file");
      await symlink("../../.qfai/assistant/agents/retired-agent.md", githubWrapper, "file");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(claudeWrapper)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(githubWrapper)).rejects.toMatchObject({ code: "ENOENT" });

      // The canonical tree is create-only and a project may add agents of its
      // own to it, so init does not delete there.
      await access(canonical);

      // A shipped agent keeps both of its wrappers.
      await expectSymlink(path.join(root, ".claude", "agents", "orchestrator.md"));
      await expectSymlink(path.join(root, ".github", "agents", "orchestrator.agent.md"));
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes a flattened retired agent wrapper on --force", async () => {
    // A `core.symlinks false` checkout writes the target bytes into a regular
    // file. Pruning only symlinks would miss the retired wrapper on exactly the
    // platform where flattening is the default.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const flattened = path.join(root, ".claude", "agents", "retired-agent.md");
      await writeFile(flattened, "../../.qfai/assistant/agents/retired-agent.md", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(flattened)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("preserves agent entries init did not write and prunes nothing without --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // An agent document a project wrote by hand: a regular file whose content
      // is not a path into the canonical agents directory.
      const projectAgent = path.join(root, ".claude", "agents", "project-owned.md");
      await writeFile(projectAgent, "# project agent\n\nInstructions.\n", "utf-8");

      // A link pointing outside the canonical agents directory is somebody
      // else's link.
      const foreignWrapper = path.join(root, ".claude", "agents", "foreign.md");
      await symlink("../../docs/foreign.md", foreignWrapper, "file");

      // A retired wrapper survives a run without `--force`, which prunes nothing.
      const retiredWrapper = path.join(root, ".claude", "agents", "retired-agent.md");
      await symlink("../../.qfai/assistant/agents/retired-agent.md", retiredWrapper, "file");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await lstat(retiredWrapper);

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await access(projectAgent);
      expect(await readFile(projectAgent, "utf-8")).toBe("# project agent\n\nInstructions.\n");
      expect((await lstat(foreignWrapper)).isSymbolicLink()).toBe(true);
      await expect(lstat(retiredWrapper)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a one-line agent file padded with whitespace out of the prune", async () => {
    // Git writes a flattened link's target verbatim — no trailing newline and
    // none of the padding an editor or a shell `echo` leaves behind. A
    // project's own note that happens to end in a space is not a wrapper, and
    // `--force` must not delete it.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const padded = path.join(root, ".claude", "agents", "custom-note.md");
      const content = "../../.qfai/assistant/agents/custom.md ";
      await writeFile(padded, content, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(padded, "utf-8")).toBe(content);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a one-line agent file spelling the target some other way out of the prune", async () => {
    // Only the bytes `path.relative` produces are what init writes. Resolving
    // the content and comparing destinations accepted a redundant `./` and an
    // absolute path to the same file as things init had written, and `--force`
    // deleted a one-line file somebody wrote by hand. Same line
    // `isFlattenedLink` already holds for the repair path.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const dotted = path.join(root, ".claude", "agents", "dotted-note.md");
      const dottedContent = "../../.qfai/assistant/agents/./retired-agent.md";
      await writeFile(dotted, dottedContent, "utf-8");

      const absolute = path.join(root, ".claude", "agents", "absolute-note.md");
      const absoluteContent = path
        .join(root, ".qfai", "assistant", "agents", "retired-agent.md")
        .split(path.sep)
        .join("/");
      await writeFile(absolute, absoluteContent, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(dotted, "utf-8")).toBe(dottedContent);
      expect(await readFile(absolute, "utf-8")).toBe(absoluteContent);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a repair sidecar for a retired agent out of the prune", async () => {
    // `claimSidecar` renames a wrapper aside before repairing it, and when that
    // repair dies the sidecar is the only copy of what was there. It is also
    // the exact thing this prune hunts: it matches on the RESOLVED target, and
    // a sidecar renamed off a retired wrapper still resolves to the retired
    // agent — under either name, since `isGeneratedWrapperTarget` compares the
    // target bytes against `path.relative(dir, resolved)` and never reads the
    // entry's own name. So `--force` would delete the rescue copy. The skill
    // prune next door needs no such test because it deletes by retired skill
    // id, and no sidecar name is one; this prune needs the name test, and
    // without a case over it the constant reads as unused.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const canonical = path.join(root, ".qfai", "assistant", "agents", "retired-agent.md");
      await writeFile(canonical, "# retired agent\n", "utf-8");
      const target = "../../.qfai/assistant/agents/retired-agent.md";

      // Both shapes a sidecar can take, because both are shapes the prune
      // otherwise accepts: the renamed symlink, and the renamed flattened file
      // a `core.symlinks false` checkout leaves. The `-1` suffix is the
      // collision form `claimSidecar` falls back to.
      const linkSidecar = path.join(root, ".claude", "agents", "retired-agent.md.qfai-repair-4242");
      await symlink(target, linkSidecar, "file");
      const fileSidecar = path.join(
        root,
        ".github",
        "agents",
        "retired-agent.agent.md.qfai-repair-4242-1",
      );
      await writeFile(fileSidecar, target, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect((await lstat(linkSidecar)).isSymbolicLink()).toBe(true);
      expect(await readFile(fileSidecar, "utf-8")).toBe(target);

      // Over-correction pin: the plain retired wrapper beside them still goes,
      // so this is a carve-out for the sidecar name and not a disabled prune.
      const retiredWrapper = path.join(root, ".claude", "agents", "retired-agent.md");
      await symlink(target, retiredWrapper, "file");
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      await expect(lstat(retiredWrapper)).rejects.toMatchObject({ code: "ENOENT" });
      expect((await lstat(linkSidecar)).isSymbolicLink()).toBe(true);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps an agent wrapper pointing below the canonical agents directory", async () => {
    // The prune is limited to a direct child of `.qfai/assistant/agents/`, the
    // only shape init writes. `QFAI-LINK-001` reports a nested target too, and
    // its remedy says so — it is a manual delete, not something `--force` does.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const nested = path.join(root, ".claude", "agents", "nested.md");
      await symlink("../../.qfai/assistant/agents/group/legacy.md", nested, "file");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect((await lstat(nested)).isSymbolicLink()).toBe(true);
    } finally {
      await removeTempTree(root);
    }
  });

  it("does not prune through an integration directory that is a symlink", async () => {
    // `readdir` follows the link, so enumerating `.claude/agents` lists an
    // external tree — while an entry's target is resolved against the lexical
    // in-project path. A link living out there reads as a retired wrapper, and
    // the delete that follows destroys data the project never owned.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const foreign = path.join(outside, "retired-agent.md");
      await symlink("../../.qfai/assistant/agents/retired-agent.md", foreign, "file");

      const claudeAgents = path.join(root, ".claude", "agents");
      await removeTempTree(claudeAgents);
      await symlink(outside, claudeAgents, process.platform === "win32" ? "junction" : "dir");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect((await lstat(foreign)).isSymbolicLink()).toBe(true);
    } finally {
      await removeTempTree(root);
      await removeTempTree(outside);
    }
  });

  it("keeps project-authored qfai-* commands, prompts and skills on --force", async () => {
    // Ownership is what init wrote, not the `qfai-` prefix: nothing reserves
    // that prefix (the shipped roster itself carries `web-research`), and init
    // has not written to `.claude/commands/` or `.github/prompts/` since the
    // symlink recut. `qfai-release.md` is the obvious name for a project slash
    // command that drives qfai, and `--force` deleted it — silently, under the
    // label "removed legacy files".
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-release.md");
      const prompt = path.join(root, ".github", "prompts", "qfai-release.prompt.md");
      const skillDoc = path.join(root, ".claude", "skills", "qfai-deploy", "SKILL.md");
      await mkdir(path.dirname(command), { recursive: true });
      await mkdir(path.dirname(prompt), { recursive: true });
      await mkdir(path.dirname(skillDoc), { recursive: true });
      await writeFile(command, "project command\n", "utf-8");
      await writeFile(prompt, "project prompt\n", "utf-8");
      await writeFile(skillDoc, "project skill\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe("project command\n");
      expect(await readFile(prompt, "utf-8")).toBe("project prompt\n");
      expect(await readFile(skillDoc, "utf-8")).toBe("project skill\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project's own command at a basename qfai once shipped", async () => {
    // A stem qfai used in the past says nothing about who owns the file today:
    // the project may have written its own `qfai-spec.md`, or replaced the old
    // wrapper with content of its own. Only the delegation line to the
    // canonical doc of the same stem proves init wrote it.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      const prompt = path.join(root, ".github", "prompts", "qfai-spec.prompt.md");
      await mkdir(path.dirname(command), { recursive: true });
      await mkdir(path.dirname(prompt), { recursive: true });
      await writeFile(command, "our own spec workflow\n", "utf-8");
      await writeFile(prompt, "our own spec prompt\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe("our own spec workflow\n");
      expect(await readFile(prompt, "utf-8")).toBe("our own spec prompt\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project's own skill symlink into its own canonical skill", async () => {
    // A project may author `.qfai/assistant/skills/my-skill/` and publish it by
    // hand — `integrationSurface.ts` allows exactly that. The link target is in
    // the canonical tree, so target alone cannot be the ownership test.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const canonical = path.join(root, ".qfai", "assistant", "skills", "my-skill");
      await mkdir(canonical, { recursive: true });
      await writeFile(path.join(canonical, "SKILL.md"), "project skill\n", "utf-8");
      const link = path.join(root, ".claude", "skills", "my-skill");
      await symlink(path.join("..", "..", ".qfai", "assistant", "skills", "my-skill"), link, "dir");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expectSymlink(link);
      expect(await readFile(path.join(link, "SKILL.md"), "utf-8")).toBe("project skill\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("still removes a skill symlink pointing at a skill that is no longer shipped", async () => {
    // `qfai-spec` was a shipped skill and is not one now, so a link init left
    // behind for it is still pruned — the cleanup the prefix test provided.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const stale = path.join(root, ".claude", "skills", "qfai-spec");
      await symlink(
        path.join("..", "..", ".qfai", "assistant", "skills", "qfai-spec"),
        stale,
        "dir",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(stale)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project's files beside a retired directory wrapper it prunes", async () => {
    // Ownership was proved for `SKILL.md` and nothing else. A project that
    // added notes or scripts to the same directory keeps them, and the
    // directory survives with them — only an emptied shell is folded away.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const stale = path.join(root, ".codex", "skills", "qfai-spec");
      await mkdir(stale, { recursive: true });
      await writeFile(
        path.join(stale, "SKILL.md"),
        "- .qfai/assistant/skills/qfai-spec/SKILL.md\n",
        "utf-8",
      );
      await writeFile(path.join(stale, "our-notes.md"), "our notes\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(path.join(stale, "SKILL.md"))).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(path.join(stale, "our-notes.md"), "utf-8")).toBe("our notes\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project alias symlink that borrows a retired skill name", async () => {
    // init always links `<id> -> .qfai/assistant/skills/<id>`. A link at a
    // retired name pointing at some other canonical entry is an alias the
    // project made, and "the target is somewhere in the tree" deleted it.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const canonical = path.join(root, ".qfai", "assistant", "skills", "my-skill");
      await mkdir(canonical, { recursive: true });
      await writeFile(path.join(canonical, "SKILL.md"), "project skill\n", "utf-8");
      const alias = path.join(root, ".claude", "skills", "qfai-spec");
      await symlink(
        path.join("..", "..", ".qfai", "assistant", "skills", "my-skill"),
        alias,
        "dir",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expectSymlink(alias);
      expect(await readFile(path.join(alias, "SKILL.md"), "utf-8")).toBe("project skill\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project command whose fence nests a shorter one", async () => {
    // CommonMark closes a fence only on the same character, at least as long.
    // Flipping on any fence line read the inner ``` as the close, and the
    // quoted delegation after it counted as the real thing.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      const body = [
        "How the retired wrapper was documented:",
        "",
        "````md",
        "```",
        "@.qfai/assistant/prompts/qfai-spec.md",
        "```",
        "````",
        "",
      ].join("\n");
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project command whose fence holds a line carrying an info string", async () => {
    // CommonMark closes a fence only on a line whose marker run is followed by
    // whitespace alone; a run with text after it is content, not a close.
    // Closing on the character and the length alone ended the block at the
    // inner "```js", and the quoted delegation below it counted as ownership.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      const body = [
        "Our spec flow. The retired QFAI wrapper was written like this:",
        "",
        "```md",
        "```js",
        "@.qfai/assistant/prompts/qfai-spec.md",
        "```",
        "",
        "We do not delegate there any more.",
        "",
      ].join("\n");
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes a wrapper whose fence is closed by a marker run with trailing spaces", async () => {
    // The other half of the same rule: whitespace after the run is allowed, so
    // the block really does end there and the delegation that follows is at
    // top level. Demanding a bare marker run would keep stale wrappers.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      await writeFile(
        command,
        [
          "```text",
          "an example the project pasted above the wrapper body",
          "```  ",
          "",
          "@.qfai/assistant/prompts/qfai-spec.md",
          "",
        ].join("\n"),
        "utf-8",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(command)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project command carrying a delegation in the prompt wrapper's form", async () => {
    // `.claude/commands/` only ever got the `@<path>` form; the `- <path>`
    // bullet is what the prompt and skill wrappers use. Sharing one set of
    // forms across surfaces accepted a shape qfai never wrote there, so a
    // project's own reference list was evidence against it.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      const body = "Reading list:\n\n- .qfai/assistant/skills/qfai-spec/SKILL.md\n";
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project command that quotes the delegation line inside a code fence", async () => {
    // A fence is a quotation whether or not it is indented. qfai never puts
    // the delegation inside one, so a doc that reproduces the retired
    // wrapper's body is not the wrapper.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      const body = [
        "Our spec flow. The retired QFAI wrapper used to say:",
        "",
        "```md",
        "@.qfai/assistant/prompts/qfai-spec.md",
        "```",
        "",
        "We do not delegate there any more.",
        "",
      ].join("\n");
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes the pre-symlink directory wrapper of a retired skill", async () => {
    // Releases before the symlink recut copied `<integration>/<id>/SKILL.md`
    // as a real directory. Pruning only symlinks left those behind on an
    // upgrade straight from one of those releases: the name is not in the
    // roster, so `ensureSymlink --force` never reaches it either, and the
    // assistant went on loading a retired instruction after `--force`.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const stale = path.join(root, ".codex", "skills", "qfai-spec");
      await mkdir(stale, { recursive: true });
      await writeFile(
        path.join(stale, "SKILL.md"),
        [
          "---",
          'name: "qfai-spec"',
          "---",
          "",
          "This skill is a thin wrapper that forwards to the canonical QFAI skill in this repository:",
          "",
          "- .qfai/assistant/skills/qfai-spec/SKILL.md",
          "",
        ].join("\n"),
        "utf-8",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(stale)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project's own skill directory at a retired basename", async () => {
    // The retired name alone does not say who wrote the directory. Only the
    // delegation line to the canonical doc of the same id does, and a
    // directory a project authored for itself carries none.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const own = path.join(root, ".claude", "skills", "qfai-spec");
      await mkdir(own, { recursive: true });
      await writeFile(path.join(own, "SKILL.md"), "our own spec skill\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(path.join(own, "SKILL.md"), "utf-8")).toBe("our own spec skill\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes the flattened form of a retired skill symlink", async () => {
    // A `core.symlinks = false` checkout leaves the link as a regular file
    // holding the target string. Treating every regular file as not-ours left
    // the retired wrapper in place on exactly those checkouts, where the id is
    // out of the roster so `createSkillSymlinks` never reaches it either.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const stale = path.join(root, ".claude", "skills", "qfai-spec");
      await writeFile(
        stale,
        path.join("..", "..", ".qfai", "assistant", "skills", "qfai-spec"),
        "utf-8",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(stale)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a hand-written file at a retired basename that spells the target its own way", async () => {
    // The flattened form is byte-for-byte what git expands, and nothing else.
    // A file somebody wrote by hand — a trailing newline from `echo`, a `./`
    // git never emits — is not that, and resolving the content instead of
    // comparing it would delete both.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const echoed = path.join(root, ".claude", "skills", "qfai-spec");
      const echoedBody = "../../.qfai/assistant/skills/qfai-spec\n";
      await writeFile(echoed, echoedBody, "utf-8");

      const respelt = path.join(root, ".agents", "skills", "qfai-spec");
      const respeltBody = "../.././.qfai/assistant/skills/qfai-spec";
      await mkdir(path.dirname(respelt), { recursive: true });
      await writeFile(respelt, respeltBody, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(echoed, "utf-8")).toBe(echoedBody);
      expect(await readFile(respelt, "utf-8")).toBe(respeltBody);
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes the command and prompt wrappers of the retired split SDD skills", async () => {
    // `qfai-sdd-planning` / `qfai-sdd-refinement` were in the roster while the
    // generator still wrote `.claude/commands/` and `.github/prompts/`, so
    // their wrappers exist in the wild — and were left behind by a stem set
    // recovered only from the assets still in the tree.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-sdd-planning.md");
      const prompt = path.join(root, ".github", "prompts", "qfai-sdd-refinement.prompt.md");
      await mkdir(path.dirname(command), { recursive: true });
      await mkdir(path.dirname(prompt), { recursive: true });
      await writeFile(command, "@.qfai/assistant/prompts/qfai-sdd-planning.md\n", "utf-8");
      await writeFile(prompt, "- .qfai/assistant/prompts/qfai-sdd-refinement.md\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(lstat(command)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(prompt)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project command that only mentions the canonical path in prose", async () => {
    // Ownership is the delegation line, which is the whole line in every
    // generation qfai shipped. Accepting the path anywhere in the body let a
    // project's own `qfai-spec.md` be deleted for explaining — or forbidding —
    // the canonical document.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      const body =
        "Our spec flow. Do NOT read .qfai/assistant/prompts/qfai-spec.md — it is gone.\n";
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps a project command that quotes the delegation line in an indented code block", async () => {
    // In every generation qfai shipped, the delegation starts at column 0.
    // Comparing trimmed lines made an indented markdown code sample — the
    // natural way for a project to document what the old wrapper contained —
    // read as the wrapper itself.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      const body = [
        "Our spec flow. The retired QFAI wrapper used to say:",
        "",
        "    @.qfai/assistant/prompts/qfai-spec.md",
        "",
        "We do not delegate there any more.",
        "",
      ].join("\n");
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps an oversized file at a legacy wrapper basename instead of reading it whole", async () => {
    // Deciding whether to delete is not a reason to pull an arbitrary file
    // into memory: a large log left at `qfai-spec.md` used to be read whole as
    // one UTF-8 string, and init died before it wrote anything. Past the
    // ceiling the ownership question is simply unanswered, so the file stays.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const command = path.join(root, ".claude", "commands", "qfai-spec.md");
      await mkdir(path.dirname(command), { recursive: true });
      // Genuine delegation line, but far past the ceiling the evidence read
      // uses — the size is what decides, not the presence of the marker.
      const body = `@.qfai/assistant/prompts/qfai-spec.md\n${"x".repeat(8192)}\n`;
      await writeFile(command, body, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(command, "utf-8")).toBe(body);
    } finally {
      await removeTempTree(root);
    }
  });

  it("replaces old non-symlink skill wrappers with symlinks on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Manually create old-style wrapper directory (non-symlink)
      const oldWrapper = path.join(root, ".codex", "skills", "qfai-configure");
      await mkdir(oldWrapper, { recursive: true });
      await writeFile(path.join(oldWrapper, "SKILL.md"), "old wrapper\n", "utf-8");

      // Create the canonical skill source
      await mkdir(path.join(root, ".qfai", "assistant", "skills", "qfai-configure"), {
        recursive: true,
      });
      await writeFile(
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        "canonical\n",
        "utf-8",
      );

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      // Old directory should be replaced with symlink
      const stat = await lstat(path.join(root, ".codex", "skills", "qfai-configure"));
      expect(stat.isSymbolicLink()).toBe(true);
    } finally {
      await removeTempTree(root);
    }
  });

  it("removes legacy 10_workflow.md from skills when --force is provided", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacyPath = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "10_workflow.md",
      );
      await writeFile(legacyPath, "legacy workflow\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(access(legacyPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await removeTempTree(root);
    }
  });

  it("does not remove custom codex skill on --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Custom (non-qfai) skill directory should not be touched
      const customCodexSkill = path.join(root, ".codex", "skills", "custom-skill", "SKILL.md");
      await mkdir(path.dirname(customCodexSkill), { recursive: true });
      await writeFile(customCodexSkill, "custom codex skill\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      await expect(access(customCodexSkill)).resolves.toBeUndefined();
      const after = await readFile(customCodexSkill, "utf-8");
      expect(after).toBe("custom codex skill\n");
    } finally {
      await removeTempTree(root);
    }
  });

  it("reports legacy cleanup as planned in dry-run and keeps files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacyPath = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "10_workflow.md",
      );
      await writeFile(legacyPath, "legacy workflow\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: true, yes: true });
      });

      expect(output).toContain("would remove legacy files");
      expect(output).toContain("would remove paths:");
      await access(legacyPath);
    } finally {
      await removeTempTree(root);
    }
  });

  it("previews and reports the core.symlinks write to .git/config", async () => {
    // `git config core.symlinks true` is the only change init makes outside
    // the working tree. Neither mode used to mention it, so --dry-run
    // enumerated every change except that one and a repository that later
    // carried the setting gave no clue who wrote it.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await execFile("git", ["init"], { cwd: root });
      // Shadow any true in the user's global config so the write is observable.
      await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: root });

      const dryRunOutput = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });

      expect(dryRunOutput).toContain("would set: git config --local core.symlinks true");
      const { stdout: afterDryRun } = await execFile(
        "git",
        ["config", "--local", "--get", "core.symlinks"],
        { cwd: root },
      );
      expect(afterDryRun.trim()).toBe("false");

      const realOutput = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(realOutput).toContain("git config: core.symlinks=true");
      const { stdout: afterInit } = await execFile(
        "git",
        ["config", "--local", "--get", "core.symlinks"],
        { cwd: root },
      );
      expect(afterInit.trim()).toBe("true");
    } finally {
      await removeTempTree(root);
    }
  });

  it("skips the core.symlinks write when it is already true", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await execFile("git", ["init"], { cwd: root });
      await execFile("git", ["config", "--local", "core.symlinks", "true"], { cwd: root });

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(output).toContain("git config: core.symlinks already true");
      expect(output).not.toContain("git config: core.symlinks=true");
    } finally {
      await removeTempTree(root);
    }
  });

  it("treats git's other true spellings of core.symlinks as already enabled", async () => {
    // Git accepts `yes` / `on` / `1` / a valueless key as true, so a raw string
    // comparison against "true" would announce a change that is not one and
    // then rewrite a setting that was already in effect.
    for (const spelling of ["yes", "on", "1"]) {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
      try {
        await execFile("git", ["init"], { cwd: root });
        await execFile("git", ["config", "--local", "core.symlinks", spelling], { cwd: root });

        const output = await captureStdout(async () => {
          await runInit({ dir: root, force: false, dryRun: true, yes: true });
        });

        expect(output).toContain("git config: core.symlinks already true");
        expect(output).not.toContain("would set: git config --local core.symlinks true");
        const { stdout: stored } = await execFile(
          "git",
          ["config", "--local", "--get", "core.symlinks"],
          { cwd: root },
        );
        expect(stored.trim()).toBe(spelling);
      } finally {
        await removeTempTree(root);
      }
    }
  });

  it("discloses the core.symlinks write before the steps that can fail after it", async () => {
    // The note used to be held back until after the report summary, so any
    // throw in between (an EPERM from symlink creation on Windows without
    // Developer Mode, say) lost the disclosure of a change that had already
    // been persisted outside the working tree.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await execFile("git", ["init"], { cwd: root });
      await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: root });

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      const noteIndex = output.indexOf("git config: core.symlinks=true");
      // The summary, not the bare `qfai init:` prefix: init now opens with a
      // `qfai init: dest=` disclosure line, so the prefix alone matches at
      // index 0 and the ordering this case exists to pin goes untested.
      const summaryIndex = output.indexOf("qfai init: done");
      expect(noteIndex).toBeGreaterThanOrEqual(0);
      expect(summaryIndex).toBeGreaterThanOrEqual(0);
      expect(noteIndex).toBeLessThan(summaryIndex);
    } finally {
      await removeTempTree(root);
    }
  });

  it("still pins core.symlinks locally when only the global config enables it", async () => {
    // The skip decision has to read the same scope the write targets. An
    // unscoped read also sees global/system config, so a `true` inherited from
    // there suppressed the local pin and left the repository depending on a
    // setting that can be removed outside it.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    const globalConfig = path.join(root, "fake-global-gitconfig");
    const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
    try {
      await writeFile(globalConfig, "[core]\n\tsymlinks = true\n", "utf8");
      process.env.GIT_CONFIG_GLOBAL = globalConfig;

      const repo = path.join(root, "repo");
      await mkdir(repo, { recursive: true });
      await execFile("git", ["init"], { cwd: repo });
      // Git for Windows may seed a local value at init time; clear it so the
      // only `true` in play comes from the global config above.
      await execFile("git", ["config", "--local", "--unset-all", "core.symlinks"], {
        cwd: repo,
      }).catch(() => undefined);

      const output = await captureStdout(async () => {
        await runInit({ dir: repo, force: false, dryRun: false, yes: true });
      });

      expect(output).toContain("git config: core.symlinks=true");
      expect(output).not.toContain("already true");
      const { stdout: localValue } = await execFile(
        "git",
        ["config", "--local", "--get", "core.symlinks"],
        { cwd: repo },
      );
      expect(localValue.trim()).toBe("true");
    } finally {
      if (previousGlobal === undefined) {
        delete process.env.GIT_CONFIG_GLOBAL;
      } else {
        process.env.GIT_CONFIG_GLOBAL = previousGlobal;
      }
      await removeTempTree(root);
    }
  });

  it("reports the common .git/config when init runs inside a linked worktree", async () => {
    // `--absolute-git-dir` answers `.git/worktrees/<name>` there, which holds
    // no `config` file at all, while the local-scope write lands in the common
    // `.git/config`. Reporting the per-worktree dir pointed at nothing.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const main = path.join(root, "main");
      await mkdir(main, { recursive: true });
      await execFile("git", ["init"], { cwd: main });
      await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: main });
      await execFile(
        "git",
        [
          "-c",
          "user.email=qfai@example.com",
          "-c",
          "user.name=qfai",
          "-c",
          "commit.gpgsign=false",
          "commit",
          "--allow-empty",
          "-m",
          "root",
        ],
        { cwd: main },
      );

      const linked = path.join(root, "linked");
      await execFile("git", ["worktree", "add", linked], { cwd: main });

      const output = await captureStdout(async () => {
        await runInit({ dir: linked, force: false, dryRun: false, yes: true });
      });

      const reported = /git config: core\.symlinks=true \(([^)]+)\)/.exec(output);
      expect(reported).not.toBeNull();
      const reportedPath = reported?.[1] ?? "";
      expect(reportedPath).not.toContain("worktrees");
      // The reported file must be the one git actually wrote to.
      await access(reportedPath);
      const { stdout: origin } = await execFile(
        "git",
        ["config", "--local", "--show-origin", "--get", "core.symlinks"],
        { cwd: linked },
      );
      expect(origin.trim()).toContain("true");
      expect(origin.replace(/\\/g, "/").toLowerCase()).toContain(
        reportedPath.replace(/\\/g, "/").toLowerCase(),
      );
    } finally {
      await removeTempTree(root);
    }
  });

  it("stays silent about core.symlinks outside a git repository", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const insideRepo = await execFile("git", ["rev-parse", "--git-dir"], { cwd: root }).then(
        () => true,
        () => false,
      );
      if (insideRepo) {
        return; // The temp dir happens to sit inside a repository.
      }

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(output).not.toContain("core.symlinks");
    } finally {
      await removeTempTree(root);
    }
  });

  it("previews the core.symlinks write when --dir does not exist yet", async () => {
    // --dry-run creates nothing, so the target directory is still missing when
    // the git probe runs; spawning a child in a missing cwd fails with ENOENT
    // and the preview said nothing about a write the real run performs against
    // the enclosing repository (the template copy creates the directory first).
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const repo = path.join(root, "repo");
      await mkdir(repo, { recursive: true });
      await execFile("git", ["init"], { cwd: repo });
      await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: repo });

      const missing = path.join(repo, "not-created-yet");
      const dryRunOutput = await captureStdout(async () => {
        await runInit({ dir: missing, force: false, dryRun: true, yes: true });
      });

      expect(dryRunOutput).toContain("would set: git config --local core.symlinks true");

      const realOutput = await captureStdout(async () => {
        await runInit({ dir: missing, force: false, dryRun: false, yes: true });
      });

      expect(realOutput).toContain("git config: core.symlinks=true");
      const { stdout: after } = await execFile(
        "git",
        ["config", "--local", "--get", "core.symlinks"],
        { cwd: repo },
      );
      expect(after.trim()).toBe("true");
    } finally {
      await removeTempTree(root);
    }
  });

  it("reports that a worktree-scope override keeps core.symlinks off", async () => {
    // `--local` reads the common .git/config, but with
    // extensions.worktreeConfig=true the per-worktree config.worktree outranks
    // it. A local `true` there was reported as "already true" while the
    // effective value git acts on stayed false.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const main = path.join(root, "main");
      await mkdir(main, { recursive: true });
      await execFile("git", ["init"], { cwd: main });
      await execFile("git", ["config", "--local", "core.symlinks", "true"], { cwd: main });
      await execFile(
        "git",
        [
          "-c",
          "user.email=qfai@example.com",
          "-c",
          "user.name=qfai",
          "-c",
          "commit.gpgsign=false",
          "commit",
          "--allow-empty",
          "-m",
          "root",
        ],
        { cwd: main },
      );

      const linked = path.join(root, "linked");
      await execFile("git", ["worktree", "add", linked], { cwd: main });
      await execFile("git", ["config", "extensions.worktreeConfig", "true"], { cwd: linked });
      await execFile("git", ["config", "--worktree", "core.symlinks", "false"], { cwd: linked });

      const output = await captureStdout(async () => {
        await runInit({ dir: linked, force: false, dryRun: false, yes: true });
      });

      expect(output).toContain("git config: core.symlinks already true");
      expect(output).toContain("core.symlinks の実効値は false のままです");
      const { stdout: effective } = await execFile("git", ["config", "--get", "core.symlinks"], {
        cwd: linked,
      });
      expect(effective.trim()).toBe("false");
    } finally {
      await removeTempTree(root);
    }
  });

  it("still writes core.symlinks when GIT_CONFIG is set in the environment", async () => {
    // GIT_CONFIG is a historical alias for --file, so git counts it as a second
    // config-file selection and every --local form exits 129 with
    // "only one config file at a time". The read swallowed that, so the failure
    // only surfaced at the write — after the template copy had already run.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    const previous = process.env.GIT_CONFIG;
    try {
      const repo = path.join(root, "repo");
      await mkdir(repo, { recursive: true });
      await execFile("git", ["init"], { cwd: repo });
      await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: repo });
      process.env.GIT_CONFIG = path.join(root, "unrelated-gitconfig");

      const output = await captureStdout(async () => {
        await runInit({ dir: repo, force: false, dryRun: false, yes: true });
      });

      expect(output).toContain("git config: core.symlinks=true");
      // The verification read must not inherit GIT_CONFIG either — git would
      // refuse it for the same reason.
      delete process.env.GIT_CONFIG;
      const { stdout: stored } = await execFile(
        "git",
        ["config", "--local", "--get", "core.symlinks"],
        { cwd: repo },
      );
      expect(stored.trim()).toBe("true");
    } finally {
      if (previous === undefined) {
        delete process.env.GIT_CONFIG;
      } else {
        process.env.GIT_CONFIG = previous;
      }
      await removeTempTree(root);
    }
  });

  it("does not overwrite specs/contracts even with --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const specPath = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
      const uiContractPath = path.join(root, ".qfai", "contracts", "ui", "ui-0001-sample.yaml");

      const customizedSpec = "customized spec\n";
      const customizedContract = "customized contract\n";
      await mkdir(path.dirname(specPath), { recursive: true });
      await mkdir(path.dirname(uiContractPath), { recursive: true });
      await writeFile(specPath, customizedSpec, "utf-8");
      await writeFile(uiContractPath, customizedContract, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readFile(specPath, "utf-8")).toBe(customizedSpec);
      expect(await readFile(uiContractPath, "utf-8")).toBe(customizedContract);

      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      expect(await readFile(specPath, "utf-8")).toBe(customizedSpec);
      expect(await readFile(uiContractPath, "utf-8")).toBe(customizedContract);
    } finally {
      await removeTempTree(root);
    }
  });

  // A project that installed an older package keeps its own agent-routing.yml
  // (manifest/ is user configuration and --force never overwrites it), so a
  // phase added to the shipped routing used to reach new projects only: the
  // regenerated skills routed to a phase the project's table did not have.
  it("--force merges a missing routing phase in without rewriting the project's taxonomy", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const routingPath = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");

      // Roll this project back to a table without the ATDD `red` phase, and
      // give it a taxonomy of its own: an extra agent in `coverage`, and one
      // shipped-required agent deliberately dropped from it.
      const doc = parseDocument(withoutAtddRedPhase(await readFile(routingPath, "utf-8")));
      const coverage = atddPhases(doc).items.find(
        (item) => isMap(item) && item.get("id") === "coverage",
      );
      if (!isMap(coverage)) throw new Error("qfai-atdd has no coverage phase");
      coverage.set("mandatory_agents", ["house-engineer"]);
      await writeFile(routingPath, doc.toString({ lineWidth: 0 }), "utf-8");
      // The merge replaces the file through a temp file and a rename, which
      // makes a new inode: the mode has to be carried over, or a manifest kept
      // at 0600 comes back readable by everyone.
      if (process.platform !== "win32") await chmod(routingPath, 0o600);

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      const merged = await readFile(routingPath, "utf-8");
      const atddSection = merged.slice(merged.indexOf("- skill: qfai-atdd"));
      // The phase is back, ahead of `implementation` as shipped.
      expect(atddSection.indexOf("- id: red")).toBeGreaterThan(-1);
      expect(atddSection.indexOf("- id: red")).toBeLessThan(
        atddSection.indexOf("- id: implementation"),
      );
      expect(captured).toContain("I-ROUTING-PHASE-MERGED");
      // The project's own edit is untouched, and its dropped required agent is
      // reported rather than restored.
      expect(merged).toContain("house-engineer");
      expect(captured).toContain("W-ROUTING-AGENT-DIVERGED");
      expect(captured).toContain("test-design-analyst");
      if (process.platform !== "win32") {
        expect((await stat(routingPath)).mode & 0o777).toBe(0o600);
      }
      // No half-written temp file is left behind in the manifest layer.
      const manifestEntries = await fg("*", {
        cwd: path.dirname(routingPath),
        dot: true,
        onlyFiles: true,
      });
      expect(manifestEntries.filter((entry) => entry.endsWith(".tmp"))).toEqual([]);

      // Idempotent: a second --force has nothing left to add.
      const second = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });
      expect(second).not.toContain("I-ROUTING-PHASE-MERGED");
      expect(await readFile(routingPath, "utf-8")).toBe(merged);
    } finally {
      await removeTempTree(root);
    }
  });

  // `writeFile` resolves a symlink and writes through it, so a project whose
  // `agent-routing.yml` is a link into another tree would have had that other
  // file rewritten by `qfai init`. `copyTemplateTree` already `lstat`s its
  // destinations for this; the merge's direct write has to as well.
  it("--force refuses to merge through a symlinked agent-routing.yml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-link-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const routingPath = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");

      // A valid, writable routing table that lives outside the project and is
      // missing the ATDD `red` phase — exactly what the merge wants to add.
      const stale = withoutAtddRedPhase(await readFile(routingPath, "utf-8"));
      const escapee = path.join(outside, "agent-routing.yml");
      await writeFile(escapee, stale, "utf-8");
      await rm(routingPath, { force: true });
      try {
        await symlink(escapee, routingPath, "file");
      } catch {
        return; // No symlinks here (Windows without Developer Mode).
      }

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("W-ROUTING-MANIFEST-UNREADABLE");
      expect(captured).not.toContain("I-ROUTING-PHASE-MERGED");
      // Nothing was written through the link.
      expect(await readFile(escapee, "utf-8")).toBe(stale);
    } finally {
      await removeTempTree(root);
      await removeTempTree(outside);
    }
  });

  // `Buffer.toString("utf-8")` does not fail on bytes that are not UTF-8: it
  // substitutes U+FFFD for each of them. The YAML still parses, so without a
  // strict decode the merge would rename the substituted text over the user's
  // manifest and those bytes would be gone for good.
  it("--force skips a routing manifest that is not valid UTF-8", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-utf8-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const routingPath = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");

      // Missing the ATDD `red` phase — so there is something to add — with a
      // comment carrying a byte sequence no UTF-8 decoder can accept.
      const stale = withoutAtddRedPhase(await readFile(routingPath, "utf-8"));
      const bytes = Buffer.concat([
        Buffer.from("# owner: ", "utf-8"),
        Buffer.from([0xff, 0xfe]),
        Buffer.from(`\n${stale}`, "utf-8"),
      ]);
      await writeFile(routingPath, bytes);

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("W-ROUTING-MANIFEST-UNREADABLE");
      expect(captured).not.toContain("I-ROUTING-PHASE-MERGED");
      // Byte for byte what the project had: nothing was substituted and
      // written back.
      expect(await readFile(routingPath)).toEqual(bytes);
    } finally {
      await removeTempTree(root);
    }
  });

  // A manifest `init` cannot open is the same class of problem as one it cannot
  // parse: the contract is a note and a skipped merge. Letting the read error
  // out of the merge aborted the whole `--force` run over an optional step.
  it("--force reports an unreadable routing manifest instead of failing init", async () => {
    // Needs an unreadable file, which POSIX modes give and root ignores.
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-eacces-"));
    const routingPath = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const stale = withoutAtddRedPhase(await readFile(routingPath, "utf-8"));
      await writeFile(routingPath, stale, "utf-8");
      await chmod(routingPath, 0o000);

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("W-ROUTING-MANIFEST-UNREADABLE");
      expect(captured).not.toContain("I-ROUTING-PHASE-MERGED");
      // The rest of the run still happened rather than being thrown away.
      await access(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "SKILL.md"));
      await chmod(routingPath, 0o600);
      expect(await readFile(routingPath, "utf-8")).toBe(stale);
    } finally {
      await chmod(routingPath, 0o600).catch(() => undefined);
      await removeTempTree(root);
    }
  });

  // The replacement is a new inode created by whoever runs `init`, so under
  // `sudo qfai init --force` — or in any shared tree where the manifest belongs
  // to somebody else — a silent rename hands the user's own file to root and
  // leaves them unable to edit it through `qfai-configure`.
  it("--force keeps the routing manifest's owner across the merge", async () => {
    // Needs a process that may hand a file to another owner.
    if (process.platform === "win32" || process.getuid?.() !== 0) return;
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-owner-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const routingPath = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");
      await writeFile(
        routingPath,
        withoutAtddRedPhase(await readFile(routingPath, "utf-8")),
        "utf-8",
      );
      await chown(routingPath, 1000, 1000);

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("I-ROUTING-PHASE-MERGED");
      const after = await lstat(routingPath);
      expect(after.uid).toBe(1000);
      expect(after.gid).toBe(1000);
    } finally {
      await removeTempTree(root);
    }
  });

  // `--force` regenerates `assistant/agents/**` but never the project's
  // `agent-catalog.yml`, so a phase spliced in ahead of an agent the project
  // removed would leave `qfai validate` failing (QFAI-AGENT-008) on a table
  // that validated a moment earlier.
  it("--force skips a routing phase the project's agent catalog cannot satisfy", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-catalog-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const manifestDir = path.join(root, ".qfai", "assistant", "manifest");
      const routingPath = path.join(manifestDir, "agent-routing.yml");
      const catalogPath = path.join(manifestDir, "agent-catalog.yml");

      await writeFile(
        routingPath,
        withoutAtddRedPhase(await readFile(routingPath, "utf-8")),
        "utf-8",
      );
      // The supported removal path: the agent is gone from the catalog.
      const catalog = parseDocument(await readFile(catalogPath, "utf-8"));
      const agents = catalog.get("agents");
      if (!isSeq(agents)) throw new Error("agent-catalog.yml has no agents sequence");
      agents.items = agents.items.filter(
        (item) => !(isMap(item) && item.get("id") === "qa-gatekeeper"),
      );
      await writeFile(catalogPath, catalog.toString({ lineWidth: 0 }), "utf-8");

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("W-ROUTING-AGENT-UNKNOWN");
      expect(captured).toContain("qa-gatekeeper");
      expect(atddPhaseIds(await readFile(routingPath, "utf-8"))).not.toContain("red");
    } finally {
      await removeTempTree(root);
    }
  });

  // The merge runs after the create-only copy, but `--dry-run` copies nothing,
  // so the manifest layer is legitimately absent there. An absent path is not
  // an unsafe one: it is simply nothing to merge into, and warning about it
  // would put a write-safety diagnostic on every `--force --dry-run`.
  it("--force --dry-run reports no routing warning when there is no manifest yet", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-dry-"));
    try {
      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: true, yes: true });
      });

      expect(captured).not.toContain("W-ROUTING");
      expect(captured).not.toContain("I-ROUTING-PHASE-MERGED");
    } finally {
      await removeTempTree(root);
    }
  });

  // An `lstat` on the manifest — like `O_NOFOLLOW` — answers for the last path
  // component only. A project whose whole `manifest/` directory is a link out
  // of the tree has a perfectly ordinary file at the end of it, so both checks
  // passed while every byte written still landed outside the project.
  it("--force refuses to merge through a symlinked manifest directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-dirlink-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const manifestDir = path.join(root, ".qfai", "assistant", "manifest");
      const escapee = path.join(outside, "manifest");

      // Move the real manifest layer out of the project and link to it.
      await rename(manifestDir, escapee);
      try {
        await symlink(escapee, manifestDir, "dir");
      } catch {
        await rename(escapee, manifestDir);
        return; // No symlinks here (Windows without Developer Mode).
      }
      const escapedRouting = path.join(escapee, "agent-routing.yml");
      const stale = withoutAtddRedPhase(await readFile(escapedRouting, "utf-8"));
      await writeFile(escapedRouting, stale, "utf-8");

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("W-ROUTING-MANIFEST-UNREADABLE");
      expect(captured).not.toContain("I-ROUTING-PHASE-MERGED");
      // Nothing was written to the file outside the project.
      expect(await readFile(escapedRouting, "utf-8")).toBe(stale);
    } finally {
      await removeTempTree(root);
      await removeTempTree(outside);
    }
  });

  // `review-profiles.yml` is excluded from `--force` exactly as the catalog is,
  // so a skill entry shipped alongside a new profile would be appended whole
  // into a project that has neither — leaving `review_profile:` naming a
  // profile nothing declares when the reviewers for that skill are selected.
  it("--force skips a routing entry whose review profile the project lacks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-routing-profile-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const manifestDir = path.join(root, ".qfai", "assistant", "manifest");
      const routingPath = path.join(manifestDir, "agent-routing.yml");
      const profilesPath = path.join(manifestDir, "review-profiles.yml");

      // A project on an older package: no `qfai-prototyping` routing entry, and
      // no `ui-bearing` profile for it to name either.
      const routing = parseDocument(await readFile(routingPath, "utf-8"));
      const entries = routing.get("routing");
      if (!isSeq(entries)) throw new Error("agent-routing.yml has no routing sequence");
      entries.items = entries.items.filter(
        (item) => !(isMap(item) && item.get("skill") === "qfai-prototyping"),
      );
      await writeFile(routingPath, routing.toString({ lineWidth: 0 }), "utf-8");
      const profiles = parseDocument(await readFile(profilesPath, "utf-8"));
      const declared = profiles.get("profiles");
      if (!isMap(declared)) throw new Error("review-profiles.yml has no profiles map");
      declared.delete("ui-bearing");
      await writeFile(profilesPath, profiles.toString({ lineWidth: 0 }), "utf-8");

      const captured = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      expect(captured).toContain("W-ROUTING-PROFILE-UNKNOWN");
      expect(captured).toContain("ui-bearing");
      expect(await readFile(routingPath, "utf-8")).not.toContain("- skill: qfai-prototyping");
    } finally {
      await removeTempTree(root);
    }
  });

  it("uses relative symlink targets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      const target = await readlink(skillLink);

      // Target should be relative (no absolute path)
      expect(path.isAbsolute(target)).toBe(false);
      // Target should contain the canonical source path
      const normalized = target.replace(/\\/g, "/");
      expect(normalized).toContain(".qfai/assistant/skills/qfai-configure");
    } finally {
      await removeTempTree(root);
    }
  });

  it("skips valid symlinks on re-run without --force (idempotent)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      const targetBefore = await readlink(skillLink);

      // Re-run without --force
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Symlink should still be valid
      await expectSymlink(skillLink);
      const targetAfter = await readlink(skillLink);
      expect(targetAfter).toBe(targetBefore);
    } finally {
      await removeTempTree(root);
    }
  });

  it("recreates broken symlinks without --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Break a symlink by removing the target and re-creating with wrong target
      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      await removeTempTree(skillLink);
      await symlink("../../nonexistent/path", skillLink, "dir");

      // Verify it's broken
      const brokenStat = await lstat(skillLink);
      expect(brokenStat.isSymbolicLink()).toBe(true);

      // Re-run — should fix the broken symlink
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      await expectSymlink(skillLink);
      await expectSymlinkTarget(skillLink, ".qfai/assistant/skills/qfai-configure");
      // Should be resolvable now
      await access(path.join(skillLink, "SKILL.md"));
    } finally {
      await removeTempTree(root);
    }
  });

  it("copilot-instructions.md references .github/skills/ instead of .github/prompts/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const copilotPath = path.join(root, ".github", "copilot-instructions.md");
      const content = await readFile(copilotPath, "utf-8");

      expect(content).toContain(".github/skills/");
      expect(content).not.toContain(".github/prompts/");
    } finally {
      await removeTempTree(root);
    }
  });

  it("generated agent instruction files reference no QFAI monorepo path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The per-tool entry points ...
      const entryPoints = [
        path.join(root, ".github", "copilot-instructions.md"),
        path.join(root, ".codex", "README.md"),
        path.join(root, ".agents", "README.md"),
        path.join(root, ".claude", "agents", "README.md"),
        path.join(root, ".github", "agents", "README.md"),
      ];
      // ... plus the whole instruction surface they hand the agent:
      // constitution, catalog contracts, skills and their references.
      const assistantSurface = await fg("assistant/**/*.{md,yml,yaml}", {
        cwd: path.join(root, ".qfai"),
        onlyFiles: true,
        followSymbolicLinks: false,
        absolute: true,
      });
      expect(assistantSurface.length).toBeGreaterThan(0);

      const generated = [...entryPoints, ...assistantSurface];

      for (const generatedPath of generated) {
        const content = await readFile(generatedPath, "utf-8");
        // `packages/qfai` only exists inside the QFAI monorepo; a rule that
        // names it is unresolvable in the consuming project it is written into.
        // The bare directory name counts: `Inspect \`packages/qfai\` structure`
        // is just as unresolvable as a path below it, so no trailing `/`.
        expect(content, `${generatedPath} names a QFAI monorepo path`).not.toMatch(
          /packages\/qfai\b/,
        );
      }
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps README.md as regular files (not symlinked)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const readmePaths = [
        path.join(root, ".claude", "agents", "README.md"),
        path.join(root, ".github", "agents", "README.md"),
        path.join(root, ".agents", "README.md"),
        path.join(root, ".codex", "README.md"),
      ];

      for (const readmePath of readmePaths) {
        const stat = await lstat(readmePath);
        expect(stat.isSymbolicLink()).toBe(false);
        expect(stat.isFile()).toBe(true);
      }
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0001
  it("New repo init creates both instructions files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const codeReviewPath = path.join(
        root,
        ".github",
        "instructions",
        "code-review.instructions.md",
      );
      const principlesPath = path.join(
        root,
        ".github",
        "instructions",
        "principles.instructions.md",
      );

      // Both files exist
      await access(codeReviewPath);
      await access(principlesPath);

      // Both files contain valid YAML frontmatter with applyTo and excludeAgent
      const codeReview = await readFile(codeReviewPath, "utf-8");
      const principles = await readFile(principlesPath, "utf-8");

      expect(codeReview).toContain("applyTo:");
      expect(codeReview).toContain("excludeAgent:");
      expect(principles).toContain("applyTo:");
      expect(principles).toContain("excludeAgent:");

      // code-review contains severity prefix definitions
      expect(codeReview).toContain("[BLOCKER]");
      expect(codeReview).toContain("[MAJOR]");

      // principles contains SOLID/KISS/YAGNI/DRY
      expect(principles).toContain("SOLID");
      expect(principles).toContain("KISS");
      expect(principles).toContain("YAGNI");
      expect(principles).toContain("DRY");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0002
  it("Skip when instructions files exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "custom-cr\n", "utf-8");
      await writeFile(path.join(instrDir, "principles.instructions.md"), "custom-pr\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      // Both files retain their original custom content
      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "custom-cr\n",
      );
      expect(await readFile(path.join(instrDir, "principles.instructions.md"), "utf-8")).toBe(
        "custom-pr\n",
      );
      // Report shows both as skipped
      expect(output).toContain("skipped");
      expect(output).toContain("code-review.instructions.md");
      expect(output).toContain("principles.instructions.md");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0003
  it("--force does not override instructions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "custom-cr\n", "utf-8");
      await writeFile(path.join(instrDir, "principles.instructions.md"), "custom-pr\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "custom-cr\n",
      );
      expect(await readFile(path.join(instrDir, "principles.instructions.md"), "utf-8")).toBe(
        "custom-pr\n",
      );
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0004
  it("Directory auto-creation for instructions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Case A: No .github/ directory at all
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const instrDir = path.join(root, ".github", "instructions");
      await access(instrDir);
      await access(path.join(instrDir, "code-review.instructions.md"));
      await access(path.join(instrDir, "principles.instructions.md"));
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0005
  it("Partial existing instructions files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "custom-cr\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // code-review retains custom content
      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "custom-cr\n",
      );
      // principles is created from template
      const principles = await readFile(path.join(instrDir, "principles.instructions.md"), "utf-8");
      expect(principles).toContain("SOLID");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0006
  it("Report includes instructions in counts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Case A: New repo, no instructions
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output).toContain("created:");
      // Activation guidance proves instructions were included in created
      expect(output).toContain("Copilot コードレビュー用 instructions を作成しました。");

      // Case B: Both files exist — re-run
      const output2 = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output2).toContain("code-review.instructions.md");
      expect(output2).toContain("principles.instructions.md");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0007
  it("--dry-run does not write instructions files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: true, yes: true });

      await expect(
        access(path.join(root, ".github", "instructions", "code-review.instructions.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        access(path.join(root, ".github", "instructions", "principles.instructions.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0008
  it("Instructions idempotency (3 consecutive runs)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Run 1: Both files created
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const instrDir = path.join(root, ".github", "instructions");
      const crAfterRun1 = await readFile(
        path.join(instrDir, "code-review.instructions.md"),
        "utf-8",
      );
      const prAfterRun1 = await readFile(
        path.join(instrDir, "principles.instructions.md"),
        "utf-8",
      );

      // Run 2: Both files skipped
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const crAfterRun2 = await readFile(
        path.join(instrDir, "code-review.instructions.md"),
        "utf-8",
      );
      const prAfterRun2 = await readFile(
        path.join(instrDir, "principles.instructions.md"),
        "utf-8",
      );
      expect(crAfterRun2).toBe(crAfterRun1);
      expect(prAfterRun2).toBe(prAfterRun1);

      // Run 3: Both files skipped
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const crAfterRun3 = await readFile(
        path.join(instrDir, "code-review.instructions.md"),
        "utf-8",
      );
      const prAfterRun3 = await readFile(
        path.join(instrDir, "principles.instructions.md"),
        "utf-8",
      );
      expect(crAfterRun3).toBe(crAfterRun1);
      expect(prAfterRun3).toBe(prAfterRun1);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0009
  it("SDD marker present in templates", async () => {
    const assetsRoot = getInitAssetsDir();
    const instructionsDir = path.join(assetsRoot, ".github", "instructions");

    const codeReview = await readFile(
      path.join(instructionsDir, "code-review.instructions.md"),
      "utf-8",
    );
    const principles = await readFile(
      path.join(instructionsDir, "principles.instructions.md"),
      "utf-8",
    );

    expect(codeReview).toContain("<!-- qfai:language-rules -->");
    expect(principles).toContain("<!-- qfai:language-rules -->");

    // Markers are positioned near the end of each file
    const codeReviewLines = codeReview.trimEnd().split("\n");
    const principlesLines = principles.trimEnd().split("\n");
    const codeReviewMarkerIdx = codeReviewLines.findIndex((l: string) =>
      l.includes("<!-- qfai:language-rules -->"),
    );
    const principlesMarkerIdx = principlesLines.findIndex((l: string) =>
      l.includes("<!-- qfai:language-rules -->"),
    );

    // Marker should be in the last 5 lines
    expect(codeReviewLines.length - codeReviewMarkerIdx).toBeLessThanOrEqual(5);
    expect(principlesLines.length - principlesMarkerIdx).toBeLessThanOrEqual(5);
  });

  // QFAI:SPEC-0003:TC-0003-0010
  it("Activation guidance printed on create", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // First run: guidance should appear
      const output1 = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output1).toContain("@github-copilot review");

      // Second run: guidance should NOT appear (files already exist)
      const output2 = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(output2).not.toContain("@github-copilot review");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0011
  it("Empty file treated as existing (instructions)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The empty file is not overwritten
      const content = await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8");
      expect(content).toBe("");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0012
  it("current init outputs remain stable after additive instruction assets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // All previously expected files still exist (instructions files are additive only)
      const expectedRegularFiles = [
        path.join(root, ".qfai", "assistant", "skills", "qfai-configure", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md"),
        path.join(root, ".qfai", "assistant", "constitution", "constitution.md"),
        path.join(root, ".qfai", "assistant", "agents", "delivery-planner.md"),
        path.join(root, ".github", "copilot-instructions.md"),
        path.join(root, ".codex", "README.md"),
        path.join(root, ".agents", "README.md"),
      ];

      for (const filePath of expectedRegularFiles) {
        await access(filePath);
      }

      // Skill symlinks still work
      const skillLink = path.join(root, ".claude", "skills", "qfai-configure");
      await expectSymlink(skillLink);
    } finally {
      await removeTempTree(root);
    }
  });

  it("appends QFAI entries to root .gitignore on first init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      expect(content).toContain("# ── QFAI managed (generated by qfai init) ──");
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/README.md");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).toContain(".qfai/report/*");
      expect(content).toContain(".qfai/evidence/*");
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");
    } finally {
      await removeTempTree(root);
    }
  });

  it("does not duplicate QFAI entries on re-init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const markerCount = content.split("# ── QFAI managed (generated by qfai init) ──").length - 1;
      expect(markerCount).toBe(1);
    } finally {
      await removeTempTree(root);
    }
  });

  it("appends QFAI entries to existing .gitignore", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await writeFile(path.join(root, ".gitignore"), "node_modules/\n", "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      expect(content).toMatch(/^node_modules\//m);
      expect(content).toContain(".qfai/review/*");
    } finally {
      await removeTempTree(root);
    }
  });

  it("strips legacy review-*/ negation lines when migrating from old managed block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      const legacyBlock = [
        "# ── QFAI managed (generated by qfai init) ──",
        ".qfai/report/*",
        "!.qfai/report/README.md",
        ".qfai/evidence/*",
        "!.qfai/evidence/README.md",
        ".qfai/discussion/discussion-*/",
        ".qfai/review/*",
        "!.qfai/review/README.md",
        "!.qfai/review/review-*/",
        "!.qfai/review/review-*/**",
        "",
      ].join("\n");
      await writeFile(path.join(root, ".gitignore"), legacyBlock, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const markerCount = content.split(QFAI_GITIGNORE_MARKER).length - 1;
      expect(markerCount).toBe(1);
      expect(content).toContain(".qfai/discussion/*");
      expect(content).not.toContain("!.qfai/discussion/README.md");
      expect(content).not.toContain(".qfai/discussion/discussion-*/");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/README.md");
    } finally {
      await removeTempTree(root);
    }
  });

  it("adds the governance negations to an existing managed block on re-init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // A block from before the negations shipped: marker + every required
      // entry, no legacy lines. The early return used to fire here, so the
      // negations only ever reached fresh inits.
      const preNegationBlock = [
        QFAI_GITIGNORE_MARKER,
        ".qfai/report/*",
        ".qfai/evidence/*",
        ".qfai/discussion/*",
        ".qfai/review/*",
        ".qfai/state.json",
        "",
      ].join("\n");
      await writeFile(path.join(root, ".gitignore"), preNegationBlock, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      expect(content.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(content).toContain(negation);
      }

      // Still idempotent once the negations are present.
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readFile(path.join(root, ".gitignore"), "utf-8")).toBe(content);
    } finally {
      await removeTempTree(root);
    }
  });

  it("rewrites a managed block whose negations sit above their ignore line", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // Every negation string is present, but git applies the LAST matching
      // pattern, so `.qfai/evidence/*` still wins and the decision records
      // stay ignored. A presence-only freshness check called this current.
      const misordered = [
        QFAI_GITIGNORE_MARKER,
        ...QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
        ".qfai/report/*",
        ".qfai/evidence/*",
        ".qfai/discussion/*",
        ".qfai/review/*",
        ".qfai/state.json",
        "",
      ].join("\n");
      await writeFile(path.join(root, ".gitignore"), misordered, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      const lines = content.split("\n");
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(lines.indexOf(negation)).toBeGreaterThan(lines.indexOf(".qfai/evidence/*"));
      }
    } finally {
      await removeTempTree(root);
    }
  });

  it("keeps an intentionally removed ignore entry across re-init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      // A project that tracks its whole audit trail deletes `.qfai/evidence/*`.
      // QFAI-REVIEW-008 says that is fine; re-init must not undo it.
      const tracked = [
        QFAI_GITIGNORE_MARKER,
        ".qfai/report/*",
        ".qfai/discussion/*",
        ".qfai/review/*",
        ".qfai/state.json",
        ...QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
        "",
      ].join("\n");
      await writeFile(path.join(root, ".gitignore"), tracked, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      expect(content).not.toContain(".qfai/evidence/*");
      expect(content.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
    } finally {
      await removeTempTree(root);
    }
  });

  // TC-1.4.1 — fresh init creates DESIGN.md at root with template byte content
  it("ships DESIGN.md at root with template byte content (TC-1.4.1)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const designMdPath = path.join(root, "DESIGN.md");
      const templatePath = path.join(getInitAssetsDir(), "root", "DESIGN.md");

      const writtenBytes = await readFile(designMdPath);
      const templateBytes = await readFile(templatePath);
      expect(writtenBytes.equals(templateBytes)).toBe(true);
    } finally {
      await removeTempTree(root);
    }
  });

  // TC-1.4.2 — re-init without --force preserves user-modified DESIGN.md
  it("preserves user-modified DESIGN.md across re-init without --force (TC-1.4.2)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const designMdPath = path.join(root, "DESIGN.md");
      const userContent = "# my brand\n";
      await writeFile(designMdPath, userContent, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(designMdPath, "utf-8")).toBe(userContent);
    } finally {
      await removeTempTree(root);
    }
  });

  // TC-1.4.3 — --force does NOT overwrite a user-modified DESIGN.md
  it("--force does not overwrite a user-modified DESIGN.md (TC-1.4.3)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const designMdPath = path.join(root, "DESIGN.md");
      const userContent = "custom design\n";
      await writeFile(designMdPath, userContent, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(designMdPath, "utf-8")).toBe(userContent);
    } finally {
      await removeTempTree(root);
    }
  });

  // TC-1.4.4 — dry-run does not write DESIGN.md
  it("dry-run does not write DESIGN.md (TC-1.4.4)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      await runInit({ dir: root, force: false, dryRun: true, yes: true });
      await expect(access(path.join(root, "DESIGN.md"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(root);
    }
  });

  // 出力先の開示。`--dir` の既定値は cwd なので、宛先を名指ししない出力では
  // 誤ったディレクトリへの実行が正しい実行とバイト単位で同一になる。
  it("names the destination directory before the work starts and in the report header", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-dest-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });
      const dest = path.resolve(root);
      const opening = `qfai init: dest=${dest}`;
      const header = `qfai init: dry-run (dest=${dest})`;
      expect(output).toContain(opening);
      expect(output).toContain(header);
      // 開示は処理開始前に出す — 中断・失敗した実行でも対象が残る。
      expect(output.indexOf(opening)).toBeLessThan(output.indexOf(header));
    } finally {
      await removeTempTree(root);
    }
  });

  // TC-1.4.5 — init reports DESIGN.md as created on first run, skipped on second run
  it("reports DESIGN.md as created on first run and skipped on second run (TC-1.4.5)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-design-"));
    try {
      const firstRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(firstRun).toMatch(/created:\s*\d+/);

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(secondRun).toContain("skipped paths:");
      expect(secondRun).toContain("DESIGN.md");
    } finally {
      await removeTempTree(root);
    }
  });

  it("does not track review-*/ subdirectories after init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const content = await readFile(path.join(root, ".gitignore"), "utf-8");
      // .qfai/review/* ignores everything; no negation whitelists review-*/ back
      expect(content).toContain(".qfai/review/*");
      expect(content).not.toContain("!.qfai/review/review-*/");
      expect(content).not.toContain("!.qfai/review/review-*/**");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0021 (TDD-0021): 4-layer asset-tree seed
  it("TC-0003-0021 (TDD-0021): seeds .qfai/assistant/{constitution,manifest,catalog,process}/.gitkeep on fresh init", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0021-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      for (const layer of ["constitution", "manifest", "catalog", "process"]) {
        const gitkeep = path.join(root, ".qfai", "assistant", layer, ".gitkeep");
        const stat = await lstat(gitkeep);
        expect(stat.isFile()).toBe(true);
        const body = await readFile(gitkeep, "utf-8");
        expect(body).toContain(`.qfai/assistant/${layer}/`);
        // The seeded body lands in every consuming repo, so it must carry no
        // QFAI-internal cross-spec change ID (`CHG-NNN`) — that ID resolves
        // to nothing outside this repository's own `_policies/10_delta.md`.
        expect(body).not.toMatch(/\bCHG-[0-9]+\b/);
      }
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): project-root .qfai/steering/ seed
  it("TC-0003-0022 (TDD-0022): seeds project-root .qfai/steering/ surface (README + .gitkeep + _templates/entry.md)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const readme = await readFile(path.join(root, ".qfai", "steering", "README.md"), "utf-8");
      expect(readme).toContain("AI work-log surface");
      expect(readme).toContain("decision");
      expect(readme).toContain("handoff");
      const gitkeepStat = await lstat(path.join(root, ".qfai", "steering", ".gitkeep"));
      expect(gitkeepStat.isFile()).toBe(true);
      const tplBody = await readFile(
        path.join(root, ".qfai", "steering", "_templates", "entry.md"),
        "utf-8",
      );
      expect(tplBody).toMatch(/id:\s*2026-MM-DD-kebab-case-id/);
      expect(tplBody).toContain("kind: decision");
      expect(tplBody).toMatch(/promote-to:/);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): re-init preserves user edits in .qfai/steering/
  it("TC-0003-0022 (TDD-0022): re-init does not overwrite user edits in .qfai/steering/README.md", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022b-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const readmePath = path.join(root, ".qfai", "steering", "README.md");
      const userEdit = "# my custom worklog notes\n";
      await writeFile(readmePath, userEdit, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const after = await readFile(readmePath, "utf-8");
      expect(after).toBe(userEdit);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): re-init reports a stale steering seed
  it("TC-0003-0022 (TDD-0022): re-init reports .qfai/steering/ seed drift instead of skipping silently", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022c-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // An untouched tree is already current: the seed files appear in the
      // skipped list and must not draw a drift notice.
      const cleanRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      expect(cleanRun).not.toContain("differs from the seed this qfai release generates");

      const readmePath = path.join(root, ".qfai", "steering", "README.md");
      const templatePath = path.join(root, ".qfai", "steering", "_templates", "entry.md");
      await writeFile(readmePath, "# my custom worklog notes\n", "utf-8");
      await writeFile(templatePath, "---\nid: stale\n---\n", "utf-8");

      const staleRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(staleRun).toContain(
        ".qfai/steering/README.md differs from the seed this qfai release generates",
      );
      expect(staleRun).toContain(
        ".qfai/steering/_templates/entry.md differs from the seed this qfai release generates",
      );
      expect(staleRun).toMatch(
        /first differing line \d+; on disk \d+ lines, latest seed \d+ lines/,
      );
      expect(staleRun).toContain("create-only");
      // The notice never implies a rewrite happened.
      expect(await readFile(readmePath, "utf-8")).toBe("# my custom worklog notes\n");
      expect(await readFile(templatePath, "utf-8")).toBe("---\nid: stale\n---\n");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): CRLF is not drift
  it("TC-0003-0022 (TDD-0022): re-init does not report drift for a CRLF copy of an unedited seed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022d-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const readmePath = path.join(root, ".qfai", "steering", "README.md");
      const templatePath = path.join(root, ".qfai", "steering", "_templates", "entry.md");
      // What core.autocrlf=true (or a Windows editor) leaves behind: the same
      // body, every LF rewritten as CRLF.
      for (const target of [readmePath, templatePath]) {
        const body = await readFile(target, "utf-8");
        await writeFile(target, body.replace(/\n/g, "\r\n"), "utf-8");
      }

      const crlfRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(crlfRun).not.toContain("differs from the seed this qfai release generates");
      expect(crlfRun).not.toContain("could not be compared");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0022 (TDD-0022): an uncomparable seed path is reported
  it("TC-0003-0022 (TDD-0022): re-init reports a steering seed path it cannot compare", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0022e-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      // A directory where the seed file belongs: occupied, so create-only skips
      // it, but there is no body to compare — that must not read as "current".
      const readmePath = path.join(root, ".qfai", "steering", "README.md");
      // `removeTempTree` rather than a bare `rm`: this file routes every removal
      // through the helper, and its `force` / retry contract is what is wanted
      // here too — the seed is a regular file, so the recursive flag is inert.
      await removeTempTree(readmePath);
      await mkdir(readmePath, { recursive: true });

      const blockedRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(blockedRun).toContain(
        ".qfai/steering/README.md could not be compared against the seed this qfai release generates",
      );
      expect(blockedRun).toContain("whether it is current is unknown");
      // The unaffected sibling stays silent, and the run still succeeds.
      expect(blockedRun).not.toContain(".qfai/steering/_templates/entry.md could not be compared");
      const dirStat = await lstat(readmePath);
      expect(dirStat.isDirectory()).toBe(true);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): --upgrade-assistant-tree migration
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree copies legacy steering/ files into the 4-layer tree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023-"));
    try {
      // Simulate a legacy v1.8 layout: seed .qfai/assistant/steering/ with content
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "# legacy test layers\n", "utf-8");
      await writeFile(path.join(legacy, "agent-catalog.yml"), "agents: []\n", "utf-8");

      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });

      const newCatalog = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "test-layers.md"),
        "utf-8",
      );
      expect(newCatalog).toContain("legacy test layers");
      const newManifest = await readFile(
        path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml"),
        "utf-8",
      );
      expect(newManifest).toContain("agents: []");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): --upgrade walks instructions/ in
  // addition to steering/, and leaves the canonical manifest/ layer untouched
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree relocates files from both probed pre-recut surfaces (instructions/, steering/) and keeps manifest/ in place", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023-2s-"));
    try {
      // legacy instructions/drift-protocol.md → constitution/drift-protocol.md
      const legacyInstructions = path.join(root, ".qfai", "assistant", "instructions");
      await mkdir(legacyInstructions, { recursive: true });
      await writeFile(
        path.join(legacyInstructions, "drift-protocol.md"),
        "# legacy drift\n",
        "utf-8",
      );
      // legacy steering/test-layers.md → catalog/test-layers.md
      const legacyStg = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacyStg, { recursive: true });
      await writeFile(path.join(legacyStg, "test-layers.md"), "# legacy layers\n", "utf-8");
      // pre-existing manifest/spec_required_files.json — manifest/ is never
      // probed by the helper because the recut leaves its path unchanged, so
      // the file must simply stay where it is.
      const legacyManifest = path.join(root, ".qfai", "assistant", "manifest");
      await mkdir(legacyManifest, { recursive: true });
      await writeFile(
        path.join(legacyManifest, "spec_required_files.json"),
        '{"value": 1}\n',
        "utf-8",
      );

      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });

      const drift = await readFile(
        path.join(root, ".qfai", "assistant", "constitution", "drift-protocol.md"),
        "utf-8",
      );
      expect(drift).toContain("legacy drift");
      const layers = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "test-layers.md"),
        "utf-8",
      );
      expect(layers).toContain("legacy layers");
      // manifest/spec_required_files.json is left exactly as seeded: the
      // helper does not walk manifest/, so nothing relocates or rewrites it.
      const manifestFile = await readFile(
        path.join(root, ".qfai", "assistant", "manifest", "spec_required_files.json"),
        "utf-8",
      );
      expect(manifestFile).toContain('"value": 1');
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): legacy process/migrations/ doesn't double-nest
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree strips leading process/ so legacy process/migrations/foo.md lands at process/migrations/foo.md (no double nesting)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023-pp-"));
    try {
      const legacyProcess = path.join(
        root,
        ".qfai",
        "assistant",
        "steering",
        "process",
        "migrations",
      );
      await mkdir(legacyProcess, { recursive: true });
      await writeFile(path.join(legacyProcess, "v1.5.0-foo.md"), "# old memo\n", "utf-8");

      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });

      // CORRECT destination
      const correctDest = path.join(
        root,
        ".qfai",
        "assistant",
        "process",
        "migrations",
        "v1.5.0-foo.md",
      );
      const movedBody = await readFile(correctDest, "utf-8");
      expect(movedBody).toContain("old memo");

      // INCORRECT (double-nested) destination MUST NOT exist
      let doubleNested = false;
      try {
        await access(
          path.join(
            root,
            ".qfai",
            "assistant",
            "process",
            "process",
            "migrations",
            "v1.5.0-foo.md",
          ),
        );
        doubleNested = true;
      } catch {
        doubleNested = false;
      }
      expect(doubleNested).toBe(false);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): review-gate.rules.yml maps to catalog layer (not manifest)
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree routes review-gate.rules.yml to catalog/ (not manifest/)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023-rg-"));
    try {
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "review-gate.rules.yml"), "rules: []\n", "utf-8");

      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });

      // catalog/ MUST contain it (review-gate is a reference rules catalog,
      // not a routing manifest).
      const catalogCopy = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "review-gate.rules.yml"),
        "utf-8",
      );
      expect(catalogCopy).toContain("rules: []");

      // manifest/ MUST NOT contain it.
      let manifestExists = false;
      try {
        await access(path.join(root, ".qfai", "assistant", "manifest", "review-gate.rules.yml"));
        manifestExists = true;
      } catch {
        manifestExists = false;
      }
      expect(manifestExists).toBe(false);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): non-top-level `migrations` segment falls through to catalog/
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree leaves non-top-level migrations segments in catalog/, not process/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023-mig-"));
    try {
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      // `foo/migrations/bar.md` — `migrations` is NOT at segments[0].
      const subDir = path.join(legacy, "foo", "migrations");
      await mkdir(subDir, { recursive: true });
      await writeFile(path.join(subDir, "bar.md"), "user note\n", "utf-8");

      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });

      // process/ MUST NOT contain it (the top-segment guard rejects this).
      let processExists = false;
      try {
        await access(
          path.join(root, ".qfai", "assistant", "process", "foo", "migrations", "bar.md"),
        );
        processExists = true;
      } catch {
        processExists = false;
      }
      expect(processExists).toBe(false);

      // catalog/ (default fallback) MUST contain it under the same subpath.
      const catalogCopy = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "foo", "migrations", "bar.md"),
        "utf-8",
      );
      expect(catalogCopy).toContain("user note");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0023 (TDD-0023): upgrade on already-upgraded project is a no-op note
  it("TC-0003-0023 (TDD-0023): --upgrade-assistant-tree on an already-upgraded project emits W-USER-EDIT-PRESERVED only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0023b-"));
    try {
      // First, perform a migration so the new tree exists with content
      // already in the 4 layers.
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "legacy A\n", "utf-8");
      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });
      // Second --upgrade run: catalog/test-layers.md already exists; the
      // helper must emit the W-USER-EDIT-PRESERVED note and NOT overwrite.
      const stdout = await captureStdout(async () => {
        await runInit({
          dir: root,
          force: false,
          dryRun: false,
          yes: true,
          upgradeAssistantTree: true,
        });
      });
      expect(stdout).toContain("W-USER-EDIT-PRESERVED");
      // Existing file is preserved (not overwritten).
      const preserved = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "test-layers.md"),
        "utf-8",
      );
      expect(preserved).toContain("legacy A");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0024 (TDD-0024): migration memo authoring
  it("TC-0003-0024 (TDD-0024): --upgrade-assistant-tree writes a migration memo and is idempotent on re-run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0024-"));
    try {
      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });
      const memoMatches = await fg(
        ".qfai/assistant/process/migrations/v*-assistant-layer-recut.md",
        {
          cwd: root,
          dot: true,
        },
      );
      expect(memoMatches.length).toBe(1);
      const memoPath = path.join(root, memoMatches[0] ?? "");
      const firstBody = await readFile(memoPath, "utf-8");
      expect(firstBody).toContain("assistant-layer recut");
      expect(firstBody).toContain("sunset: v1.10.0");

      // Re-run: memo MUST NOT be modified (commit-immutable per OC-53).
      await runInit({
        dir: root,
        force: false,
        dryRun: false,
        yes: true,
        upgradeAssistantTree: true,
      });
      const secondBody = await readFile(memoPath, "utf-8");
      expect(secondBody).toBe(firstBody);
    } finally {
      await removeTempTree(root);
    }
  });

  it("names only the pre-recut surfaces it probed when reporting that none were found", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-upgrade-manifest-"));
    try {
      // Populate the canonical manifest/ layer and leave the two pre-recut
      // surfaces (steering/, instructions/) absent. The helper deliberately
      // never stats manifest/ — its path is unchanged by the recut — so
      // neither the note nor the memo may claim it was examined.
      const manifestDir = path.join(root, ".qfai", "assistant", "manifest");
      await mkdir(manifestDir, { recursive: true });
      await writeFile(path.join(manifestDir, "my-routing.yml"), "phases: []\n", "utf-8");

      const stdout = await captureStdout(async () => {
        await runInit({
          dir: root,
          force: false,
          dryRun: false,
          yes: true,
          upgradeAssistantTree: true,
        });
      });

      expect(stdout).toContain(
        "W-USER-EDIT-PRESERVED: no pre-recut surfaces (.qfai/assistant/{steering,instructions}/) found",
      );
      expect(stdout).not.toContain("{steering,instructions,manifest}");

      const memoMatches = await fg(
        ".qfai/assistant/process/migrations/v*-assistant-layer-recut.md",
        { cwd: root, dot: true },
      );
      expect(memoMatches.length).toBe(1);
      const memoBody = await readFile(path.join(root, memoMatches[0] ?? ""), "utf-8");
      expect(memoBody).toContain(
        "No pre-recut surfaces (`.qfai/assistant/{steering,instructions}/`) found",
      );
      expect(memoBody).not.toContain("{steering,instructions,manifest}");
      expect(memoBody).not.toContain(
        "Source layout: .qfai/assistant/{steering, instructions, manifest}/",
      );
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:SPEC-0003:TC-0003-0025 (TDD-0025): assistantPaths.ts SSOT — init.ts routes new layers through the helper
  it("TC-0003-0025 (TDD-0025): init.ts builds new 4-layer paths through assistantPaths.ts helpers", async () => {
    const initSrc = await readFile(
      path.join(__dirname, "..", "..", "src", "cli", "commands", "init.ts"),
      "utf-8",
    );
    expect(initSrc).toMatch(/from "\.\.\/\.\.\/core\/paths\/assistantPaths\.js"/);
    expect(initSrc).toContain("joinAssistantLayer");
    expect(initSrc).toContain("joinProjectSteering");
    expect(initSrc).toContain("joinMigrationMemo");
    // Layer path strings in path-construction position (e.g. path.join with
    // literal "constitution"/"manifest"/"catalog"/"process") should not
    // appear inside init.ts — those go through the SSOT instead.
    expect(initSrc).not.toMatch(
      /path\.join\([^)]*"\.qfai",\s*"assistant",\s*"(constitution|manifest|catalog|process)"/,
    );
  });

  // QFAI:SPEC-0003:TC-0003-0026 (TDD-0026): legacy backward-compat + sunset warning
  //
  // Split across the sunset. The original case pinned its `When` to v1.9.0, so
  // the pre-sunset half preserves its intent verbatim; the post-sunset half is
  // what the same run does now that the window named in the message has closed.
  // Both halves keep the retention assertion — `init` must never delete user
  // content in the default flow, on either side of a deprecation.
  async function withLegacySteering(
    run: (root: string) => Promise<void>,
  ): Promise<{ root: string; legacyFile: string }> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tdd0026-"));
    const legacy = path.join(root, ".qfai", "assistant", "steering");
    await mkdir(legacy, { recursive: true });
    await writeFile(path.join(legacy, "test-layers.md"), "legacy content\n", "utf-8");
    await run(root);
    return { root, legacyFile: path.join(legacy, "test-layers.md") };
  }

  it("TC-0003-0026 (TDD-0026): inside the window, qfai init retains legacy steering/ and reports it on stdout", async () => {
    let root = "";
    try {
      const stdout: string[] = [];
      const captured = await captureStdout(async () => {
        const r = await withLegacySteering(async (dir) => {
          await runInit({
            dir,
            force: false,
            dryRun: false,
            yes: true,
            toolVersionOverride: "1.9.0",
          });
        });
        root = r.root;
        stdout.push(r.legacyFile);
      });

      expect(await readFile(stdout[0] ?? "", "utf-8")).toBe("legacy content\n");
      expect(captured).toMatch(/D-DEPRECATED-PATH/);
      expect(captured).toMatch(/sunset: v1\.10\.0/);
      expect(captured).toMatch(/read-compatible for the current minor release only/);
    } finally {
      if (root) await removeTempTree(root);
    }
  });

  it("TC-0003-0026 (TDD-0026): past the sunset, qfai init still retains legacy steering/ but reports it as an error", async () => {
    let root = "";
    let legacyFile = "";
    try {
      const text = await captureStderr(async () => {
        const r = await withLegacySteering(async (dir) => {
          await runInit({
            dir,
            force: false,
            dryRun: false,
            yes: true,
            toolVersionOverride: "1.10.0",
          });
        });
        root = r.root;
        legacyFile = r.legacyFile;
      });

      // Retention is unchanged: escalating the report must not start deleting.
      expect(await readFile(legacyFile, "utf-8")).toBe("legacy content\n");

      expect(text).toMatch(/D-DEPRECATED-PATH/);
      expect(text).toMatch(/sunset: v1\.10\.0/);
      expect(text).toMatch(/past the announced sunset/);
      // The remediation command survives the escalation — an error the operator
      // cannot act on is worse than the warning it replaced.
      expect(text).toContain("qfai init --upgrade-assistant-tree");
      expect(text).not.toMatch(/read-compatible/);
    } finally {
      if (root) await removeTempTree(root);
    }
  });

  it("TC-0003-0023: --upgrade-assistant-tree still migrates past the sunset", async () => {
    // The regression guard for the hard constraint: the migration path must
    // keep READING the legacy tree, because it is the command the error tells
    // operators to run. Closing the window by refusing legacy presence in
    // `runInit` would break exactly this.
    let root = "";
    try {
      const r = await withLegacySteering(async (dir) => {
        await captureStdout(async () => {
          await runInit({
            dir,
            force: false,
            dryRun: false,
            yes: true,
            upgradeAssistantTree: true,
            toolVersionOverride: "1.10.0",
          });
        });
      });
      root = r.root;

      const migrated = await readFile(
        path.join(root, ".qfai", "assistant", "catalog", "test-layers.md"),
        "utf-8",
      );
      expect(migrated).toBe("legacy content\n");
      expect(await readFile(r.legacyFile, "utf-8")).toBe("legacy content\n");
    } finally {
      if (root) await removeTempTree(root);
    }
  });
});
