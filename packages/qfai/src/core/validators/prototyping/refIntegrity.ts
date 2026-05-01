/**
 * Prototyping artifact ref integrity validator (v2.0 transitional stub).
 *
 * The v1.x round-based ref-walk was tightly coupled to funnel artifacts
 * (rounds[], harvestRef, narrowDecisionRef, absorptionPlanRef,
 * reimplementationRef, breakthrough.json) which were removed in P2.
 *
 * The v2.0 iteration-based ref integrity validator lands in P7 and walks
 * `prototyping.json#iterations[].evidenceRefs` and the design-system /
 * prototype-handoff contracts produced post-loop.
 */

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";

export function validatePrototypingArtifactRefIntegrity(
  _root: string,
  _config: QfaiConfig,
): Issue[] {
  return [];
}
