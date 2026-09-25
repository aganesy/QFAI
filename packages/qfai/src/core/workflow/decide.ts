import { createHash } from "node:crypto";
import path from "node:path";

import { compileGlob } from "../atdd/scaffoldDialect.js";
import type { NormativeReferenceKind, ObservedReferenceKind, RouteReference } from "./parse.js";

export interface WorkflowQuestion {
  questionId: string;
  kind: "create";
  text: string;
  options: { optionId: string; label: string; description: string; effect: "proceed" | "stop" }[];
  selection: { min: 1; max: 1 };
  recommendation: string;
  capability: { goal: string; covers: string[]; excludes: string[]; slotId: string };
}

export interface WorkflowEvent {
  type: string;
  question?: WorkflowQuestion;
  authorization?: WorkflowAuthorization;
  proposal?: NonNullable<WorkflowInput["result"]>["proposal"];
  workOrder?: WorkflowWorkOrder;
  resultRef?: string;
  stageInstanceId?: string;
  outcome?: string;
  binding?: WorkflowBinding;
  plan?: WorkflowPlan;
  notRun?: WorkflowNotRun;
  seamRequest?: { targetTestId: string };
}

type WorkflowNotRun =
  { kind: "not_applicable"; reason?: string } | { kind: "reused"; receiptRef: string };

interface WorkflowBinding {
  slotId: string;
  capabilityId: string;
  specId: string;
}

interface WorkflowWorkOrder {
  workOrderId: string;
  stageInstanceId: string;
  attempt: number;
  stageKind: string;
  target?: { kind: "new_capability"; slotId: string } | { kind: "spec"; specId: string };
  executor?: { skill: string };
  operation?: string;
  authorizationRefs?: string[];
  parentWorkOrderId?: string;
  scope?: { writeAreas: string[] };
  recordAreas?: string[];
  inputs?: { path: string; digest: string }[];
  ledger?: { specId: string; rowIds: string[]; rowSetDigest: string };
  priorStageReceiptRefs?: { ref: string; validity: "valid" | "stale" | "unknown" }[];
}

interface WorkflowAuthorization {
  authorizationId: string;
  runId: string;
  kind: "human_decision";
  capture: "agent_captured";
  scopeDigest: string;
  recordedAt: string;
  questionId: string;
  question: Pick<WorkflowQuestion, "text" | "options" | "selection">;
  answer: { optionIds: string[] };
  effect: "proceed" | "stop";
  answeredBy: string;
  operation: "CREATE";
  target: {
    kind: "new_capability";
    slotId: string;
    capability: Omit<WorkflowQuestion["capability"], "slotId">;
  };
}

export interface WorkflowDecision {
  verdict: {
    ok: boolean;
    run: { id: string; state: string; sequence: number } | null;
    questions?: WorkflowQuestion[];
    workOrder?: WorkflowWorkOrder | null;
    plan?: WorkflowPlan;
    error?:
      | {
          code: "invalid-input";
          message: string;
          reasons?: InputRefusal[];
        }
      | { code: "stale-sequence"; message: string }
      | {
          code: "proposal-refused";
          message: string;
          reasons: ProposalRefusal[];
        };
  };
  events: WorkflowEvent[];
}

type InputRefusalReason =
  | "skip-unexplained"
  | "reuse-stale"
  | "debt-owner-missing"
  | "seam-passed"
  | "red-not-assertion"
  | "schema"
  | "work-order"
  | "result-id-reused"
  | "write-scope"
  | "unbound-capability"
  | "regression-fix-receipt";

interface InputRefusal {
  reason: InputRefusalReason;
  subject: string;
}

type ProposalRefusalReason =
  | "unknown-path"
  | "unknown-id"
  | "inactive-spec"
  | "broken-reference"
  | "protected-surface"
  | "scope-escape"
  | "unresolved-approval"
  | "stage-set";

interface ProposalRefusal {
  reason: ProposalRefusalReason;
  subject: string;
}

type PlanStages = {
  stageInstanceId: string;
  stageKind: string;
  skill?: string;
  operation?: string;
  when?: string;
}[];

interface WorkflowPlan {
  route: string;
  goal: string;
  stages: PlanStages;
  writeScope: string[];
  expectedBehaviorRefs: RouteReference<NormativeReferenceKind>[];
  observedRefs: RouteReference<ObservedReferenceKind>[];
}

interface WorkflowSnapshot {
  run: { id: string; state: string; sequence: number };
  outstandingWorkOrder?: WorkflowWorkOrder;
  openQuestions?: WorkflowQuestion[];
  scopeDigest?: string;
  plan?: { route: string; stages: PlanStages; writeScope?: string[] };
  specBinding?: { specId: string };
  diagnosis?: { verdict: string; reproductionRef: string; matchedRowIds: string[] } | null;
  capabilities?: WorkflowQuestion["capability"][];
  approval?: {
    authorizationId?: string;
    scopeDigest?: string;
    kind: string;
    operation: string;
    effect: string;
    target?: {
      kind: string;
      slotId: string;
      capability?: Omit<WorkflowQuestion["capability"], "slotId">;
    };
  };
  acceptedStages?: { stageInstanceId: string; stageKind: string; outcome: string }[];
  seamRequest?: WorkflowSeamRequest;
  attempts?: Record<string, number>;
  receiptRefs?: string[];
  recordedResults?: Record<string, { payloadDigest: string; verdict: WorkflowDecision["verdict"] }>;
}

interface WorkflowSeamRequest {
  parentWorkOrderId: string;
  stageInstanceId: string;
  attempt: number;
  targetTestId: string;
}

