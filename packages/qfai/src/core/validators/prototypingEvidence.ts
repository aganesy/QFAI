/**
 * Prototyping evidence validator (v2.0 transitional stub).
 *
 * v1.x round/funnel/polish/branch/concept-fit/100-perfect schema validation
 * removed in P2 (spec-0017). The v2.0 iteration-based validator lands as
 * `prototypingEvidenceV3.ts` in P7 with QFAI-PROT2-NNN error codes.
 */

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";

export function validatePrototypingEvidence(_root: string, _config: QfaiConfig): Issue[] {
  return [];
}
