import { createHash } from "node:crypto";

import { compileGlob } from "../atdd/scaffoldDialect.js";
import type {
  FailClosedCause,
  InputRefusal,
  PlanStages,
  WorkflowActor,
  WorkflowDecision,
  WorkflowRun,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

export const RESULT_ID = /^[A-Za-z0-9._-]{1,64}$/;

export const TERMINAL_STATES = ["completed", "cancelled", "failed"];

// The stage kinds that author the story tree, and so record rows of its two tables.
export const STORY_AUTHORING_KINDS = ["sdd", "sdd_append", "sdd_delta"];

// The stage kinds whose work order binds no flow and no new story.
export const UNTARGETED_KINDS = ["route", "discussion", "maintenance", "verify"];

export const DEFAULT_SPECS_DIR = ".qfai/spec";

export function areaCovers(area: string, filePath: string): boolean {
  return (
    area === filePath ||
    filePath.startsWith(`${area}/`) ||
    new RegExp(`^${compileGlob(area)}$`).test(filePath)
  );
}

export function isAuthorOrRecommender(
  actorHistory: readonly WorkflowActor[],
  agentInstance: string,
) {
  return actorHistory.some(
    (actor) =>
      actor.agentInstance === agentInstance &&
      (actor.role === "author" || actor.role === "recommender"),
  );
}

export function refusedInput(run: WorkflowRun, message: string): WorkflowDecision {
  return { verdict: { ok: false, run, error: { code: "invalid-input", message } }, events: [] };
}

export function refusedWith(run: WorkflowRun, reasons: InputRefusal[]): WorkflowDecision {
  return {
    verdict: {
      ok: false,
      run,
      error: {
        code: "invalid-input",
        message: "The stage result failed a check. Fix it and submit again.",
        reasons,
      },
    },
    events: [],
  };
}

export function refusedFailClosed(run: WorkflowRun, cause: FailClosedCause): WorkflowDecision {
  const message = "The run cannot go on until the cause it names is cleared.";
  return {
    verdict: { ok: false, run, error: { code: "fail-closed", message, cause } },
    events: [],
  };
}

export function notReady(run: WorkflowRun, what: string): WorkflowDecision {
  return refusedInput(run, `The ${what} is not ready.`);
}

// The digest covers the scope's own four fields and nothing else, so a work order's record
// areas never change it.
// SIMPLIFIED: the scope carries no protected targets or non-goals, and the digest reads each as
// empty.
// Lift when: the checked plan keeps the proposal's protected targets and a source of non-goals.
export function scopeOf(
  writeAreas: string[],
  effects: string[],
): NonNullable<WorkflowWorkOrder["scope"]> {
  const fields = { writeAreas, protectedTargets: [], allowedEffects: effects, nonGoals: [] };
  const digest = createHash("sha256").update(JSON.stringify(fields)).digest("hex");
  return { digest, writeAreas, allowedEffects: effects };
}

// The digest of a checked write scope, as an authorization records it: no effect is allowed yet.
export function scopeDigestOf(writeAreas: string[]): string {
  return scopeOf(writeAreas, []).digest ?? "";
}

// The stage the plan runs next, and the stages whose predicates hold now.
export type PlanStage = PlanStages[number];

// The kind of the first ID a diagnosis matched: `BF`, `AC` or `EX`.
export function firstMatchedKind(diagnosis: WorkflowSnapshot["diagnosis"]): string | undefined {
  return /^(BF|AC|EX)-/.exec(diagnosis?.matchedIds[0] ?? "")?.[1];
}

// Every stage result the run accepted, in the order it accepted them: the plans a replan
// replaced, the current plan's stages, then the stages that repaired a finding.
export function everyStageResult(snapshot: WorkflowSnapshot) {
  return [
    ...(snapshot.priorStages ?? []),
    ...(snapshot.acceptedStages ?? []),
    ...(snapshot.repairedStages ?? []),
  ];
}

// The skills a plan stage can be issued to: its executor, and each skill a stage naming two has.
export function stageSkills(stage: PlanStage, diagnosis: WorkflowSnapshot["diagnosis"]): string[] {
  const executor = executorSkill(stage, diagnosis);
  return [...new Set([...(executor ? [executor] : []), ...(stage.skills ?? [])])];
}

// The first active stage `skill` can serve, which is where a finding it owns is repaired.
export function servingStage(
  selected: readonly PlanStage[],
  skill: string,
  diagnosis: WorkflowSnapshot["diagnosis"],
): PlanStage | undefined {
  return selected.find((stage) => stageSkills(stage, diagnosis).includes(skill));
}

// The skill a finding names as its owner, when a skill rather than the operator owns it.
export function skillOwnerOf(debt: { resolvingOwner?: string | undefined }): string | undefined {
  const owner = debt.resolvingOwner?.trim();
  return owner && owner !== "operator" ? owner : undefined;
}

// A `test_fix` stage goes to `qfai-atdd` when the diagnosis's first matched ID is a BF or an
// AC, and to `qfai-implement` when it is an EX.
export function executorSkill(
  stage: PlanStage,
  diagnosis: WorkflowSnapshot["diagnosis"],
): string | undefined {
  if (stage.stageKind !== "test_fix") return stage.skill;
  const kind = firstMatchedKind(diagnosis);
  if (kind === "EX") return "qfai-implement";
  if (kind === "BF" || kind === "AC") return "qfai-atdd";
  return stage.skill;
}
