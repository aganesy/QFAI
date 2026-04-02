/**
 * Canonical UIX aggregate validator — v1.7.13
 *
 * This is the package's production-path UIX validator entrypoint.
 * It runs the strong validators defined under uix/ plus the
 * essential validators from uixValidators.ts that are still canonical.
 *
 * runAllUixValidators (uixValidators.ts) is retained for migration
 * compatibility only and should not define the package's primary truth.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import { findLatestDiscussionPackDir } from "../../discussionPack.js";
import type { Issue } from "../../types.js";
import { readSafe } from "../utils.js";

// Canonical validators from uixValidators.ts (still production-worthy)
import {
  validateSidecarMissing,
  validateOptionComparison,
  validateOqClosure,
  validateMigration,
  applyPhase1Ratchet,
} from "../uixValidators.js";

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
 * When `config.uiux.phase1ReleaseDate` is set, applies the phase-1 ratchet.
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
    // Option comparison & anchor
    validateOptionComparison,
    // OQ closure
    validateOqClosure,
    // Migration / stale-asset detection
    validateMigration,
  ];

  const results = await Promise.all(validators.map((v) => v(effectiveRoot, config)));
  let issues = results.flat();

  const relDateStr = config.uiux?.phase1ReleaseDate;
  if (relDateStr) {
    const releaseDate = new Date(relDateStr);
    if (!isNaN(releaseDate.getTime())) {
      issues = applyPhase1Ratchet(issues, releaseDate);
    }
  }

  return issues;
}
