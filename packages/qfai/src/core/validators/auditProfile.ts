/**
 * Audit profile entry surface — thin wrapper / re-export over
 * `./designAudit.js`.
 *
 * The audit lane behavior (band warning, closed-schema rejection,
 * legacy string-only acceptance during the deprecation window) is
 * implemented in `designAudit.ts`. This module exposes the same
 * surface under the contract-named filename so consumers can import
 * the audit profile entrypoints from a stable identifier.
 *
 * The wrapper deliberately does not duplicate logic: any change to
 * audit semantics MUST land in `designAudit.ts` and is automatically
 * surfaced here.
 */

export {
  PRIMARY_TASKS_BAND_MIN,
  PRIMARY_TASKS_BAND_MAX,
  PRIMARY_TASKS_BAND_LABEL,
  resolveAuditConfig,
  mapSeverity,
  findingToIssue,
  deduplicateFindings,
  validateDesignAudit,
} from "./designAudit.js";

export type { DesignAuditConfig, DesignFinding } from "./designAudit.js";

import { validateDesignAudit as _validateDesignAudit } from "./designAudit.js";
import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";

/**
 * Pass-through audit entrypoint. Delegates to `validateDesignAudit`
 * in `designAudit.ts`. Provided as a stable name under the
 * audit-profile module so callers depending on this surface do not
 * need to import the implementation module directly.
 */
export async function runAuditProfile(root: string, config: QfaiConfig): Promise<Issue[]> {
  return _validateDesignAudit(root, config);
}
