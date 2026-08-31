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
 * Grouping them here, each behind its own named precondition, gives two
 * things the inline call-sites could not:
 *
 *   - the composition in `core/validate.ts` states the preconditions
 *     instead of leaving them implicit in each detector's early return,
 *     and
 *   - the profile-coverage notice can name a finding code as NOT
 *     evaluated when that detector's precondition does not hold, so a
 *     clean partial-profile run stops implying it was.
 *
 * The preconditions are per code, not one for the group: the two
 * detectors read different files, so a tree carrying one detector's
 * inputs and not the other's is evaluated for exactly one of them.
 */
import path from "node:path";

import type { Issue } from "../types.js";
import { detectHandoffSchemaDrift } from "./handoffSchemaDrift.js";
import { HANDOFF_SCHEMA_REL, HANDOFF_WRITER_PAIRS } from "./handoffSchemaPairs.js";
import { detectSkillManifestDrift } from "./skillManifestDrift.js";
import { SKILL_MANIFEST_PAIRS } from "./skillManifestPairs.js";
import { exists } from "./utils.js";

/**
 * Root-relative qfai package source tree both detectors resolve their
 * inputs against. Present only when qfai validates itself.
 *
 * It is the tree the two detectors live under, not the precondition for
 * either of them — see {@link unevaluatedPackageSelfGovernanceFamilies}.
 */
export const PACKAGE_SOURCE_ROOT_REL = "packages/qfai/src";

/**
 * One drift detector, with the precondition that decides whether it can
 * produce a finding at all.
 *
 * The precondition is per code because the two detectors need different
 * files. Deciding the whole group on the presence of
 * {@link PACKAGE_SOURCE_ROOT_REL} was wrong in the direction that
 * matters: a partial tree — the package source root present, one
 * detector's registered inputs missing — dropped both codes from the
 * "NOT evaluated" notice while one of them structurally had not run,
 * which is the same false assurance this group was added to remove.
 */
type SelfGovernanceGate = {
  /**
   * The finding family this gate covers. Deliberately not named `code`: the
   * rule-code ownership scan reads a `code:` object-literal property as "this
   * module declares that finding code", and the code is declared — and emitted
   * — by the detector module, not here.
   */
  readonly family: string;
  /** True when every file this detector reads to reach a verdict exists. */
  readonly evaluable: (root: string) => Promise<boolean>;
  readonly run: (root: string) => Promise<readonly Issue[]>;
};

/**
 * Pair IV reaches a verdict only with the schema **and** at least one
 * registered writer: the schema alone leaves every pair skipped at
 * `detectHandoffSchemaDrift`'s per-writer `exists` check.
 */
async function handoffSchemaDriftEvaluable(root: string): Promise<boolean> {
  if (!(await exists(path.join(root, HANDOFF_SCHEMA_REL)))) {
    return false;
  }
  for (const pair of HANDOFF_WRITER_PAIRS) {
    if (await exists(path.join(root, pair.writerRel))) {
      return true;
    }
  }
  return false;
}

/**
 * Pair III compares two sides, so one whole pair must be present. With
 * either side missing `detectSkillManifestDrift` skips that pair by
 * design — conservative, and therefore silent.
 */
async function skillManifestDriftEvaluable(root: string): Promise<boolean> {
  for (const pair of SKILL_MANIFEST_PAIRS) {
    if (
      (await exists(path.join(root, pair.probeImplRel))) &&
      (await exists(path.join(root, pair.schemaRel)))
    ) {
      return true;
    }
  }
  return false;
}

const SELF_GOVERNANCE_GATES: readonly SelfGovernanceGate[] = [
  {
    family: "R-HANDOFF-SCHEMA-DRIFT",
    evaluable: handoffSchemaDriftEvaluable,
    run: detectHandoffSchemaDrift,
  },
  {
    family: "R-SKILL-MANIFEST-DRIFT",
    evaluable: skillManifestDriftEvaluable,
    run: detectSkillManifestDrift,
  },
];

/**
 * Finding codes this group owns. Listed as individual codes rather than
 * an `R-*` wildcard: the other Reviewer-Gate detectors read
 * project-owned paths and do fire in a consuming repo, so the wildcard
 * would be over-broad in both directions.
 */
export const PACKAGE_SELF_GOVERNANCE_FAMILIES = SELF_GOVERNANCE_GATES.map((gate) => gate.family);

/**
 * The codes in this group whose inputs are absent, so a run cannot have
 * evaluated them. Empty when every detector could reach a verdict.
 */
export async function unevaluatedPackageSelfGovernanceFamilies(root: string): Promise<string[]> {
  const unevaluated: string[] = [];
  for (const gate of SELF_GOVERNANCE_GATES) {
    if (!(await gate.evaluable(root))) {
      unevaluated.push(gate.family);
    }
  }
  return unevaluated;
}

/**
 * Run the self-governance drift detectors, each only where its own
 * inputs exist. Outside qfai's own repo the group is a no-op by
 * contract, and the coverage notice reports it as unevaluated.
 */
export async function runPackageSelfGovernanceValidators(root: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const gate of SELF_GOVERNANCE_GATES) {
    if (await gate.evaluable(root)) {
      issues.push(...(await gate.run(root)));
    }
  }
  return issues;
}
