// How far the work on a plan may go, narrowest first, so the user can stop the work once it has
// delivered what the request asked for.

import type { Artifact } from "./extraction.js";
import type { PlanStage } from "./planFormat.js";

export type ScopeName = "narrow" | "medium" | "broad";

export interface PlanScope {
  scope: ScopeName;
  stages: string[];
  recommended: boolean;
}

// The artifacts a stage of each kind writes. A kind not named here writes none.
const WRITES: Record<string, readonly Artifact[]> = {
  sdd: ["spec", "contract"],
  sdd_append: ["spec", "contract"],
  prototype: ["ui"],
  implement: ["code", "tests", "config", "ci", "deps", "data", "assistant"],
  regression_fix: ["code", "tests"],
  test_fix: ["tests"],
  maintenance: ["docs"],
};

// Kinds whose work is never handed over without the closing verification stages.
const WRITES_CODE = new Set(["implement", "regression_fix", "test_fix"]);

// The steps of the change note and the verify block, its local commit included: what `medium` adds
// to work that writes no code.
const GATE_STEPS = new Set([
  "verify-change-note",
  "verify-qfai-gate",
  "verify-repo-gate",
  "verify-commit",
]);

// A private security report must not reach a tracked file before its fix, so no scope stops early.
const PRIVATE_INTAKE = "triage-security-intake";

function writesRequested(stage: PlanStage, artifacts: readonly Artifact[]): boolean {
  return artifacts.some((artifact) => WRITES[stage.kind]?.includes(artifact));
}

// The index of the last stage of `stages` that `holds`, or -1.
function lastIndex(stages: readonly PlanStage[], holds: (stage: PlanStage) => boolean): number {
  let last = -1;
  stages.forEach((stage, index) => {
    if (holds(stage)) last = index;
  });
  return last;
}

// The index where the run of `verify` stages that ends the plan starts.
function closingVerifyStart(stages: readonly PlanStage[]): number {
  let start = stages.length;
  while (start > 0 && stages[start - 1]?.kind === "verify") start -= 1;
  return start;
}

// The narrow and medium stage lists, or `undefined` when the plan offers only `broad`.
function narrowerScopes(
  stages: readonly PlanStage[],
  artifacts: readonly Artifact[],
): { narrow: string[]; medium: string[] } | undefined {
  if (stages.some((stage) => stage.steps.some((step) => step.name === PRIVATE_INTAKE))) {
    return undefined;
  }
  const end = lastIndex(stages, (stage) => writesRequested(stage, artifacts));
  if (end < 0) return undefined;
  // Implementation that writes nothing the request names stays out.
  const kept = stages
    .slice(0, end + 1)
    .filter((stage) => !WRITES_CODE.has(stage.kind) || writesRequested(stage, artifacts));
  const ids = (list: readonly PlanStage[]) => list.map((stage) => stage.id);
  const closing = stages.slice(Math.max(closingVerifyStart(stages), end + 1));
  const gates = closing.filter((stage) => stage.steps.every((step) => GATE_STEPS.has(step.name)));
  if (!kept.some((stage) => WRITES_CODE.has(stage.kind))) {
    const medium = ids([...kept, ...gates]);
    // Work that writes only documentation is never handed over unchecked.
    const onlyDocs = kept.every((stage) => stage.kind === "maintenance");
    return { narrow: onlyDocs ? medium : ids(kept), medium };
  }
  // Work that writes code takes the gates. The other closing checks verify the fix, so they come
  // only once the route's last code-writing stage is in the run.
  const lastCode = lastIndex(stages, (stage) => WRITES_CODE.has(stage.kind));
  const narrow = ids([...kept, ...(lastCode <= end ? closing : gates)]);
  return { narrow, medium: narrow };
}

// The plan's distinct scopes, narrowest first, the narrowest recommended.
export function scopesOf(
  stages: readonly PlanStage[],
  artifacts: readonly Artifact[],
): PlanScope[] {
  const all = stages.map((stage) => stage.id);
  const narrower = narrowerScopes(stages, artifacts);
  const candidates: Array<{ scope: ScopeName; stages: string[] }> = narrower
    ? [
        { scope: "narrow", stages: narrower.narrow },
        { scope: "medium", stages: narrower.medium },
      ]
    : [];
  // A scope holding every stage is `broad`; of two other scopes holding the same stages, the
  // narrower name stays.
  const distinct = candidates.filter(
    (candidate, index) =>
      candidate.stages.length < all.length &&
      !candidates
        .slice(0, index)
        .some((earlier) => earlier.stages.length === candidate.stages.length),
  );
  distinct.push({ scope: "broad", stages: all });
  return distinct.map((candidate, index) => ({ ...candidate, recommended: index === 0 }));
}
