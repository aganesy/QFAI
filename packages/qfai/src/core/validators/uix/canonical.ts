/**
 * Canonical UIX aggregate validator.
 *
 * Runs the canonical UIX checks against the discussion pack under
 * validation — resolved from a repo root, or taken directly when the target is
 * already a pack root.
 */
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../../config.js";
import { findLatestPack } from "../../packLocator.js";
import type { Issue } from "../../types.js";
import { readSafe } from "../utils.js";

// Canonical validators — owned by uix/ modules
import { validateClassification } from "./classification.js";
import { validateSidecarMissing } from "./foundation.js";
import { validateExplorationArtifacts } from "./comparisonValidator.js";
import { validateOqClosure } from "./oqClosure.js";
import { validateCompetitiveReferences } from "./competitiveRefs.js";

import {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "./threeLayer.js";
import { validateScreenContractSchema } from "./screenContract.js";
import { validateTrendScan } from "./trendScan.js";

type UixValidator = (root: string, config: QfaiConfig) => Promise<Issue[]>;

/**
 * The canonical UIX validator set — the whole UIX surface `qfai validate`
 * runs.
 *
 * Exported because the non-UI over-fire regression (`nonUiOverfire.ts`) has to
 * measure *this* list. Its own copy of the list drifted into naming modules
 * that had been unwired from here when the pre-`DESIGN.md` uiux sidecars were
 * retired, so the regression asserted zero fires from validators production
 * never executed.
 */
export const CANONICAL_UIX_VALIDATORS: readonly UixValidator[] = [
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
  validateExplorationArtifacts,
  // Competitive Reference Registry (bounded by uiux.competitive_refs_min)
  validateCompetitiveReferences,
  // OQ closure
  validateOqClosure,
  // Trend scan — `04_Sources.md#Trend Scan` is live SSOT; only the
  // `uiux/20_trend_scan.md` sidecar was retired.
  validateTrendScan,
];

/**
 * Run the canonical UIX validator set and return combined issues.
 * Resolves the latest discussion pack when root is a repo root.
 */
export async function runCanonicalUixValidators(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  // The admission probe used to be `<root>/01_Spec.md`, and both call sites
  // pass the repo root. `01_Spec.md` is a *spec* file that no discussion pack
  // contains — a pack has `01_Context.md`, which is what everything behind this
  // gate then reads. So every validator behind this gate was inert on every
  // documented invocation, including
  // `qfai validate --profile discussion --fail-on error`.
  const packRoots = await resolvePackRoots(root, config);
  if (packRoots.length === 0) {
    return [];
  }

  const perPack = await Promise.all(
    packRoots.map(async (packRoot) => {
      const results = await Promise.all(CANONICAL_UIX_VALIDATORS.map((v) => v(packRoot, config)));
      return results.flat();
    }),
  );

  return perPack.flat();
}

/**
 * The pack directories the canonical validators run against.
 *
 * Two shapes are accepted, because both call sites and the direct-invocation
 * path are real:
 *
 * - a **repo root** — resolve the latest pack under `paths.discussionDir`, the
 *   same resolution `validateDiscussionPackReadiness` performs two lines above
 *   the call site;
 * - a **pack root** — probe `01_Context.md`, which is the file a pack actually
 *   has and the one `surfaceType.ts` and the rest of the family read. The old
 *   probe named `01_Spec.md`, so this path never matched either.
 */
async function resolvePackRoots(root: string, config: QfaiConfig): Promise<string[]> {
  if (await readSafe(path.join(root, "01_Context.md"))) {
    return [root];
  }
  const latest = await findLatestPack(resolvePath(root, config, "discussionDir"), "discussion");
  return latest ? [latest.path] : [];
}
