/**
 * The two required-file registries agree (#393).
 *
 * "Which files must a layered spec contain" is stated twice — in
 * `catalog/spec_required_files.json`, which `qfai init` copies into every
 * project, and in `specLayout.ts` as `REQUIRED_LAYERED_*_FILES_V1421`. They
 * disagreed in both directions: the JSON's `shared_dir` omitted
 * `11_Slice-Policy.md` (which the code required) and its `spec_dir` added
 * `10_Plan.md` (which the code did not).
 *
 * `resolveLayeredRequiredFileSets` prefers the on-disk catalog and falls back
 * silently, so which registry applied depended on whether a project had run
 * `qfai init` — and as shipped, `E_SPEC_MISSING_FILESET` could never fire for
 * `11_Slice-Policy.md`, the one `_policies` file `workflow.md` makes a
 * precondition for every CREATE / UPDATE / DELETE decision.
 *
 * This test is the SSOT-sync entry the issue asks for: a divergence fails CI.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_LAYERED_SHARED_FILES_V1421,
  REQUIRED_LAYERED_SPEC_FILES_V1421,
} from "../../src/core/specLayout.js";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CATALOG = "assistant/catalog/spec_required_files.json";

async function loadCatalog(tree: string): Promise<{ spec_dir: string[]; shared_dir: string[] }> {
  return JSON.parse(await readFile(path.join(repoRoot, tree, CATALOG), "utf-8"));
}

describe("required-file registries", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: spec_dir equals REQUIRED_LAYERED_SPEC_FILES_V1421`, async () => {
      const catalog = await loadCatalog(tree);

      // Order matters as much as membership: the two are read as one contract,
      // and a reader comparing them by eye compares them in order.
      expect(catalog.spec_dir).toEqual([...REQUIRED_LAYERED_SPEC_FILES_V1421]);
    });

    it(`${tree}: shared_dir equals REQUIRED_LAYERED_SHARED_FILES_V1421`, async () => {
      const catalog = await loadCatalog(tree);

      expect(catalog.shared_dir).toEqual([...REQUIRED_LAYERED_SHARED_FILES_V1421]);
    });

    it(`${tree}: 11_Slice-Policy.md is required by both`, async () => {
      // `workflow.md` makes it a precondition for every CREATE/UPDATE/DELETE
      // decision, and as shipped the gate could never fire for it.
      const catalog = await loadCatalog(tree);

      expect(catalog.shared_dir).toContain("11_Slice-Policy.md");
      expect(REQUIRED_LAYERED_SHARED_FILES_V1421).toContain("11_Slice-Policy.md");
    });

    it(`${tree}: 10_Plan.md is required by both`, async () => {
      // `spec-traceability-rules.md` lists it and `sdd-quality-gate.md` gates
      // on it, so the catalog was right and the constant was the outlier.
      const catalog = await loadCatalog(tree);

      expect(catalog.spec_dir).toContain("10_Plan.md");
      expect(REQUIRED_LAYERED_SPEC_FILES_V1421).toContain("10_Plan.md");
    });
  }
});
