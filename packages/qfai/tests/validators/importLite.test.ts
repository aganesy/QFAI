import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { findImportLiteEvidence } from "../../src/core/preflight/importLiteEvidence.js";
import { validateProject } from "../../src/core/validate.js";

async function withLegacyPack(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-old-layout-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const IMPORT_LITE_EVIDENCE = [
  "# Import-lite evidence",
  "",
  "## Metadata",
  "",
  "- generated_at: 2026-04-01T00:00:00Z",
  "- entrypoint: import-lite",
  "",
  "## Sources",
  "",
  "- URLs: https://example.com/requirements",
  "",
].join("\n");

describe("old spec-pack layout at the validation entrypoint", () => {
  it("requires migration instead of dispatching spec-pack input-source checks", async () => {
    await withLegacyPack(async (root) => {
      const result = await validateProject(root, undefined, { profile: "sdd" });
      expect(result.issues.map((item) => item.code)).toContain("QFAI-LAYOUT-001");
      expect(result.issues.map((item) => item.code)).not.toContain("QFAI-IMPLITE-001");
    });
  });

  it("does not let old import-lite evidence bypass the migration gate", async () => {
    await withLegacyPack(async (root) => {
      const evidenceDir = path.join(root, ".qfai", "evidence");
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(
        path.join(evidenceDir, "import-lite-20260401000000000.md"),
        IMPORT_LITE_EVIDENCE,
        "utf-8",
      );
      expect(await findImportLiteEvidence(root)).not.toBeNull();
      const result = await validateProject(root, undefined, { profile: "full" });
      expect(result.issues.map((item) => item.code)).toContain("QFAI-LAYOUT-001");
    });
  });
});
