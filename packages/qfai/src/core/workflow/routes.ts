// The routes a run can take, one built-in plan each, and how a record written under a route id
// the catalog no longer holds is read.
export const WORKFLOW_ROUTES = [
  "close-no-change",
  "answer-question",
  "request-info",
  "close-duplicate",
  "cluster-reports",
  "decide-design",
  "decompose-epic",
  "retriage-bundle",
  "repair-consistency",
  "retire-mechanism",
  "restate-records",
  "add-feature",
  "prototype-feature",
  "change-compatibility",
  "apply-settled",
  "refactor-code",
  "edit-text",
  "fix-defect",
  "improve-performance",
  "fix-vulnerability",
  "fix-intermittent",
  "fix-env-bound",
  "fix-conformance",
  "quarantine-flaky",
  "repair-test",
  "fix-red-main",
  "change-tooling",
  "bump-dependency",
  "revert-culprit",
  "write-acceptance-tests",
  "hand-off-operation",
  "backport-fix",
  "draft-release-notes",
  "verify-manually",
] as const;

export type WorkflowRoute = (typeof WORKFLOW_ROUTES)[number];

export const ROUTE_FAMILIES = [
  "close",
  "decide",
  "consistency",
  "change",
  "fix",
  "upkeep",
  "release",
] as const;

export function isWorkflowRoute(value: unknown): value is WorkflowRoute {
  return WORKFLOW_ROUTES.some((route) => route === value);
}

// Each retired route id with the route that succeeds it. `feature` had two successors, told
// apart by whether its run had a prototype stage.
const RETIRED: Record<string, (stageKinds: readonly string[]) => WorkflowRoute> = {
  direct: () => "edit-text",
  bugfix: () => "fix-defect",
  "bounded-change": () => "add-feature",
  feature: (kinds) => (kinds.includes("prototype") ? "prototype-feature" : "add-feature"),
  discovery: () => "decide-design",
};

export function isRetiredRoute(route: string | undefined): boolean {
  return route !== undefined && Object.hasOwn(RETIRED, route);
}

// The route a record shows: the successor of a retired id, and any other id as it is.
export function reportedRoute(route: string, stageKinds: readonly string[]): string {
  const successor = Object.hasOwn(RETIRED, route) ? RETIRED[route] : undefined;
  return successor ? successor(stageKinds) : route;
}
