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

// The steps of the change note and the verify block: what `medium` adds to work that writes no code.
const GATE_STEPS = new Set(["verify-change-note", "verify-qfai-gate", "verify-repo-gate"]);

// The index of the last stage that writes a requested artifact, or -1 when none does.
function lastWriter(stages: readonly PlanStage[], artifacts: readonly Artifact[]): number {
  let last = -1;
  stages.forEach((stage, index) => {
    if (artifacts.some((artifact) => WRITES[stage.kind]?.includes(artifact))) last = index;
  });
  return last;
}

// The index where the run of `verify` stages that ends the plan starts.
function closingVerifyStart(stages: readonly PlanStage[]): number {
  let start = stages.length;
  while (start > 0 && stages[start - 1]?.kind === "verify") start -= 1;
  return start;
}

// The plan's distinct scopes, narrowest first, the narrowest recommended.
export function scopesOf(
  stages: readonly PlanStage[],
  artifacts: readonly Artifact[],
): PlanScope[] {
  const ids = stages.map((stage) => stage.id);
  const candidates: Array<{ scope: ScopeName; stages: string[] }> = [];
  const end = lastWriter(stages, artifacts);
  if (end >= 0) {
    const closing = stages.slice(Math.max(closingVerifyStart(stages), end + 1));
    const gates = closing.filter((stage) => stage.steps.every((step) => GATE_STEPS.has(step.name)));
    const leading = ids.slice(0, end + 1);
    const withGates = [...leading, ...gates.map((stage) => stage.id)];
    let lastCode = -1;
    stages.forEach((stage, index) => {
      if (WRITES_CODE.has(stage.kind)) lastCode = index;
    });
    const holdsCode = stages.slice(0, end + 1).some((stage) => WRITES_CODE.has(stage.kind));
    // Work that writes code takes the gates. The other closing checks verify the fix, so they come
    // only once the route's last code-writing stage is in the run.
    let narrow = leading;
    if (holdsCode) {
      narrow = lastCode <= end ? [...leading, ...closing.map((stage) => stage.id)] : withGates;
    }
    candidates.push({ scope: "narrow", stages: narrow }, { scope: "medium", stages: withGates });
  }
  // A scope holding every stage is `broad`; of two other scopes holding the same stages, the
  // narrower name stays.
  const distinct = candidates.filter(
    (candidate, index) =>
      candidate.stages.length < ids.length &&
      !candidates
        .slice(0, index)
        .some((narrower) => narrower.stages.length === candidate.stages.length),
  );
  distinct.push({ scope: "broad", stages: ids });
  return distinct.map((candidate, index) => ({ ...candidate, recommended: index === 0 }));
}
