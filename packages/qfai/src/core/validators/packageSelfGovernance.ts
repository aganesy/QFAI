/**
 * Package self-governance gate group.
 *
 * Pair III (`QFAI-MANIFEST-001`) and Pair IV
 * (`QFAI-HANDOFF-001`) both resolve every input they read under
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
import { detectHandoffSchemaDrift, unreadableHandoffInput } from "./handoffSchemaDrift.js";
import { HANDOFF_SCHEMA_REL, HANDOFF_WRITER_PAIRS } from "./handoffSchemaPairs.js";
import { detectSkillManifestDrift, unreadableManifestSide } from "./skillManifestDrift.js";
import { SKILL_MANIFEST_PAIRS } from "./skillManifestPairs.js";
import { observePath } from "./utils.js";

/**
 * Root-relative qfai package source tree both detectors resolve their
 * inputs against. Present only when qfai validates itself.
 *
 * It is the tree the two detectors live under, not the precondition for
 * either of them — see {@link unevaluatedPackageSelfGovernanceFamilies}.
 */
export const PACKAGE_SOURCE_ROOT_REL = "packages/qfai/src";

/**
 * Whether a detector's inputs let it reach a verdict. `incomplete` is the
 * case where they might, but a path could not be observed (a permission error
 * on a parent directory, say): the check is undone, which is neither "absent"
 * nor "in sync", so it carries the findings that say so instead of throwing.
 */
type Precondition =
  | { readonly kind: "met" }
  | { readonly kind: "unmet" }
  | { readonly kind: "incomplete"; readonly issues: readonly Issue[] };

const MET: Precondition = { kind: "met" };
const UNMET: Precondition = { kind: "unmet" };

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
  /** Whether every file this detector reads to reach a verdict exists. */
  readonly precondition: (root: string) => Promise<Precondition>;
  readonly run: (root: string) => Promise<readonly Issue[]>;
};

/**
 * Pair IV reaches a verdict only with the schema **and** at least one
 * registered writer: the schema alone leaves every pair skipped at
 * `detectHandoffSchemaDrift`'s per-writer absence check. A schema, or with
 * no writer present a writer, that cannot be observed makes it incomplete.
 */
async function handoffSchemaDriftPrecondition(root: string): Promise<Precondition> {
  const schema = await observePath(path.join(root, HANDOFF_SCHEMA_REL));
  if (schema.kind === "absent") return UNMET;
  if (schema.kind === "unobservable") {
    return incomplete([
      unreadableHandoffInput(HANDOFF_SCHEMA_REL, schema.reason, "every registered writer"),
    ]);
  }
  const unobserved: Issue[] = [];
  for (const pair of HANDOFF_WRITER_PAIRS) {
    const writer = await observePath(path.join(root, pair.writerRel));
    if (writer.kind === "present") return MET;
    if (writer.kind === "unobservable") {
      unobserved.push(
        unreadableHandoffInput(pair.writerRel, writer.reason, `clause=${pair.clause}`),
      );
    }
  }
  return unobserved.length > 0 ? incomplete(unobserved) : UNMET;
}

/**
 * Pair III compares two sides, so one whole pair must be present. With
 * either side missing `detectSkillManifestDrift` skips that pair by
 * design — conservative, and therefore silent. With no whole pair present,
 * a pair whose sides are each present or unobservable makes it incomplete.
 */
async function skillManifestDriftPrecondition(root: string): Promise<Precondition> {
  const unobserved: Issue[] = [];
  for (const pair of SKILL_MANIFEST_PAIRS) {
    const sides = [
      { rel: pair.probeImplRel, seen: await observePath(path.join(root, pair.probeImplRel)) },
      { rel: pair.schemaRel, seen: await observePath(path.join(root, pair.schemaRel)) },
    ];
    if (sides.every((side) => side.seen.kind === "present")) return MET;
    // A pair with a side known to be absent is out of scope, as in the detector.
    if (sides.some((side) => side.seen.kind === "absent")) continue;
    for (const side of sides) {
      if (side.seen.kind === "unobservable") {
        unobserved.push(unreadableManifestSide(side.rel, side.seen.reason, pair.clause));
      }
    }
  }
  return unobserved.length > 0 ? incomplete(unobserved) : UNMET;
}

function incomplete(issues: readonly Issue[]): Precondition {
  return { kind: "incomplete", issues };
}

const SELF_GOVERNANCE_GATES: readonly SelfGovernanceGate[] = [
  {
    family: "QFAI-HANDOFF-001",
    precondition: handoffSchemaDriftPrecondition,
    run: detectHandoffSchemaDrift,
  },
  {
    family: "QFAI-MANIFEST-001",
    precondition: skillManifestDriftPrecondition,
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
 * The codes in this group whose inputs are absent or could not be observed,
 * so a run cannot have evaluated them. Empty when every detector could reach
 * a verdict.
 */
export async function unevaluatedPackageSelfGovernanceFamilies(root: string): Promise<string[]> {
  const unevaluated: string[] = [];
  for (const gate of SELF_GOVERNANCE_GATES) {
    if ((await gate.precondition(root)).kind !== "met") {
      unevaluated.push(gate.family);
    }
  }
  return unevaluated;
}

/**
 * Run the self-governance drift detectors, each only where its own
 * inputs exist. Outside qfai's own repo the group is a no-op by
 * contract, and the coverage notice reports it as unevaluated. A
 * precondition that could not observe a path reports the check as
 * incomplete instead of stopping the run.
 */
export async function runPackageSelfGovernanceValidators(root: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const gate of SELF_GOVERNANCE_GATES) {
    const precondition = await gate.precondition(root);
    if (precondition.kind === "met") {
      issues.push(...(await gate.run(root)));
    } else if (precondition.kind === "incomplete") {
      issues.push(...precondition.issues);
    }
  }
  return issues;
}
