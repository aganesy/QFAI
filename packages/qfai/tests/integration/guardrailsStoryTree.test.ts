import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runGuardrails } from "../../src/cli/commands/guardrails.js";
import { captureStdout } from "../helpers/stdout.js";

const readFailure = vi.hoisted(() => ({ target: "" }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      if (typeof args[0] === "string" && args[0] === readFailure.target) {
        throw new Error(`EACCES: permission denied, open '${args[0]}'`);
      }
      return actual.readFile(...args);
    },
  };
});

async function withWorkspace(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-story-"));
  try {
    await task(root);
  } finally {
    readFailure.target = "";
    await rm(root, { recursive: true, force: true });
  }
}

async function writeSource(root: string, relative: string, content: string): Promise<string> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
  return file;
}

function guardrail(id: string, statement: string, keyword = ""): string {
  return [
    `- ID: ${id}`,
    "  Type: non-goal",
    `  Guardrail: ${statement}`,
    "  Rationale: Keep the agreed scope.",
    "  Reconsider: When scope is reviewed.",
    ...(keyword ? [`  Keywords: ${keyword}`] : []),
  ].join("\n");
}

async function runWithOutput(
  options: Parameters<typeof runGuardrails>[0],
): Promise<{ code: number; output: string }> {
  let code = -1;
  const output = await captureStdout(async () => {
    code = await runGuardrails(options);
  });
  return { code, output };
}

