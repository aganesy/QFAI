// QFAI:SPEC-0010 — Navigation Flow Validation
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateNavigationFlow } from "../../src/core/validators/navigationFlow.js";
import { legacyLayoutConfig as defaultConfig } from "./legacyLayoutConfig.js";

// ── Test helpers ───────────────────────────────────────────────────────

async function withTempRoot(task: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-navflow-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeSpecFile(
  root: string,
  specId: string,
  fileName: string,
  content: string,
): Promise<string> {
  const filePath = path.join(root, ".qfai", "specs", specId, fileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

function flowchartMd(mermaidContent: string, extraMd = ""): string {
  return ["# Navigation Flow", "", "```mermaid", mermaidContent, "```", "", extraMd].join("\n");
}

const config = defaultConfig;

// ── TDD-0001 — Static Mermaid checks ──

describe("TDD-0001: Static Mermaid checks", () => {
  it("valid flowchart parses without syntax errors", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    Entry[Entry point] -->|"start"| ScreenA[Screen A]',
            '    ScreenA -->|"next"| ScreenB[Screen B]',
            '    ScreenB -->|"finish"| End[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const syntaxErrors = issues.filter((i) => i.code === "QFAI-NAV-001");
      expect(syntaxErrors).toEqual([]);
    });
  });

  it("missing flowchart declaration emits QFAI-NAV-001", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(["graph TD", "    A --> B"].join("\n")),
      );

      const issues = await validateNavigationFlow(root, config);
      const syntaxErrors = issues.filter((i) => i.code === "QFAI-NAV-001");
      expect(syntaxErrors.length).toBeGreaterThanOrEqual(1);
      expect(syntaxErrors[0]?.severity).toBe("error");
    });
  });

  it("mismatched subgraph/end emits QFAI-NAV-001", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            "    subgraph desktop",
            '    A[Start] -->|"go"| B[End]',
            "%% shared",
            // missing "end"
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const syntaxErrors = issues.filter((i) => i.code === "QFAI-NAV-001");
      expect(syntaxErrors.length).toBeGreaterThanOrEqual(1);
      expect(syntaxErrors[0]?.severity).toBe("error");
    });
  });

  it("unlabeled edge emits QFAI-NAV-002", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            "    A[Start] --> B[Middle]",
            '    B -->|"done"| C[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const unlabeled = issues.filter((i) => i.code === "QFAI-NAV-002");
      expect(unlabeled.length).toBe(1);
      expect(unlabeled[0]?.severity).toBe("warning");
      expect(unlabeled[0]?.message).toContain("A");
      expect(unlabeled[0]?.message).toContain("B");
    });
  });

  it("all edges labeled produces no QFAI-NAV-002", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Start] -->|"go"| B[Middle]',
            '    B -->|"done"| C[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const unlabeled = issues.filter((i) => i.code === "QFAI-NAV-002");
      expect(unlabeled).toEqual([]);
    });
  });

  it("dead-end non-terminal node emits QFAI-NAV-003", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Start] -->|"go"| B[Middle]',
            '    A -->|"alt"| C[Orphan Screen]',
            '    B -->|"done"| D[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const deadEnd = issues.filter((i) => i.code === "QFAI-NAV-003");
      expect(deadEnd.length).toBe(1);
      expect(deadEnd[0]?.message).toContain("C");
    });
  });

  it("terminal nodes with 0 outgoing edges are NOT flagged", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(["flowchart TD", '    A[Start] -->|"go"| B[End]', "%% shared"].join("\n")),
      );

      const issues = await validateNavigationFlow(root, config);
      const deadEnd = issues.filter((i) => i.code === "QFAI-NAV-003");
      expect(deadEnd).toEqual([]);
    });
  });
});

// ── TDD-0002 — Reachability + error recovery ──

describe("TDD-0002: Reachability + error recovery", () => {
  it("unreachable node emits QFAI-NAV-004", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Start] -->|"go"| B[End]',
            '    C[Orphan] -->|"back"| D[Also Orphan]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const unreachable = issues.filter((i) => i.code === "QFAI-NAV-004");
      expect(unreachable.length).toBeGreaterThanOrEqual(1);
      expect(unreachable[0]?.severity).toBe("error");
      const unreachableNodes = unreachable.map((i) => i.message);
      expect(unreachableNodes.some((m) => m.includes("C"))).toBe(true);
    });
  });

  it("fully connected graph produces no QFAI-NAV-004", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Start] -->|"step1"| B[Middle]',
            '    B -->|"step2"| C[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const unreachable = issues.filter((i) => i.code === "QFAI-NAV-004");
      expect(unreachable).toEqual([]);
    });
  });

  it("error node without recovery edge emits QFAI-NAV-005", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Start] -->|"go"| B[Screen B]',
            '    B -->|"error"| err-validation[Validation Error]:::error',
            '    B -->|"done"| C[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const noRecovery = issues.filter((i) => i.code === "QFAI-NAV-005");
      expect(noRecovery.length).toBe(1);
      expect(noRecovery[0]?.severity).toBe("error");
      expect(noRecovery[0]?.message).toContain("err-validation");
    });
  });

  it("error node with recovery edge produces no QFAI-NAV-005", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Start] -->|"go"| B[Screen B]',
            '    B -->|"error"| err-validation[Validation Error]:::error',
            '    err-validation -->|"retry"| B',
            '    B -->|"done"| C[End]',
            "%% shared",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const noRecovery = issues.filter((i) => i.code === "QFAI-NAV-005");
      expect(noRecovery).toEqual([]);
    });
  });
});

