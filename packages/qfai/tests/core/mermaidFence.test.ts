import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateMermaidFenceUsage } from "../../src/core/validators/mermaidFence.js";

describe("validateMermaidFenceUsage", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mermaid-fence-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function writeArtifact(
    root: string,
    relativePath: string,
    content: string,
  ): Promise<string> {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  it("passes when mermaid syntax is inside mermaid fences", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/specs/_policies/04_Business-flow.md",
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

      const issues = await validateMermaidFenceUsage(root);
      expect(issues).toEqual([]);
    });
  });

  it("emits error when mermaid syntax is written in non-mermaid fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/discussion/discussion-20260216160000000/03_Story-Workshop.md",
        ["# Business Flow", "", "```text", "sequenceDiagram", "  A->>B: request", "```", ""].join(
          "\n",
        ),
      );

      const issues = await validateMermaidFenceUsage(root);
      const error = issues.find((entry) => entry.code === "QFAI-MERMAID-001");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=text");
    });
  });

  it("emits error when mermaid syntax is written in language-less fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/spec-0001/04_Examples.feature",
        [
          "@SPEC-0001",
          "@SC-0001-0001",
          "Scenario: sample",
          "  Given ready",
          "",
          "```",
          "flowchart LR",
          "  A --> B",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateMermaidFenceUsage(root);
      const error = issues.find((entry) => entry.code === "QFAI-MERMAID-001");

      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=(none)");
    });
  });

  it("ignores fences that do not contain mermaid syntax", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/evidence/sample.md",
        ["# Evidence", "", "```text", "this block has no diagram syntax", "```", ""].join("\n"),
      );

      const issues = await validateMermaidFenceUsage(root);
      expect(issues).toEqual([]);
    });
  });
});
