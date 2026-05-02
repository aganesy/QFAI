/**
 * Prototyping state-gate orchestrator (v2.0 transitional stub).
 *
 * v1.x mode/full-harness sub-validators (executionPlan, screenshotDir,
 * lighthouseGate, iterationGate, designSystemThreshold) were removed in
 * P3 (spec-0017). The v2.0 iteration loop has no equivalent state-gate
 * orchestrator — completion is checked by the new
 * `qfai prototyping iterate --cycle <n>` command via shouldStop()
 * (lands in P5/P6) and `qfai prototyping certify --check` (P5/P7).
 */

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";

export function validateStateGate(_root: string, _config: QfaiConfig): Issue[] {
  return [];
}