// ── TDD-0003 — Viewport diff records ──

describe("TDD-0003: Viewport diff records", () => {
  it("no viewport annotation emits QFAI-NAV-006", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(["flowchart TD", '    A[Start] -->|"go"| B[End]'].join("\n")),
      );

      const issues = await validateNavigationFlow(root, config);
      const viewport = issues.filter((i) => i.code === "QFAI-NAV-006");
      expect(viewport.length).toBe(1);
      expect(viewport[0]?.severity).toBe("warning");
    });
  });

  it("viewport subgraphs produce no QFAI-NAV-006", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            "    subgraph desktop",
            '    A[Start] -->|"go"| B[End]',
            "    end",
            "    subgraph mobile",
            '    C[Start Mobile] -->|"go"| D[End Mobile]',
            "    end",
          ].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const viewport = issues.filter((i) => i.code === "QFAI-NAV-006");
      expect(viewport).toEqual([]);
    });
  });

  it("shared annotation produces no QFAI-NAV-006", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(["flowchart TD", '    A[Start] -->|"go"| B[End]', "%% shared"].join("\n")),
      );

      const issues = await validateNavigationFlow(root, config);
      const viewport = issues.filter((i) => i.code === "QFAI-NAV-006");
      expect(viewport).toEqual([]);
    });
  });
});

// ── TDD-0004 — Implementation alignment ──

describe("TDD-0004: Implementation alignment", () => {
  it("screen in Screen List missing from flow emits QFAI-NAV-007", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Login] -->|"submit"| B[Dashboard]',
            '    B -->|"done"| C[End]',
            "%% shared",
          ].join("\n"),
          ["## Screen List", "- Login", "- Dashboard", "- Settings", ""].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const mismatch = issues.filter((i) => i.code === "QFAI-NAV-007");
      expect(mismatch.length).toBeGreaterThanOrEqual(1);
      const messages = mismatch.map((i) => i.message);
      expect(messages.some((m) => m.includes("Settings"))).toBe(true);
    });
  });

  it("flow node not in Screen List emits QFAI-NAV-007", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Login] -->|"submit"| B[Dashboard]',
            '    B -->|"profile"| C[Profile]',
            '    C -->|"done"| D[End]',
            "%% shared",
          ].join("\n"),
          ["## Screen List", "- Login", "- Dashboard", ""].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const mismatch = issues.filter((i) => i.code === "QFAI-NAV-007");
      expect(mismatch.length).toBeGreaterThanOrEqual(1);
      const messages = mismatch.map((i) => i.message);
      expect(messages.some((m) => m.includes("Profile"))).toBe(true);
    });
  });

  it("aligned Screen List and flow produce no QFAI-NAV-007", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(
          [
            "flowchart TD",
            '    A[Login] -->|"submit"| B[Dashboard]',
            '    B -->|"done"| C[End]',
            "%% shared",
          ].join("\n"),
          ["## Screen List", "- Login", "- Dashboard", ""].join("\n"),
        ),
      );

      const issues = await validateNavigationFlow(root, config);
      const mismatch = issues.filter((i) => i.code === "QFAI-NAV-007");
      expect(mismatch).toEqual([]);
    });
  });

  // No Screen List section — skip check
  it("no Screen List section skips alignment check", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        flowchartMd(["flowchart TD", '    A[Login] -->|"go"| B[End]', "%% shared"].join("\n")),
      );

      const issues = await validateNavigationFlow(root, config);
      const mismatch = issues.filter((i) => i.code === "QFAI-NAV-007");
      expect(mismatch).toEqual([]);
    });
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("no spec files produces no issues", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
      const issues = await validateNavigationFlow(root, config);
      expect(issues).toEqual([]);
    });
  });

  it("spec file without mermaid blocks produces no issues", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(root, "spec-0001", "nav.md", "# Navigation\n\nNo diagrams here.\n");

      const issues = await validateNavigationFlow(root, config);
      expect(issues).toEqual([]);
    });
  });

  it("non-flowchart mermaid blocks are skipped", async () => {
    await withTempRoot(async (root) => {
      await writeSpecFile(
        root,
        "spec-0001",
        "nav.md",
        [
          "# Navigation",
          "",
          "```mermaid",
          "sequenceDiagram",
          "    Alice->>Bob: Hello",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateNavigationFlow(root, config);
      expect(issues).toEqual([]);
    });
  });
});
