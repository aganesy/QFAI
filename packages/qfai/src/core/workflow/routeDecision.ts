// How an extraction becomes a route: one route when the request reads one way, and the candidate
// routes when a low-confidence request reads two or three ways.

import { decideRoute, reachedFirst, type RouteChoice } from "./decisionRules.js";
import type { RoutingReading, WorkflowExtraction } from "./extraction.js";
import type { WorkflowRoute } from "./routes.js";

export type RoutingOutcome =
  | { taken: RouteChoice }
  // The distinct routes of the readings, in the order the decision rules reach them, and the
  // main reading's route, which the candidate question recommends.
  | { candidates: RouteChoice[]; recommended: WorkflowRoute };

// The main reading's route first, then each other reading's that differs.
function choicesOf(readings: readonly RoutingReading[]): RouteChoice[] {
  const choices: RouteChoice[] = [];
  for (const reading of readings) {
    const choice = decideRoute(reading);
    if (!choices.some((each) => each.route === choice.route)) choices.push(choice);
  }
  return choices;
}

// A low-confidence request is always asked about: it is read with its alternatives and returns
// its distinct routes as candidates, one when every reading reaches the same route. Any other
// takes the main reading's route.
export function routingOutcome(extraction: WorkflowExtraction): RoutingOutcome {
  const readings =
    extraction.confidence === "low"
      ? [extraction, ...(extraction.alternatives ?? [])]
      : [extraction];
  const [main, ...others] = choicesOf(readings);
  if (!main) throw new Error("A reading always reaches a route.");
  if (extraction.confidence !== "low") return { taken: main };
  return { candidates: [main, ...others].sort(reachedFirst), recommended: main.route };
}
