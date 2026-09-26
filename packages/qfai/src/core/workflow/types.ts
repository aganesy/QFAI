import type { WorkflowMeasurement } from "./parse.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  QuestionEffect,
  RouteReference,
} from "./parse.js";

/** A story a new-story slot will create: in an existing flow, or `flowId: null` for a new flow. */
export interface WorkflowStorySlot {
  goal: string;
  covers: string[];
  excludes: string[];
  flowId: string | null;
  slotId: string;
}

export type WorkflowStory = Omit<WorkflowStorySlot, "slotId">;

export interface WorkflowQuestion {
  questionId: string;
  kind: "create" | "decision" | "fact";
  text: string;
  options: { optionId: string; label: string; description: string; effect: QuestionEffect }[];
  selection?: { min: number; max: number };
  recommendation?: string;
  // On a fact question, which offers no options: the effect of any value.
  effect?: QuestionEffect;
  story?: WorkflowStorySlot;
  // On a question a story-authoring stage opened: its answer authorizes that stage's change.
  changeRequest?: true;
}

// The run's own view of the bound flow's obligations when a work order was issued.
export interface WorkflowObligationSet {
  flowId: string;
  exampleIds: string[];
  annotated: string[];
}

// The two tables, and for defect example seeding the contract it may extend, as they were when a
// story-authoring work order was issued.
export interface WorkflowRecordsAtIssue {
  decisions: string;
  openQuestions: string;
  contract?: { path: string; text: string };
}

export interface WorkflowEvent {
  type: string;
  question?: WorkflowQuestion;
  authorization?: WorkflowAuthorization;
  proposal?: WorkflowProposal;
  workOrder?: WorkflowWorkOrder;
  resultRef?: string;
  stageInstanceId?: string;
  outcome?: string;
  binding?: WorkflowBinding;
  // On a `binding-recorded` event with no slot: the one flow the checked proposal named.
  flowId?: string;
  plan?: WorkflowPlan;
  notRun?: WorkflowNotRun;
  seamRequest?: { targetTestId: string };
  repairs?: WorkflowDebt[];
  debts?: WorkflowDebt[];
  gateResults?: WorkflowGateReceipt[];
  // The agent that produced the result an event records, as the run's actor history keeps it.
  actor?: WorkflowActor;
  validate?: { verdict: "PASS" | "FAIL"; findings: FindingIdentity[]; trustLevel: "cli_observed" };
  executionContext?: WorkflowExecutionContext;
  cause?: FailClosedCause;
  halt?: WorkflowHalt;
  retry?: { attempt: number; nextDelaySeconds: number };
  measurement?: WorkflowMeasurement;
  diagnosis?: WorkflowDiagnosis;
  // Runtime only: what the run has settled so far, which the tracked summary never copies.
  settled?: WorkflowSettled;
  adjustments?: WorkflowStartAdjustment[];
  // On an issued work order bound to a flow: which of its examples tests annotated then.
  obligationSet?: WorkflowObligationSet;
  // On an issued story-authoring work order: the records it is later compared with.
  recordsAtIssue?: WorkflowRecordsAtIssue;
  // On an accepted story-authoring result: the `decisions.md` rows it appended.
  appendedRows?: string[];
}

// A path an in-force change request changed outside the run, admitted into the run change
// boundary at the digest it had when `resume` admitted it.
export interface WorkflowStartAdjustment {
  path: string;
  digest: string;
  changeRequest: string;
}

// The checked proposal's routing result, and every answered question with the option labels
// chosen or the value given.
export interface WorkflowSettled {
  routingResultId: string;
  answers: { questionId: string; text: string; chosen: string[] | string }[];
}

export type FailClosedCause =
  | "policy-drift"
  | "contract-undeclared"
  | "reviewer-missing"
  | "unsupported-capability"
  | "invariant-violation"
  | "invalid-mode";

// The host's capability report, each capability reported true or false.
export interface WorkflowHarness {
  host: string;
  capabilities: Record<string, boolean>;
}

export interface WorkflowExecutionContext {
  runId: string;
  qfaiVersion: string;
  policyDigests: Record<string, string>;
  planDigests: Record<string, string>;
  harness: WorkflowHarness;
  requestDigest: string;
}

// What `start` fixes for the run change boundary: the commit checked out, and each path already
// changed then with its content digest, `null` for a path with no file.
export interface WorkflowBoundaryStart {
  head: string | null;
  dirty: Record<string, string | null>;
}

// The worktree real path and branch a run was started in.
export interface WorkflowIdentity {
  worktree: string;
  branch: string | null;
}

export type WorkflowPolicyDigests = Pick<WorkflowExecutionContext, "policyDigests" | "planDigests">;

