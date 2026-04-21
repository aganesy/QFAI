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
import { validateDesignSystemPresence } from "./designSystemPresence.js";
import { validateOptionComparison } from "./comparisonValidator.js";
import { validateOqClosure } from "./oqClosure.js";

// Strong validators from uix/
import { validateTasteInterview } from "./taste.js";
import { validateTrendScan } from "./trend.js";
import { validateTrendAxisTraceability } from "./trendAxisTraceability.js";
import {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "./threeLayer.js";
import { validateScoringReady } from "./scoringReady.js";
import { validateStrategyStrong } from "./strategy.js";
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
    // Design system presence (UIX-VAL-DS01/DS02)
    validateDesignSystemPresence,
    // Design taste interview (10 sections)
    validateTasteInterview,
    // Trend scan freshness
    validateTrendScan,
    // Trend->Axis traceability (UIX-VAL-T01..T04)
    validateTrendAxisTraceability,
    // 3-layer model enforcement
    validateThreeLayerModel,
    validateForbiddenLegacyFiles,
    validateThreeLayerFamilyCompleteness,
    // Scoring-ready (split 3-layer files)
    validateScoringReady,
    // Strong strategy (8-field schema)
    validateStrategyStrong,
    // Strong screen contract schema
    validateScreenContractSchema,
    // Option comparison & selected anchor
    validateOptionComparison,
    // OQ closure
    validateOqClosure,
  ];

  const results = await Promise.all(validators.map((v) => v(root, config)));
  const issues = results.flat();

  return issues;
}
