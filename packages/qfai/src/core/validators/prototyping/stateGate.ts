/**
 * Prototyping state-gate orchestrator (transitional no-op).
 *
 * Completion for the iteration loop is checked by
 * `qfai prototyping iterate --cycle <n>` via shouldStop() and by
 * `qfai prototyping certify --check`; this orchestrator has no
 * additional gates of its own.
 */

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";

export function validateStateGate(_root: string, _config: QfaiConfig): Issue[] {
  return [];
}
