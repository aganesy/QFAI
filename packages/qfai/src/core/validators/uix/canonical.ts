/**
 * Canonical UIX aggregate validator — v1.7.14
 *
 * This validator now runs only when the validation target is a direct
 * discussion pack root. Repo-root downstream validation is contract-first
 * and must not resolve the latest discussion pack implicitly.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { readSafe } from "../utils.js";

// Canonical validators — owned by uix/ modules
import { validateClassification } from "./classification.js";
import { validateSidecarMissing } from "./foundation.js";
import { validateOptionComparison } from "./comparisonValidator.js";
import { validateOqClosure } from "./oqClosure.js";

import {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "./threeLayer.js";
import { validateScreenContractSchema } from "./screenContract.js";

/**
 * Run the canonical UIX validator set and return combined issues.
 * Resolves the latest discussion pack when root is a repo root.
 */
export async function runCanonicalUixValidators(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const directSpec = await readSafe(path.join(root, "01_Spec.md"));
  if (!directSpec) {
    return [];
  }

  const validators = [
    // Explicit UI-bearing classification (must run before sidecar checks)
    validateClassification,
    // Sidecar presence
    validateSidecarMissing,
    // Exploration-first sidecar family
    validateThreeLayerModel,
    validateForbiddenLegacyFiles,
    validateThreeLayerFamilyCompleteness,
    // Strong screen contract schema
    validateScreenContractSchema,
    // Exploration brief / rubric / evaluator calibration
    validateOptionComparison,
    // OQ closure
    validateOqClosure,
  ];

  const results = await Promise.all(validators.map((v) => v(root, config)));
  const issues = results.flat();

  return issues;
}