interface WorkflowInput {
  operation: string;
  questionId?: string;
  answer?: { optionIds: string[] };
  answeredBy?: string;
  expectedSequence?: number;
  payloadDigest?: string;
  result?: {
    resultId: string;
    workOrderId: string;
    stageInstanceId: string;
    attempt: number;
    expectedSequence: number;
    outcome: string;
    diagnosis?: { verdict: string; reproductionRef: string; matchedRowIds: string[] };
    bindings?: WorkflowBinding[];
    notRun?: WorkflowNotRun;
    debts?: WorkflowDebt[];
    seamRequest?: { targetTestId: string };
    seam?: { targetTestId: string; observation: string };
    testObservation?: string;
    changedFiles?: { path: string; digest: string }[];
    red?: { testId: string; failureKind: string };
    regressionFix?: { testId?: string; rerunRef?: string; reviewRef?: string };
    proposal?: {
      requestKind: string;
      candidateRoute: string | null;
      goal?: string;
      affectedSpecIds?: string[];
      riskSignals?: string[];
      unresolvedQuestions?: unknown[];
      proposedWriteScope?: string[];
      protectedTargets?: string[];
      confidence?: number;
      expectedBehaviorRefs: RouteReference<NormativeReferenceKind>[];
      observedRefs: RouteReference<ObservedReferenceKind>[];
      newCapabilities: {
        goal: string;
        covers: string[];
        excludes: string[];
        evidence: string[];
      }[];
      requiredStages: string[];
    };
  };
}

interface WorkflowDebt {
  findingCode: string;
  path: string;
  cause: string;
  owningSpec: string;
  detectingCommand: string;
  resolvingOwner?: string;
  blockingExtent: string;
}

interface WorkflowFacts {
  now?: string;
  pathExistence?: Record<string, boolean>;
  acceptanceObligationsUnmet?: boolean;
  plans?: Record<string, { route: string; stages: PlanStages }>;
  specs?: Record<string, { lifecycle: string }>;
  contractIds?: string[];
  receiptValidity?: Record<string, "valid" | "stale" | "unknown">;
  itemReferences?: Record<string, "resolved" | "unresolved">;
  fileDigests?: Record<string, string>;
  ledger?: { specId: string; rows: { rowId: string; status: string; digest: string }[] };
}

type WorkflowProposal = NonNullable<NonNullable<WorkflowInput["result"]>["proposal"]>;

const REQUEST_KINDS = [
  "change",
  "read_only",
  "plan_only",
  "verify_only",
  "resume",
  "cancel",
  "explicit_stage",
];

const RESULT_ID = /^[A-Za-z0-9._-]{1,64}$/;

const PROTECTED_PREFIXES = [
  ".git/",
  ".qfai/runs/",
  ".qfai/evidence/workflow/",
  ".qfai/decisions/",
  ".qfai/evidence/decisions/",
  ".qfai/evidence/change-request-",
  ".qfai/evidence/decision-",
];

