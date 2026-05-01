/**
 * Spec ID linkage validator (v2.0 transitional stub).
 *
 * v1.x round/candidate/polishCycle ID linkage rules removed in P2.
 * v2.0 will check `iterations[].index` contiguity and iter-NN/ dir
 * presence (covered by prototypingEvidenceV3 in P7).
 */

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";

export function validateSpecIdLinkage(_root: string, _config: QfaiConfig): Issue[] {
  return [];
}
