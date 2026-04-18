import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateDiscussionMermaid } from "../../src/core/validators/discussMermaid.js";

describe("validateDiscussionMermaid", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-discuss-mermaid-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function seedBusinessFlow(root: string, dirName: string, content: string): Promise<string> {
    const file = path.join(root, ".qfai", "discussion", dirName, "03_Story-Workshop.md");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
    return file;
  }

  const mermaidSequence = [
    "## Business Flows",
    "",
    "```mermaid",
    "sequenceDiagram",
    "  participant U as User",
    "  participant S as System",
    "  U->>S: request",
    "```",
    "",
  ].join("\n");

  const mermaidFlowchart = [
    "## Business Flows",
    "",
    "```mermaid",
    "flowchart TD",
    "  A[Start] --> B[End]",
    "```",
    "",
  ].join("\n");

  it("validates discussion-* outputs and emits error when sequenceDiagram is missing", async () => {
    await withTempRoot(async (root) => {
      const file = await seedBusinessFlow(
        root,
        "discussion-20260215205220203",
        "# Business Flows\n\nNo sequence diagram.\n",
      );

      const issues = await validateDiscussionMermaid(root);
      const error = issues.find((entry) => entry.code === "QFAI-DPACK-009");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(file);
      expect(issues.some((entry) => entry.code === "QFAI-DPACK-010")).toBe(false);
    });
  });

  it("falls back to legacy DISCUSSION-XXXX and emits deprecation warning", async () => {
    await withTempRoot(async (root) => {
      const discussRoot = path.join(root, ".qfai", "discussion");
      await seedBusinessFlow(root, "DISCUSSION-0001", mermaidSequence);

      const issues = await validateDiscussionMermaid(root);
      const warning = issues.find((entry) => entry.code === "QFAI-DPACK-010");

      expect(warning?.severity).toBe("warning");
      expect(warning?.file).toBe(discussRoot);
      expect(issues.some((entry) => entry.code === "QFAI-DPACK-009")).toBe(false);
    });
  });

  it("does not emit legacy warning when discussion-* exists", async () => {
    await withTempRoot(async (root) => {
      await seedBusinessFlow(root, "DISCUSSION-0001", mermaidSequence);
      await seedBusinessFlow(root, "discussion-20260215205220203", mermaidSequence);

      const issues = await validateDiscussionMermaid(root);

      expect(issues.some((entry) => entry.code === "QFAI-DPACK-009")).toBe(false);
      expect(issues.some((entry) => entry.code === "QFAI-DPACK-010")).toBe(false);
    });
  });

  it("accepts Mermaid flowchart in discussion Business Flow", async () => {
    await withTempRoot(async (root) => {
      await seedBusinessFlow(root, "discussion-20260215205220203", mermaidFlowchart);

      const issues = await validateDiscussionMermaid(root);
      expect(issues.some((entry) => entry.code === "QFAI-DPACK-009")).toBe(false);
    });
  });

  it("ignores stale canonical discussion packs when the latest pack is valid", async () => {
    await withTempRoot(async (root) => {
      await seedBusinessFlow(
        root,
        "discussion-20260215205220203",
        "# Business Flows\n\nNo diagram.\n",
      );
      await seedBusinessFlow(root, "discussion-20260216205220203", mermaidSequence);

      const issues = await validateDiscussionMermaid(root);
      expect(issues.some((entry) => entry.code === "QFAI-DPACK-009")).toBe(false);
    });
  });
});
