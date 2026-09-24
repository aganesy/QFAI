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
    error?:
      | { code: "invalid-input"; message: string }
      | {
          code: "proposal-refused";
          message: string;
          reasons: { reason: "unknown-path"; subject: string }[];
        };
  };
  events: WorkflowEvent[];
}

interface WorkflowSnapshot {
  run: { id: string; state: string; sequence: number };
  outstandingWorkOrder?: WorkflowWorkOrder;
  openQuestions?: WorkflowQuestion[];
  scopeDigest?: string;
  plan?: {
    route: string;
    stages: {
      stageInstanceId: string;
      stageKind: string;
      skill?: string;
      operation?: string;
      when?: string;
    }[];
  };
  specBinding?: { specId: string };
  diagnosis?: { verdict: string; reproductionRef: string; matchedRowIds: string[] } | null;
  approval?: {
    authorizationId?: string;
    kind: string;
    operation: string;
    effect: string;
    target?: { kind: string; slotId: string };
  };
  acceptedStages?: { stageInstanceId: string; stageKind: string; outcome: string }[];
}

interface WorkflowInput {
  operation: string;
  questionId?: string;
  answer?: { optionIds: string[] };
  answeredBy?: string;
  expectedSequence?: number;
  result?: {
    resultId: string;
    workOrderId: string;
    stageInstanceId: string;
    attempt: number;
    expectedSequence: number;
    outcome: string;
    diagnosis?: { verdict: string; reproductionRef: string; matchedRowIds: string[] };
    proposal?: {
      requestKind: string;
      candidateRoute: string | null;
      expectedBehaviorRefs: string[];
      observedRefs: string[];
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

function activeStages(
  plan: NonNullable<WorkflowSnapshot["plan"]>,
  diagnosis: WorkflowSnapshot["diagnosis"],
  acceptanceObligationsUnmet: boolean | undefined,
): NonNullable<WorkflowSnapshot["plan"]>["stages"] {
  if (plan.route !== "bugfix" && plan.route !== "bounded-change") return plan.stages;
  return plan.stages.filter((stage) => {
    switch (stage.when) {
      case "always":
        return true;
      case "missing_test_row_needed":
        return diagnosis?.verdict === "missing-test";
      case "acceptance_obligations_unmet":
        return acceptanceObligationsUnmet === true;
      default:
        return false;
    }
  });
}

export function decide(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: {
    now?: string;
    pathExistence?: Record<string, boolean>;
    acceptanceObligationsUnmet?: boolean;
  },
): WorkflowDecision {
  const run = snapshot.run;
  const workOrder = snapshot.outstandingWorkOrder;
  const result = input.result;
  const proposal = result?.proposal;
  const capabilities = proposal?.newCapabilities;

  if (input.operation === "decision" && run.state === "awaiting_input") {
    const question = snapshot.openQuestions?.find(
      (openQuestion) => openQuestion.questionId === input.questionId,
    );
    const chosen = question?.options.find(
      (option) => option.optionId === input.answer?.optionIds[0],
    );
    if (
      input.expectedSequence !== run.sequence ||
      question?.kind !== "create" ||
      input.answer?.optionIds.length !== 1 ||
      !chosen ||
      !input.answeredBy?.trim() ||
      !/^[a-f0-9]{64}$/.test(snapshot.scopeDigest ?? "") ||
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
      scopeDigest: snapshot.scopeDigest,
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
      (isDirect
        ? plan.stages.length !== 2 ||
          plan.stages[0]?.stageKind !== "maintenance" ||
          plan.stages[0].skill !== "qfai-maintain" ||
          plan.stages[0].operation !== "non-normative-edit" ||
          plan.stages[1]?.stageKind !== "verify" ||
          plan.stages[1].skill !== "qfai-verify" ||
          plan.stages[1].operation !== "verify-full" ||
          !/^spec-\d{4}$/.test(snapshot.specBinding?.specId ?? "")
        : isBugfix
          ? plan.stages[0]?.stageKind !== "diagnose" ||
            plan.stages.at(-1)?.stageKind !== "verify" ||
            !/^spec-\d{4}$/.test(snapshot.specBinding?.specId ?? "") ||
            plan.stages.some(
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
          : isBounded
            ? plan.stages[0]?.stageKind !== "sdd_delta" ||
              plan.stages.at(-1)?.stageKind !== "verify" ||
              !/^spec-\d{4}$/.test(snapshot.specBinding?.specId ?? "") ||
              plan.stages.some(
                (stage) =>
                  !stage.skill ||
                  !stage.operation ||
                  (stage.when !== "always" && stage.when !== "acceptance_obligations_unmet"),
              )
            : plan.route !== "feature" ||
              plan.stages[0]?.stageKind !== "sdd" ||
              plan.stages.at(-1)?.stageKind !== "verify" ||
              approval?.kind !== "human_decision" ||
              approval.operation !== "CREATE" ||
              approval.effect !== "proceed" ||
              approval.target?.kind !== "new_capability" ||
              !approval.target.slotId ||
              (approval.authorizationId !== undefined &&
                !/^[A-Za-z0-9_-]{1,64}$/.test(approval.authorizationId))) ||
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

    const stage = selectedStages[acceptedStages.length];
    if (!stage) return { verdict: { ok: true, run, workOrder: null }, events: [] };

    const nextWorkOrder: WorkflowWorkOrder = {
      workOrderId: `work-order-${stage.stageInstanceId}-1`,
      stageInstanceId: stage.stageInstanceId,
      attempt: 1,
      stageKind: stage.stageKind,
    };
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
      nextWorkOrder.executor = { skill: stage.skill };
      nextWorkOrder.operation = stage.operation;
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
      nextWorkOrder.target = { kind: "new_capability", slotId };
      // SIMPLIFIED: next also accepts a ready snapshot without a persisted approval ID.
      // Lift when: ready-snapshot validation requires the authorization record.
      nextWorkOrder.authorizationRefs = approval.authorizationId
        ? [`authorizations/${approval.authorizationId}.json`]
        : [];
    }
    return {
      verdict: {
        ok: true,
        run: { ...run, state: "running", sequence: run.sequence + 2 },
        workOrder: nextWorkOrder,
      },
      events: [
        { type: "work-order-issued", workOrder: nextWorkOrder },
        { type: "dispatch-work-order" },
      ],
    };
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
      !/^[A-Za-z0-9._-]{1,64}$/.test(result.resultId) ||
      result.outcome !== "accepted" ||
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

  // SIMPLIFIED: this transition checks path references and feature capability shape.
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
    proposal?.requestKind !== "change" ||
    proposal.candidateRoute !== "feature" ||
    !Array.isArray(proposal.expectedBehaviorRefs) ||
    proposal.expectedBehaviorRefs.some((ref) => typeof ref !== "string") ||
    !Array.isArray(proposal.observedRefs) ||
    proposal.observedRefs.some((ref) => typeof ref !== "string") ||
    !proposal.requiredStages.includes("sdd") ||
    !proposal.requiredStages.includes("verify") ||
    !Array.isArray(capabilities) ||
    capabilities.length === 0 ||
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

  const references = new Set([...proposal.expectedBehaviorRefs, ...proposal.observedRefs]);
  const unknownPaths = [...references].filter(
    (ref) =>
      (Object.hasOwn(facts.pathExistence ?? {}, ref) ||
        ref.includes("/") ||
        ref.includes("\\") ||
        /^[^/\\]+\.[^./\\]+$/.test(ref) ||
        /^\.[^./\\]+$/.test(ref)) &&
      facts.pathExistence?.[ref] !== true,
  );
  if (unknownPaths.length > 0) {
    return {
      verdict: {
        ok: false,
        run,
        error: {
          code: "proposal-refused",
          message: "A referenced path was not found. Check the route proposal and submit it again.",
          reasons: unknownPaths.map((subject) => ({ reason: "unknown-path", subject })),
        },
      },
      events: [],
    };
  }

  const questions: WorkflowQuestion[] = capabilities.map((capability, index) => ({
    questionId: `question-${run.sequence + 1}-${index + 1}`,
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
    capability: {
      goal: capability.goal,
      covers: capability.covers,
      excludes: capability.excludes,
      slotId: `slot-${run.sequence + 1}-${index + 1}`,
    },
  }));

  return {
    verdict: {
      ok: true,
      run: { ...run, state: "awaiting_input", sequence: run.sequence + questions.length + 1 },
      questions,
    },
    events: [
      ...questions.map((question) => ({ type: "question-opened", question })),
      { type: "unsettled-material-input", proposal },
    ],
  };
}
