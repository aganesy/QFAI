// The routes of the catalog, one built-in plan each.
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
  "apply-settled-prototype",
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
