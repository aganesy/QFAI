// Where a declared branch point sends a run, and what of the run's evidence the destination
// keeps. A run changes route only at a step its plan declares a branch point, to a destination
// the plan declares for the outcome the step reported.

import { createHash } from "node:crypto";

import { everyStageResult } from "./common.js";
import { decideRoute } from "./decisionRules.js";
import type { PlanBranchPoint } from "./planFormat.js";
import { stepNamesOf } from "./steps.js";
import type {
  InputRefusal,
  PlanStages,
  WorkflowFacts,
  WorkflowResult,
  WorkflowReroute,
  WorkflowReusedStep,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

// The branch point that reads the diagnosis verdict rather than a `branch` field.
const DIAGNOSE_STEP = "implement-diagnose";

// The re-routes a request makes before the operator is asked about the next one.
export const REROUTE_CAP = 2;

const UNDECLARED: InputRefusal = { reason: "branch-undeclared", subject: "branch" };

// The commit checked out and the digest of every tracked run change, as one digest; none where the
// operation observed no commit.
export function revisionOf(facts: WorkflowFacts): string | undefined {
  if (facts.head === undefined) return undefined;
  const changes = [...(facts.observedChangedPaths ?? [])]
    .sort()
    .map((file) => [file, facts.fileDigests?.[file] ?? null]);
  return createHash("sha256")
    .update(JSON.stringify({ head: facts.head, changes }))
    .digest("hex");
}

// The branch point a result reports at and the outcome it reports: `branch.outcome` at any point
// but `implement-diagnose`, and the diagnosis verdict there. A `branch` on a work order running
// no such point is undeclared.
function reportedBranch(
  points: readonly PlanBranchPoint[],
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
): { point: PlanBranchPoint; outcome: string } | "undeclared" | undefined {
  const steps = stepNamesOf(workOrder);
  const held = points.filter((point) => steps.includes(point.step));
  if (result.branch) {
    const point = held.find((each) => each.step !== DIAGNOSE_STEP);
    return point ? { point, outcome: result.branch.outcome } : "undeclared";
  }
  const diagnosing = held.find((each) => each.step === DIAGNOSE_STEP);
  const verdict = result.diagnosis?.verdict;
  return diagnosing && verdict ? { point: diagnosing, outcome: verdict } : undefined;
}

// The route an outcome's destinations give: the one route, the one `branch.route` names among
// several, or the one the decision rules give `branch.extraction`, with the rule that gave it.
function destinationOf(
  routes: string[] | "decision-table",
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
): { route: string; rule?: number | null } | InputRefusal {
  const branch = result.branch;
  if (routes === "decision-table") {
    const reading = branch?.extraction;
    if (!reading) return { reason: "schema", subject: "branch.extraction" };
    const artifacts = snapshot.extraction?.artifacts ?? [];
    const choice = decideRoute({ ...reading, artifacts });
    return { route: choice.route, rule: choice.rule };
  }
  const named = branch?.route ?? (routes.length === 1 ? routes[0] : undefined);
  return named !== undefined && routes.includes(named) ? { route: named } : UNDECLARED;
}

// What a result reports at a branch point: a refusal, the re-route it declares, or nothing when
// the run continues its route.
export function resolveBranch(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  facts: WorkflowFacts,
): { refusal?: InputRefusal; reroute?: WorkflowReroute } {
  const points = facts.plans?.[snapshot.plan?.route ?? ""]?.branchPoints ?? [];
  const reported = reportedBranch(points, workOrder, result);
  if (reported === undefined) return {};
  if (reported === "undeclared") return { refusal: UNDECLARED };
  const { point, outcome } = reported;
  const pair = point.outcomes.find((each) => each.outcome === outcome);
  // A diagnosis verdict the point does not pair with a destination continues the route.
  if (!pair) return result.branch ? { refusal: UNDECLARED } : {};
  const destination = destinationOf(pair.routes, snapshot, result);
  if ("reason" in destination) return { refusal: destination };
  return { reroute: { ...destination, fromStep: point.step, outcome } };
}

// The destination's first step and the latest receipt that covers it, when that receipt was
// accepted at the revision the run is at now. Any change since sends the step to run again.
export function reusedStepOf(
  snapshot: WorkflowSnapshot,
  stages: PlanStages,
  facts: WorkflowFacts,
): WorkflowReusedStep | undefined {
  const [first] = stages;
  const step = first?.steps?.[0]?.name;
  const revision = revisionOf(facts);
  if (!first || step === undefined || revision === undefined) return undefined;
  const receipt = [...everyStageResult(snapshot)]
    .reverse()
    .find((stage) => stage.revision === revision && (stage.steps ?? []).includes(step));
  if (!receipt?.receiptRef) return undefined;
  return { stageInstanceId: first.stageInstanceId, step, receiptRef: receipt.receiptRef };
}
