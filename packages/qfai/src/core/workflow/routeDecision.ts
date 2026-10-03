// How routing turns an extraction into a route and the run's modifiers: one route when the
// request reads one way, and the candidate routes when it reads two ways and the choice matters.

import { decideRoute, reachedFirst, type RouteChoice } from "./decisionRules.js";
import type { RoutingReading, WorkflowExtraction } from "./extraction.js";
import {
  defaultModifiersOf,
  entriesOf,
  extractionModifiers,
  withModifiers,
  type WorkflowModifier,
  type WorkflowModifierEntry,
} from "./modifiers.js";
import type {
  WorkflowFacts,
  WorkflowPlan,
  WorkflowQuestion,
  WorkflowRouteCandidate,
} from "./types.js";

type Plans = NonNullable<WorkflowFacts["plans"]>;

// A route's default modifiers, as its plan declares them.
export function defaultsIn(plans: Plans | undefined) {
  return (route: string): WorkflowModifier[] =>
    defaultModifiersOf(plans?.[route]?.defaultModifiers);
}

export interface RoutingOutcome {
  // The distinct routes of every reading, in the order the decision rules reach them.
  candidates: RouteChoice[];
  // The route routing fixes now; absent while the candidate question decides it.
  taken?: RouteChoice;
  // The main reading's route, which the candidate question recommends.
  recommended?: string;
  modifiers: WorkflowModifierEntry[];
}

// A high-confidence request is read one way; any other with its alternatives.
function readingsOf(extraction: WorkflowExtraction): RoutingReading[] {
  if (extraction.confidence === "high") return [extraction];
  return [extraction, ...(extraction.alternatives ?? [])];
}

// The main reading's route first, then each other reading's that differs.
function choicesOf(extraction: WorkflowExtraction): RouteChoice[] {
  const choices: RouteChoice[] = [];
  for (const reading of readingsOf(extraction)) {
    const choice = decideRoute({ ...reading, artifacts: extraction.artifacts });
    if (!choices.some((each) => each.route === choice.route)) choices.push(choice);
  }
  return choices;
}

function gatesDiffer(candidates: RouteChoice[], defaultsOf: (route: string) => string[]) {
  const gates = (choice: RouteChoice) =>
    defaultsOf(choice.route)
      .filter((modifier) => modifier.startsWith("gate:"))
      .sort()
      .join(",");
  return new Set(candidates.map(gates)).size > 1;
}

// The route and modifiers routing gives an extraction. A low-confidence request with two or
// more candidate routes, or a medium one whose candidates differ in their gates, is asked about;
// any other takes the main reading's route. The run carries the modifiers of every candidate, so
// it is never lighter than any of them, whichever is taken.
export function routingOutcome(
  extraction: WorkflowExtraction,
  defaultsOf: (route: string) => WorkflowModifier[],
): RoutingOutcome {
  const candidates = choicesOf(extraction);
  const [main, ...others] = candidates;
  if (!main) throw new Error("A reading always reaches a route.");
  const differ = gatesDiffer(candidates, defaultsOf);
  const ask = candidates.length > 1 && (extraction.confidence === "low" || differ);
  const own = entriesOf(
    [...extractionModifiers(extraction), ...(differ ? (["gate:user"] as const) : [])],
    "extraction",
  );
  const modifiers = withModifiers(
    withModifiers(own, entriesOf(defaultsOf(main.route), ask ? "candidate" : "default")),
    others.flatMap((each) => entriesOf(defaultsOf(each.route), "candidate")),
  );
  if (ask) {
    return { candidates: [...candidates].sort(reachedFirst), recommended: main.route, modifiers };
  }
  return { candidates, taken: main, modifiers };
}

// The route and modifiers routing gives a re-route: the destination the branch point fixed, which
// the decision rules do not choose again, with the extraction's modifiers and the destination's
// defaults.
export function reroutedOutcome(
  extraction: WorkflowExtraction,
  taken: RouteChoice,
  defaultsOf: (route: string) => WorkflowModifier[],
): RoutingOutcome {
  const modifiers = withModifiers(
    entriesOf(extractionModifiers(extraction), "extraction"),
    entriesOf(defaultsOf(taken.route), "default"),
  );
  return { candidates: [taken], taken, modifiers };
}

const FAMILY_LABELS: Record<string, string> = {
  close: "Close the request without a change",
  decide: "Settle the decision before any change",
  consistency: "Make the declared surfaces agree",
  change: "Change the product's behaviour",
  fix: "Fix the defect",
  upkeep: "Repair tests, CI or dependencies",
  release: "Prepare the release or the operation",
};

function stagesOf(plan: WorkflowPlan): string {
  return plan.stages.map((stage) => stage.stageInstanceId).join(", ");
}

// One single-select question naming each candidate route by what it does, in the order the
// decision rules reach them, with the main reading's route recommended. A harness that may put
// no question answers it with the first option. An option's ID is the route it takes.
export function candidateQuestion(
  questionId: string,
  candidates: readonly WorkflowRouteCandidate[],
  familyOf: (route: string) => string | undefined,
  recommended: string | undefined,
): WorkflowQuestion {
  return {
    questionId,
    kind: "decision",
    purpose: "route",
    text: "The request can be read more than one way. Which should the run do?",
    options: candidates.map((candidate) => ({
      optionId: candidate.route,
      label: FAMILY_LABELS[familyOf(candidate.route) ?? ""] ?? "Run this plan",
      description: `Runs the stages ${stagesOf(candidate.plan)}.`,
      effect: "proceed",
    })),
    selection: { min: 1, max: 1 },
    ...(recommended ? { recommendation: recommended } : {}),
  };
}

// The one question confirming the plan that `gate:user` opens at routing.
export function planQuestion(questionId: string, plan: WorkflowPlan): WorkflowQuestion {
  return {
    questionId,
    kind: "decision",
    purpose: "plan",
    text: `Run this plan for: ${plan.goal}`,
    options: [
      {
        optionId: "proceed",
        label: "Run the plan",
        description: `The run goes through the stages ${stagesOf(plan)}.`,
        effect: "proceed",
      },
      {
        optionId: "stop",
        label: "Stop",
        description: "The run ends and changes nothing.",
        effect: "stop",
      },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "proceed",
  };
}

// The one question a re-route past the cap puts: the destination named by what it does and the
// stages it runs.
export function rerouteQuestion(
  questionId: string,
  family: string | undefined,
  stages: readonly string[],
): WorkflowQuestion {
  const label = FAMILY_LABELS[family ?? ""] ?? "Run another plan";
  return {
    questionId,
    kind: "decision",
    purpose: "reroute",
    text: `The run has changed its plan twice already. Change it again to: ${label}?`,
    options: [
      {
        optionId: "proceed",
        label,
        description: `The run goes through the stages ${stages.join(", ")}.`,
        effect: "proceed",
      },
      {
        optionId: "stop",
        label: "Stop",
        description: "The run ends here.",
        effect: "stop",
      },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "proceed",
  };
}

// The release question `gate:release` puts at the route's release point.
export function releaseQuestion(questionId: string, goal: string): WorkflowQuestion {
  return {
    questionId,
    kind: "decision",
    purpose: "release",
    text: `Approve the release of: ${goal}. Approving pushes, merges and publishes nothing.`,
    options: [
      {
        optionId: "approve",
        label: "Approve the release",
        description: "The run records who approved it and goes on.",
        effect: "proceed",
      },
      {
        optionId: "stop",
        label: "Do not release",
        description: "The run ends without the release.",
        effect: "stop",
      },
    ],
    selection: { min: 1, max: 1 },
  };
}