describe("BF-0003 story-tree decision guardrails", () => {
  // QFAI:AC-0003-0013-01
  it("lists only explicit policy and contract entries with their complete source fields", async () => {
    await withWorkspace(async (root) => {
      await writeSource(
        root,
        ".qfai/spec/01_policy/scope.md",
        [
          "# Scope",
          "",
          "The system MUST remain reliable. This sentence is not a guardrail.",
          "",
          "## Decision Guardrails",
          "",
          guardrail("DG-0001", "Do not add automatic upgrades."),
        ].join("\n"),
      );
      await writeSource(
        root,
        ".qfai/spec/03_contract/api/orders.md",
        [
          "# Orders",
          "",
          "## Decision Guardrails",
          "",
          guardrail("DG-0002", "Do not expose bulk deletion."),
        ].join("\n"),
      );
      await writeSource(
        root,
        ".qfai/spec/02_business-flow/business-flow-0003/note.md",
        ["## Decision Guardrails", guardrail("DG-9999", "Do not read this story note.")].join("\n"),
      );

      const { code, output } = await runWithOutput({
        root,
        action: "list",
        paths: [],
        format: "json",
      });
      expect(code).toBe(0);
      const payload: unknown = JSON.parse(output);
      expect(payload).toMatchObject({
        items: [
          {
            id: "DG-0001",
            type: "non-goal",
            guardrail: "Do not add automatic upgrades.",
            rationale: "Keep the agreed scope.",
            reconsider: "When scope is reviewed.",
            source: { file: ".qfai/spec/01_policy/scope.md", line: 7 },
          },
          {
            id: "DG-0002",
            type: "non-goal",
            guardrail: "Do not expose bulk deletion.",
            rationale: "Keep the agreed scope.",
            reconsider: "When scope is reviewed.",
            source: { file: ".qfai/spec/03_contract/api/orders.md", line: 5 },
          },
        ],
      });
      expect(output).not.toContain("DG-9999");
      expect(output).not.toContain("The system MUST remain reliable");
    });
  });

  // QFAI:AC-0003-0013-02
  it("renders the empty list explicitly", async () => {
    await withWorkspace(async (root) => {
      await writeSource(
        root,
        ".qfai/spec/01_policy/scope.md",
        "# Scope\n\nThe operator SHOULD review scope.\n",
      );
      const { code, output } = await runWithOutput({ root, action: "list", paths: [] });
      expect(code).toBe(0);
      expect(output).toContain("# Decision Guardrails (list)");
      expect(output).toContain("- (none)");
      expect(output).not.toContain("DG-");
    });
  });

  // QFAI:AC-0003-0014-01
  it("extracts a case-insensitive keyword match in the LLM format", async () => {
    await withWorkspace(async (root) => {
      const file = await writeSource(
        root,
        ".qfai/spec/01_policy/scope.md",
        [
          "## Decision Guardrails",
          "",
          guardrail("DG-0001", "Keep human approval for releases.", "release"),
          "",
          guardrail("DG-0002", "Do not add billing reports.", "billing"),
        ].join("\n"),
      );
      const { code, output } = await runWithOutput({
        root,
        action: "extract",
        paths: [file],
        keyword: "RELEASE",
      });
      expect(code).toBe(0);
      expect(output).toContain("# Decision Guardrails (extract)");
      expect(output).toContain("- [DG-0001][non-goal] Keep human approval for releases.");
      expect(output).toContain("  Rationale: Keep the agreed scope.");
      expect(output).toContain("  Reconsider: When scope is reviewed.");
      expect(output).not.toContain("DG-0002");
    });
  });

  // QFAI:AC-0003-0014-02
  it("limits extraction from thirty entries to ten", async () => {
    await withWorkspace(async (root) => {
      const entries = Array.from({ length: 30 }, (_, index) =>
        guardrail(`DG-${String(index + 1).padStart(4, "0")}`, `Boundary ${index + 1}.`),
      );
      const file = await writeSource(
        root,
        ".qfai/spec/01_policy/scope.md",
        ["## Decision Guardrails", "", ...entries.flatMap((entry) => [entry, ""])].join("\n"),
      );
      const { code, output } = await runWithOutput({
        root,
        action: "extract",
        paths: [file],
        max: 10,
      });
      expect(code).toBe(0);
      expect(output.match(/^- \[DG-\d{4}\]/gmu)).toHaveLength(10);
      expect(output).toContain("DG-0010");
      expect(output).not.toContain("DG-0011");
    });
  });

  // QFAI:AC-0003-0015-01
  it("reports a clean check and exits zero", async () => {
    await withWorkspace(async (root) => {
      await writeSource(
        root,
        ".qfai/spec/01_policy/scope.md",
        ["## Decision Guardrails", "", guardrail("DG-0001", "Do not add automatic upgrades.")].join(
          "\n",
        ),
      );
      const { code, output } = await runWithOutput({ root, action: "check", paths: [] });
      expect(code).toBe(0);
      expect(output).toContain("guardrails check: error=0 warning=0");
    });
  });

  // QFAI:AC-0003-0015-02
  it("reports structured issues and exits one when a guardrail is invalid", async () => {
    await withWorkspace(async (root) => {
      const file = await writeSource(
        root,
        ".qfai/spec/01_policy/scope.md",
        [
          "## Decision Guardrails",
          "",
          "- ID: DG-0001",
          "  Rationale: Keep the agreed scope.",
          "  Reconsider: When scope is reviewed.",
        ].join("\n"),
      );
      const result = await runWithOutput({ root, action: "check", paths: [file], format: "json" });
      expect(result.code).toBe(1);
      const payload: unknown = JSON.parse(result.output);
      expect(payload).toMatchObject({
        summary: { errors: 2, warnings: 0 },
        errors: [
          {
            code: "QFAI-GR-003",
            severity: "error",
            message: "Type is missing",
            file: ".qfai/spec/01_policy/scope.md",
          },
          {
            code: "QFAI-GR-005",
            severity: "error",
            message: "Guardrail is missing",
            file: ".qfai/spec/01_policy/scope.md",
          },
        ],
      });
      const textResult = await runWithOutput({ root, action: "check", paths: [file] });
      expect(textResult.code).toBe(1);
      expect(textResult.output).toContain("guardrails check: error=2 warning=0");
      expect(textResult.output).toContain("[error] QFAI-GR-003");
    });
  });

  // QFAI:AC-0003-0016-01
  it("rejects a missing action with a visible error and exit two", async () => {
    await withWorkspace(async (root) => {
      const { code, output } = await runWithOutput({ root, paths: [], format: "json" });
      expect(code).toBe(2);
      const payload: unknown = JSON.parse(output);
      expect(payload).toMatchObject({
        error: {
          code: "action-required",
          message: "guardrails: action is required (list|extract|check)",
        },
      });
    });
  });

  // QFAI:AC-0003-0016-02
  it("rejects an explicit missing path with a visible error and exit two", async () => {
    await withWorkspace(async (root) => {
      const { code, output } = await runWithOutput({
        root,
        action: "list",
        paths: ["missing.md"],
        format: "json",
      });
      expect(code).toBe(2);
      const payload: unknown = JSON.parse(output);
      expect(payload).toMatchObject({
        error: {
          code: "load-failed",
          details: [{ path: "missing.md", message: "Path does not exist" }],
        },
      });
    });
  });

  it("rejects a source that becomes unreadable after scanning", async () => {
    await withWorkspace(async (root) => {
      const file = await writeSource(
        root,
        ".qfai/spec/01_policy/unreadable.md",
        ["## Decision Guardrails", "", guardrail("DG-0001", "Do not add automatic upgrades.")].join(
          "\n",
        ),
      );
      expect(await readFile(file, "utf8")).toContain("DG-0001");
      readFailure.target = file;
      const { code, output } = await runWithOutput({
        root,
        action: "list",
        paths: [file],
        format: "json",
      });
      expect(code).toBe(2);
      const payload: unknown = JSON.parse(output);
      expect(payload).toMatchObject({
        error: {
          code: "load-failed",
          details: [{ path: ".qfai/spec/01_policy/unreadable.md" }],
        },
      });
      expect(output).toContain("EACCES");
      expect(output).not.toContain(root);
    });
  });
});
