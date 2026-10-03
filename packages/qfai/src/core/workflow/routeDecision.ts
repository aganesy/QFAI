// How an extraction becomes a route: one route when the request reads one way, and the candidate
// routes when a low-confidence request reads two or three ways.

import { decideRoute, reachedFirst, type RouteChoice } from "./decisionRules.js";
import type { RoutingReading, WorkflowExtraction } from "./extraction.js";
import { defaultModifiersOf, type WorkflowModifier } from "./modifiers.js";
import { loadBuiltInPlans } from "./plans.js";
import type { WorkflowRoute } from "./routes.js";

// A route's default modifiers, as the package's plans declare them. Rule 15 reads them.
export async function routeDefaults(): Promise<(route: WorkflowRoute) => WorkflowModifier[]> {
  const plans = new Map((await loadBuiltInPlans()).map((plan) => [plan.route, plan]));
  return (route) => defaultModifiersOf(plans.get(route)?.defaultModifiers);
}

export type RoutingOutcome =
  | { taken: RouteChoice }
  // The distinct routes of the readings, in the order the decision rules reach them, and the
  // main reading's route, which the candidate question recommends.
  | { candidates: RouteChoice[]; recommended: WorkflowRoute };

// The main reading's route first, then each other reading's that differs.
function choicesOf(
  readings: readonly RoutingReading[],
  extraction: WorkflowExtraction,
  defaultsOf: (route: WorkflowRoute) => readonly string[],
): RouteChoice[] {
  const choices: RouteChoice[] = [];
  for (const reading of readings) {
    const choice = decideRoute({ ...reading, artifacts: extraction.artifacts }, defaultsOf);
    if (!choices.some((each) => each.route === choice.route)) choices.push(choice);
  }
  return choices;
}

// A `low` extraction is read with its alternatives and returns its distinct routes as
// candidates; any other takes the main reading's route.
export function routingOutcome(
  extraction: WorkflowExtraction,
  defaultsOf: (route: WorkflowRoute) => readonly string[],
): RoutingOutcome {
  const readings =
    extraction.confidence === "low"
      ? [extraction, ...(extraction.alternatives ?? [])]
      : [extraction];
  const [main, ...others] = choicesOf(readings, extraction, defaultsOf);
  if (!main) throw new Error("A reading always reaches a route.");
  if (others.length === 0) return { taken: main };
  return { candidates: [main, ...others].sort(reachedFirst), recommended: main.route };
}
