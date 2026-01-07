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

async function makeTempRoot(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "qfai-prompts-integrity-"));
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.doUnmock("../../src/shared/assets.js");
});

describe("diffProjectPromptsAgainstInitAssets", () => {
  it("skips when prompts is missing", async () => {
    const root = await makeTempRoot();
    try {
      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");
      const diff = await diffProjectPromptsAgainstInitAssets(root);
      expect(diff.status).toBe("skipped_missing_prompts");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns ok when prompts matches init assets", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");
      const diff = await diffProjectPromptsAgainstInitAssets(root);
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

      const target = path.join(root, ".qfai", "prompts", "README.md");
      const before = await readFile(target, "utf-8");
      await writeFile(target, before + "\nmodified\n", "utf-8");

      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");
      const diff = await diffProjectPromptsAgainstInitAssets(root);
      expect(diff.status).toBe("modified");
      expect(diff.changed).toContain("README.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects missing files", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "prompts", "README.md");
      await unlink(target);

      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");
      const diff = await diffProjectPromptsAgainstInitAssets(root);
      expect(diff.status).toBe("modified");
      expect(diff.missing).toContain("README.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects extra files", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const extra = path.join(root, ".qfai", "prompts", "extra.md");
      await writeFile(extra, "extra", "utf-8");

      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");
      const diff = await diffProjectPromptsAgainstInitAssets(root);
      expect(diff.status).toBe("modified");
      expect(diff.extra).toContain("extra.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("normalizes CRLF so it does not count as a change", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "prompts", "README.md");
      const content = await readFile(target, "utf-8");
      const crlf = content.replace(/\n/g, "\r\n");
      await writeFile(target, crlf, "utf-8");

      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");
      const diff = await diffProjectPromptsAgainstInitAssets(root);
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

      const { diffProjectPromptsAgainstInitAssets } =
        await import("../../src/core/promptsIntegrity.js");

      // Ensure prompts directory exists so we don't short-circuit with missing prompts.
      await mkdir(path.join(root, ".qfai", "prompts"), { recursive: true });

      const diff = await diffProjectPromptsAgainstInitAssets(root);
      expect(diff.status).toBe("skipped_missing_assets");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("validatePromptsIntegrity", () => {
  it("returns empty array when prompts is not modified", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const { validatePromptsIntegrity } =
        await import("../../src/core/validators/promptsIntegrity.js");
      const issues = await validatePromptsIntegrity(root);

      expect(issues).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns empty array when prompts is missing", async () => {
    const root = await makeTempRoot();
    try {
      const { validatePromptsIntegrity } =
        await import("../../src/core/validators/promptsIntegrity.js");
      const issues = await validatePromptsIntegrity(root);

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

      const { validatePromptsIntegrity } =
        await import("../../src/core/validators/promptsIntegrity.js");
      const issues = await validatePromptsIntegrity(root);

      expect(issues).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns an error issue when prompts is modified", async () => {
    const root = await makeTempRoot();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, ".qfai", "prompts", "README.md");
      const before = await readFile(target, "utf-8");
      await writeFile(target, before + "\nmodified\n", "utf-8");

      const { validatePromptsIntegrity } =
        await import("../../src/core/validators/promptsIntegrity.js");
      const issues = await validatePromptsIntegrity(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("QFAI-PROMPTS-001");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.category).toBe("change");
      expect(issues[0]?.suggested_action).toContain("prompts.local");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