// One input a receipt depends on: a file by its digest, or a glob by the digest of its member
// list. A `historical_observation` is what the stage observed once, and is never rechecked.
export interface WorkflowDependency {
  path: string;
  digest: string;
  class: "normative" | "historical_observation" | "current_verification";
}

export interface WorkflowGateReceipt {
  gateId: string;
  verdict: string;
  trustLevel: "cli_observed" | "agent_reported";
}

export type Severity = "error" | "warning" | "info";

export interface FindingIdentity {
  code: string;
  file: string;
  refs: string[];
}

export type UnmetCondition =
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

export interface WorkflowUnmet {
  condition: UnmetCondition;
  subject: string;
  owner: string;
  findings?: (FindingIdentity & { baseline: "pre-existing" | "new" })[];
}

export type CompletionTarget = "qfai_done" | "working_tree";

export type WorkflowNotRun =
  { kind: "not_applicable"; reason?: string } | { kind: "reused"; receiptRef: string };

export interface WorkflowBinding {
  slotId: string;
  flowId: string;
  storyIds: string[];
}

export type WorkflowTarget =
  { kind: "new_story"; slotId: string } | { kind: "flow"; flowId: string };

export interface WorkflowWorkOrder {
  workOrderId: string;
  stageInstanceId: string;
  attempt: number;
  stageKind: string;
  target?: WorkflowTarget;
  executor?: { skill: string };
  operation?: string;
  authorizationRefs?: string[];
  parentWorkOrderId?: string;
  checkpointRef?: string;
  scope?: { digest?: string; writeAreas: string[]; allowedEffects?: string[] };
  recordAreas?: string[];
  inputs?: { path: string; digest: string }[];
  obligations?: { flowId: string; ids: string[]; digest: string };
  priorStageReceiptRefs?: { ref: string; validity: "valid" | "stale" | "unknown" }[];
  requiredReviewerRoles?: string[];
  actorHistory?: WorkflowActor[];
  settled?: WorkflowSettled;
}

export interface WorkflowActor {
  role: string;
  agentInstance: string;
  stageInstanceId?: string;
}

export interface WorkflowAuthorization {
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
  operation: "CREATE" | "CHANGE_REQUEST" | null;
  target?: { kind: "new_story"; slotId: string; story: WorkflowStory };
}

export type WorkflowBlocker =
  "stage-blocked" | "delegation-unavailable" | "budget-exhausted" | "scope-dependency";

// Why a blocked run stopped: exactly one cause or one blocker, and who can clear it.
export type WorkflowHalt = (
  { cause: FailClosedCause; blocker?: never } | { blocker: WorkflowBlocker; cause?: never }
) & { owner: string; subjects: string[] };

export type WorkflowReceiptClass = { ref: string; validity: "valid" | "stale" | "unknown" };

export interface WorkflowVerdict {
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
    | { code: "invalid-input"; message: string; reasons?: InputRefusal[] }
    | {
        code:
          | "stale-sequence"
          | "no-open-question"
          | "answer-conflict"
          | "run-terminal"
          | "identity-mismatch";
        message: string;
      }
    | { code: "fail-closed"; message: string; cause: FailClosedCause }
    | { code: "proposal-refused"; message: string; reasons: ProposalRefusal[] };
}

export interface WorkflowDecision {
  verdict: WorkflowVerdict;
  events: WorkflowEvent[];
}

export type InputRefusalReason =
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
  | "unbound-story"
  | "regression-fix-receipt"
  | "test-fix-receipt"
  | "test-fix-meaning"
  | "option"
  | "reviewer-not-independent"
  | "blocked-repairable"
  | "authorization-kind"
  | "example-uncovered"
  | "example-added"
  | "record-rewritten"
  | "record-unauthorized"
  | "rule-changed";

export interface InputRefusal {
  reason: InputRefusalReason;
  subject: string;
}

export type ProposalRefusalReason =
  | "unknown-path"
  | "unknown-id"
  | "protected-surface"
  | "scope-escape"
  | "unresolved-approval"
  | "stage-set"
  | "flow-binding";

export interface ProposalRefusal {
  reason: ProposalRefusalReason;
  subject: string;
}

export type PlanStages = {
  stageInstanceId: string;
  stageKind: string;
  skill?: string;
  // Both skills of a `test_fix` stage, when it names two.
  skills?: string[];
  operation?: string;
  when?: string;
  effects?: string[];
}[];

export interface WorkflowPlan {
  route: string;
  goal: string;
  stages: PlanStages;
  writeScope: string[];
  expectedBehaviorRefs: RouteReference<NormativeReferenceKind>[];
  observedRefs: RouteReference<ObservedReferenceKind>[];
  riskSignals?: string[];
}

export interface WorkflowDiagnosis {
  verdict: string;
  reproductionRef: string;
  matchedIds: string[];
}

