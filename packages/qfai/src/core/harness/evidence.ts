/**
 * Harness evidence — v1.7.15
 *
 * Re-exports from history.ts which now manages iteration evidence.
 * Kept for barrel-export compatibility within the harness module.
 */

export { loadHistory, appendIteration, computeTerminationReason } from "./history.js";
