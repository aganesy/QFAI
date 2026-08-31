import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runGuardrails } from "../../src/cli/commands/guardrails.js";
import { captureStdout } from "../helpers/stdout.js";

describe("guardrails command", () => {
  it("extracts guardrails from --path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    const deltaPath = path.join(root, "18_delta.md");
    try {
      await writeFile(
        deltaPath,
        [
          "# SPEC-0001: Delta",
          "",
          "## Decision Guardrails",
          "",
          "- ID: DG-0001",
          "  Type: non-goal",
          "  Guardrail: Do not change the spec layout.",
          "  Rationale: Spec layout is a hard gate.",
          "  Reconsider: never",
          "",
        ].join("\n"),
        "utf-8",
      );

      const output = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "extract",
          paths: [deltaPath],
          max: 20,
        });
        expect(exitCode).toBe(0);
      });

      expect(output).toContain("# Decision Guardrails (extract)");
      expect(output).toContain("DG-0001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("extracts guardrails from heading format", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    const deltaPath = path.join(root, "18_delta.md");
    try {
      await writeFile(
        deltaPath,
        [
          "# SPEC-0001: Delta",
          "",
          "## Decision Guardrails",
          "",
          "### DG-0003: Avoid auto-upgrade",
          "- Type: not-now",
          "- Guardrail: Do not add auto-upgrade flows.",
          "- Reason: Upgrade policy needs a separate spec.",
          "- Reconsider: after upgrade design is approved",
          "",
        ].join("\n"),
        "utf-8",
      );

      const output = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "extract",
          paths: [deltaPath],
          max: 20,
        });
        expect(exitCode).toBe(0);
      });

      expect(output).toContain("# Decision Guardrails (extract)");
      expect(output).toContain("DG-0003");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns exit 1 when check finds errors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    const deltaPath = path.join(root, "18_delta.md");
    try {
      await writeFile(
        deltaPath,
        [
          "# SPEC-0001: Delta",
          "",
          "## Decision Guardrails",
          "",
          "- ID: DG-0001",
          "  Guardrail: Missing type",
          "",
        ].join("\n"),
        "utf-8",
      );

      const output = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "check",
          paths: [deltaPath],
        });
        expect(exitCode).toBe(1);
      });

      expect(output).toContain("QFAI-GR-003");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns exit 2 when path is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    try {
      const exitCode = await runGuardrails({
        root,
        action: "list",
        paths: ["missing.md"],
      });
      expect(exitCode).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
