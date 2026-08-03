/**
 * Required-file registry parity (QFAI-SPACK-095).
 *
 * "Which files must a layered spec contain" is stated twice: in
 * `catalog/spec_required_files.json`, which `qfai init` copies into every
 * project, and in `specLayout.ts` as `REQUIRED_LAYERED_*_FILES_V1421`.
 * `resolveLayeredRequiredFileSets` prefers the on-disk catalog and falls back
 * to the constants **silently**, so which registry applies depends on whether a
 * project ran `qfai init` — and a catalog array replaces the code default
 * wholesale rather than merging with it.
 *
 * The two shipped copies disagreed in both directions, which is why this check
 * exists rather than an assumption that they cannot. A project may legitimately
 * customise its catalog, so divergence is a `warning`: the point is that
 * changing which files are mandatory should never be silent.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  REQUIRED_LAYERED_SHARED_FILES_V1421,
  REQUIRED_LAYERED_SPEC_FILES_V1421,
} from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

/** Waivable as `SPACK-095` — `waivers.ts#resolveRuleId` strips the `QFAI-`. */
export const REQUIRED_FILES_DIVERGENCE_RULE_ID = "QFAI-SPACK-095";

const CATALOG_REL = path.join("assistant", "catalog", "spec_required_files.json");

type SetName = "spec_dir" | "shared_dir";

const BUILT_IN: Record<SetName, readonly string[]> = {
  spec_dir: REQUIRED_LAYERED_SPEC_FILES_V1421,
  shared_dir: REQUIRED_LAYERED_SHARED_FILES_V1421,
};

function readNames(node: Record<string, unknown>, key: SetName): string[] | null {
  const value = node[key];
  if (!Array.isArray(value)) {
    return null;
  }
  const names = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return names.length > 0 ? names : null;
}

function describeDifference(catalog: readonly string[], builtIn: readonly string[]): string | null {
  const inCatalog = new Set(catalog);
  const inCode = new Set(builtIn);
  const onlyCatalog = catalog.filter((name) => !inCode.has(name));
  const onlyCode = builtIn.filter((name) => !inCatalog.has(name));
  if (onlyCatalog.length === 0 && onlyCode.length === 0) {
    return null;
  }
  const parts: string[] = [];
  if (onlyCatalog.length > 0) {
    parts.push(`required only by the catalog: ${onlyCatalog.join(", ")}`);
  }
  if (onlyCode.length > 0) {
    parts.push(`required only by the built-in default: ${onlyCode.join(", ")}`);
  }
  return parts.join("; ");
}

export async function validateSpecRequiredFilesCatalog(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const catalogPath = path.join(path.dirname(specsRoot), CATALOG_REL);
  const raw = await readSafe(catalogPath);
  if (raw.length === 0) {
    // No catalog: the built-in defaults apply, which is the documented
    // fallback and not a divergence.
    return [];
  }

  const rel = path.relative(root, catalogPath).replace(/\\/g, "/");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return [
      issue(
        REQUIRED_FILES_DIVERGENCE_RULE_ID,
        `spec_required_files.json could not be parsed, so the built-in required-file sets apply instead: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "warning",
        rel,
        "specPack.requiredFilesCatalog",
        undefined,
        "canonical",
        "Fix the JSON, or delete the file to use the built-in sets deliberately. " +
          "A malformed catalog silently changes which files are mandatory.",
      ),
    ];
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }
  const node = parsed as Record<string, unknown>;

  const issues: Issue[] = [];
  for (const key of ["spec_dir", "shared_dir"] as const) {
    const names = readNames(node, key);
    if (names === null) {
      continue;
    }
    const difference = describeDifference(names, BUILT_IN[key]);
    if (difference === null) {
      continue;
    }
    issues.push(
      issue(
        REQUIRED_FILES_DIVERGENCE_RULE_ID,
        `spec_required_files.json "${key}" differs from the built-in required-file set — ${difference}. ` +
          `The catalog wins, so this changes which files are mandatory.`,
        "warning",
        rel,
        "specPack.requiredFilesCatalog",
        undefined,
        "canonical",
        "A project may customise this deliberately; record that decision and waive " +
          `\`${REQUIRED_FILES_DIVERGENCE_RULE_ID}\`. Otherwise re-sync the catalog with the ` +
          "shipped set — an unnoticed divergence means `E_SPEC_MISSING_FILESET` cannot fire for " +
          "a file one side considers required.",
      ),
    );
  }

  return issues;
}
