import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDiscussionPackReadiness } from "../../src/core/validators/discussionPack.js";

describe("validateDiscussionPackReadiness — current-only wording", () => {
  async function withRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dpack-wording-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("legacy migration wording does not appear in issue messages", async () => {
    await withRoot(async (root) => {
      const discussionDir = path.join(root, ".qfai", "discussion");
      await mkdir(path.join(discussionDir, "discussion-0001"), { recursive: true });

      const issues = await validateDiscussionPackReadiness(root, defaultConfig);
      const allMessages = issues.map((i) => `${i.message} ${i.suggested_action ?? ""}`).join("\n");

      expect(allMessages).not.toContain("段階的に廃止");
      expect(allMessages).not.toContain("移行時は");
      expect(allMessages).not.toContain("legacy discussion-pack を検出しました");
      expect(allMessages).not.toContain("legacy 連番 pack");
      expect(allMessages).not.toContain("discussion-legacy-* へ退避");
    });
  });

  it("legacy sequential discussion-pack detection uses current-only wording", async () => {
    await withRoot(async (root) => {
      const discussionDir = path.join(root, ".qfai", "discussion");
      await mkdir(path.join(discussionDir, "discussion-0001"), { recursive: true });

      const issues = await validateDiscussionPackReadiness(root, defaultConfig);
      const legacyIssue = issues.find((i) => i.code === "QFAI-DPACK-006");

      expect(legacyIssue).toBeDefined();
      expect(legacyIssue?.message).toContain(
        "current canonical discussion-pack naming does not allow sequential pack directories",
      );
    });
  });

  it("dangerous pack naming uses current-only wording without legacy retirement guidance", async () => {
    await withRoot(async (root) => {
      const discussionDir = path.join(root, ".qfai", "discussion");
      // seed a canonical pack so that latestPackDir is found
      const canonicalPack = path.join(discussionDir, "discussion-20260406000000000");
      await mkdir(canonicalPack, { recursive: true });
      for (const f of MINIMAL_PACK_FILES) {
        await writeFile(
          path.join(canonicalPack, f),
          `# ${f}\n\nMinimal content for testing purposes. This text satisfies the minimum character requirement.\n`,
          "utf-8",
        );
      }
      await mkdir(path.join(discussionDir, "discussion-latest"), { recursive: true });

      const issues = await validateDiscussionPackReadiness(root, defaultConfig);
      const namingIssue = issues.find((i) => i.code === "QFAI-DPACK-005");

      expect(namingIssue).toBeDefined();
      const fullText = `${namingIssue?.message ?? ""} ${namingIssue?.suggested_action ?? ""}`;
      expect(fullText).not.toContain("discussion-legacy-* などへ退避");
      expect(fullText).toContain("Remove or rename the non-canonical discussion directory");
    });
  });
});

const MINIMAL_PACK_FILES = [
  "01_Context.md",
  "02_Inception-Deck.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "10_Policy.md",
  "11_OQ-Register.md",
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;
