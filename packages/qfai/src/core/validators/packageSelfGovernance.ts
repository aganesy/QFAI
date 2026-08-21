/**
 * Package self-governance gate group.
 *
 * Pair III (`R-SKILL-MANIFEST-DRIFT`) and Pair IV
 * (`R-HANDOFF-SCHEMA-DRIFT`) both resolve every input they read under
 * qfai's own monorepo source tree, against the *validated* repo's root.
 * A project produced by `qfai init` never contains that tree, so in a
 * consuming repo both detectors return `[]` structurally — not because
 * the project is clean.
 *
 * Grouping them behind one named precondition gives two things the
 * inline call-sites could not:
 *
 *   - the composition in `core/validate.ts` states the precondition
 *     once instead of leaving it implicit in each detector's early
 *     return, and
 *   - the profile-coverage notice can name the two finding codes as
 *     NOT evaluated when the precondition does not hold, so a clean
 *     partial-profile run stops implying they were.
 */
import path from "node:path";

import type { Issue } from "../types.js";
import { detectHandoffSchemaDrift } from "./handoffSchemaDrift.js";
import { detectSkillManifestDrift } from "./skillManifestDrift.js";
import { exists } from "./utils.js";

/**
 * Root-relative qfai package source tree both detectors resolve their
 * inputs against. Present only when qfai validates itself.
 */
export const PACKAGE_SOURCE_ROOT_REL = "packages/qfai/src";

/**
 * Finding codes this group owns. Listed as individual codes rather than
 * an `R-*` wildcard: the other Reviewer-Gate detectors read
 * project-owned paths and do fire in a consuming repo, so the wildcard
 * would be over-broad in both directions.
 */
export const PACKAGE_SELF_GOVERNANCE_FAMILIES = [
  "R-HANDOFF-SCHEMA-DRIFT",
  "R-SKILL-MANIFEST-DRIFT",
] as const;

/** True when the validated repo carries the qfai package source tree. */
export async function packageSelfGovernanceApplies(root: string): Promise<boolean> {
  return exists(path.join(root, PACKAGE_SOURCE_ROOT_REL));
}

/**
 * Run the self-governance drift detectors, but only where their inputs
 * can exist. Outside qfai's own repo the group is a no-op by contract,
 * and the coverage notice reports it as unevaluated.
 */
export async function runPackageSelfGovernanceValidators(root: string): Promise<Issue[]> {
  if (!(await packageSelfGovernanceApplies(root))) {
    return [];
  }
  return [...(await detectHandoffSchemaDrift(root)), ...(await detectSkillManifestDrift(root))];
}
