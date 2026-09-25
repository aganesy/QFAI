import { createHash, createHmac } from "node:crypto";
import path from "node:path";

import { compileGlob } from "../atdd/scaffoldDialect.js";
import {
  isRecord,
  parseMeasurement,
  parseQuestionInput,
  type WorkflowMeasurement,
} from "./parse.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  QuestionEffect,
  RouteReference,
} from "./parse.js";

type WorkflowCapability = { goal: string; covers: string[]; excludes: string[]; slotId: string };

export interface WorkflowQuestion {
  questionId: string;
  kind: "create" | "decision" | "fact";
  text: string;
  options: { optionId: string; label: string; description: string; effect: QuestionEffect }[];
  selection?: { min: number; max: number };
  recommendation?: string;
  // On a fact question, which offers no options: the effect of any value.
  effect?: QuestionEffect;
  capability?: WorkflowCapability;
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
  repairs?: WorkflowDebt[];
  debts?: WorkflowDebt[];
  gateResults?: WorkflowGateReceipt[];
  validate?: { verdict: "PASS" | "FAIL"; findings: FindingIdentity[]; trustLevel: "cli_observed" };
  executionContext?: WorkflowExecutionContext;
  cause?: FailClosedCause;
  halt?: WorkflowHalt;
  retry?: { attempt: number; nextDelaySeconds: number };
  measurement?: WorkflowMeasurement;
}

type FailClosedCause =
  | "policy-drift"
  | "contract-undeclared"
  | "reviewer-missing"
  | "unsupported-capability"
  | "invariant-violation"
  | "invalid-mode";

// The host's capability report, each capability reported true or false.
interface WorkflowHarness {
  host: string;
  capabilities: Record<string, boolean>;
}

interface WorkflowExecutionContext {
  runId: string;
  qfaiVersion: string;
  policyDigests: Record<string, string>;
  manifestDigests: Record<string, string>;
  planDigests: Record<string, string>;
  harness: WorkflowHarness;
  requestDigest: string;
}

interface WorkflowGateReceipt {
  gateId: string;
  verdict: string;
  trustLevel: "cli_observed" | "agent_reported";
}

type Severity = "error" | "warning" | "info";

interface FindingIdentity {
  code: string;
  file: string;
  refs: string[];
}

type UnmetCondition =
  | "work-order-outstanding"
  | "run-waiting"
  | "obligation-unprocessed"
  | "stage-unaccepted"
  | "review-missing"
  | "verify-missing"
  | "verify-foreign"
  | "gate-failed"
  | "diff-out-of-scope"
  | "approval-unanswered"
  | "debt-open"
  | "tool-drift"
  | "policy-drift"
  | "uncommitted";

interface WorkflowUnmet {
  condition: UnmetCondition;
  subject: string;
  owner: string;
  findings?: (FindingIdentity & { baseline: "pre-existing" | "new" })[];
}

type CompletionTarget = "qfai_done" | "working_tree";

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
  scope?: { writeAreas: string[]; allowedEffects?: string[] };
  recordAreas?: string[];
  inputs?: { path: string; digest: string }[];
  ledger?: { specId: string; rowIds: string[]; rowSetDigest: string };
  priorStageReceiptRefs?: { ref: string; validity: "valid" | "stale" | "unknown" }[];
  requiredReviewerRoles?: string[];
  actorHistory?: WorkflowActor[];
}

interface WorkflowActor {
  role: string;
  agentInstance: string;
  stageInstanceId?: string;
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
  answer: { optionIds: string[] } | { valueDigest: string };
  effect: QuestionEffect;
  answeredBy: string;
  operation: "CREATE" | null;
  target?: {
    kind: "new_capability";
    slotId: string;
    capability: Omit<WorkflowCapability, "slotId">;
  };
}

type WorkflowBlocker =
  "stage-blocked" | "delegation-unavailable" | "budget-exhausted" | "scope-dependency";

// Why a blocked run stopped: exactly one cause or one blocker, and who can clear it.
type WorkflowHalt = (
  { cause: FailClosedCause; blocker?: never } | { blocker: WorkflowBlocker; cause?: never }
) & { owner: string; subjects: string[] };

type WorkflowReceiptClass = { ref: string; validity: "valid" | "stale" | "unknown" };

