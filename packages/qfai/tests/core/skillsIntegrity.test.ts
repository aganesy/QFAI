import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
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

describe("diffProjectSkillsAgainstInitAssets", () => {
  it("skips when skills is missing", async () => {
    const root = await makeTempRoot();
    try {
      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );
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

      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );
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

      const target = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-require",
        "10_workflow.md",
      );
      const before = await readFile(target, "utf-8");
      await writeFile(target, `${before}\nmodified\n`, "utf-8");

      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("modified");
      expect(diff.changed).toContain("qfai-require/10_workflow.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects missing files", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-require",
        "10_workflow.md",
      );
      await unlink(target);

      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("modified");
      expect(diff.missing).toContain("qfai-require/10_workflow.md");
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

      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );
      const { config } = await loadConfig(root);
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      expect(diff.status).toBe("modified");
      expect(diff.extra).toContain("extra/SKILL.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("normalizes CRLF so it does not count as a change", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-require",
        "10_workflow.md",
      );
      const content = await readFile(target, "utf-8");
      const crlf = content.replace(/\n/g, "\r\n");
      await writeFile(target, crlf, "utf-8");

      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );
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

      const { diffProjectSkillsAgainstInitAssets } = await import(
        "../../src/core/skillsIntegrity.js"
      );

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

describe("validateSkillsIntegrity", () => {
  it("returns empty array when skills is not modified", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const { validateSkillsIntegrity } = await import(
        "../../src/core/validators/skillsIntegrity.js"
      );
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
      const { validateSkillsIntegrity } = await import(
        "../../src/core/validators/skillsIntegrity.js"
      );
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

      const { validateSkillsIntegrity } = await import(
        "../../src/core/validators/skillsIntegrity.js"
      );
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

      const target = path.join(
        root,
        ".qfai",
        "assistant",
        "skills",
        "qfai-require",
        "10_workflow.md",
      );
      const before = await readFile(target, "utf-8");
      await writeFile(target, `${before}\nmodified\n`, "utf-8");

      const { validateSkillsIntegrity } = await import(
        "../../src/core/validators/skillsIntegrity.js"
      );
      const { config } = await loadConfig(root);
      const issues = await validateSkillsIntegrity(root, config);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("QFAI-SKILLS-001");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.category).toBe("change");
      expect(issues[0]?.suggested_action).toContain(
        ".qfai/assistant/skills.local",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
