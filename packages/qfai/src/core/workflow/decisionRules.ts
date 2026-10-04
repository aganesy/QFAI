// The decision rules that choose a route from an extraction. The core applies them in number
// order and takes the route of the first that holds, so the same extraction always gives the
// same route. Within a rule, the clauses are tried in order too.

import type { RoutingReading } from "./extraction.js";
import type { WorkflowRoute } from "./routes.js";

// A reading as the rules read it.
export type RuleInput = RoutingReading;

interface Clause {
  holds: (input: RuleInput) => boolean;
  route: WorkflowRoute | ((input: RuleInput) => WorkflowRoute);
}

interface DecisionRule {
  rule: number;
  clauses: Clause[];
}

// The route a request that no rule holds for takes, and one whose intent could not be read.
export const FALLBACK_ROUTE: WorkflowRoute = "answer-question";

// Which route a rule chose, the rule and its clause; `rule: null` is the fallback.
export interface RouteChoice {
  route: WorkflowRoute;
  rule: number | null;
  clause: number;
}

const is =
  (...intents: string[]) =>
  (input: RuleInput) =>
    input.intent !== null && intents.includes(input.intent);
const flag = (input: RuleInput, name: string) => input.entryFlags.some((each) => each === name);
const qualified = (input: RuleInput, name: string) =>
  input.qualifiers.some((each) => each === name);
const signalled = (input: RuleInput, ...names: string[]) =>
  input.signals.some((each) => names.includes(each));

// A behaviour change that asks to change the prototype goes through prototyping, settled or not.
const prototypeChange = (input: RuleInput) =>
  is("behaviour-change")(input) && qualified(input, "prototype-requested");

const envWithoutRepro = (input: RuleInput) => flag(input, "env") && !flag(input, "repro");

const rule = (number: number, ...clauses: Clause[]): DecisionRule => ({ rule: number, clauses });
const clause = (holds: Clause["holds"], route: Clause["route"]): Clause => ({ holds, route });

