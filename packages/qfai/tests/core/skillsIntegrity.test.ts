import { mkdtemp, mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { loadConfig } from "../../src/core/config.js";

async function makeTempRoot(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "qfai-skills-integrity-"));
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.doUnmock("../../src/shared/assets.js");
});

describe("diffProjectSkillsAgainstInitAssets", { timeout: 15000 }, () => {
  it("skips when skills is missing", async () => {
    const root = await makeTempRoot();
    try {
      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("skipped_missing_skills");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns ok when skills matches init assets", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("ok");
      expect(diff.missing).toHaveLength(0);
      expect(diff.extra).toHaveLength(0);
      expect(diff.changed).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects changed files", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md");
      const before = await readFile(target, "utf-8");
      await writeFile(target, `${before}\nmodified\n`, "utf-8");

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("modified");
      expect(diff.changed).toContain("qfai-discussion/SKILL.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects missing files", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md");
      await unlink(target);

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("modified");
      expect(diff.missing).toContain("qfai-discussion/SKILL.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects extra files", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const extraDir = path.join(root, ".qfai", "assistant", "skills", "extra");
      await mkdir(extraDir, { recursive: true });
      await writeFile(path.join(extraDir, "SKILL.md"), "extra", "utf-8");

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("modified");
      expect(diff.extra).toContain("extra/SKILL.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recovers from legacy 10_workflow.md after force init", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacyFile = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-discussion",
        "10_workflow.md",
      );
      await writeFile(legacyFile, "legacy workflow\n", "utf-8");

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);

      const before = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(before.status).toBe("modified");
      expect(before.extra).toContain("qfai-discussion/10_workflow.md");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      const after = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(after.status).toBe("ok");
      expect(after.extra).not.toContain("qfai-discussion/10_workflow.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("normalizes CRLF so it does not count as a change", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md");
      const content = await readFile(target, "utf-8");
      const crlf = content.replace(/\n/g, "\r\n");
      await writeFile(target, crlf, "utf-8");

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("ok");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skips when init assets cannot be resolved", async () => {
    const root = await makeTempRoot();
    try {
      vi.doMock("../../src/shared/assets.js", () => ({
        getInitAssetsDir: () => {
          throw new Error("missing init assets");
        },
      }));

      const { diffProjectSkillsAgainstInitAssets } =
        await import("../../src/core/skillsIntegrity.js");

      // Ensure skills directory exists so we don't short-circuit with missing skills.
      await mkdir(path.join(root, ".qfai", "assistant", "skills"), {
        recursive: true,
      });

      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("skipped_missing_assets");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("validateSkillsIntegrity", { timeout: 15000 }, () => {
  it("returns empty array when skills is not modified", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const { validateSkillsIntegrity } =
        await import("../../src/core/validators/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const issues = await validateSkillsIntegrity(root, config);

      expect(issues).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns empty array when skills is missing", async () => {
    const root = await makeTempRoot();
    try {
      const { validateSkillsIntegrity } =
        await import("../../src/core/validators/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const issues = await validateSkillsIntegrity(root, config);

      expect(issues).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns empty array when init assets are missing", async () => {
    const root = await makeTempRoot();
    try {
      vi.doMock("../../src/shared/assets.js", () => ({
        getInitAssetsDir: () => {
          throw new Error("missing init assets");
        },
      }));

      const { validateSkillsIntegrity } =
        await import("../../src/core/validators/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const issues = await validateSkillsIntegrity(root, config);

      expect(issues).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns an error issue when skills is modified", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "assistant", "skills", "qfai-discussion", "SKILL.md");
      const before = await readFile(target, "utf-8");
      await writeFile(target, `${before}\nmodified\n`, "utf-8");

      const { validateSkillsIntegrity } =
        await import("../../src/core/validators/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const issues = await validateSkillsIntegrity(root, config);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("QFAI-SKILLS-001");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.category).toBe("change");
      expect(issues[0]?.suggested_action).toContain("qfai init --force");
      expect(issues[0]?.suggested_action).not.toContain("skills.local");
      // The over-correction pin: on a default install the finding still names
      // the default directory, and now says so on `target:` as well.
      expect(issues[0]?.file).toBe(".qfai/assistant/skills");
      expect(issues[0]?.message).toContain(".qfai/assistant/skills/**");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("names the configured skills directory rather than the default one", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // `paths.skillsDir` is settable, and the diff is taken against whatever
      // it resolves to. A finding that spelled the default path would send the
      // reader to a directory this project does not have — the issue carries no
      // `loc`, so the message and `file` are the only places the real one can
      // appear.
      const moved = path.join(root, "tools", "skills");
      await mkdir(path.dirname(moved), { recursive: true });
      await rename(path.join(root, ".qfai", "assistant", "skills"), moved);

      const { validateSkillsIntegrity } =
        await import("../../src/core/validators/skillsIntegrity.js");
      const { config } = await loadConfig(root);
      const issues = await validateSkillsIntegrity(root, {
        ...config,
        paths: { ...config.paths, skillsDir: "tools/skills" },
      });

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("QFAI-SKILLS-001");
      expect(issues[0]?.file).toBe("tools/skills");
      expect(issues[0]?.message).toContain("tools/skills/**");
      expect(issues[0]?.message).not.toContain(".qfai/assistant/skills");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