function literalPrefix(area: string): string {
  const glob = area.search(/[*?[{]/);
  return glob < 0 ? area : area.slice(0, glob);
}

// SIMPLIFIED: two write areas overlap when one's literal prefix contains the other's.
// Lift when: a glob pair that shares no path is refused and the refusal is observed.
function areasOverlap(left: string, right: string): boolean {
  const leftPrefix = literalPrefix(left);
  const rightPrefix = literalPrefix(right);
  const leftIsGlob = leftPrefix !== left;
  const rightIsGlob = rightPrefix !== right;
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`) ||
    (leftIsGlob && right.startsWith(leftPrefix)) ||
    (rightIsGlob && left.startsWith(rightPrefix))
  );
}

function touchesProtectedSurface(area: string, protectedTargets: readonly string[]): boolean {
  const prefix = literalPrefix(area);
  return (
    PROTECTED_PREFIXES.some(
      (surface) =>
        prefix.startsWith(surface) ||
        `${area}/` === surface ||
        (prefix !== area && surface.startsWith(prefix)),
    ) || protectedTargets.some((target) => areasOverlap(area, target))
  );
}

function escapesRoot(area: string): boolean {
  const normalized = path.posix.normalize(area.replaceAll("\\", "/"));
  return (
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(area) ||
    normalized === ".." ||
    normalized.startsWith("../")
  );
}

// SIMPLIFIED: any open question counts as asking every material risk signal.
// Lift when: a question input names the risk signal it asks about.
function unaskedRiskSignals(proposal: WorkflowProposal): string[] {
  if ((proposal.unresolvedQuestions ?? []).length > 0) return [];
  return (proposal.riskSignals ?? []).filter((signal) => signal !== "authorization-restored");
}

function stageSetGaps(proposal: WorkflowProposal, facts: WorkflowFacts): string[] {
  const required = proposal.requiredStages;
  const plan = proposal.candidateRoute ? facts.plans?.[proposal.candidateRoute] : undefined;
  const planKinds = (plan?.stages ?? []).map((stage) => stage.stageKind);
  const omittedAlways = (plan?.stages ?? [])
    .filter((stage) => stage.when === "always" && !required.includes(stage.stageKind))
    .map((stage) => stage.stageKind);
  const changeRoute = proposal.candidateRoute !== null && proposal.candidateRoute !== "discovery";
  const omittedVerify = changeRoute && !required.includes("verify") ? ["verify"] : [];
  const unknown = plan ? required.filter((kind) => !planKinds.includes(kind)) : [];
  return [...new Set([...omittedAlways, ...omittedVerify, ...unknown])];
}

function checkedPlan(proposal: WorkflowProposal, facts: WorkflowFacts): WorkflowPlan | undefined {
  const builtIn = proposal.candidateRoute ? facts.plans?.[proposal.candidateRoute] : undefined;
  if (!builtIn || !proposal.goal || !Array.isArray(proposal.proposedWriteScope)) return undefined;
  return {
    route: builtIn.route,
    goal: proposal.goal,
    stages: builtIn.stages,
    writeScope: proposal.proposedWriteScope,
    expectedBehaviorRefs: proposal.expectedBehaviorRefs,
    observedRefs: proposal.observedRefs,
  };
}

function notRunRefusalOf(
  notRun: WorkflowNotRun | undefined,
  facts: WorkflowFacts,
): InputRefusalReason | undefined {
  if (notRun?.kind === "not_applicable" && !notRun.reason?.trim()) return "skip-unexplained";
  if (notRun?.kind === "reused" && facts.receiptValidity?.[notRun.receiptRef] !== "valid") {
    return "reuse-stale";
  }
  return undefined;
}

function areaCovers(area: string, filePath: string): boolean {
  return (
    area === filePath ||
    filePath.startsWith(`${area}/`) ||
    new RegExp(`^${compileGlob(area)}$`).test(filePath)
  );
}

function resultRefusals(
  result: NonNullable<WorkflowInput["result"]>,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  const refusals: InputRefusal[] = [];
  const areas = [...(workOrder.scope?.writeAreas ?? []), ...(workOrder.recordAreas ?? [])];
  const target = workOrder.target;
  (result.bindings ?? []).forEach((binding, index) => {
    if (target?.kind !== "new_capability" || binding.slotId !== target.slotId) {
      refusals.push({ reason: "unbound-capability", subject: `bindings[${index}]` });
    }
  });
  for (const changed of result.changedFiles ?? []) {
    if (!areas.some((area) => areaCovers(area, changed.path))) {
      refusals.push({ reason: "write-scope", subject: changed.path });
    }
  }
  const notRun = notRunRefusalOf(result.notRun, facts);
  if (notRun) refusals.push({ reason: notRun, subject: "notRun" });
  if (result.testObservation === "expected_red" && result.red?.failureKind !== "assertion") {
    refusals.push({ reason: "red-not-assertion", subject: "red" });
  }
  const fix = result.regressionFix;
  if (workOrder.stageKind === "regression_fix" && (!fix?.rerunRef || !fix.reviewRef)) {
    refusals.push({ reason: "regression-fix-receipt", subject: "regressionFix" });
  }
  (result.debts ?? []).forEach((debt, index) => {
    if (!debt.resolvingOwner?.trim()) {
      refusals.push({ reason: "debt-owner-missing", subject: `debts[${index}]` });
    }
  });
  return refusals;
}

function refusalsOf(reason: ProposalRefusalReason, subjects: readonly string[]): ProposalRefusal[] {
  return subjects.map((subject) => ({ reason, subject }));
}

function proposalRefusals(proposal: WorkflowProposal, facts: WorkflowFacts): ProposalRefusal[] {
  const references = [...proposal.expectedBehaviorRefs, ...proposal.observedRefs];
  const pathReferences = references
    .filter((reference) => reference.kind === "path" || reference.kind === "evidence")
    .map((reference) => reference.ref);
  const unknownPaths = [...new Set(pathReferences)].filter(
    (ref) => facts.pathExistence?.[ref] !== true,
  );
  const unknownIds = references
    .filter(
      (reference) =>
        (reference.kind === "spec-id" && !Object.hasOwn(facts.specs ?? {}, reference.ref)) ||
        (reference.kind === "contract-id" && !(facts.contractIds ?? []).includes(reference.ref)),
    )
    .map((reference) => reference.ref);
  const inactiveSpecs = (proposal.affectedSpecIds ?? []).filter((specId) => {
    const lifecycle = facts.specs?.[specId]?.lifecycle;
    return lifecycle !== undefined && lifecycle !== "active";
  });
  const brokenReferences = Object.entries(facts.itemReferences ?? {})
    .filter(([, resolution]) => resolution === "unresolved")
    .map(([reference]) => reference);
  const protectedAreas = (proposal.proposedWriteScope ?? []).filter((area) =>
    touchesProtectedSurface(area, proposal.protectedTargets ?? []),
  );
  return [
    ...refusalsOf("unknown-path", unknownPaths),
    ...refusalsOf("unknown-id", unknownIds),
    ...refusalsOf("inactive-spec", inactiveSpecs),
    ...refusalsOf("broken-reference", brokenReferences),
    ...refusalsOf("protected-surface", protectedAreas),
    ...refusalsOf("scope-escape", proposal.requestKind === "change" ? [] : [proposal.requestKind]),
    ...refusalsOf("scope-escape", (proposal.proposedWriteScope ?? []).filter(escapesRoot)),
    ...refusalsOf("unresolved-approval", unaskedRiskSignals(proposal)),
    ...refusalsOf("stage-set", stageSetGaps(proposal, facts)),
  ];
}

function createQuestion(
  questionId: string,
  capability: WorkflowQuestion["capability"],
): WorkflowQuestion {
  return {
    questionId,
    kind: "create",
    text: `Create a capability for ${capability.goal}?`,
    options: [
      {
        optionId: "create",
        label: "Create it",
        description: "SDD writes the new capability's spec.",
        effect: "proceed",
      },
      {
        optionId: "decline",
        label: "Do not create it",
        description: "The run ends without creating the capability.",
        effect: "stop",
      },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "create",
    capability,
  };
}

function reaskCreate(
  run: WorkflowSnapshot["run"],
  capability: WorkflowQuestion["capability"],
): WorkflowDecision {
  const question = createQuestion(`question-${run.sequence + 1}-1`, capability);
  return {
    verdict: {
      ok: true,
      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
      questions: [question],
      workOrder: null,
    },
    events: [{ type: "question-opened", question }, { type: "material-decision" }],
  };
}

// SIMPLIFIED: judges staleness only from the facts the snapshot carries.
// Lift when: the snapshot is rebuilt from the journal, which carries both digests and texts.
function approvalIsStale(snapshot: WorkflowSnapshot): boolean {
  const recorded = snapshot.approval?.scopeDigest;
  const approved = snapshot.approval?.target?.capability;
  const current = currentCapability(snapshot);
  return (
    (recorded !== undefined &&
      snapshot.scopeDigest !== undefined &&
      recorded !== snapshot.scopeDigest) ||
    (approved !== undefined &&
      current !== undefined &&
      JSON.stringify([approved.goal, approved.covers, approved.excludes]) !==
        JSON.stringify([current.goal, current.covers, current.excludes]))
  );
}

function currentCapability(snapshot: WorkflowSnapshot): WorkflowQuestion["capability"] | undefined {
  const slotId = snapshot.approval?.target?.slotId;
  return snapshot.capabilities?.find((capability) => capability.slotId === slotId);
}

function activeStages(
  plan: NonNullable<WorkflowSnapshot["plan"]>,
  diagnosis: WorkflowSnapshot["diagnosis"],
  acceptanceObligationsUnmet: boolean | undefined,
): NonNullable<WorkflowSnapshot["plan"]>["stages"] {
  // SIMPLIFIED: feature and discovery issue every stage; their predicates are not evaluated.
  // Lift when: the prototype and full-discussion predicates get the facts that decide them.
  if (plan.route !== "bugfix" && plan.route !== "bounded-change") return plan.stages;
  return plan.stages.filter((stage) => {
    switch (stage.when) {
      case "always":
        return true;
      case "missing_test_row_needed":
        return diagnosis?.verdict === "missing-test";
      case "acceptance_obligations_unmet":
        return acceptanceObligationsUnmet === true;
      case "regression_found":
        return diagnosis?.verdict === "regression";
      case "test_defect_found":
        return diagnosis?.verdict === "defective-test";
      default:
        return false;
    }
  });
}

function routePlanIsInvalid(
  plan: NonNullable<WorkflowSnapshot["plan"]>,
  snapshot: WorkflowSnapshot,
): boolean {
  const { stages } = plan;
  const boundToSpec = /^spec-\d{4}$/.test(snapshot.specBinding?.specId ?? "");
  const approval = snapshot.approval;
  switch (plan.route) {
    case "direct":
      return (
        stages.length !== 2 ||
        stages[0]?.stageKind !== "maintenance" ||
        stages[0].skill !== "qfai-maintain" ||
        stages[0].operation !== "non-normative-edit" ||
        stages[1]?.stageKind !== "verify" ||
        stages[1].skill !== "qfai-verify" ||
        stages[1].operation !== "verify-full" ||
        !boundToSpec
      );
    case "bugfix":
      return (
        stages[0]?.stageKind !== "diagnose" ||
        stages.at(-1)?.stageKind !== "verify" ||
        !boundToSpec ||
        stages.some(
          (stage) =>
            !stage.skill ||
            !stage.operation ||
            ![
              "always",
              "missing_test_row_needed",
              "acceptance_obligations_unmet",
              "regression_found",
              "test_defect_found",
            ].includes(stage.when ?? ""),
        )
      );
    case "bounded-change":
      return (
        stages[0]?.stageKind !== "sdd_delta" ||
        stages.at(-1)?.stageKind !== "verify" ||
        !boundToSpec ||
        stages.some(
          (stage) =>
            !stage.skill ||
            !stage.operation ||
            (stage.when !== "always" && stage.when !== "acceptance_obligations_unmet"),
        )
      );
    case "feature":
      return (
        stages[0]?.stageKind !== "sdd" ||
        stages.at(-1)?.stageKind !== "verify" ||
        approval?.kind !== "human_decision" ||
        approval.operation !== "CREATE" ||
        approval.effect !== "proceed" ||
        approval.target?.kind !== "new_capability" ||
        !approval.target.slotId ||
        (approval.authorizationId !== undefined &&
          !/^[A-Za-z0-9_-]{1,64}$/.test(approval.authorizationId))
      );
    case "discovery":
      return stages.some((stage) => !stage.skill || !stage.operation);
    default:
      return true;
  }
}

// SIMPLIFIED: an input whose digest the facts do not carry is left out of the work order.
// Lift when: the command adapter supplies the digest of every file a work order names.
function diagnosisInputs(
  stageKind: string,
  diagnosis: WorkflowSnapshot["diagnosis"],
  facts: WorkflowFacts,
): NonNullable<WorkflowWorkOrder["inputs"]> {
  const digest = diagnosis ? facts.fileDigests?.[diagnosis.reproductionRef] : undefined;
  if (stageKind !== "sdd_append" || !diagnosis || digest === undefined) return [];
  return [{ path: diagnosis.reproductionRef, digest }];
}

// The row set covers each row's ID, status and digest, so a moved status changes it.
// The work order itself carries row IDs only.
function ledgerOf(
  specId: string,
  stageKind: string,
  diagnosis: WorkflowSnapshot["diagnosis"],
  facts: WorkflowFacts,
): WorkflowWorkOrder["ledger"] {
  const ledger = facts.ledger;
  if (ledger?.specId !== specId) return undefined;
  const rows = [...ledger.rows].sort((left, right) => left.rowId.localeCompare(right.rowId));
  const rowSetDigest = createHash("sha256")
    .update(JSON.stringify(rows.map(({ rowId, status, digest }) => [rowId, status, digest])))
    .digest("hex");
  const fixesMatchedRows = stageKind === "regression_fix" || stageKind === "test_fix";
  const rowIds =
    fixesMatchedRows && diagnosis
      ? diagnosis.matchedRowIds
      : rows.filter((row) => row.status !== "done").map((row) => row.rowId);
  return { specId, rowIds, rowSetDigest };
}

function refusedInput(run: WorkflowSnapshot["run"], message: string): WorkflowDecision {
  return { verdict: { ok: false, run, error: { code: "invalid-input", message } }, events: [] };
}

function refusedWith(run: WorkflowSnapshot["run"], reasons: InputRefusal[]): WorkflowDecision {
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

function outcomeIsAcceptable(
  result: NonNullable<WorkflowInput["result"]>,
  stageKind: string,
): boolean {
  switch (result.outcome) {
    case "accepted":
    case "accepted_with_debt":
    case "unrun":
      return true;
    case "needs_repair":
      return stageKind === "acceptance" && result.seamRequest !== undefined;
    default:
      return false;
  }
}

// SIMPLIFIED: an unrun result blocks the run without naming a blocker or who can clear it.
// Lift when: a blocked result's blocker and owner are derived from its delegation and debts.
function blockOnUnrun(
  run: WorkflowSnapshot["run"],
  result: NonNullable<WorkflowInput["result"]>,
): WorkflowDecision {
  return {
    verdict: { ok: true, run: { ...run, state: "blocked", sequence: run.sequence + 1 } },
    events: [
      {
        type: "unrun-or-unresolved-dependency",
        resultRef: `results/${result.resultId}.json`,
        stageInstanceId: result.stageInstanceId,
        outcome: result.outcome,
      },
    ],
  };
}

function issueWorkOrder(
  run: WorkflowSnapshot["run"],
  workOrder: WorkflowWorkOrder,
  skipped: WorkflowEvent[] = [],
): WorkflowDecision {
  const events = [
    ...skipped,
    { type: "work-order-issued", workOrder },
    { type: "dispatch-work-order" },
  ];
  return {
    verdict: {
      ok: true,
      run: { ...run, state: "running", sequence: run.sequence + events.length },
      workOrder,
    },
    events,
  };
}

// SIMPLIFIED: a stage whose predicate does not hold is recorded as a receipt carrying
// `not_applicable` and the predicate as its reason, when `next` issues the stage after it.
// Lift when: the run evidence gains its own record of skipped stages.
function skippedBefore(
  plan: NonNullable<WorkflowSnapshot["plan"]>,
  selected: PlanStages,
  lastAccepted: string | undefined,
  issuing: string,
): WorkflowEvent[] {
  const ids = plan.stages.map((stage) => stage.stageInstanceId);
  const from = lastAccepted === undefined ? 0 : ids.indexOf(lastAccepted) + 1;
  return plan.stages
    .slice(from, ids.indexOf(issuing))
    .filter((stage) => !selected.includes(stage))
    .map((stage) => ({
      type: "receipt-recorded",
      stageInstanceId: stage.stageInstanceId,
      notRun: { kind: "not_applicable", reason: `predicate ${stage.when ?? "none"} does not hold` },
    }));
}

function issueSeamOnly(snapshot: WorkflowSnapshot, seam: WorkflowSeamRequest): WorkflowDecision {
  const specId = snapshot.specBinding?.specId;
  if (!specId) return refusedInput(snapshot.run, "The seam work order is not ready.");
  return issueWorkOrder(snapshot.run, {
    workOrderId: `work-order-${seam.stageInstanceId}-seam-${seam.attempt}`,
    stageInstanceId: `${seam.stageInstanceId}-seam-${seam.attempt}`,
    attempt: 1,
    stageKind: "implement",
    target: { kind: "spec", specId },
    executor: { skill: "qfai-implement" },
    operation: "seam-only",
    parentWorkOrderId: seam.parentWorkOrderId,
  });
}

function resultNamesWorkOrder(
  result: WorkflowInput["result"],
  workOrder: WorkflowWorkOrder,
  run: WorkflowSnapshot["run"],
): result is NonNullable<WorkflowInput["result"]> {
  return (
    result?.workOrderId === workOrder.workOrderId &&
    result.stageInstanceId === workOrder.stageInstanceId &&
    result.attempt === workOrder.attempt &&
    result.expectedSequence === run.sequence &&
    RESULT_ID.test(result.resultId)
  );
}

function acceptSeamOnly(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowInput["result"],
): WorkflowDecision {
  const { run, seamRequest } = snapshot;
  if (
    !seamRequest ||
    workOrder.parentWorkOrderId !== seamRequest.parentWorkOrderId ||
    !resultNamesWorkOrder(result, workOrder, run) ||
    result.outcome !== "accepted" ||
    result.seam?.targetTestId !== seamRequest.targetTestId
  ) {
    return refusedInput(run, "The stage result is not ready.");
  }
  if (result.seam.observation === "pass") {
    return refusedWith(run, [{ reason: "seam-passed", subject: "seam" }]);
  }
  return {
    verdict: { ok: true, run: { ...run, state: "ready", sequence: run.sequence + 1 } },
    events: [
      {
        type: "accept-nonfinal-result",
        resultRef: `results/${result.resultId}.json`,
        stageInstanceId: workOrder.stageInstanceId,
        outcome: result.outcome,
      },
    ],
  };
}

function acceptPreamble(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  result: NonNullable<WorkflowInput["result"]>,
): WorkflowDecision | undefined {
  const { run, outstandingWorkOrder: workOrder } = snapshot;
  const recorded = snapshot.recordedResults?.[result.resultId];
  if (recorded) {
    return recorded.payloadDigest === input.payloadDigest
      ? { verdict: recorded.verdict, events: [] }
      : refusedWith(run, [{ reason: "result-id-reused", subject: "resultId" }]);
  }
  if (!RESULT_ID.test(result.resultId)) {
    return refusedWith(run, [{ reason: "schema", subject: "resultId" }]);
  }
  if (
    result.workOrderId !== workOrder?.workOrderId ||
    result.stageInstanceId !== workOrder.stageInstanceId ||
    result.attempt !== workOrder.attempt
  ) {
    return refusedWith(run, [{ reason: "work-order", subject: "workOrderId" }]);
  }
  if (result.expectedSequence !== run.sequence) {
    const message =
      "The run moved on since this result was prepared. Read the run's status and submit again.";
    return { verdict: { ok: false, run, error: { code: "stale-sequence", message } }, events: [] };
  }
  return undefined;
}

export function decide(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision {
  const run = snapshot.run;
  const workOrder = snapshot.outstandingWorkOrder;
  const result = input.result;
  const proposal = result?.proposal;
  const capabilities = proposal?.newCapabilities;

  if (input.operation === "accept" && result) {
    const refused = acceptPreamble(snapshot, input, result);
    if (refused) return refused;
  }

  if (input.operation === "decision" && run.state === "awaiting_input") {
    const question = snapshot.openQuestions?.find(
      (openQuestion) => openQuestion.questionId === input.questionId,
    );
    const chosen = question?.options.find(
      (option) => option.optionId === input.answer?.optionIds[0],
    );
    const scopeDigest = snapshot.scopeDigest;
    if (
      input.expectedSequence !== run.sequence ||
      question?.kind !== "create" ||
      input.answer?.optionIds.length !== 1 ||
      !chosen ||
      !input.answeredBy?.trim() ||
      scopeDigest === undefined ||
      !/^[a-f0-9]{64}$/.test(scopeDigest) ||
      !facts.now ||
      !Number.isFinite(Date.parse(facts.now)) ||
      new Date(facts.now).toISOString() !== facts.now ||
      !question.capability.slotId
    ) {
      return {
        verdict: {
          ok: false,
          run,
          error: { code: "invalid-input", message: "The create answer is not ready." },
        },
        events: [],
      };
    }

    const { goal, covers, excludes, slotId } = question.capability;
    const authorization: WorkflowAuthorization = {
      authorizationId: `authorization-${run.sequence + 1}`,
      runId: run.id,
      kind: "human_decision",
      capture: "agent_captured",
      scopeDigest,
      recordedAt: facts.now,
      questionId: question.questionId,
      question: { text: question.text, options: question.options, selection: question.selection },
      answer: { optionIds: [chosen.optionId] },
      effect: chosen.effect,
      answeredBy: input.answeredBy,
      operation: "CREATE",
      target: { kind: "new_capability", slotId, capability: { goal, covers, excludes } },
    };
    const events: WorkflowEvent[] = [{ type: "authorization-recorded", authorization }];
    if (chosen.effect === "stop") events.push({ type: "authorized-stop" });
    return {
      verdict: {
        ok: true,
        run: {
          ...run,
          state: chosen.effect === "stop" ? "cancelled" : "ready",
          sequence: run.sequence + events.length,
        },
      },
      events,
    };
  }

  if (input.operation === "next" && run.state === "ready") {
    const plan = snapshot.plan;
    const acceptedStages = snapshot.acceptedStages ?? [];
    const approval = snapshot.approval;
    const isDirect = plan?.route === "direct";
    const isBugfix = plan?.route === "bugfix";
    const isBounded = plan?.route === "bounded-change";
    const selectedStages = plan
      ? activeStages(plan, snapshot.diagnosis, facts.acceptanceObligationsUnmet)
      : [];
    if (
      !plan ||
      !Array.isArray(plan.stages) ||
      plan.stages.length === 0 ||
      plan.stages.some((stage) => !stage.stageInstanceId || !stage.stageKind) ||
      new Set(plan.stages.map((stage) => stage.stageInstanceId)).size !== plan.stages.length ||
      routePlanIsInvalid(plan, snapshot) ||
      !Array.isArray(acceptedStages) ||
      (isBugfix && acceptedStages.length > 0 && !snapshot.diagnosis) ||
      acceptedStages.length > selectedStages.length ||
      acceptedStages.some(
        (accepted, index) =>
          accepted.outcome !== "accepted" ||
          accepted.stageInstanceId !== selectedStages[index]?.stageInstanceId ||
          accepted.stageKind !== selectedStages[index].stageKind,
      )
    ) {
      return {
        verdict: {
          ok: false,
          run,
          error: { code: "invalid-input", message: "The plan is not ready." },
        },
        events: [],
      };
    }

    if (snapshot.seamRequest) return issueSeamOnly(snapshot, snapshot.seamRequest);
    const stage = selectedStages[acceptedStages.length];
    if (!stage) return { verdict: { ok: true, run, workOrder: null }, events: [] };

    const attempt = (snapshot.attempts?.[stage.stageInstanceId] ?? 0) + 1;
    const nextWorkOrder: WorkflowWorkOrder = {
      workOrderId: `work-order-${stage.stageInstanceId}-${attempt}`,
      stageInstanceId: stage.stageInstanceId,
      attempt,
      stageKind: stage.stageKind,
      ...(stage.skill ? { executor: { skill: stage.skill } } : {}),
      ...(stage.operation ? { operation: stage.operation } : {}),
      // SIMPLIFIED: the scope carries the plan's write areas and nothing else.
      // Lift when: a work order's scope digest, protected targets, effects or non-goals are read.
      ...(plan.writeScope ? { scope: { writeAreas: plan.writeScope } } : {}),
    };
    const receiptRefs = snapshot.receiptRefs ?? [];
    if (receiptRefs.length > 0) {
      nextWorkOrder.priorStageReceiptRefs = receiptRefs.map((ref) => ({
        ref,
        validity: facts.receiptValidity?.[ref] ?? "unknown",
      }));
    }
    if (isDirect || isBugfix || isBounded) {
      const specId = snapshot.specBinding?.specId;
      if (!specId || !stage.skill || !stage.operation) {
        return {
          verdict: {
            ok: false,
            run,
            error: { code: "invalid-input", message: "The spec work order is not ready." },
          },
          events: [],
        };
      }
      nextWorkOrder.target = { kind: "spec", specId };
      const inputs = diagnosisInputs(stage.stageKind, snapshot.diagnosis, facts);
      if (inputs.length > 0) nextWorkOrder.inputs = inputs;
      const ledger = ledgerOf(specId, stage.stageKind, snapshot.diagnosis, facts);
      if (ledger) nextWorkOrder.ledger = ledger;
    } else if (plan.route === "feature" && stage.stageKind !== "sdd" && snapshot.specBinding) {
      nextWorkOrder.target = { kind: "spec", specId: snapshot.specBinding.specId };
    } else if (stage.stageKind === "sdd") {
      const slotId = approval?.target?.slotId;
      if (!slotId) {
        return {
          verdict: {
            ok: false,
            run,
            error: { code: "invalid-input", message: "The feature work order is not ready." },
          },
          events: [],
        };
      }
      if (!approval.authorizationId || approvalIsStale(snapshot)) {
        const capability = approval.target?.capability;
        if (!capability) {
          return {
            verdict: {
              ok: false,
              run,
              error: { code: "invalid-input", message: "The feature work order is not ready." },
            },
            events: [],
          };
        }
        return reaskCreate(run, currentCapability(snapshot) ?? { ...capability, slotId });
      }
      nextWorkOrder.target = { kind: "new_capability", slotId };
      nextWorkOrder.authorizationRefs = [`authorizations/${approval.authorizationId}.json`];
    }
    const skipped = skippedBefore(
      plan,
      selectedStages,
      acceptedStages.at(-1)?.stageInstanceId,
      stage.stageInstanceId,
    );
    return issueWorkOrder(run, nextWorkOrder, skipped);
  }

  if (input.operation === "next" && run.state === "running" && workOrder) {
    return { verdict: { ok: true, run, workOrder }, events: [] };
  }

  // SIMPLIFIED: resume reissues the outstanding work order without revalidating the run.
  // Lift when: observers supply the identity, integrity and receipt facts resume checks.
  if (input.operation === "resume" && run.state === "running" && workOrder) {
    const events: WorkflowEvent[] = [
      { type: "observed-session-interruption" },
      { type: "reconciled-resume" },
      { type: "dispatch-work-order" },
    ];
    return {
      verdict: { ok: true, run: { ...run, sequence: run.sequence + events.length }, workOrder },
      events,
    };
  }

  if (
    input.operation === "accept" &&
    run.state === "running" &&
    workOrder?.operation === "seam-only"
  ) {
    return acceptSeamOnly(snapshot, workOrder, result);
  }

  if (input.operation === "accept" && run.state === "running") {
    const plan = snapshot.plan;
    const acceptedStages = snapshot.acceptedStages ?? [];
    const selectedStages = plan
      ? activeStages(plan, snapshot.diagnosis, facts.acceptanceObligationsUnmet)
      : [];
    const nextStage =
      Array.isArray(plan?.stages) && Array.isArray(acceptedStages)
        ? selectedStages[acceptedStages.length]
        : undefined;
    // SIMPLIFIED: this path accepts a canned stage result by identity and outcome.
    // Lift when: the stage-result schema and receipt checks are implemented.
    if (
      (plan?.route !== "feature" &&
        plan?.route !== "discovery" &&
        plan?.route !== "direct" &&
        plan?.route !== "bugfix" &&
        plan?.route !== "bounded-change") ||
      !Array.isArray(plan.stages) ||
      !Array.isArray(acceptedStages) ||
      !nextStage ||
      workOrder?.stageInstanceId !== nextStage.stageInstanceId ||
      workOrder.stageKind !== nextStage.stageKind ||
      ((plan.route === "direct" || plan.route === "bugfix" || plan.route === "bounded-change") &&
        (workOrder.target?.kind !== "spec" ||
          workOrder.target.specId !== snapshot.specBinding?.specId ||
          workOrder.executor?.skill !== nextStage.skill ||
          workOrder.operation !== nextStage.operation)) ||
      (plan.route === "bugfix" &&
        nextStage.stageKind === "diagnose" &&
        (!result?.diagnosis ||
          !["missing-test", "defective-test", "regression", "expectation-differs"].includes(
            result.diagnosis.verdict,
          ) ||
          !result.diagnosis.reproductionRef ||
          !Array.isArray(result.diagnosis.matchedRowIds))) ||
      result?.workOrderId !== workOrder.workOrderId ||
      result.stageInstanceId !== workOrder.stageInstanceId ||
      result.attempt !== workOrder.attempt ||
      result.expectedSequence !== run.sequence ||
      !RESULT_ID.test(result.resultId) ||
      !outcomeIsAcceptable(result, nextStage.stageKind) ||
      result.proposal !== undefined
    ) {
      return {
        verdict: {
          ok: false,
          run,
          error: { code: "invalid-input", message: "The stage result is not ready." },
        },
        events: [],
      };
    }

    const inputRefusals = resultRefusals(result, workOrder, facts);
    if (inputRefusals.length > 0) return refusedWith(run, inputRefusals);
    if (result.outcome === "unrun") return blockOnUnrun(run, result);
    const approvedCapability = snapshot.approval?.target?.capability;
    if (
      plan.route === "feature" &&
      nextStage.stageKind === "sdd" &&
      approvedCapability &&
      workOrder.target?.kind === "new_capability" &&
      approvalIsStale(snapshot)
    ) {
      return reaskCreate(
        run,
        currentCapability(snapshot) ?? { ...approvedCapability, slotId: workOrder.target.slotId },
      );
    }
    const endsDiscovery =
      plan.route === "discovery" && acceptedStages.length + 1 === selectedStages.length;
    const needsReplan =
      endsDiscovery ||
      (nextStage.stageKind === "diagnose" && result.diagnosis?.verdict === "expectation-differs");
    const events: WorkflowEvent[] = [
      {
        type: needsReplan ? "scope-or-obligation-revision" : "accept-nonfinal-result",
        resultRef: `results/${result.resultId}.json`,
        stageInstanceId: workOrder.stageInstanceId,
        outcome: result.outcome,
        ...(result.notRun ? { notRun: result.notRun } : {}),
        ...(result.seamRequest ? { seamRequest: result.seamRequest } : {}),
      },
      ...(nextStage.stageKind === "sdd" ? (result.bindings ?? []) : []).map((binding) => ({
        type: "binding-recorded",
        binding,
      })),
    ];
    return {
      verdict: {
        ok: true,
        run: {
          ...run,
          state: needsReplan ? "routing" : "ready",
          sequence: run.sequence + events.length,
        },
      },
      events,
    };
  }

  // SIMPLIFIED: this transition checks path references, capability shape and the built-in plan.
  // Lift when: remaining proposal checks supply observer facts and plan rules.
  if (
    input.operation !== "accept" ||
    run.state !== "routing" ||
    workOrder?.stageKind !== "routing" ||
    result?.workOrderId !== workOrder.workOrderId ||
    result.stageInstanceId !== workOrder.stageInstanceId ||
    result.attempt !== workOrder.attempt ||
    result.expectedSequence !== run.sequence ||
    result.outcome !== "accepted" ||
    !proposal ||
    !REQUEST_KINDS.includes(proposal.requestKind) ||
    (proposal.requestKind === "change" && !proposal.candidateRoute) ||
    !Array.isArray(proposal.expectedBehaviorRefs) ||
    !Array.isArray(proposal.observedRefs) ||
    !Array.isArray(proposal.requiredStages) ||
    !Array.isArray(capabilities) ||
    (proposal.candidateRoute === "feature" && capabilities.length === 0) ||
    capabilities.some(
      (capability) =>
        !capability.goal ||
        !Array.isArray(capability.covers) ||
        !Array.isArray(capability.excludes) ||
        !Array.isArray(capability.evidence) ||
        capability.evidence.length === 0,
    )
  ) {
    return {
      verdict: {
        ok: false,
        run,
        error: {
          code: "invalid-input",
          message: "The routing result is not ready. Check it and submit again.",
        },
      },
      events: [],
    };
  }

  const refusals = proposalRefusals(proposal, facts);
  if (refusals.length > 0) {
    return {
      verdict: {
        ok: false,
        run,
        error: {
          code: "proposal-refused",
          message: "The route proposal failed a check. Revise it and submit it again.",
          reasons: refusals,
        },
      },
      events: [],
    };
  }

  const plan = checkedPlan(proposal, facts);
  if (capabilities.length === 0) {
    if (!plan) {
      return {
        verdict: {
          ok: false,
          run,
          error: {
            code: "invalid-input",
            message: "The routing result is not ready. Check it and submit again.",
          },
        },
        events: [],
      };
    }
    return {
      verdict: { ok: true, run: { ...run, state: "ready", sequence: run.sequence + 1 }, plan },
      events: [{ type: "plan-accepted", plan }],
    };
  }

  const questions: WorkflowQuestion[] = capabilities.map((capability, index) =>
    createQuestion(`question-${run.sequence + 1}-${index + 1}`, {
      goal: capability.goal,
      covers: capability.covers,
      excludes: capability.excludes,
      slotId: `slot-${run.sequence + 1}-${index + 1}`,
    }),
  );

  return {
    verdict: {
      ok: true,
      run: { ...run, state: "awaiting_input", sequence: run.sequence + questions.length + 1 },
      questions,
      ...(plan ? { plan } : {}),
    },
    events: [
      ...questions.map((question) => ({ type: "question-opened", question })),
      { type: "unsettled-material-input", proposal },
    ],
  };
}
