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

  it("emits error when mermaid syntax is written in language-less fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/spec-0001/04_Examples.feature",
        ["Feature: Example", "", "```", "flowchart LR", "  A --> B", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=(none)");
    });
  });

  it("emits error when an evidence file holds mermaid syntax in a non-mermaid fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/evidence/reference.md",
        ["# Evidence", "", "```text", "sequenceDiagram", "  A->>B: copy", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=text");
    });
  });

  it("ignores evidence fences that do not contain mermaid syntax", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/evidence/sample.md",
        ["# Evidence", "", "```text", "this block has no diagram syntax", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  it("emits error when a mindmap diagram sits in a non-mermaid fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/evidence/mindmap.md",
        ["# Evidence", "", "```text", "mindmap", "  root((idea))", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=text");
    });
  });

  it("does not treat prose starting with a diagram keyword as mermaid outside fences", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/evidence/prose.md",
        [
          "# Evidence",
          "",
          "Journey mapping was run with three participants.",
          "Gantt planning is deferred to the next iteration.",
          "Flowchart rendering happens in the reviewer's browser.",
          "Mindmap notes were discarded.",
          "",
        ].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  it("still flags a bare diagram declaration outside fences", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/evidence/declaration.md",
        ["# Evidence", "", "mindmap", "  root((idea))", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-002");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  // A `text` fence holds prose exactly as readily as a `.md` body does — most of
  // all in the evidence tree, where a run log is quoted verbatim inside one.
  it("does not treat prose inside a non-mermaid fence as mermaid", async () => {
    await withTempRoot(async (root) => {
      await writeArtifact(
        root,
        ".qfai/evidence/prose-fence.md",
        [
          "# Evidence",
          "",
          "```text",
          "Journey mapping was run with three participants.",
          "Gantt planning is deferred to the next iteration.",
          "```",
          "",
          "```",
          "Flowchart rendering happens in the reviewer's browser.",
          "Mindmap notes were discarded.",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      expect(issues).toEqual([]);
    });
  });

  // `graph TD;` and `flowchart LR; A --> B` are valid Mermaid: the declaration
  // may be terminated by `;`, with or without the body following on the same
  // line. Requiring the declaration to be the entire line dropped both.
  it("flags a semicolon-terminated declaration outside fences", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/evidence/semicolon.md",
        ["# Evidence", "", "graph TD;", "  A --> B", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-002");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("flags a single-line declaration and body outside fences", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/evidence/inline-body.md",
        ["# Evidence", "", "flowchart LR; A --> B", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-002");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  // The same matcher serves both scans, so the semicolon form has to be caught
  // in a non-mermaid fence too — otherwise the two sides drift apart again.
  it("flags a semicolon-terminated declaration inside a non-mermaid fence", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/specs/spec-0001/04_Business-rules.md",
        ["# Rules", "", "```text", "graph LR; A --> B", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
      expect(error?.message).toContain("detected=text");
    });
  });

  // A trailing `%%` comment is Mermaid's own comment syntax, so it terminates a
  // declaration the same way `;` does.
  it("flags a declaration carrying a mermaid comment outside fences", async () => {
    await withTempRoot(async (root) => {
      const filePath = await writeArtifact(
        root,
        ".qfai/evidence/comment.md",
        ["# Evidence", "", "sequenceDiagram %% participants below", "  A->>B: request", ""].join(
          "\n",
        ),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-002");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(filePath);
    });
  });

  it("emits error for a stale discussion pack even when the latest pack is clean", async () => {
    await withTempRoot(async (root) => {
      const stalePath = await writeArtifact(
        root,
        ".qfai/discussion/discussion-20260216160000000/03_Story-Workshop.md",
        ["# Flow", "", "```text", "flowchart TD", "  A --> B", "```", ""].join("\n"),
      );
      await writeArtifact(
        root,
        ".qfai/discussion/discussion-20260217160000000/03_Story-Workshop.md",
        ["# Flow", "", "```mermaid", "flowchart TD", "  A --> B", "```", ""].join("\n"),
      );

      const issues = await validateMermaidEnforcement(root);
      const error = issues.find((entry) => entry.code === "QFAI-MMD-001");
      expect(error?.severity).toBe("error");
      expect(error?.file).toBe(stalePath);
    });
  });
});
