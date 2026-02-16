import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateBusinessFlowHasMermaid } from "../../src/core/validators/businessFlow.js";

describe("validateBusinessFlowHasMermaid", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-business-flow-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function writeSharedFile(
    root: string,
    fileName: string,
    content: string,
  ): Promise<string> {
    const filePath = path.join(root, ".qfai", "specs", "_shared", fileName);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  it("passes when 04_Business-flow.md includes mermaid flowchart", async () => {
    await withTempRoot(async (root) => {
      await writeSharedFile(
        root,
        "04_Business-flow.md",
        [
          "# Business Flow",
          "",
          "```mermaid",
          "flowchart TD",
          "  A[Start] --> B[End]",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateBusinessFlowHasMermaid(root);
      expect(issues).toEqual([]);
    });
  });

  it("emits error when mermaid fence is missing", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeSharedFile(
        root,
        "04_Business-flow.md",
        "# Business Flow\n\nNo diagrams.\n",
      );

      const issues = await validateBusinessFlowHasMermaid(root);
      const error = issues.find((entry) => entry.code === "QFAI-BFLOW-001");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("emits error when diagram type is neither flowchart nor sequenceDiagram", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeSharedFile(
        root,
        "04_Business-flow.md",
        [
          "# Business Flow",
          "",
          "```mermaid",
          "classDiagram",
          "  class User",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateBusinessFlowHasMermaid(root);
      const error = issues.find((entry) => entry.code === "QFAI-BFLOW-002");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("emits warning when legacy Business-flow.feature remains", async () => {
    await withTempRoot(async (root) => {
      const featurePath = await writeSharedFile(
        root,
        "05_Business-flow.feature",
        [
          "Feature: Legacy Business Flow",
          "  Scenario: old format",
          "    Given legacy",
          "",
        ].join("\n"),
      );

      const issues = await validateBusinessFlowHasMermaid(root);
      const warning = issues.find((entry) => entry.code === "QFAI-BFLOW-003");

      expect(warning?.severity).toBe("warning");
      expect(warning?.file).toBe(featurePath);
    });
  });
});
