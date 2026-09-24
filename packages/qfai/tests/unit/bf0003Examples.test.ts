import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runGuardrails } from "../../src/cli/commands/guardrails.js";
import type { DoctorData } from "../../src/core/doctor.js";
import { captureStdout } from "../helpers/stdout.js";

async function withWorkspace(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0003-examples-"));
  try {
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function guardrail(id: string, type: string, statement: string): string {
  return [
    `- ID: ${id}`,
    `  Type: ${type}`,
    `  Guardrail: ${statement}`,
    `  Rationale: Reason for ${id}.`,
    `  Reconsider: Review ${id} after adoption.`,
  ].join("\n");
}

async function guardrailsOutput(
  root: string,
  action: "list" | "extract",
  format: "text" | "json",
): Promise<{ code: number; output: string }> {
  let code = -1;
  const output = await captureStdout(async () => {
    code = await runGuardrails({ root, action, format, paths: [] });
  });
  return { code, output };
}

describe("BF-0003 diagnostic and guardrail examples", () => {
  it("counts every doctor severity in the machine-readable summary", async () => {
    // QFAI:EX-0003-0001-04
    await withWorkspace(async (root) => {
      let code = -1;
      const output = await captureStdout(async () => {
        code = await runDoctor({ root, rootExplicit: true, format: "json", failOn: "never" });
      });
      expect(code).toBe(0);
      const data = JSON.parse(output) as DoctorData;
      expect(data.config.found).toBe(true);
      expect(
        data.checks.some((check) => check.id === "paths.specsDir" && check.severity === "warning"),
      ).toBe(true);
      expect(data.summary).toEqual({
        ok: data.checks.filter((check) => check.severity === "ok").length,
        info: data.checks.filter((check) => check.severity === "info").length,
        warning: data.checks.filter((check) => check.severity === "warning").length,
        error: data.checks.filter((check) => check.severity === "error").length,
      });
    });
  });

  it("lists explicit policy and contract entries with their source fields", async () => {
    // QFAI:EX-0003-0013-04
    await withWorkspace(async (root) => {
      await put(
        root,
        ".qfai/spec/01_policy/scope.md",
        ["## Decision Guardrails", guardrail("DG-0001", "non-goal", "No automatic release.")].join(
          "\n",
        ),
      );
      await put(
        root,
        ".qfai/spec/03_contract/cli/operation.md",
        ["## Decision Guardrails", guardrail("DG-0002", "not-now", "No bulk repair.")].join("\n"),
      );
      const result = await guardrailsOutput(root, "list", "json");
      expect(result.code).toBe(0);
      const payload: unknown = JSON.parse(result.output);
      expect(payload).toMatchObject({
        items: [
          {
            id: "DG-0001",
            type: "non-goal",
            guardrail: "No automatic release.",
            rationale: "Reason for DG-0001.",
            reconsider: "Review DG-0001 after adoption.",
            source: { file: ".qfai/spec/01_policy/scope.md" },
          },
          {
            id: "DG-0002",
            type: "not-now",
            guardrail: "No bulk repair.",
            rationale: "Reason for DG-0002.",
            reconsider: "Review DG-0002 after adoption.",
            source: { file: ".qfai/spec/03_contract/cli/operation.md" },
          },
        ],
      });
    });
  });

  it("normalizes and sorts list entries by type, then ID", async () => {
    // QFAI:EX-0003-0013-06
    await withWorkspace(async (root) => {
      await put(
        root,
        ".qfai/spec/01_policy/scope.md",
        [
          "## Decision Guardrails",
          guardrail("DG-0001", "trade-off", "  Keep a manual review.  "),
          guardrail("DG-0003", "non-goal", "No hidden edits."),
        ].join("\n\n"),
      );
      await put(
        root,
        ".qfai/spec/03_contract/cli/operation.md",
        ["## Decision Guardrails", guardrail("DG-0002", "non-goal", "No silent repair.")].join(
          "\n",
        ),
      );
      const result = await guardrailsOutput(root, "list", "json");
      expect(result.code).toBe(0);
      const payload: unknown = JSON.parse(result.output);
      expect(payload).toMatchObject({
        items: [
          {
            id: "DG-0002",
            type: "non-goal",
            guardrail: "No silent repair.",
            source: { file: ".qfai/spec/03_contract/cli/operation.md" },
          },
          {
            id: "DG-0003",
            type: "non-goal",
            guardrail: "No hidden edits.",
            source: { file: ".qfai/spec/01_policy/scope.md" },
          },
          {
            id: "DG-0001",
            type: "trade-off",
            guardrail: "Keep a manual review.",
            source: { file: ".qfai/spec/01_policy/scope.md" },
          },
        ],
      });
    });
  });

  it("renders an explicit entry in the LLM extract format", async () => {
    // QFAI:EX-0003-0014-03
    await withWorkspace(async (root) => {
      await put(
        root,
        ".qfai/spec/01_policy/scope.md",
        ["## Decision Guardrails", guardrail("DG-0001", "non-goal", "No automatic release.")].join(
          "\n",
        ),
      );
      const result = await guardrailsOutput(root, "extract", "text");
      expect(result.code).toBe(0);
      expect(result.output).toContain("# Decision Guardrails (extract)");
      expect(result.output).toContain("- [DG-0001][non-goal] No automatic release.");
      expect(result.output).toContain("  Rationale: Reason for DG-0001.");
      expect(result.output).toContain("  Reconsider: Review DG-0001 after adoption.");
    });
  });
});
