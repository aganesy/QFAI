/**
 * Legacy / Compatibility Layer — v1.7.13
 *
 * Re-exports legacy validators that are retained for migration compatibility
 * and backward-compatible test coverage. These are NOT part of the canonical
 * production path, which uses `runCanonicalUixValidators` from `uix/canonical.ts`.
 *
 * Import from this module only when exercising compatibility behavior.
 */

export {
  validateSidecarMissing,
  validateStrategyCompleteness,
  validateScoringAxes,
  validateAggregateScoringRules,
  validateOptionComparison,
  validateScreenContracts,
  validateOqClosure,
  validateMigration,
  runLegacyUixCompatibilityValidators,
  reviewStrategy,
  applyPhase1Ratchet,
  type ReviewVerdict,
  type ReviewResult,
} from "./uixCompatibility.js";

export { validateLegacyDdpFields, resetBannedPatternsCache } from "./ddpCompatibility.js";
