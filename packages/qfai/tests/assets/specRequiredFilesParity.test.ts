/**
 * The three required-file registries agree (#393, #665).
 *
 * "Which files must a layered spec contain" is stated three times — in
 * `catalog/spec_required_files.json`, which `qfai init` copies into every
 * project, in `specLayout.ts` as `REQUIRED_LAYERED_*_FILES_V1421`, and in
 * `catalog/review-gate.rules.yml`, which states the same inventory in the
 * artifact vocabulary a reviewer uses (`Spec`, `UserStories`, `Delta`).
 *
 * The first two disagreed in both directions: the JSON's `shared_dir` omitted
 * `11_Slice-Policy.md` (which the code required) and its `spec_dir` added
 * `10_Plan.md` (which the code did not).
 *
 * `resolveLayeredRequiredFileSets` prefers the on-disk catalog and falls back
 * silently, so which registry applied depended on whether a project had run
 * `qfai init` — and as shipped, `E_SPEC_MISSING_FILESET` could never fire for
 * `11_Slice-Policy.md`, the one `_policies` file `workflow.md` makes a
 * precondition for every CREATE / UPDATE / DELETE decision.
 *
 * The YAML was the third copy and had no reader in `src`, so nothing caught it
 * drifting: it listed neither `Plan` nor `SlicePolicy`, telling a reviewer that
 * two artifacts the gate errors on are neither required nor optional.
 *
 * This test is the SSOT-sync entry the issues ask for: a divergence fails CI.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  REQUIRED_LAYERED_SHARED_FILES_V1421,
  REQUIRED_LAYERED_SPEC_FILES_V1421,
} from "../../src/core/specLayout.js";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CATALOG = "assistant/catalog/spec_required_files.json";
const REVIEW_GATE = "assistant/catalog/review-gate.rules.yml";

type Scope = "spec" | "shared";

async function loadCatalog(tree: string): Promise<{ spec_dir: string[]; shared_dir: string[] }> {
  return JSON.parse(await readFile(path.join(repoRoot, tree, CATALOG), "utf-8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** `02_User-stories.md` -> `UserStories`; `09_delta.md` -> `Delta`. */
function toArtifactName(fileName: string): string {
  return fileName
    .replace(/^\d+_/, "")
    .replace(/\.md$/, "")
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function readNames(rules: Record<string, unknown>, section: string, scope: Scope): string[] {
  const bucket = rules[section];
  if (!isRecord(bucket)) {
    throw new Error(`${REVIEW_GATE}: \`${section}\` is not a mapping`);
  }

  const names = bucket[scope];
  if (!isStringArray(names)) {
    throw new Error(`${REVIEW_GATE}: \`${section}.${scope}\` is not a list of strings`);
  }

  return names;
}

/**
 * `required` and `optional` split the inventory by obligation, not by filename
 * order, so the union is what the JSON catalog can be compared against.
 */
async function loadReviewGateInventory(tree: string, scope: Scope): Promise<string[]> {
  const raw = await readFile(path.join(repoRoot, tree, REVIEW_GATE), "utf-8");
  const rules: unknown = parseYaml(raw);
  if (!isRecord(rules)) {
    throw new Error(`${REVIEW_GATE}: did not parse to a mapping`);
  }

  return [...readNames(rules, "required", scope), ...readNames(rules, "optional", scope)];
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

    it(`${tree}: review-gate.rules.yml inventories every spec_dir artifact`, async () => {
      const [inventory, catalog] = await Promise.all([
        loadReviewGateInventory(tree, "spec"),
        loadCatalog(tree),
      ]);

      expect([...inventory].sort()).toEqual(catalog.spec_dir.map(toArtifactName).sort());
    });

    it(`${tree}: review-gate.rules.yml inventories every shared_dir artifact`, async () => {
      const [inventory, catalog] = await Promise.all([
        loadReviewGateInventory(tree, "shared"),
        loadCatalog(tree),
      ]);

      expect([...inventory].sort()).toEqual(catalog.shared_dir.map(toArtifactName).sort());
    });

    it(`${tree}: review-gate.rules.yml names Plan and SlicePolicy as required`, async () => {
      // The two artifacts the YAML was frozen without. A reviewer working from
      // it had no reason to open either, while QFAI-PLAN-* / QFAI-SPLIT-* still
      // fail the run at error severity.
      const raw = await readFile(path.join(repoRoot, tree, REVIEW_GATE), "utf-8");
      const rules: unknown = parseYaml(raw);
      if (!isRecord(rules)) {
        throw new Error(`${REVIEW_GATE}: did not parse to a mapping`);
      }

      expect(readNames(rules, "required", "spec")).toContain("Plan");
      expect(readNames(rules, "required", "shared")).toContain("SlicePolicy");
    });
  }
});