export interface WorkflowSnapshot {
  run: { id: string; state: string; sequence: number };
  // What `start` fixed for the run. The core reads its policy and plan digests.
  executionContext?: WorkflowExecutionContext;
  identity?: WorkflowIdentity;
  // The run change boundary's starting state.
  boundary?: WorkflowBoundaryStart;
  outstandingWorkOrder?: WorkflowWorkOrder;
  openQuestions?: WorkflowQuestion[];
  scopeDigest?: string;
  plan?: {
    route: string;
    stages: PlanStages;
    writeScope?: string[];
    riskSignals?: string[];
  };
  flowBinding?: { flowId: string };
  diagnosis?: WorkflowDiagnosis | null;
  stories?: WorkflowStorySlot[];
  approval?: {
    authorizationId?: string;
    scopeDigest?: string;
    kind: string;
    operation: string | null;
    effect: string;
    target?: { kind: string; slotId: string; story?: WorkflowStory };
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
  // The findings a `needs_repair` result routed to their owners, and the stage that found them.
  repairRequest?: { stageInstanceId: string; debts: WorkflowDebt[] };
  // The results of stages issued out of plan order to repair a finding.
  repairedStages?: WorkflowAcceptedStage[];
  // The current plan's stages the run skipped because their predicate did not hold.
  skippedStages?: string[];
  // The stage results of every plan a replan replaced, kept for their receipts and debts.
  priorStages?: WorkflowAcceptedStage[];
  // What the routing receipt depends on, recorded when routing's result was accepted.
  routingDependencies?: WorkflowDependency[];
  attempts?: Record<string, number>;
  // The saturated-delegation retries already scheduled for the outstanding work order.
  delegationRetries?: number;
  // The replans the run has already made.
  replans?: number;
  // The automatic repairs already made for each cause: a finding code at its path.
  repairsByCause?: { findingCode: string; path: string; count: number }[];
  receiptRefs?: string[];
  actorHistory?: WorkflowActor[];
  recordedResults?: Record<string, { payloadDigest: string; verdict: WorkflowVerdict }>;
  authorizations?: WorkflowAuthorizationRef[];
  answeredQuestions?: Record<
    string,
    { answer: WorkflowAuthorization["answer"]; verdict: WorkflowVerdict }
  >;
  // The verdict a `stop` returned, which a repeated `stop` returns again.
  stopVerdict?: WorkflowVerdict;
  // The run's key for free-text answers, read from its private request file.
  digestKey?: string;
  routingReceiptRef?: string;
  settled?: WorkflowSettled;
  // Why the run is blocked, while it is.
  halt?: WorkflowHalt;
  // The record areas of every work order the run issued.
  issuedRecordAreas?: string[];
  // The bound flow's examples, as the outstanding work order was issued against them.
  issuedObligations?: WorkflowObligationSet;
  // The records the outstanding story-authoring work order is compared with at `accept`.
  issuedRecords?: WorkflowRecordsAtIssue;
  // Every `decisions.md` row a story-authoring result of this run appended.
  appendedRows?: string[];
  // The bounded adjustments `resume` made to the run's starting state.
  startAdjustments?: WorkflowStartAdjustment[];
}

export interface WorkflowAuthorizationRef {
  authorizationId: string;
  kind: string;
  operation?: string | null;
  answeredBy?: string;
  policy?: WorkflowPolicy;
}

export interface WorkflowPolicy {
  path: string;
  digest: string;
  effects: string[];
}

export interface WorkflowAcceptedStage {
  stageInstanceId: string;
  stageKind: string;
  outcome: string;
  receiptRef?: string;
  testObservation?: string;
  // Each shared report the result named, as copied under this stage instance.
  reports?: { path: string; digest: string }[];
  // What the stage's receipt depends on, recorded when it was accepted.
  dependencies?: WorkflowDependency[];
  gateResults?: WorkflowGateReceipt[];
  reviewResults?: WorkflowReview[];
  debts?: WorkflowDebt[];
}

export interface WorkflowReview {
  role: string;
  agentInstance: string;
  verdict: string;
  reportRef: string;
}

export interface WorkflowSeamRequest {
  parentWorkOrderId: string;
  stageInstanceId: string;
  attempt: number;
  targetTestId: string;
}

export interface WorkflowNewStory {
  goal: string;
  covers: string[];
  excludes: string[];
  evidence: string[];
  flowId: string | null;
}

export interface WorkflowProposal {
  requestKind: string;
  candidateRoute: string | null;
  goal?: string;
  affectedFlowIds?: string[];
  riskSignals?: string[];
  unresolvedQuestions?: unknown[];
  proposedWriteScope?: string[];
  protectedTargets?: string[];
  confidence?: number;
  rationale?: string;
  expectedBehaviorRefs: RouteReference<NormativeReferenceKind>[];
  observedRefs: RouteReference<ObservedReferenceKind>[];
  newStories: WorkflowNewStory[];
  requiredStages: string[];
}

export interface WorkflowResult {
  approved?: unknown;
  authorization?: unknown;
  resultId: string;
  workOrderId: string;
  stageInstanceId: string;
  attempt: number;
  expectedSequence: number;
  outcome: string;
  diagnosis?: WorkflowDiagnosis;
  bindings?: WorkflowBinding[];
  notRun?: WorkflowNotRun;
  debts?: WorkflowDebt[];
  seamRequest?: { targetTestId: string };
  seam?: { targetTestId: string; observation: string };
  testObservation?: string;
  changedFiles?: { path: string; digest: string }[];
  artifactRefs?: { path: string; digest: string }[];
  red?: { testId: string; failureKind: string };
  regressionFix?: { testId?: string; rerunRef?: string; reviewRef?: string };
  reviewResults?: WorkflowReview[];
  // The agent instance that produced the result.
  actor?: { agentInstance: string };
  gateResults?: { gateId: string; verdict: string }[];
  testFix?: { citedBefore?: unknown; citedAfter?: unknown; reviewRef?: string; rerunRef?: string };
  questions?: unknown[];
  delegation?: { status: string; attempt: number };
  measurement?: unknown;
  proposal?: WorkflowProposal;
}

export interface WorkflowInput {
  operation: string;
  request?: { text: string };
  harness?: WorkflowHarness;
  completionTarget?: string;
  stop?: boolean;
  questionId?: string;
  answer?: { optionIds?: string[]; value?: string };
  answeredBy?: string;
  expectedSequence?: number;
  payloadDigest?: string;
  // Neither is an input the core reads: each is here to be refused or ignored.
  capture?: unknown;
  authorization?: unknown;
  scope?: unknown;
  result?: WorkflowResult;
}

export interface WorkflowDebt {
  findingCode: string;
  path: string;
  cause: string;
  // `null` in a run that binds no flow.
  owningFlow: string | null;
  detectingCommand: string;
  resolvingOwner?: string;
  blockingExtent: string;
}

// The bound flow's obligations as the tree and its tests read now.
export interface WorkflowObligationFacts {
  flowId: string;
  ids: string[];
  exampleIds: string[];
  annotated: string[];
  digest: string;
}

// Where defect example seeding may write, derived from the diagnosis's first matched ID.
export interface WorkflowSeedingTargets {
  exampleFile?: string;
  contractFiles: string[];
}

export interface WorkflowFacts {
  now?: string;
  specsDir?: string;
  contractsDir?: string;
  pathExistence?: Record<string, boolean>;
  acceptanceObligationsUnmet?: boolean;
  // Whether a UI contract serves the bound flow, which a prototype stage needs.
  prototypeDecisionNeeded?: boolean;
  plans?: Record<string, { route: string; stages: PlanStages }>;
  // The business flows the story tree declares.
  flows?: string[];
  receiptValidity?: Record<string, "valid" | "stale" | "unknown">;
  fileDigests?: Record<string, string>;
  obligations?: WorkflowObligationFacts;
  records?: WorkflowRecordsAtIssue;
  seeding?: WorkflowSeedingTargets;
  completion?: WorkflowCompletionFacts;
  // What `start` fixes for the run: its minted ID and key, and the tool and policy it runs under.
  start?: Omit<WorkflowExecutionContext, "harness" | "requestDigest"> & { digestKey: string };
  // The always-required reviewers of the review profile each skill is routed to.
  reviewerRoles?: Record<string, string[]>;
  // A fail-closed cause an observer found for this operation.
  cause?: FailClosedCause;
  causeSubjects?: string[];
  // Each submitted changed path's real path relative to the project's real root, or `null` when
  // it resolves outside the root. A path the observer could not resolve is absent.
  changedRealPaths?: Record<string, string | null>;
  // The run's cumulative changed paths, observed at this write operation.
  observedChangedPaths?: string[];
  // The worktree and branch this operation runs in, and the watched digests now.
  identity?: WorkflowIdentity;
  policyNow?: WorkflowPolicyDigests;
  // Each change request row, whether it is in force, and the paths it names.
  changeRequests?: { rowId: string; inForce: boolean; paths: string[] }[];
}

// What `finish` observes: validate run in process, the offered verify report, the tool and
// policy digests, and the run's cumulative changed and uncommitted paths.
export interface WorkflowCompletionFacts {
  validate: { failOn: Severity; findings: (FindingIdentity & { severity: Severity })[] };
  verifyReport?: { runId: string; stageInstanceId: string; status: string; scope: string };
  toolVersion: string;
  cliEntryDigest: string;
  policyDigests: Record<string, string>;
  changedPaths: string[];
  uncommittedPaths: string[];
}

export type WorkflowRun = WorkflowSnapshot["run"];
