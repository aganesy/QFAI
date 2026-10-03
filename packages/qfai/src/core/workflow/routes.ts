// The routes of the catalog, one built-in plan each.
export const WORKFLOW_ROUTES = [
  "close-no-change",
  "answer-question",
  "investigate-question",
  "request-info",
  "close-duplicate",
  "cluster-reports",
  "decide-acceptance",
  "decide-design",
  "decompose-epic",
  "retriage-bundle",
  "repair-consistency",
  "sweep-guard",
  "retire-mechanism",
  "restate-records",
  "add-feature",
  "prototype-feature",
  "change-compatibility",
  "apply-settled-spec",
  "apply-settled-build",
  "refactor-code",
  "edit-text",
  "fix-defect",
  "fix-regression",
  "improve-performance",
  "fix-vulnerability",
  "fix-crash",
  "fix-intermittent",
  "fix-env-bound",
  "fix-conformance",
  "quarantine-flaky",
  "repair-test",
  "fix-red-main",
  "change-tooling",
  "bump-dependency",
  "revert-culprit",
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
