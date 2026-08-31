import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateMermaidEnforcement } from "../../src/core/validators/mermaidEnforcement.js";

describe("business flow rules of validateMermaidEnforcement", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-business-flow-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function writePoliciesFile(
    root: string,
    fileName: string,
    content: string,
  ): Promise<string> {
    const filePath = path.join(root, ".qfai", "specs", "_policies", fileName);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  it("passes when 04_Business-Flow.md includes mermaid flowchart", async () => {
    await withTempRoot(async (root) => {
      await writePoliciesFile(
        root,
        "04_Business-Flow.md",
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

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  it("emits error when mermaid fence is missing", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writePoliciesFile(
        root,
        "04_Business-Flow.md",
        "# Business Flow\n\nNo diagrams.\n",
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-003");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("emits error when diagram type is neither flowchart nor sequenceDiagram", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writePoliciesFile(
        root,
        "04_Business-Flow.md",
        ["# Business Flow", "", "```mermaid", "classDiagram", "  class User", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-004");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  // The diagram-type check means "this diagram IS a flowchart", so only a
  // diagram directive at the start of a line counts. An unanchored match let a
  // `graph TD` diagram pass on a `%%` comment that merely mentions the word.
  it("emits error when only a comment inside the mermaid block mentions flowchart", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writePoliciesFile(
        root,
        "04_Business-Flow.md",
        [
          "# Business Flow",
          "",
          "```mermaid",
          "graph TD",
          "  %% flowchart of the ordering journey",
          "  A[Order] --> B[Ship]",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-004");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("accepts an indented diagram directive inside the mermaid block", async () => {
    await withTempRoot(async (root) => {
      await writePoliciesFile(
        root,
        "04_Business-Flow.md",
        [
          "# Business Flow",
          "",
          "```mermaid",
          "  sequenceDiagram",
          "    User->>System: request",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  // On a case-insensitive filesystem the canonical candidate resolves to the
  // legacy file, so `path.basename` reports the canonical spelling and the
  // legacy-name branch is unreachable there.
  it.skipIf(process.platform === "win32" || process.platform === "darwin")(
    "emits warning when the legacy 04_Business-flow.md basename remains",
    async () => {
      await withTempRoot(async (root) => {
        const filePath = await writePoliciesFile(
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

        const issues = await validateMermaidEnforcement(root);
        const warning = issues.find((entry) => entry.code === "QFAI-MMD-005");

        expect(warning?.severity).toBe("warning");
        expect(warning?.file).toBe(filePath);
      });
    },
  );

  it("emits warning when legacy Business-flow.feature remains", async () => {
    await withTempRoot(async (root) => {
      const featurePath = await writePoliciesFile(
        root,
        "05_Business-flow.feature",
        ["Feature: Legacy Business Flow", "  Scenario: old format", "    Given legacy", ""].join(
          "\n",
        ),
      );

      const issues = await validateMermaidEnforcement(root);
      const warning = issues.find((entry) => entry.code === "QFAI-BFLOW-003");

      expect(warning?.severity).toBe("warning");
      expect(warning?.file).toBe(featurePath);
    });
  });
});