export const DECISION_RULES: readonly DecisionRule[] = [
  rule(1, clause(is("security"), "fix-vulnerability")),
  rule(
    2,
    clause(
      (input) => signalled(input, "approved-record-task") && !prototypeChange(input),
      "apply-settled",
    ),
  ),
  rule(
    3,
    clause(
      (input) => signalled(input, "grilling-required", "decide-by-change-request"),
      "decide-design",
    ),
  ),
  rule(
    4,
    clause((input) => signalled(input, "disabled-test", "flaky-label"), "quarantine-flaky"),
  ),
  rule(
    5,
    clause((input) => signalled(input, "backport"), "backport-fix"),
    clause((input) => signalled(input, "release-notes"), "draft-release-notes"),
    clause((input) => signalled(input, "test-plan"), "verify-manually"),
    clause((input) => signalled(input, "acceptance-bodies"), "write-acceptance-tests"),
  ),
  rule(6, clause(is("no-work", "question-hosted"), "close-no-change")),
  rule(
    7,
    clause(
      (input) => flag(input, "stale") || qualified(input, "known-duplicate"),
      "close-duplicate",
    ),
  ),
  rule(
    8,
    clause(
      (input) =>
        is("question-how")(input) ||
        (is("question-help")(input) && qualified(input, "docs-answerable")),
      "answer-question",
    ),
  ),
  rule(9, clause(is("question-why", "question-help"), "answer-question")),
  rule(
    10,
    clause((input) => flag(input, "vague"), "request-info"),
  ),
  rule(11, clause(is("epic"), "decompose-epic")),
  rule(
    12,
    clause(
      (input) =>
        is("follow-up")(input) || (flag(input, "bundle") && qualified(input, "mixed-bundle")),
      "retriage-bundle",
    ),
  ),
  rule(13, clause(is("design"), "decide-design")),
  rule(
    14,
    clause(
      (input) => (is("order")(input) && qualified(input, "human-run")) || is("release")(input),
      "hand-off-operation",
    ),
  ),
  rule(
    15,
    clause(
      (input) =>
        is("order")(input) ||
        (flag(input, "upstream") && qualified(input, "settled-design") && !prototypeChange(input)),
      "apply-settled",
    ),
  ),
  rule(
    16,
    clause(is("flaky-test"), "quarantine-flaky"),
    clause(is("test-defect"), "repair-test"),
    clause(is("dependency"), "bump-dependency"),
  ),
  rule(
    17,
    clause((input) => is("ci")(input) && qualified(input, "red-since-change"), "fix-red-main"),
    clause(is("ci"), "change-tooling"),
  ),
  rule(
    18,
    clause(
      (input) => is("unenforced")(input) && qualified(input, "check-misses"),
      "repair-consistency",
    ),
  ),
  rule(
    19,
    clause(
      (input) => is("unenforced")(input) && qualified(input, "removal-requested"),
      "retire-mechanism",
    ),
  ),
  rule(20, clause(is("surface-contradiction", "model-gap", "unenforced"), "repair-consistency")),
  rule(21, clause(is("stale-record"), "restate-records")),
  rule(
    22,
    clause((input) => is("defect-regression")(input) && !envWithoutRepro(input), "fix-defect"),
  ),
  rule(
    23,
    clause(is("defect-conformance"), "fix-conformance"),
    clause(is("performance"), "improve-performance"),
  ),
  rule(
    24,
    clause((input) => is("defect-crash")(input) && flag(input, "bot"), "cluster-reports"),
    clause(
      (input) => is("defect-crash")(input) && flag(input, "trace") && !flag(input, "cause"),
      "fix-defect",
    ),
    clause((input) => is("defect-crash")(input) && flag(input, "intermittent"), "fix-intermittent"),
  ),
  rule(
    25,
    clause(
      (input) =>
        is("defect", "defect-regression", "defect-silent", "defect-crash")(input) &&
        envWithoutRepro(input),
      "fix-env-bound",
    ),
  ),
  rule(
    26,
    clause((input) => is("defect")(input) && flag(input, "intermittent"), "fix-intermittent"),
  ),
  rule(27, clause(is("defect", "defect-silent", "defect-crash"), "fix-defect")),
  rule(
    28,
    clause(
      (input) => is("feature", "behaviour-change")(input) && flag(input, "decision"),
      "decide-design",
    ),
    clause(prototypeChange, "prototype-feature"),
    clause(is("deprecation", "behaviour-change"), "change-compatibility"),
    clause((input) => is("feature")(input) && qualified(input, "visual-open"), "prototype-feature"),
    clause(is("feature"), "add-feature"),
  ),
  rule(29, clause(is("refactor"), "refactor-code"), clause(is("docs"), "edit-text")),
];

// The first rule that holds, with the clause that held.
function firstHolding(input: RuleInput): RouteChoice | undefined {
  for (const entry of DECISION_RULES) {
    const index = entry.clauses.findIndex((each) => each.holds(input));
    const held = entry.clauses[index];
    if (!held) continue;
    const route = typeof held.route === "function" ? held.route(input) : held.route;
    return { route, rule: entry.rule, clause: index + 1 };
  }
  return undefined;
}

// The route the decision rules give a reading. A reading with no intent, or one no rule holds
// for, takes the fallback route, which changes nothing.
export function decideRoute(input: RuleInput): RouteChoice {
  const fallback = { route: FALLBACK_ROUTE, rule: null, clause: 0 };
  if (input.intent === null) return fallback;
  return firstHolding(input) ?? fallback;
}

// Which of two choices the rules reach first: by rule number, then by clause within the rule.
// The fallback comes last.
export function reachedFirst(left: RouteChoice, right: RouteChoice): number {
  const rank = (choice: RouteChoice) => choice.rule ?? Number.MAX_SAFE_INTEGER;
  return rank(left) - rank(right) || left.clause - right.clause;
}
