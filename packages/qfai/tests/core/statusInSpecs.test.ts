import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateStatusInSpecs } from "../../src/core/validators/statusInSpecs.js";

describe("validateStatusInSpecs", () => {
  it("ignores decision records that use Status: Adopted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-status-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(
        path.join(specDir, "07_Decisions.md"),
        [
          "# 07 Decisions",
          "",
          "## DR-0001-0001",
          "- Decision: Sample",
          "- Status: Adopted",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateStatusInSpecs(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-STATUSLEAK-001")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores legitimate spec lifecycle Status bullet on 01_Spec.md", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-status-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(
        path.join(specDir, "01_Spec.md"),
        [
          "# 01 Spec",
          "",
          "- Spec: spec-0001",
          "- Parent: CAP-0001",
          "- Status: active",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateStatusInSpecs(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-STATUSLEAK-001")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("flags operational progress fields under QFAI-STATUSLEAK-001", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-status-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(
        path.join(specDir, "10_Plan.md"),
        [
          "# 10 Plan",
          "",
          "- progress: in-progress",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateStatusInSpecs(root, defaultConfig);
      expect(issues.map((entry) => entry.code)).toContain("QFAI-STATUSLEAK-001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
