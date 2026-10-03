// How an extraction becomes a route: one route when the request reads one way, and the candidate
// routes when a low-confidence request reads two or three ways.

import { decideRoute, reachedFirst, type RouteChoice } from "./decisionRules.js";
import type { RoutingReading, WorkflowExtraction } from "./extraction.js";
import { defaultModifiersOf, type WorkflowModifier } from "./modifiers.js";
import { loadPackagePlan, type PlanRefusal } from "./plans.js";
import { WORKFLOW_ROUTES, type WorkflowRoute } from "./routes.js";

export interface RouteDefaults {
  // A route's default modifiers, as its plan declares them. Rule 15 reads them.
  defaultsOf: (route: WorkflowRoute) => WorkflowModifier[];
  // Why each plan the rules consulted does not load. A plan nobody consulted is not reported.
  refusals: PlanRefusal[];
}

export async function routeDefaults(): Promise<RouteDefaults> {
  const loads = new Map(
    await Promise.all(
      WORKFLOW_ROUTES.map(async (route) => [route, await loadPackagePlan(route)] as const),
    ),
  );
  const refusals: PlanRefusal[] = [];
  const defaultsOf = (route: WorkflowRoute): WorkflowModifier[] => {
    const load = loads.get(route);
    if (load?.ok) return defaultModifiersOf(load.plan.defaultModifiers);
    refusals.push(...(load?.refusals ?? []));
    return [];
  };
  return { defaultsOf, refusals };
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
// candidates, one when every reading reaches the same route; any other takes the main reading's
// route.
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
  if (extraction.confidence !== "low") return { taken: main };
  return { candidates: [main, ...others].sort(reachedFirst), recommended: main.route };
}
