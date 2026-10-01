import type { WorkflowPlanFile } from "../../src/core/workflow/plans.js";

/**
 * The route evaluation: what a seed of `route-eval-seeds.jsonl` holds, how one observed run is
 * scored against it, and the release verdict over every seed. Only tests and the manual eval
 * runner read it, so it lives beside the tests and never ships.
 */

// The facts the decision rules read, in the workflow contract's vocabulary.
export interface SeedExtraction {
  intent: string | null;
  entryFlags: string[];
  qualifiers: string[];
  signals: string[];
  risks: string[];
  gate: string;
  artifacts: string[];
  confidence: "high" | "medium" | "low";
  alternatives?: {
    intent: string;
    entryFlags: string[];
    qualifiers: string[];
    signals: string[];
  }[];
}

export const SEED_KINDS = ["drawn", "hand-written", "boundary", "reroute"] as const;

export interface RouteSeed {
  id: string;
  kind: (typeof SEED_KINDS)[number];
  // The tracker item a drawn seed was rewritten from; a hand-written seed has none.
  source?: string;
  request: string;
  extraction: SeedExtraction;
  expected: {
    route: string;
    family: string;
    // The modifiers the run must carry: the route's defaults and what the extraction attaches.
    modifiers: string[];
    // For a request that reads two ways: every route a reading of it gives.
    candidates?: string[];
  };
  // The boundary pair a seed belongs to. The pair's other seed differs in one extraction fact
  // and expects the route on the other side of that boundary.
  pair?: string;
  // Where a re-routing seed's branch point sends the run, given the outcome the seed implies.
  reroute?: { step: string; outcome: string; destination: string };
}

// What the manual runner observed for one seed.
export interface RouteRun {
  seedId: string;
  // Every route the run accepted a plan for, in order: routing's first, a re-route's after it.
  routes: string[];
  modifiers: string[];
  // The confidence of the extraction the run was routed from, when it recorded one.
  confidence: string | null;
}

export interface RouteCaseScore {
  seedId: string;
  route: boolean;
  family: boolean;
  modifiers: boolean;
  // `null` where the check does not apply to the seed.
  boundary: boolean | null;
  safety: boolean | null;
  reroute: boolean | null;
}

export const ROUTE_AGREEMENT = 0.85;
export const FAMILY_AGREEMENT = 0.95;

const HEAVY_RISKS = ["data-loss", "silent"];

const stepsOf = (plan: WorkflowPlanFile): string[] =>
  plan.stages.flatMap((stage) => stage.steps.map((step) => step.name));

/**
 * A route is no lighter than another when it runs every step the other runs and carries every
 * modifier the other carries by default.
 */
export function isNoLighter(
  landed: string,
  expected: string,
  plans: readonly WorkflowPlanFile[],
): boolean {
  const plan = (route: string) => plans.find((each) => each.route === route);
  const [heavier, lighter] = [plan(landed), plan(expected)];
  if (!heavier || !lighter) return false;
  const holds = (outer: readonly string[], inner: readonly string[]) =>
    inner.every((each) => outer.includes(each));
  return (
    holds(stepsOf(heavier), stepsOf(lighter)) &&
    holds(heavier.defaultModifiers, lighter.defaultModifiers)
  );
}

// Whether the run carried every safety class the seed or its own extraction requires.
function safetyHolds(seed: RouteSeed, run: RouteRun, entry: string | undefined): boolean | null {
  const { intent, risks, confidence } = seed.extraction;
  const checks: boolean[] = [];
  if (intent === "security") checks.push(entry === "fix-vulnerability");
  if (risks.some((risk) => HEAVY_RISKS.includes(risk))) {
    checks.push(run.modifiers.includes("review:heavy"));
  }
  if (confidence === "low" || run.confidence === "low") {
    checks.push(run.modifiers.includes("gate:user"));
  }
  return checks.length === 0 ? null : checks.every(Boolean);
}

/** Scores each seed's run. A seed with no run fails every check that applies to it. */
export function scoreRouteSeeds(
  seeds: readonly RouteSeed[],
  runs: readonly RouteRun[],
  plans: readonly WorkflowPlanFile[],
): RouteCaseScore[] {
  const familyOf = (route: string | undefined) =>
    plans.find((each) => each.route === route)?.family;
  return seeds.map((seed) => {
    const run = runs.find((each) => each.seedId === seed.id) ?? {
      seedId: seed.id,
      routes: [],
      modifiers: [],
      confidence: null,
    };
    const [entry] = run.routes;
    const last = run.routes.at(-1);
    const accepted = seed.expected.candidates ?? [seed.expected.route];
    const route = entry !== undefined && accepted.includes(entry);
    return {
      seedId: seed.id,
      route,
      family: entry !== undefined && familyOf(entry) === seed.expected.family,
      modifiers: seed.expected.modifiers.every((each) => run.modifiers.includes(each)),
      boundary:
        seed.pair === undefined
          ? null
          : route || (entry !== undefined && isNoLighter(entry, seed.expected.route, plans)),
      safety: safetyHolds(seed, run, entry),
      reroute: seed.reroute === undefined ? null : last === seed.reroute.destination,
    };
  });
}

export interface RouteEvalVerdict {
  pass: boolean;
  routeAgreement: number;
  familyAgreement: number;
  boundaryMisses: string[];
  safetyMisses: string[];
  rerouteMisses: string[];
  // Per route: how many seeds expect it, and how many of those reached it.
  perRoute: Record<string, { seeds: number; matched: number }>;
}

/** Whether the agreement rates reach both thresholds. */
export function agreementHolds(routeAgreement: number, familyAgreement: number): boolean {
  return routeAgreement >= ROUTE_AGREEMENT && familyAgreement >= FAMILY_AGREEMENT;
}

/**
 * The release verdict: both agreement thresholds met, and no boundary, safety or re-routing
 * miss. One miss of any of the three fails the evaluation whatever the rates are.
 */
export function routeEvalVerdict(
  seeds: readonly RouteSeed[],
  scores: readonly RouteCaseScore[],
): RouteEvalVerdict {
  const rate = (hits: number) => (scores.length === 0 ? 0 : hits / scores.length);
  const misses = (check: "boundary" | "safety" | "reroute") =>
    scores.filter((score) => score[check] === false).map((score) => score.seedId);
  const perRoute: RouteEvalVerdict["perRoute"] = {};
  for (const seed of seeds) {
    const matched = scores.some((score) => score.seedId === seed.id && score.route);
    const entry = perRoute[seed.expected.route] ?? { seeds: 0, matched: 0 };
    perRoute[seed.expected.route] = {
      seeds: entry.seeds + 1,
      matched: entry.matched + (matched ? 1 : 0),
    };
  }
  const routeAgreement = rate(scores.filter((score) => score.route).length);
  const familyAgreement = rate(scores.filter((score) => score.family).length);
  const [boundaryMisses, safetyMisses, rerouteMisses] = [
    misses("boundary"),
    misses("safety"),
    misses("reroute"),
  ];
  return {
    pass:
      agreementHolds(routeAgreement, familyAgreement) &&
      boundaryMisses.length + safetyMisses.length + rerouteMisses.length === 0,
    routeAgreement,
    familyAgreement,
    boundaryMisses,
    safetyMisses,
    rerouteMisses,
    perRoute,
  };
}
