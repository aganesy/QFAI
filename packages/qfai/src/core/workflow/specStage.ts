// The specification stage a plan gains when the request names the story tree and no stage of
// its route reviews a specification change, so that change is read by a requirements reviewer
// whatever family the request falls in.

import type { Artifact } from "./extraction.js";
import type { PlanStage, PlanStep, WorkflowPlanFile } from "./planFormat.js";
import { hasPrivateIntake, lastIndex, writesSomething } from "./scopes.js";

const STORY_TREE: readonly Artifact[] = ["spec", "contract"];

// The steps of the specification stage the change routes share.
const SPEC_STEPS: readonly PlanStep[] = [
  { name: "sdd-triage" },
  { name: "sdd-story", passThrough: true },
  { name: "sdd-contract", passThrough: true },
];

// A conflict resolution only keeps what one side already had, so it keeps its code review alone.
const KEEPS_ITS_REVIEWS = new Set(["resolve-conflicts"]);

function needsSpecStage(plan: WorkflowPlanFile, artifacts: readonly Artifact[]): boolean {
  const { stages } = plan;
  return (
    artifacts.some((artifact) => STORY_TREE.includes(artifact)) &&
    !stages.some((stage) => stage.review === "spec") &&
    stages.some(writesSomething) &&
    !hasPrivateIntake(stages) &&
    !KEEPS_ITS_REVIEWS.has(plan.route)
  );
}

// The plan with a `spec` stage when the request needs one: after the route's last `sdd` stage, or
// else before its first stage that writes, holding the shared steps the route does not already run.
// An added `sdd-triage` is a decision point, as it is in every route that runs it.
export function withSpecStage(
  plan: WorkflowPlanFile,
  artifacts: readonly Artifact[],
): WorkflowPlanFile {
  if (!needsSpecStage(plan, artifacts)) return plan;
  const { stages } = plan;
  const present = new Set(stages.flatMap((stage) => stage.steps.map((step) => step.name)));
  const steps = SPEC_STEPS.filter((step) => !present.has(step.name));
  const lastSdd = lastIndex(stages, (stage) => stage.kind === "sdd");
  const at = lastSdd >= 0 ? lastSdd + 1 : stages.findIndex(writesSomething);
  const previous = stages[at - 1];
  const spec: PlanStage = {
    id: "spec",
    kind: "sdd",
    steps,
    after: previous ? [previous.id] : [],
    review: "spec",
  };
  const planned = [...stages.slice(0, at), spec, ...stages.slice(at)];
  const points = new Set(plan.decisionPoints);
  if (steps.some((step) => step.name === "sdd-triage")) points.add("sdd-triage");
  // Every decision point names a step the plan runs once, so plan order lists them all.
  const decisionPoints = planned
    .flatMap((stage) => stage.steps.map((step) => step.name))
    .filter((name) => points.has(name));
  return { ...plan, stages: planned, decisionPoints };
}
