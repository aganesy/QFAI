import { mkdtemp, writeFile, rm } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runGuardrails } from "../../src/cli/commands/guardrails.js";
import { captureStdout } from "../helpers/stdout.js";

/**
 * Lets a single test make `readFile` fail the way a mid-scan deletion or a
 * permission error would, without depending on platform-specific fs tricks.
 */
const readFileFailure = vi.hoisted(() => ({
  build: null as ((target: string) => Error) | null,
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      const target = args[0];
      if (readFileFailure.build && typeof target === "string") {
        throw readFileFailure.build(target);
      }
      return actual.readFile(...args);
    },
  };
});

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

  it("emits structured JSON for check without changing the exit code", async () => {
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
          format: "json",
        });
        expect(exitCode).toBe(1);
      });

      const parsed: unknown = JSON.parse(output);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("guardrails check --format json must emit an object");
      }
      const record: Record<string, unknown> = { ...parsed };
      const errors = record.errors;
      const warnings = record.warnings;
      if (!Array.isArray(errors) || !Array.isArray(warnings)) {
        throw new Error("guardrails check --format json must emit errors[] and warnings[]");
      }
      expect(errors).toContainEqual(
        expect.objectContaining({
          severity: "error",
          code: "QFAI-GR-003",
          file: "18_delta.md",
          id: "DG-0001",
        }),
      );
      expect(record.summary).toEqual({ errors: errors.length, warnings: warnings.length });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("relativizes duplicate-ID locations instead of leaking absolute paths", async () => {
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
          "  Guardrail: First copy.",
          "  Rationale: Spec layout is a hard gate.",
          "  Reconsider: never",
          "",
          "- ID: DG-0001",
          "  Type: non-goal",
          "  Guardrail: Second copy.",
          "  Rationale: Spec layout is a hard gate.",
          "  Reconsider: never",
          "",
        ].join("\n"),
        "utf-8",
      );

      const output = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "check",
          paths: [deltaPath],
          format: "json",
        });
        expect(exitCode).toBe(1);
      });

      expect(output).not.toContain(root);
      const parsed: unknown = JSON.parse(output);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("guardrails check --format json must emit an object");
      }
      const errors = { ...parsed }.errors;
      if (!Array.isArray(errors)) {
        throw new Error("guardrails check --format json must emit errors[]");
      }
      expect(errors).toContainEqual(
        expect.objectContaining({
          code: "QFAI-GR-008",
          message: "ID is duplicated: DG-0001",
          file: "18_delta.md",
          locations: [
            { file: "18_delta.md", line: 5 },
            { file: "18_delta.md", line: 11 },
          ],
        }),
      );

      const text = await captureStdout(async () => {
        const exitCode = await runGuardrails({ root, action: "check", paths: [deltaPath] });
        expect(exitCode).toBe(1);
      });
      expect(text).not.toContain(root);
      expect(text).toContain("locations=18_delta.md:5, 18_delta.md:11");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits structured JSON for list and extract", async () => {
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

      for (const action of ["list", "extract"] as const) {
        const output = await captureStdout(async () => {
          const exitCode = await runGuardrails({
            root,
            action,
            paths: [deltaPath],
            format: "json",
          });
          expect(exitCode).toBe(0);
        });

        const parsed: unknown = JSON.parse(output);
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error(`guardrails ${action} --format json must emit an object`);
        }
        const items = { ...parsed }.items;
        if (!Array.isArray(items)) {
          throw new Error(`guardrails ${action} --format json must emit items[]`);
        }
        expect(items).toEqual([
          {
            id: "DG-0001",
            type: "non-goal",
            guardrail: "Do not change the spec layout.",
            rationale: "Spec layout is a hard gate.",
            reconsider: "never",
            keywords: [],
            source: { file: "18_delta.md", line: 5 },
          },
        ]);
      }
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

  it("emits a structured JSON envelope on the exit 2 refusals", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    try {
      const loadOutput = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "list",
          paths: ["missing.md"],
          format: "json",
        });
        expect(exitCode).toBe(2);
      });

      expect(loadOutput).not.toContain(root);
      const parsed: unknown = JSON.parse(loadOutput);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("guardrails --format json must emit an object on failure");
      }
      expect({ ...parsed }.error).toEqual(
        expect.objectContaining({
          code: "load-failed",
          details: [{ path: "missing.md", message: "Path does not exist" }],
        }),
      );

      const maxOutput = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "extract",
          paths: [],
          max: -1,
          format: "json",
        });
        expect(exitCode).toBe(2);
      });
      const parsedMax: unknown = JSON.parse(maxOutput);
      if (typeof parsedMax !== "object" || parsedMax === null) {
        throw new Error("guardrails --format json must emit an object on failure");
      }
      expect({ ...parsedMax }.error).toEqual(expect.objectContaining({ code: "invalid-max" }));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("relativizes the absolute path inside a read failure message", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-guardrails-"));
    const deltaPath = path.join(root, "18_delta.md");
    try {
      await writeFile(deltaPath, "# SPEC-0001: Delta\n", "utf-8");
      // Node splices the absolute path into its own error message.
      readFileFailure.build = (target: string): Error =>
        new Error(`ENOENT: no such file or directory, open '${target}'`);

      const output = await captureStdout(async () => {
        const exitCode = await runGuardrails({
          root,
          action: "list",
          paths: [deltaPath],
          format: "json",
        });
        expect(exitCode).toBe(2);
      });

      expect(output).not.toContain(root);
      const parsed: unknown = JSON.parse(output);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("guardrails --format json must emit an object on failure");
      }
      expect({ ...parsed }.error).toEqual(
        expect.objectContaining({
          code: "load-failed",
          details: [
            {
              path: "18_delta.md",
              message: "Error: ENOENT: no such file or directory, open '18_delta.md'",
            },
          ],
        }),
      );
    } finally {
      readFileFailure.build = null;
      await rm(root, { recursive: true, force: true });
    }
  });
});
