/**
 * Canonical UIX aggregate validator — v1.7.14
 *
 * This is the package's production-path UIX validator entrypoint.
 * All validators are owned by canonical modules under uix/.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import { findLatestDiscussionPackDir } from "../../discussionPack.js";
import type { Issue } from "../../types.js";
import { readSafe } from "../utils.js";

// Canonical validators — owned by uix/ modules
import { validateClassification } from "./classification.js";
import { validateSidecarMissing } from "./foundation.js";
import { validateOptionComparison } from "./comparisonValidator.js";
import { validateOqClosure } from "./oqClosure.js";

// Strong validators from uix/
import { validateTasteInterview } from "./taste.js";
import { validateTrendScan } from "./trend.js";
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
  // Resolve the effective validation root: if root contains 01_Spec.md directly
  // (test scenario / direct pack), use it. Otherwise resolve the latest discussion pack.
  let effectiveRoot = root;
  const directSpec = await readSafe(path.join(root, "01_Spec.md"));
  if (!directSpec) {
    const discussionDir = path.join(root, config.paths.discussionDir);
    const packRoot = await findLatestDiscussionPackDir(discussionDir);
    if (!packRoot) return [];
    effectiveRoot = packRoot;
  }

  const validators = [
    // Explicit UI-bearing classification (must run before sidecar checks)
    validateClassification,
    // Sidecar presence
    validateSidecarMissing,
    // Design taste interview (10 sections)
    validateTasteInterview,
    // Trend scan freshness
    validateTrendScan,
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

  const results = await Promise.all(validators.map((v) => v(effectiveRoot, config)));
  const issues = results.flat();

  return issues;
}