export interface WorkflowDecision {
  verdict: {
    ok: boolean;
    run: { id: string; state: string; sequence: number } | null;
    questions?: WorkflowQuestion[];
    workOrder?: WorkflowWorkOrder | null;
    plan?: WorkflowPlan;
    target?: CompletionTarget;
    unmet?: WorkflowUnmet[];
    deliveryUnmet?: WorkflowUnmet[];
    receipts?: WorkflowGateReceipt[];
    classedReceipts?: WorkflowReceiptClass[];
    retry?: { attempt: number; nextDelaySeconds: number };
    halt?: WorkflowHalt;
    error?:
      | {
          code: "invalid-input";
          message: string;
          reasons?: InputRefusal[];
        }
      | {
          code: "stale-sequence" | "no-open-question" | "answer-conflict" | "run-terminal";
          message: string;
        }
      | { code: "fail-closed"; message: string; cause: FailClosedCause }
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
  | "digest-mismatch"
  | "write-scope"
  | "unbound-capability"
  | "regression-fix-receipt"
  | "test-fix-receipt"
  | "test-fix-meaning"
  | "option"
  | "reviewer-not-independent"
  | "authorization-kind";

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
  effects?: string[];
}[];

interface WorkflowPlan {
  route: string;
  goal: string;
  stages: PlanStages;
  writeScope: string[];
  expectedBehaviorRefs: RouteReference<NormativeReferenceKind>[];
  observedRefs: RouteReference<ObservedReferenceKind>[];
  riskSignals?: string[];
}

interface WorkflowSnapshot {
  run: { id: string; state: string; sequence: number };
  outstandingWorkOrder?: WorkflowWorkOrder;
  openQuestions?: WorkflowQuestion[];
  scopeDigest?: string;
  plan?: { route: string; stages: PlanStages; writeScope?: string[]; riskSignals?: string[] };
  specBinding?: { specId: string };
  diagnosis?: { verdict: string; reproductionRef: string; matchedRowIds: string[] } | null;
  capabilities?: WorkflowCapability[];
  approval?: {
    authorizationId?: string;
    scopeDigest?: string;
    kind: string;
    operation: string | null;
    effect: string;
    target?: {
      kind: string;
      slotId: string;
      capability?: Omit<WorkflowCapability, "slotId">;
    };
  };
  acceptedStages?: WorkflowAcceptedStage[];
  completionTarget?: CompletionTarget;
  baseline?: {
    findings: FindingIdentity[];
    toolVersion: string;
    cliEntryDigest: string;
    policyDigests: Record<string, string>;
  };
  seamRequest?: WorkflowSeamRequest;
  repairRequest?: { stageInstanceId: string; debts: WorkflowDebt[] };
  attempts?: Record<string, number>;
  // The saturated-delegation retries already scheduled for the outstanding work order.
  delegationRetries?: number;
  // The replans the run has already made.
  replans?: number;
  // The automatic repairs already made for each cause: a finding code at its path.
  repairsByCause?: { findingCode: string; path: string; count: number }[];
  receiptRefs?: string[];
  actorHistory?: WorkflowActor[];
  recordedResults?: Record<string, { payloadDigest: string; verdict: WorkflowDecision["verdict"] }>;
  authorizations?: { authorizationId: string; kind: string; policy?: WorkflowPolicy }[];
  answeredQuestions?: Record<
    string,
    { answer: WorkflowAuthorization["answer"]; verdict: WorkflowDecision["verdict"] }
  >;
  // The verdict a `stop` returned, which a repeated `stop` returns again.
  stopVerdict?: WorkflowDecision["verdict"];
  // The run's key for free-text answers, read from its private request file.
  digestKey?: string;
  routingReceiptRef?: string;
}

interface WorkflowPolicy {
  path: string;
  digest: string;
  effects: string[];
}

interface WorkflowAcceptedStage {
  stageInstanceId: string;
  stageKind: string;
  outcome: string;
  receiptRef?: string;
  gateResults?: WorkflowGateReceipt[];
  reviewResults?: WorkflowReview[];
  debts?: WorkflowDebt[];
}

interface WorkflowReview {
  role: string;
  agentInstance: string;
  verdict: string;
  reportRef: string;
}

interface WorkflowSeamRequest {
  parentWorkOrderId: string;
  stageInstanceId: string;
  attempt: number;
  targetTestId: string;
}

interface WorkflowInput {
  operation: string;
  request?: { text: string };
  harness?: WorkflowHarness;
  stop?: boolean;
  questionId?: string;
  answer?: { optionIds?: string[]; value?: string };
  answeredBy?: string;
  expectedSequence?: number;
  payloadDigest?: string;
  // Neither is an input the core reads: each is here to be refused or ignored.
  capture?: unknown;
  authorization?: unknown;
  result?: {
    approved?: unknown;
    authorization?: unknown;
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
    reviewResults?: WorkflowReview[];
    gateResults?: { gateId: string; verdict: string }[];
    testFix?: { citedBefore?: string; citedAfter?: string; reviewRef?: string; rerunRef?: string };
    questions?: unknown[];
    delegation?: { status: string; attempt: number };
    measurement?: unknown;
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
  ledger?: {
    specId: string;
    rows: { rowId: string; status: string; digest: string; layer?: string; tcLevels?: string[] }[];
  };
  completion?: WorkflowCompletionFacts;
  // What `start` fixes for the run: its minted ID and key, and the tool and policy it runs under.
  start?: Omit<WorkflowExecutionContext, "harness" | "requestDigest"> & { digestKey: string };
  // The always-required reviewers of the review profile each skill is routed to.
  reviewerRoles?: Record<string, string[]>;
  // A fail-closed cause an observer found for this operation.
  cause?: FailClosedCause;
  // The run's cumulative changed paths, observed at this write operation.
  observedChangedPaths?: string[];
}

// What `finish` observes: validate run in process, the offered verify report, the tool and
// policy digests, and the run's cumulative changed and uncommitted paths.
interface WorkflowCompletionFacts {
  validate: { failOn: Severity; findings: (FindingIdentity & { severity: Severity })[] };
  verifyReport?: { runId: string; stageInstanceId: string; status: string; scope: string };
  toolVersion: string;
  cliEntryDigest: string;
  policyDigests: Record<string, string>;
  changedPaths: string[];
  uncommittedPaths: string[];
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
    ...(proposal.riskSignals?.length ? { riskSignals: proposal.riskSignals } : {}),
  };
}

const IMPLEMENTATION_HEAVY_ROLES = [
  "completion-reviewer",
  "qa-gatekeeper",
  "implementation-reviewer",
];

// A run that restores an authorization check reviews its implementation work harder, and
// asks nobody first.
// SIMPLIFIED: a skill whose review profile the facts do not carry gets no reviewer roles.
// Lift when: the command adapter supplies the reviewer roles of every skill a plan names.
function requiredReviewerRoles(
  skill: string | undefined,
  plan: NonNullable<WorkflowSnapshot["plan"]>,
  facts: WorkflowFacts,
): string[] | undefined {
  if (!skill) return undefined;
  const restored = (plan.riskSignals ?? []).includes("authorization-restored");
  if (restored && (skill === "qfai-implement" || skill === "qfai-atdd")) {
    return IMPLEMENTATION_HEAVY_ROLES;
  }
  return facts.reviewerRoles?.[skill];
}

// An external effect is allowed only where a project policy names it. A request that asks
// for one authorizes nothing.
function allowedEffects(stage: PlanStages[number], snapshot: WorkflowSnapshot): string[] {
  const named = new Set(
    (snapshot.authorizations ?? [])
      .filter((authorization) => authorization.kind === "project_policy")
      .flatMap((authorization) => authorization.policy?.effects ?? []),
  );
  return (stage.effects ?? []).filter((effect) => named.has(effect));
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

// SIMPLIFIED: a reviewer recorded as an author or recommender anywhere in the run is refused.
// Lift when: a review result names the stage it reviewed.
function reviewerRefusals(
  result: NonNullable<WorkflowInput["result"]>,
  actorHistory: readonly WorkflowActor[],
): InputRefusal[] {
  return (result.reviewResults ?? []).flatMap((review, index): InputRefusal[] =>
    isAuthorOrRecommender(actorHistory, review.agentInstance)
      ? [{ reason: "reviewer-not-independent", subject: `reviewResults[${index}]` }]
      : [],
  );
}

function resultRefusals(
  result: NonNullable<WorkflowInput["result"]>,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
  actorHistory: readonly WorkflowActor[],
): InputRefusal[] {
  const refusals: InputRefusal[] = [
    ...reviewerRefusals(result, actorHistory),
    ...digestRefusals(result, facts),
    ...measurementRefusals(result),
  ];
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
  const testFix = result.testFix;
  if (workOrder.stageKind === "test_fix" && (!testFix?.reviewRef || !testFix.rerunRef)) {
    refusals.push({ reason: "test-fix-receipt", subject: "testFix" });
  }
  // A changed expectation is a change of meaning, which the fix leaves to SDD.
  if (workOrder.stageKind === "test_fix" && testFix?.citedAfter !== testFix?.citedBefore) {
    refusals.push({ reason: "test-fix-meaning", subject: "testFix" });
  }
  (result.debts ?? []).forEach((debt, index) => {
    if (!debt.resolvingOwner?.trim()) {
      refusals.push({ reason: "debt-owner-missing", subject: `debts[${index}]` });
    }
  });
  return refusals;
}

function measurementRefusals(result: NonNullable<WorkflowInput["result"]>): InputRefusal[] {
  if (result.measurement === undefined) return [];
  const measured = parseMeasurement(result.measurement);
  return measured.ok ? [] : measured.subjects.map((subject) => ({ reason: "schema", subject }));
}

// The measurement a result submitted, kept as submitted: a `null` never becomes `0`.
function measuredOf(result: NonNullable<WorkflowInput["result"]>) {
  const measured = parseMeasurement(result.measurement);
  return measured.ok ? { measurement: measured.measurement } : {};
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

function createQuestion(questionId: string, capability: WorkflowCapability): WorkflowQuestion {
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
  capability: WorkflowCapability,
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

function currentCapability(snapshot: WorkflowSnapshot): WorkflowCapability | undefined {
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

// SIMPLIFIED: a submitted digest of a file the facts carry no digest for is not checked.
// Lift when: the command adapter supplies the digest of every file a result names.
function digestRefusals(
  result: NonNullable<WorkflowInput["result"]>,
  facts: WorkflowFacts,
): InputRefusal[] {
  return (result.changedFiles ?? [])
    .filter((changed) => {
      const own = facts.fileDigests?.[changed.path];
      return own !== undefined && own !== changed.digest;
    })
    .map((changed) => ({ reason: "digest-mismatch", subject: changed.path }));
}

// A repeated work order names each input by the digest the file has now, never a stale one.
function refreshedInputs(workOrder: WorkflowWorkOrder, facts: WorkflowFacts): WorkflowWorkOrder {
  if (!workOrder.inputs) return workOrder;
  const inputs = workOrder.inputs.map((input) => ({
    path: input.path,
    digest: facts.fileDigests?.[input.path] ?? input.digest,
  }));
  return { ...workOrder, inputs };
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

// SIMPLIFIED: a test fix whose defective row the ledger fact does not describe keeps the plan's skill.
// Lift when: the command adapter always supplies the bound spec's ledger rows.
function executorSkill(
  stage: PlanStages[number],
  diagnosis: WorkflowSnapshot["diagnosis"],
  facts: WorkflowFacts,
): string | undefined {
  if (stage.stageKind !== "test_fix") return stage.skill;
  const rowId = diagnosis?.matchedRowIds[0];
  const row = facts.ledger?.rows.find((candidate) => candidate.rowId === rowId);
  if (!row?.layer) return stage.skill;
  const acceptanceLayer =
    row.layer === "E2E" ||
    row.layer === "API" ||
    (row.layer === "Integration" && (row.tcLevels ?? []).includes("L3"));
  return acceptanceLayer ? "qfai-atdd" : "qfai-implement";
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

const AUTHORIZATION_KINDS: unknown[] = ["request_scope", "human_decision", "project_policy"];

// Only the core records an authorization. One a payload carries is refused, and one of a kind
// the core never records, such as one derived from a mode or a confidence value, says so.
function carriedAuthorization(payload: { approved?: unknown; authorization?: unknown }) {
  const refusals: InputRefusal[] = [];
  const { approved, authorization } = payload;
  if (approved !== undefined) refusals.push({ reason: "schema", subject: "approved" });
  if (authorization !== undefined) {
    const kind = isRecord(authorization) ? authorization.kind : undefined;
    const reason = AUTHORIZATION_KINDS.includes(kind) ? "schema" : "authorization-kind";
    refusals.push({ reason, subject: "authorization" });
  }
  return refusals;
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
    case "blocked":
      return true;
    case "awaiting_input":
      return (result.questions ?? []).length > 0;
    case "needs_repair":
      return (
        (stageKind === "acceptance" && result.seamRequest !== undefined) ||
        (result.debts ?? []).length > 0
      );
    default:
      return false;
  }
}

// SIMPLIFIED: an unrun or blocked result with no delegation blocks the run without naming a
// blocker or who can clear it.
// Lift when: a blocked result's blocker and owner are derived from its debts.
function blockOnResult(
  run: WorkflowSnapshot["run"],
  result: NonNullable<WorkflowInput["result"]>,
  type = "unrun-or-unresolved-dependency",
  halt?: WorkflowHalt,
): WorkflowDecision {
  const blocked = { ...run, state: "blocked", sequence: run.sequence + 1 };
  return {
    verdict: { ok: true, run: blocked, ...(halt ? { halt } : {}) },
    events: [
      {
        type,
        resultRef: `results/${result.resultId}.json`,
        stageInstanceId: result.stageInstanceId,
        outcome: result.outcome,
        ...(halt ? { halt } : {}),
      },
    ],
  };
}

// SIMPLIFIED: the replan budget is checked on a replan from `running` only; the state machine
// gives `ready` and `awaiting_input` no edge to `blocked`.
// Lift when: the state machine names the edge a replan at its cap takes from those states.
const REPLAN_BUDGET = 3;

const REPAIR_BUDGET = 3;

// Each cause a repair request lists that has had every automatic repair its budget allows,
// named `<findingCode>@<path>`.
function exhaustedRepairCauses(
  snapshot: WorkflowSnapshot,
  result: NonNullable<WorkflowInput["result"]>,
): string[] {
  if (result.outcome !== "needs_repair") return [];
  const made = snapshot.repairsByCause ?? [];
  return (result.debts ?? [])
    .filter((debt) =>
      made.some(
        (cause) =>
          cause.findingCode === debt.findingCode &&
          cause.path === debt.path &&
          cause.count >= REPAIR_BUDGET,
      ),
    )
    .map((debt) => `${debt.findingCode}@${debt.path}`);
}

// The core never sleeps: each retry is returned with the delay the harness waits before it.
const RETRY_DELAYS_SECONDS = [30, 60, 120];

// A result reporting its delegation failed is decided by that delegation, before anything the
// result lists.
function decideDelegation(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: NonNullable<WorkflowInput["result"]>,
): WorkflowDecision | undefined {
  const { run } = snapshot;
  const status = result.delegation?.status;
  if (status === "unavailable") {
    const subjects = ["delegateSubAgent"];
    // SIMPLIFIED: every plan stage is taken to need a real delegation, so the first delegation
    // is the one of a run with no accepted stage.
    // Lift when: a plan or work order marks which stages need a real delegation.
    const first = (snapshot.acceptedStages ?? []).length === 0;
    const halt: WorkflowHalt = first
      ? { cause: "unsupported-capability", owner: "operator", subjects }
      : { blocker: "delegation-unavailable", owner: "operator", subjects };
    return blockOnResult(run, result, undefined, halt);
  }
  if (status !== "saturated") return undefined;
  const retries = snapshot.delegationRetries ?? 0;
  const nextDelaySeconds = RETRY_DELAYS_SECONDS[retries];
  if (nextDelaySeconds === undefined) {
    const halt = { blocker: "budget-exhausted" as const, owner: "operator" };
    return blockOnResult(run, result, undefined, { ...halt, subjects: [workOrder.workOrderId] });
  }
  const retry = { attempt: workOrder.attempt + 1, nextDelaySeconds };
  const kept = { ...workOrder, attempt: retry.attempt };
  return {
    verdict: { ok: true, run: { ...run, sequence: run.sequence + 1 }, workOrder: kept, retry },
    events: [
      {
        type: "retry-scheduled",
        resultRef: `results/${result.resultId}.json`,
        workOrder: kept,
        retry,
      },
    ],
  };
}

// A stage that needs an answer before it can go on opens its questions and waits.
function openStageQuestions(
  run: WorkflowSnapshot["run"],
  result: NonNullable<WorkflowInput["result"]>,
): WorkflowDecision {
  const inputs = (result.questions ?? []).map(parseQuestionInput);
  const parsed = inputs.flatMap((question) => question ?? []);
  if (parsed.length !== inputs.length) {
    return refusedWith(run, [{ reason: "schema", subject: "questions" }]);
  }
  const questions: WorkflowQuestion[] = parsed.map((question, index) => ({
    ...question,
    questionId: `question-${run.sequence + 1}-${index + 1}`,
  }));
  const events: WorkflowEvent[] = [
    ...questions.map((question) => ({ type: "question-opened", question })),
    {
      type: "material-decision",
      resultRef: `results/${result.resultId}.json`,
      stageInstanceId: result.stageInstanceId,
      outcome: result.outcome,
    },
  ];
  const waiting = { ...run, state: "awaiting_input", sequence: run.sequence + events.length };
  return { verdict: { ok: true, run: waiting, questions }, events };
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
  if (recorded) return refusedWith(run, [{ reason: "result-id-reused", subject: "resultId" }]);
  if (!RESULT_ID.test(result.resultId)) {
    return refusedWith(run, [{ reason: "schema", subject: "resultId" }]);
  }
  const carried = carriedAuthorization(result);
  if (carried.length > 0) return refusedWith(run, carried);
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

// A gate verdict a result submits is informative only; the core never decides a gate from it.
function agentReported(claims: { gateId: string; verdict: string }[]): WorkflowGateReceipt[] {
  return claims.map(({ gateId, verdict }) => ({ gateId, verdict, trustLevel: "agent_reported" }));
}

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 };

function unmetOf(condition: UnmetCondition, subjects: readonly string[], owner = "operator") {
  return subjects.map((subject): WorkflowUnmet => ({ condition, subject, owner }));
}

function findingKey(finding: FindingIdentity): string {
  return JSON.stringify([finding.code, finding.file, [...finding.refs].sort()]);
}

function failingFindings(completion: WorkflowCompletionFacts): FindingIdentity[] {
  const { failOn, findings } = completion.validate;
  return findings
    .filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK[failOn])
    .map(({ code, file, refs }) => ({ code, file, refs }));
}

function validateGate(snapshot: WorkflowSnapshot, failing: FindingIdentity[]): WorkflowUnmet[] {
  if (failing.length === 0) return [];
  const known = new Set((snapshot.baseline?.findings ?? []).map(findingKey));
  const findings = failing.map((finding) => {
    const baseline: "pre-existing" | "new" = known.has(findingKey(finding))
      ? "pre-existing"
      : "new";
    return { ...finding, baseline };
  });
  return [{ condition: "gate-failed", subject: "validate", owner: "operator", findings }];
}

function runStateUnmet(snapshot: WorkflowSnapshot): WorkflowUnmet[] {
  const { run, outstandingWorkOrder } = snapshot;
  if (run.state === "running") {
    const owner = outstandingWorkOrder?.executor?.skill ?? "operator";
    return unmetOf(
      "work-order-outstanding",
      [outstandingWorkOrder?.workOrderId ?? "work-order"],
      owner,
    );
  }
  if (run.state === "awaiting_input") {
    const questionIds = (snapshot.openQuestions ?? []).map((question) => question.questionId);
    return unmetOf("run-waiting", questionIds.length > 0 ? questionIds : ["question"]);
  }
  // SIMPLIFIED: a blocked run is named by its state, not by its cause or blocker.
  // Lift when: the snapshot carries the cause or blocker that moved the run to `blocked`.
  return run.state === "blocked" ? unmetOf("run-waiting", ["blocked"]) : [];
}

function stageUnmet(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowUnmet[] {
  const plan = snapshot.plan;
  if (!plan) return [];
  const accepted = snapshot.acceptedStages ?? [];
  const isAccepted = (stageInstanceId: string) =>
    accepted.some((stage) => stage.stageInstanceId === stageInstanceId);
  return activeStages(plan, snapshot.diagnosis, facts.acceptanceObligationsUnmet)
    .filter((stage) => stage.stageKind !== "verify" && !isAccepted(stage.stageInstanceId))
    .flatMap((stage) =>
      unmetOf(
        "stage-unaccepted",
        [stage.stageInstanceId],
        executorSkill(stage, snapshot.diagnosis, facts) ?? "operator",
      ),
    );
}

function verifyUnmet(snapshot: WorkflowSnapshot, completion: WorkflowCompletionFacts) {
  const verifyStages = (snapshot.acceptedStages ?? []).filter(
    (stage) => stage.stageKind === "verify",
  );
  if (verifyStages.length === 0) {
    const planned = snapshot.plan?.stages.find((stage) => stage.stageKind === "verify");
    return unmetOf("verify-missing", [planned?.stageInstanceId ?? "verify"], "qfai-verify");
  }
  const report = completion.verifyReport;
  const isThisRunsCopy =
    report?.runId === snapshot.run.id &&
    verifyStages.some((stage) => stage.stageInstanceId === report.stageInstanceId);
  if (!isThisRunsCopy) return unmetOf("verify-foreign", ["verify.json"], "qfai-verify");
  return report.status === "PASS" && report.scope === "full"
    ? []
    : unmetOf("gate-failed", ["verify"]);
}

function isAuthorOrRecommender(actorHistory: readonly WorkflowActor[], agentInstance: string) {
  return actorHistory.some(
    (actor) =>
      actor.agentInstance === agentInstance &&
      (actor.role === "author" || actor.role === "recommender"),
  );
}

function reviewUnmet(snapshot: WorkflowSnapshot): WorkflowUnmet[] {
  const actorHistory = snapshot.actorHistory ?? [];
  const independentPass = (snapshot.acceptedStages ?? [])
    .flatMap((stage) => stage.reviewResults ?? [])
    .some(
      (review) =>
        review.role === "qa-gatekeeper" &&
        review.verdict === "PASS" &&
        !isAuthorOrRecommender(actorHistory, review.agentInstance),
    );
  return independentPass ? [] : unmetOf("review-missing", ["qa-gatekeeper"]);
}

function scopeUnmet(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
  completion: WorkflowCompletionFacts,
) {
  const ledger = facts.ledger;
  const unprocessed =
    ledger && ledger.specId === snapshot.specBinding?.specId
      ? ledger.rows.filter((row) => row.status !== "done" && row.status !== "exception")
      : [];
  const escaped = escapedPaths(snapshot, completion.changedPaths);
  const approval = snapshot.approval;
  const unanswered =
    (approval && !approval.authorizationId) || (snapshot.plan?.route === "feature" && !approval)
      ? [approval?.target?.slotId ?? "CREATE"]
      : [];
  return [
    ...unmetOf(
      "obligation-unprocessed",
      unprocessed.map((row) => row.rowId),
    ),
    ...unmetOf("diff-out-of-scope", escaped),
    ...unmetOf("approval-unanswered", unanswered),
  ];
}

// A debt is resolved once the finish validate no longer reports its finding code at its path.
// SIMPLIFIED: a later accepted result of the detecting stage kind does not resolve a debt.
// Lift when: an accepted result's own findings are recorded beside its stage.
function debtUnmet(snapshot: WorkflowSnapshot, completion: WorkflowCompletionFacts) {
  const reported = (debt: WorkflowDebt) =>
    completion.validate.findings.some(
      (finding) => finding.code === debt.findingCode && finding.file === debt.path,
    );
  return (snapshot.acceptedStages ?? [])
    .flatMap((stage) => stage.debts ?? [])
    .filter(reported)
    .flatMap((debt) => unmetOf("debt-open", [debt.owningSpec], debt.resolvingOwner ?? "operator"));
}

function driftUnmet(snapshot: WorkflowSnapshot, completion: WorkflowCompletionFacts) {
  const start = snapshot.baseline;
  if (!start) return [];
  const tool = [
    ...(start.toolVersion === completion.toolVersion ? [] : ["tool-version"]),
    ...(start.cliEntryDigest === completion.cliEntryDigest ? [] : ["cli-entry-digest"]),
  ];
  const policyPaths = new Set([
    ...Object.keys(start.policyDigests),
    ...Object.keys(completion.policyDigests),
  ]);
  const policy = [...policyPaths].filter(
    (policyPath) => start.policyDigests[policyPath] !== completion.policyDigests[policyPath],
  );
  return [...unmetOf("tool-drift", tool), ...unmetOf("policy-drift", policy)];
}

function completionUnmet(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
  completion: WorkflowCompletionFacts,
): WorkflowUnmet[] {
  const unmet = [
    ...runStateUnmet(snapshot),
    ...stageUnmet(snapshot, facts),
    ...verifyUnmet(snapshot, completion),
    ...reviewUnmet(snapshot),
    ...validateGate(snapshot, failingFindings(completion)),
    ...scopeUnmet(snapshot, facts, completion),
    ...debtUnmet(snapshot, completion),
    ...driftUnmet(snapshot, completion),
    ...unmetOf("uncommitted", completion.uncommittedPaths),
  ];
  const seen = new Set<string>();
  return unmet.filter((entry) => {
    const key = JSON.stringify([entry.condition, entry.subject, entry.owner]);
    const first = !seen.has(key);
    seen.add(key);
    return first;
  });
}

function classedReceipts(snapshot: WorkflowSnapshot, facts: WorkflowFacts) {
  return (snapshot.acceptedStages ?? []).flatMap((stage): WorkflowReceiptClass[] =>
    stage.receiptRef
      ? [
          {
            ref: stage.receiptRef,
            validity: facts.receiptValidity?.[stage.receiptRef] ?? "unknown",
          },
        ]
      : [],
  );
}

function checkpointOf(
  accepted: readonly WorkflowAcceptedStage[],
  receipts: readonly WorkflowReceiptClass[],
): number {
  return accepted.findIndex((stage) =>
    receipts.some(({ ref, validity }) => ref === stage.receiptRef && validity !== "valid"),
  );
}

// A receipt that is not valid, including one whose dependency cannot be read, reopens its
// stage: the run restarts at the first accepted stage whose receipt does not hold.
// SIMPLIFIED: resume revalidates receipts only, not the worktree identity, the journal or digests.
// Lift when: observers supply the identity and integrity facts resume checks.
function resumeFromCheckpoint(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
): WorkflowDecision | undefined {
  const receipts = classedReceipts(snapshot, facts);
  const accepted = snapshot.acceptedStages ?? [];
  const checkpoint = checkpointOf(accepted, receipts);
  if (checkpoint < 0) return undefined;
  const events: WorkflowEvent[] = [
    { type: "observed-session-interruption" },
    { type: "reconciled-resume" },
  ];
  const { outstandingWorkOrder: _abandoned, ...rest } = snapshot;
  const run = { ...snapshot.run, state: "ready", sequence: snapshot.run.sequence + events.length };
  const acceptedStages = accepted.slice(0, checkpoint);
  const issued = decide({ ...rest, run, acceptedStages }, { operation: "next" }, facts);
  if (!issued.verdict.ok) return issued;
  return {
    verdict: { ...issued.verdict, classedReceipts: receipts },
    events: [...events, ...issued.events],
  };
}

// A crash can leave a run in `created` before its request was captured.
function resumeCreated(run: WorkflowSnapshot["run"]): WorkflowDecision {
  return {
    verdict: { ok: true, run: { ...run, state: "routing", sequence: run.sequence + 1 } },
    events: [{ type: "capture-request" }],
  };
}

// A routing receipt that no longer holds sends the run back to routing before any work.
function planRevision(snapshot: WorkflowSnapshot, facts: WorkflowFacts) {
  const ref = snapshot.routingReceiptRef;
  if (ref === undefined || facts.receiptValidity?.[ref] === "valid") return undefined;
  const run = { ...snapshot.run, state: "routing", sequence: snapshot.run.sequence + 1 };
  return { verdict: { ok: true, run }, events: [{ type: "required-plan-revision" }] };
}

// SIMPLIFIED: the authorized set is the plan's write scope and the run's own evidence tree.
// Lift when: the snapshot records the record areas of every work order the run issued.
function escapedPaths(snapshot: WorkflowSnapshot, changedPaths: readonly string[]): string[] {
  const areas = [
    ...(snapshot.plan?.writeScope ?? []),
    `.qfai/evidence/workflow/${snapshot.run.id}`,
  ];
  return changedPaths.filter((changed) => !areas.some((area) => areaCovers(area, changed)));
}

// The fail-closed cause found for this operation: one an observer reported, or a cumulative
// change that escaped the run change boundary.
function foundCause(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
): { cause: FailClosedCause; subjects: string[] } | undefined {
  if (facts.cause) return { cause: facts.cause, subjects: [] };
  const escaped = escapedPaths(snapshot, facts.observedChangedPaths ?? []);
  return escaped.length > 0 ? { cause: "invariant-violation", subjects: escaped } : undefined;
}

function refusedFailClosed(run: WorkflowSnapshot["run"], cause: FailClosedCause) {
  const message = "The run cannot go on until the cause it names is cleared.";
  return {
    verdict: { ok: false, run, error: { code: "fail-closed" as const, message, cause } },
    events: [],
  };
}

function resumeReady(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const receipts = classedReceipts(snapshot, facts);
  const accepted = snapshot.acceptedStages ?? [];
  const checkpoint = checkpointOf(accepted, receipts);
  const acceptedStages = checkpoint < 0 ? accepted : accepted.slice(0, checkpoint);
  const issued = decide({ ...snapshot, acceptedStages }, { operation: "next" }, facts);
  if (!issued.verdict.ok || receipts.length === 0) return issued;
  return { ...issued, verdict: { ...issued.verdict, classedReceipts: receipts } };
}

// The core cannot observe a blocker a stage reported, so resume reissues that stage's work
// order as a new attempt, and the new result decides whether the block still holds.
function resumeBlocked(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run } = snapshot;
  if (facts.cause) return refusedFailClosed(run, facts.cause);
  const { outstandingWorkOrder: _blocked, ...rest } = snapshot;
  const ready = { ...run, state: "ready", sequence: run.sequence + 1 };
  const issued = decide({ ...rest, run: ready }, { operation: "next" }, facts);
  if (!issued.verdict.ok) return issued;
  return { ...issued, events: [{ type: "blocker-cleared-and-revalidated" }, ...issued.events] };
}

function resumeRunning(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): WorkflowDecision {
  if (facts.cause) {
    const events: WorkflowEvent[] = [
      { type: "observed-session-interruption" },
      { type: "reconciled-with-blocker", cause: facts.cause },
    ];
    const run = { ...snapshot.run, state: "blocked", sequence: snapshot.run.sequence + 2 };
    return { verdict: { ok: true, run }, events };
  }
  const checkpoint = resumeFromCheckpoint(snapshot, facts);
  if (checkpoint) return checkpoint;
  const events: WorkflowEvent[] = [
    { type: "observed-session-interruption" },
    { type: "reconciled-resume" },
    { type: "dispatch-work-order" },
  ];
  const run = { ...snapshot.run, sequence: snapshot.run.sequence + events.length };
  return { verdict: { ok: true, run, workOrder }, events };
}

function decideResume(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run, outstandingWorkOrder } = snapshot;
  if (run.state === "created") return resumeCreated(run);
  if (run.state === "ready") return resumeReady(snapshot, facts);
  if (run.state === "blocked") return resumeBlocked(snapshot, facts);
  if (run.state === "running" && outstandingWorkOrder) {
    return resumeRunning(snapshot, outstandingWorkOrder, facts);
  }
  return refusedInput(run, "The run cannot resume from here. Read the run's status.");
}

function decideFinish(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run, completionTarget } = snapshot;
  const completion = facts.completion;
  if (!completion || !completionTarget) {
    return refusedInput(run, "The completion facts are not ready.");
  }
  const all = completionUnmet(snapshot, facts, completion);
  const workingTree = completionTarget === "working_tree";
  const unmet = workingTree ? all.filter((entry) => entry.condition !== "uncommitted") : all;
  const delivery = workingTree
    ? { deliveryUnmet: all.filter((entry) => entry.condition === "uncommitted") }
    : {};
  const failing = failingFindings(completion);
  const verdict = failing.length === 0 ? "PASS" : "FAIL";
  const receipts: WorkflowGateReceipt[] = [
    { gateId: "validate", verdict, trustLevel: "cli_observed" },
  ];
  if (unmet.length > 0 || run.state !== "ready") {
    return { verdict: { ok: true, run, unmet, ...delivery, receipts }, events: [] };
  }
  const completed = { ...run, state: "completed", sequence: run.sequence + 1 };
  return {
    verdict: { ok: true, run: completed, target: completionTarget, unmet, ...delivery, receipts },
    events: [
      {
        type: "validated-final-result-and-target",
        validate: { verdict, findings: failing, trustLevel: "cli_observed" },
      },
    ],
  };
}

// Strongest first: the answer takes the strongest effect among the options chosen.
const EFFECT_STRENGTH: QuestionEffect[] = ["stop", "replan", "proceed"];

function chosenOptions(question: WorkflowQuestion, optionIds: readonly string[]) {
  const chosen = question.options.filter((option) => optionIds.includes(option.optionId));
  if (!question.selection) return undefined;
  const { min, max } = question.selection;
  const valid =
    new Set(optionIds).size === optionIds.length &&
    chosen.length === optionIds.length &&
    optionIds.length >= min &&
    optionIds.length <= max;
  return valid ? chosen : undefined;
}

function answerEvents(authorization: WorkflowAuthorization): WorkflowEvent[] {
  const events: WorkflowEvent[] = [{ type: "authorization-recorded", authorization }];
  if (authorization.effect === "proceed") events.push({ type: "valid-answer-no-replan" });
  if (authorization.effect === "replan") events.push({ type: "answer-changes-scope" });
  if (authorization.effect === "stop") events.push({ type: "authorized-stop" });
  return events;
}

// A value is kept only as a digest under the run's key, so the tracked record cannot be
// matched against a guess.
function keyedDigest(text: string, key: string | undefined) {
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return undefined;
  return createHmac("sha256", Buffer.from(key, "hex")).update(text).digest("hex");
}

function valueDigestOf(value: string | undefined, key: string | undefined) {
  const normalized = value?.normalize("NFC").trim();
  return normalized ? keyedDigest(normalized, key) : undefined;
}

// SIMPLIFIED: start records the execution context from the facts it is given; it checks no
// capability report, active run or baseline.
// Lift when: start's own refusals and its validate baseline are decided here.
const SUPPORTED_HOSTS = ["claude-code", "codex"];

const REQUIRED_CAPABILITIES = [
  "fetchSkillBody",
  "invokeStage",
  "delegateSubAgent",
  "relayQuestion",
  "runShellAndTests",
  "writeProjectRoot",
  "keepRunRecord",
  "resume",
];

// The refusal message for a host the core cannot run on, naming the host or each capability it
// lacks; undefined when the host and every capability are supported.
function unsupportedHarness(harness: WorkflowHarness): string | undefined {
  if (!SUPPORTED_HOSTS.includes(harness.host)) {
    return `No run was created: ${harness.host} is not a supported host. Invoke a stage skill by name instead.`;
  }
  const missing = REQUIRED_CAPABILITIES.filter((name) => harness.capabilities[name] !== true);
  if (missing.length === 0) return undefined;
  return `No run was created: the host reports no ${missing.join(", ")}. Invoke a stage skill by name instead.`;
}

function decideStart(input: WorkflowInput, facts: WorkflowFacts): WorkflowDecision {
  const start = facts.start;
  const text = input.request?.text ?? "";
  const requestDigest = text.trim() ? keyedDigest(text, start?.digestKey) : undefined;
  if (input.operation !== "start" || !start || !requestDigest || !input.harness) {
    const message = "The run could not be started. Check the request and try again.";
    return {
      verdict: { ok: false, run: null, error: { code: "invalid-input", message } },
      events: [],
    };
  }
  const unsupported = unsupportedHarness(input.harness);
  if (unsupported) {
    const cause = "unsupported-capability" as const;
    return {
      verdict: {
        ok: false,
        run: null,
        error: { code: "fail-closed", message: unsupported, cause },
      },
      events: [],
    };
  }
  const { digestKey: _key, ...fixed } = start;
  const executionContext = { ...fixed, harness: input.harness, requestDigest };
  const events = [{ type: "run-created", executionContext }, { type: "capture-request" }];
  const run = { id: start.runId, state: "routing", sequence: events.length };
  return { verdict: { ok: true, run }, events };
}

function valueAnswer(question: WorkflowQuestion, value: string | undefined, key?: string) {
  const valueDigest = valueDigestOf(value, key);
  if (!valueDigest || !question.effect) return undefined;
  return { answer: { valueDigest }, effect: question.effect };
}

// An answer is identified by its sorted option IDs, or by its value's keyed digest.
function normalizedAnswer(input: WorkflowInput, key: string | undefined) {
  const { value, optionIds } = input.answer ?? {};
  if (value !== undefined) return { valueDigest: valueDigestOf(value, key) };
  return { optionIds: [...(optionIds ?? [])].sort() };
}

// A repeated answer returns the verdict it was given; a different one is refused.
function replayedAnswer(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
): WorkflowDecision | undefined {
  const recorded = input.questionId ? snapshot.answeredQuestions?.[input.questionId] : undefined;
  if (!recorded) return undefined;
  const same =
    JSON.stringify(normalizedAnswer(input, snapshot.digestKey)) === JSON.stringify(recorded.answer);
  if (same) return { verdict: recorded.verdict, events: [] };
  const message = "That question already has a different answer. Read the run's status.";
  return {
    verdict: { ok: false, run: snapshot.run, error: { code: "answer-conflict", message } },
    events: [],
  };
}

function answerOf(
  question: WorkflowQuestion,
  input: WorkflowInput,
  key: string | undefined,
): Pick<WorkflowAuthorization, "answer" | "effect"> | "option" | undefined {
  if (question.kind === "fact") return valueAnswer(question, input.answer?.value, key);
  const chosen = chosenOptions(question, input.answer?.optionIds ?? []);
  if (!chosen) return "option";
  const effect = EFFECT_STRENGTH.find((candidate) =>
    chosen.some((option) => option.effect === candidate),
  );
  if (!effect) return undefined;
  return { answer: { optionIds: chosen.map((option) => option.optionId).sort() }, effect };
}

const STATE_AFTER_EFFECT: Record<QuestionEffect, string> = {
  proceed: "ready",
  replan: "routing",
  stop: "cancelled",
};

function decideAnswer(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run, scopeDigest } = snapshot;
  const question = snapshot.openQuestions?.find(
    (openQuestion) => openQuestion.questionId === input.questionId,
  );
  const notReady = refusedInput(run, "The answer is not ready.");
  const kind = carriedAuthorization({ authorization: input.authorization }).filter(
    (refusal) => refusal.reason === "authorization-kind",
  );
  if (kind.length > 0) return refusedWith(run, kind);
  if (!question) {
    const message = "No question is waiting for this answer. Read the run's status first.";
    return {
      verdict: { ok: false, run, error: { code: "no-open-question", message } },
      events: [],
    };
  }
  const answered = answerOf(question, input, snapshot.digestKey);
  if (answered === "option") return refusedWith(run, [{ reason: "option", subject: "answer" }]);
  const slotId = question.capability?.slotId;
  if (
    input.expectedSequence !== run.sequence ||
    !input.answeredBy?.trim() ||
    scopeDigest === undefined ||
    !/^[a-f0-9]{64}$/.test(scopeDigest) ||
    !facts.now ||
    !Number.isFinite(Date.parse(facts.now)) ||
    new Date(facts.now).toISOString() !== facts.now ||
    (question.kind === "create" && !slotId) ||
    !answered
  ) {
    return notReady;
  }
  const { answer, effect } = answered;
  const authorization: WorkflowAuthorization = {
    authorizationId: `authorization-${run.sequence + 1}`,
    runId: run.id,
    kind: "human_decision",
    capture: "agent_captured",
    scopeDigest,
    recordedAt: facts.now,
    questionId: question.questionId,
    question: {
      text: question.text,
      options: question.options,
      ...(question.selection ? { selection: question.selection } : {}),
    },
    answer,
    effect,
    answeredBy: input.answeredBy,
    operation: question.capability && slotId ? "CREATE" : null,
    ...(question.capability && slotId
      ? {
          target: {
            kind: "new_capability",
            slotId,
            capability: {
              goal: question.capability.goal,
              covers: question.capability.covers,
              excludes: question.capability.excludes,
            },
          },
        }
      : {}),
  };
  const events = answerEvents(authorization);
  const next = {
    ...run,
    state: STATE_AFTER_EFFECT[effect],
    sequence: run.sequence + events.length,
  };
  return { verdict: { ok: true, run: next }, events };
}

const TERMINAL_STATES = ["completed", "cancelled", "failed"];

// A replay returns the verdict it was given, whatever state the run is in now.
function replayOf(snapshot: WorkflowSnapshot, input: WorkflowInput): WorkflowDecision | undefined {
  const result = input.result;
  const recorded = result ? snapshot.recordedResults?.[result.resultId] : undefined;
  if (input.operation === "accept") {
    const same = recorded !== undefined && recorded.payloadDigest === input.payloadDigest;
    return same ? { verdict: recorded.verdict, events: [] } : undefined;
  }
  if (input.operation !== "decision") return undefined;
  if (input.stop === true) {
    return snapshot.stopVerdict ? { verdict: snapshot.stopVerdict, events: [] } : undefined;
  }
  return replayedAnswer(snapshot, input);
}

// A stop needs no open question and no sequence: it cancels any run that has not ended.
function decideStop(run: WorkflowSnapshot["run"], input: WorkflowInput): WorkflowDecision {
  if (!input.answeredBy?.trim()) return refusedInput(run, "The stop is not ready.");
  return {
    verdict: { ok: true, run: { ...run, state: "cancelled", sequence: run.sequence + 1 } },
    events: [{ type: "authorized-stop" }],
  };
}

// Before `start` there is no run, so `start` alone takes no snapshot.
export function decide(
  snapshot: null,
  input: WorkflowInput & { operation: "start" },
  facts: WorkflowFacts,
): WorkflowDecision;
export function decide(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision;
export function decide(
  snapshot: WorkflowSnapshot | null,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision {
  if (!snapshot) return decideStart(input, facts);
  const replayed = replayOf(snapshot, input);
  if (replayed) return replayed;
  const run = snapshot.run;
  if (TERMINAL_STATES.includes(run.state)) {
    const message = "The run has ended. Start a new run to continue.";
    return { verdict: { ok: false, run, error: { code: "run-terminal", message } }, events: [] };
  }
  if (input.operation === "decision" && input.stop === true) return decideStop(run, input);
  // A cause found where the state machine has no edge to `blocked` refuses the operation;
  // at `finish` it is an unmet condition instead.
  const found = input.operation === "finish" ? undefined : foundCause(snapshot, facts);
  const waiting = run.state === "ready" || run.state === "awaiting_input";
  if (found && waiting) return refusedFailClosed(run, found.cause);
  const workOrder = snapshot.outstandingWorkOrder;
  const result = input.result;
  const proposal = result?.proposal;
  const capabilities = proposal?.newCapabilities;

  if (input.operation === "accept" && result) {
    const refused = acceptPreamble(snapshot, input, result);
    if (refused) return refused;
    if (found && run.state === "running") {
      return blockOnResult(run, result, undefined, { ...found, owner: "operator" });
    }
  }

  if (input.operation === "finish") return decideFinish(snapshot, facts);
  if (input.operation === "resume") return decideResume(snapshot, facts);

  if (input.operation === "decision") {
    return decideAnswer(snapshot, input, facts);
  }

  if (input.operation === "next" && run.state === "ready") {
    const revision = planRevision(snapshot, facts);
    if (revision) return revision;
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
    // SIMPLIFIED: a repair goes to the plan stage the first finding's owner serves.
    // Lift when: a repair owned by no plan stage returns the run to routing, and the
    // detecting stage is reissued after the repair is accepted.
    const repairOwner = snapshot.repairRequest?.debts[0]?.resolvingOwner;
    const stage = repairOwner
      ? plan.stages.find((candidate) => candidate.skill === repairOwner)
      : selectedStages[acceptedStages.length];
    if (!stage && repairOwner) return refusedInput(run, "The repair work order is not ready.");
    if (!stage) return { verdict: { ok: true, run, workOrder: null }, events: [] };

    const attempt = (snapshot.attempts?.[stage.stageInstanceId] ?? 0) + 1;
    const skill = executorSkill(stage, snapshot.diagnosis, facts);
    const nextWorkOrder: WorkflowWorkOrder = {
      workOrderId: `work-order-${stage.stageInstanceId}-${attempt}`,
      stageInstanceId: stage.stageInstanceId,
      attempt,
      stageKind: stage.stageKind,
      ...(skill ? { executor: { skill } } : {}),
      ...(stage.operation ? { operation: stage.operation } : {}),
      // SIMPLIFIED: the scope carries the plan's write areas and the allowed effects only.
      // Lift when: a work order's scope digest, protected targets or non-goals are read.
      ...(plan.writeScope
        ? {
            scope: { writeAreas: plan.writeScope, allowedEffects: allowedEffects(stage, snapshot) },
          }
        : {}),
    };
    const reviewerRoles = requiredReviewerRoles(skill, plan, facts);
    if (reviewerRoles) nextWorkOrder.requiredReviewerRoles = reviewerRoles;
    const actorHistory = snapshot.actorHistory ?? [];
    if (actorHistory.length > 0) nextWorkOrder.actorHistory = actorHistory;
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
    return { verdict: { ok: true, run, workOrder: refreshedInputs(workOrder, facts) }, events: [] };
  }

  // An unanswered question is never answered by asking for work: nothing is issued or recorded.
  if (input.operation === "next" && run.state === "awaiting_input") {
    const questions = snapshot.openQuestions ?? [];
    return { verdict: { ok: true, run, workOrder: null, questions }, events: [] };
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
          workOrder.executor?.skill !== executorSkill(nextStage, snapshot.diagnosis, facts) ||
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

    const inputRefusals = resultRefusals(result, workOrder, facts, snapshot.actorHistory ?? []);
    if (inputRefusals.length > 0) return refusedWith(run, inputRefusals);
    const delegated = decideDelegation(snapshot, workOrder, result);
    if (delegated) return delegated;
    if (result.outcome === "unrun" || result.outcome === "blocked") {
      return blockOnResult(run, result);
    }
    if (result.outcome === "awaiting_input") return openStageQuestions(run, result);
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
    if (needsReplan && (snapshot.replans ?? 0) >= REPLAN_BUDGET) {
      const halt = { blocker: "budget-exhausted" as const, owner: "operator" };
      return blockOnResult(run, result, undefined, { ...halt, subjects: ["replan"] });
    }
    const exhausted = exhaustedRepairCauses(snapshot, result);
    if (exhausted.length > 0) {
      const halt = { blocker: "budget-exhausted" as const, owner: "operator" };
      return blockOnResult(run, result, undefined, { ...halt, subjects: exhausted });
    }
    const events: WorkflowEvent[] = [
      {
        type: needsReplan ? "scope-or-obligation-revision" : "accept-nonfinal-result",
        resultRef: `results/${result.resultId}.json`,
        stageInstanceId: workOrder.stageInstanceId,
        outcome: result.outcome,
        ...(result.notRun ? { notRun: result.notRun } : {}),
        ...(result.seamRequest ? { seamRequest: result.seamRequest } : {}),
        ...(result.outcome === "needs_repair" && result.debts ? { repairs: result.debts } : {}),
        ...(result.outcome === "accepted_with_debt" && result.debts ? { debts: result.debts } : {}),
        ...(result.gateResults?.length ? { gateResults: agentReported(result.gateResults) } : {}),
        ...measuredOf(result),
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

  if (
    input.operation === "accept" &&
    run.state === "routing" &&
    workOrder?.stageKind === "routing" &&
    result?.outcome === "blocked"
  ) {
    return blockOnResult(run, result, "missing-capability");
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
  const questionInputs = (proposal.unresolvedQuestions ?? []).map(parseQuestionInput);
  const decisionInputs = questionInputs.flatMap((question) => question ?? []);
  if (decisionInputs.length !== questionInputs.length) {
    return refusedWith(run, [{ reason: "schema", subject: "unresolvedQuestions" }]);
  }
  if (capabilities.length === 0 && decisionInputs.length === 0) {
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
  decisionInputs.forEach((input) => {
    questions.push({
      ...input,
      questionId: `question-${run.sequence + 1}-${questions.length + 1}`,
    });
  });

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
