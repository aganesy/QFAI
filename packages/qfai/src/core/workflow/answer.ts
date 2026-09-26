import { createHmac } from "node:crypto";

import { refusedInput, refusedWith } from "./common.js";
import { carriedAuthorization, type QuestionEffect } from "./parse.js";
import type {
  WorkflowAuthorization,
  WorkflowDecision,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowInput,
  WorkflowQuestion,
  WorkflowRun,
  WorkflowSettled,
  WorkflowSnapshot,
} from "./types.js";

// Strongest first: the answer takes the strongest effect among the options chosen.
const EFFECT_STRENGTH: QuestionEffect[] = ["stop", "replan", "proceed"];

const STATE_AFTER_EFFECT: Record<QuestionEffect, string> = {
  proceed: "ready",
  replan: "routing",
  stop: "cancelled",
};

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

// A value is kept only as a digest under the run's key, so the tracked record cannot be
// matched against a guess.
export function keyedDigest(text: string, key: string | undefined) {
  if (!key || !/^[a-f0-9]{64}$/.test(key)) return undefined;
  return createHmac("sha256", Buffer.from(key, "hex")).update(text).digest("hex");
}

function valueDigestOf(value: string | undefined, key: string | undefined) {
  const normalized = value?.normalize("NFC").trim();
  return normalized ? keyedDigest(normalized, key) : undefined;
}

function answerEvents(
  authorization: WorkflowAuthorization,
  settled: WorkflowSettled | undefined,
): WorkflowEvent[] {
  const events: WorkflowEvent[] = [
    { type: "authorization-recorded", authorization, ...(settled ? { settled } : {}) },
  ];
  if (authorization.effect === "proceed") events.push({ type: "valid-answer-no-replan" });
  if (authorization.effect === "replan") events.push({ type: "answer-changes-scope" });
  if (authorization.effect === "stop") events.push({ type: "authorized-stop" });
  return events;
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
export function replayedAnswer(
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

// The run's settled facts with this answer added: the labels chosen, or the value given.
function settledWith(
  snapshot: WorkflowSnapshot,
  question: WorkflowQuestion,
  input: WorkflowInput,
): WorkflowSettled | undefined {
  const settled = snapshot.settled;
  if (!settled) return undefined;
  const optionIds = input.answer?.optionIds ?? [];
  const chosen =
    question.kind === "fact"
      ? (input.answer?.value ?? "").normalize("NFC").trim()
      : question.options
          .filter((option) => optionIds.includes(option.optionId))
          .map((option) => option.label);
  const answer = { questionId: question.questionId, text: question.text, chosen };
  return { ...settled, answers: [...settled.answers, answer] };
}

function answerIsIncomplete(
  snapshot: WorkflowSnapshot,
  question: WorkflowQuestion,
  input: WorkflowInput,
  facts: WorkflowFacts,
): boolean {
  const { run, scopeDigest } = snapshot;
  return (
    input.expectedSequence !== run.sequence ||
    !input.answeredBy?.trim() ||
    scopeDigest === undefined ||
    !/^[a-f0-9]{64}$/.test(scopeDigest) ||
    !facts.now ||
    !Number.isFinite(Date.parse(facts.now)) ||
    new Date(facts.now).toISOString() !== facts.now ||
    (question.kind === "create" && !question.story?.slotId)
  );
}

// The `human_decision` an answer records: the question as put, the answer and who gave it,
// and the slot or change it authorizes.
function authorizationOf(
  snapshot: WorkflowSnapshot,
  question: WorkflowQuestion,
  answered: Pick<WorkflowAuthorization, "answer" | "effect">,
  answeredBy: string,
  now: string,
): WorkflowAuthorization {
  const { run } = snapshot;
  const story = question.story;
  const operation = story ? "CREATE" : question.changeRequest ? "CHANGE_REQUEST" : null;
  const target: WorkflowAuthorization["target"] = story
    ? {
        kind: "new_story",
        slotId: story.slotId,
        story: {
          goal: story.goal,
          covers: story.covers,
          excludes: story.excludes,
          flowId: story.flowId,
        },
      }
    : undefined;
  return {
    authorizationId: `authorization-${run.sequence + 1}`,
    runId: run.id,
    kind: "human_decision",
    capture: "agent_captured",
    scopeDigest: snapshot.scopeDigest ?? "",
    recordedAt: now,
    questionId: question.questionId,
    question: {
      text: question.text,
      options: question.options,
      ...(question.selection ? { selection: question.selection } : {}),
    },
    ...answered,
    answeredBy,
    operation,
    ...(target ? { target } : {}),
  };
}

function noOpenQuestion(run: WorkflowRun): WorkflowDecision {
  const message = "No question is waiting for this answer. Read the run's status first.";
  return { verdict: { ok: false, run, error: { code: "no-open-question", message } }, events: [] };
}

// `decision` with an answer: the open question it names is answered, recorded as a
// `human_decision`, and the run moves by the answer's effect.
export function decideAnswer(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run } = snapshot;
  const kind = carriedAuthorization({ authorization: input.authorization }).filter(
    (refusal) => refusal.reason === "authorization-kind",
  );
  if (kind.length > 0) return refusedWith(run, kind);
  const question = snapshot.openQuestions?.find((open) => open.questionId === input.questionId);
  if (!question) return noOpenQuestion(run);
  const answered = answerOf(question, input, snapshot.digestKey);
  if (answered === "option") return refusedWith(run, [{ reason: "option", subject: "answer" }]);
  if (!answered || !facts.now || answerIsIncomplete(snapshot, question, input, facts)) {
    return refusedInput(run, "The answer is not ready.");
  }
  const authorization = authorizationOf(
    snapshot,
    question,
    answered,
    input.answeredBy ?? "",
    facts.now,
  );
  const events = answerEvents(authorization, settledWith(snapshot, question, input));
  const state = STATE_AFTER_EFFECT[answered.effect];
  return {
    verdict: { ok: true, run: { ...run, state, sequence: run.sequence + events.length } },
    events,
  };
}

// A stop needs no open question and no sequence: it cancels any run that has not ended.
export function decideStop(run: WorkflowRun, input: WorkflowInput): WorkflowDecision {
  if (!input.answeredBy?.trim()) return refusedInput(run, "The stop is not ready.");
  return {
    verdict: { ok: true, run: { ...run, state: "cancelled", sequence: run.sequence + 1 } },
    events: [{ type: "authorized-stop" }],
  };
}
