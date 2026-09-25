import { areaCovers, executorSkill, isAuthorOrRecommender, refusedInput } from "./common.js";
import { activeStages } from "./stages.js";
import type {
  FindingIdentity,
  Severity,
  UnmetCondition,
  WorkflowCompletionFacts,
  WorkflowDebt,
  WorkflowDecision,
  WorkflowFacts,
  WorkflowGateReceipt,
  WorkflowSnapshot,
  WorkflowUnmet,
} from "./types.js";

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
    const subject = outstandingWorkOrder?.workOrderId ?? "work-order";
    return unmetOf("work-order-outstanding", [subject], owner);
  }
  if (run.state === "awaiting_input") {
    const questionIds = (snapshot.openQuestions ?? []).map((question) => question.questionId);
    return unmetOf("run-waiting", questionIds.length > 0 ? questionIds : ["question"]);
  }
  if (run.state !== "blocked") return [];
  const halt = snapshot.halt;
  const named = halt?.cause ?? halt?.blocker;
  return unmetOf("run-waiting", [named ?? "blocked"], halt?.owner);
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
        executorSkill(stage, snapshot.diagnosis) ?? "operator",
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

function inForceChangeRequests(facts: WorkflowFacts) {
  return (facts.changeRequests ?? []).filter((changeRequest) => changeRequest.inForce);
}

// A start adjustment holds while its change request row is still in force and its path still
// has the digest it was admitted at.
function heldAdjustments(snapshot: WorkflowSnapshot, facts: WorkflowFacts): string[] {
  const inForce = inForceChangeRequests(facts).map((changeRequest) => changeRequest.rowId);
  return (snapshot.startAdjustments ?? [])
    .filter(
      (adjustment) =>
        inForce.includes(adjustment.changeRequest) &&
        facts.fileDigests?.[adjustment.path] === adjustment.digest,
    )
    .map((adjustment) => adjustment.path);
}

// The cumulative changes outside the run change boundary. Its authorized set is the plan's
// write scope, the record areas of every work order the run issued, the core's own evidence
// tree, and each start adjustment that still holds.
export function escapedPaths(
  snapshot: WorkflowSnapshot,
  changedPaths: readonly string[],
  facts: WorkflowFacts,
): string[] {
  const areas = [
    ...(snapshot.plan?.writeScope ?? []),
    ...(snapshot.issuedRecordAreas ?? []),
    ...(snapshot.outstandingWorkOrder?.recordAreas ?? []),
    `.qfai/evidence/workflow/${snapshot.run.id}`,
    ...heldAdjustments(snapshot, facts),
  ];
  return changedPaths.filter((changed) => !areas.some((area) => areaCovers(area, changed)));
}

// An example of the bound flow is processed once a test annotates it.
function scopeUnmet(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
  completion: WorkflowCompletionFacts,
) {
  const obligations = facts.obligations;
  const unprocessed =
    obligations && obligations.flowId === snapshot.flowBinding?.flowId
      ? obligations.exampleIds.filter((id) => !obligations.annotated.includes(id))
      : [];
  const escaped = escapedPaths(snapshot, completion.changedPaths, facts);
  const approval = snapshot.approval;
  const unanswered =
    (approval && !approval.authorizationId) || (snapshot.plan?.route === "feature" && !approval)
      ? [approval?.target?.slotId ?? "CREATE"]
      : [];
  return [
    ...unmetOf("obligation-unprocessed", unprocessed),
    ...unmetOf("diff-out-of-scope", escaped),
    ...unmetOf("approval-unanswered", unanswered),
  ];
}

// A debt is resolved once the finish validate, or a later accepted result of the stage kind
// that detected it, no longer reports its finding code at its path.
function debtUnmet(snapshot: WorkflowSnapshot, completion: WorkflowCompletionFacts) {
  const accepted = snapshot.acceptedStages ?? [];
  const reported = (debt: WorkflowDebt) =>
    completion.validate.findings.some(
      (finding) => finding.code === debt.findingCode && finding.file === debt.path,
    );
  const sameFinding = (debt: WorkflowDebt) => (other: WorkflowDebt) =>
    other.findingCode === debt.findingCode && other.path === debt.path;
  return accepted
    .flatMap((stage, index) => {
      const later = accepted.slice(index + 1).filter((next) => next.stageKind === stage.stageKind);
      return (stage.debts ?? []).filter(
        (debt) => !later.some((next) => !(next.debts ?? []).some(sameFinding(debt))),
      );
    })
    .filter(reported)
    .flatMap((debt) => unmetOf("debt-open", [debt.owningFlow], debt.resolvingOwner ?? "operator"));
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

// `finish`: the only operation that judges completion, against the target fixed at `start`.
export function decideFinish(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
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
  const verdict: "PASS" | "FAIL" = failing.length === 0 ? "PASS" : "FAIL";
  const receipts: WorkflowGateReceipt[] = [
    { gateId: "validate", verdict, trustLevel: "cli_observed" },
  ];
  if (unmet.length > 0 || run.state !== "ready") {
    return { verdict: { ok: true, run, unmet, ...delivery, receipts }, events: [] };
  }
  const completed = { ...run, state: "completed", sequence: run.sequence + 1 };
  const validate = { verdict, findings: failing, trustLevel: "cli_observed" as const };
  return {
    verdict: { ok: true, run: completed, target: completionTarget, unmet, ...delivery, receipts },
    events: [{ type: "validated-final-result-and-target", validate }],
  };
}
