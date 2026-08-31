import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateMermaidEnforcement } from "../../src/core/validators/mermaidEnforcement.js";

describe("validateMermaidEnforcement", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mmd-"));
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

  it("emits error when mermaid keyword appears in text fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/spec-0001/04_Business-rules.md",
        ["# Rules", "", "```text", "sequenceDiagram", "  A->>B: request", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("emits error when mermaid directive appears in non-mermaid language fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/spec-0001/04_Business-rules.md",
        ["# Rules", "", "```yaml", "flowchart TD", "  A --> B", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=yaml");
    });
  });

  it("emits error when mermaid keyword appears outside fences", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/discussion/discussion-20260216160000000/03_Story-Workshop.md",
        ["# Flow", "", "flowchart TD", "  A --> B", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-002");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("passes when mermaid syntax is inside mermaid fence", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/specs/spec-0001/05_Examples.feature",
        [
          "Feature: Example",
          "",
          "```mermaid",
          "sequenceDiagram",
          "  User->>System: request",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  it("emits error when Business Flow has no mermaid fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/_policies/04_Business-Flow.md",
        "# 04 Business Flow\n\nNo diagrams.\n",
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-003");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("emits error when Business Flow mermaid block has no flowchart/sequenceDiagram", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/_policies/04_Business-Flow.md",
        ["# 04 Business Flow", "", "```mermaid", "classDiagram", "  class User", "```", ""].join(
          "\n",
        ),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-004");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("ignores evidence directory from enforcement targets", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/evidence/reference.md",
        ["# Evidence", "", "```text", "sequenceDiagram", "  A->>B: copy", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  it("ignores stale discussion packs when the latest pack is clean", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/discussion/discussion-20260216160000000/03_Story-Workshop.md",
        ["# Flow", "", "flowchart TD", "  A --> B", ""].join("\n"),
      );
      await writeArtifact(
        root,
        ".qfai/discussion/discussion-20260217160000000/03_Story-Workshop.md",
        ["# Flow", "", "```mermaid", "flowchart TD", "  A --> B", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });
});
