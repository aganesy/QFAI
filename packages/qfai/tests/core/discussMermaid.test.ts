import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateDiscussMermaid } from "../../src/core/validators/discussMermaid.js";

describe("validateDiscussMermaid", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-discuss-mermaid-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function seedBusinessFlow(
    root: string,
    dirName: string,
    content: string,
  ): Promise<string> {
    const file = path.join(
      root,
      ".qfai",
      "discuss",
      dirName,
      "04_Business-flow.md",
    );
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

  it("validates discuss-* outputs and emits error when sequenceDiagram is missing", async () => {
    await withTempRoot(async (root) => {
      const file = await seedBusinessFlow(
        root,
        "discuss-202602152052203",
        "# Business Flows\n\nNo sequence diagram.\n",
      );

      const issues = await validateDiscussMermaid(root);
      const error = issues.find((entry) => entry.code === "QFAI-DISCUSS-021");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(file);
      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-022")).toBe(
        false,
      );
    });
  });

  it("falls back to legacy DISCUSS-XXXX and emits deprecation warning", async () => {
    await withTempRoot(async (root) => {
      const discussRoot = path.join(root, ".qfai", "discuss");
      await seedBusinessFlow(root, "DISCUSS-0001", mermaidSequence);

      const issues = await validateDiscussMermaid(root);
      const warning = issues.find((entry) => entry.code === "QFAI-DISCUSS-022");

      expect(warning?.severity).toBe("warning");
      expect(warning?.file).toBe(discussRoot);
      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-021")).toBe(
        false,
      );
    });
  });

  it("does not emit legacy warning when discuss-* exists", async () => {
    await withTempRoot(async (root) => {
      await seedBusinessFlow(root, "DISCUSS-0001", mermaidSequence);
      await seedBusinessFlow(root, "discuss-202602152052203", mermaidSequence);

      const issues = await validateDiscussMermaid(root);

      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-021")).toBe(
        false,
      );
      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-022")).toBe(
        false,
      );
    });
  });
});
