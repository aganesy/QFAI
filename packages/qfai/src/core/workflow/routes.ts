// The routes of the catalog, one built-in plan each.
export const WORKFLOW_ROUTES = [
  "close-no-change",
  "answer-question",
  "answer-in-session",
  "request-info",
  "close-duplicate",
  "cluster-reports",
  "decide-design",
  "decompose-epic",
  "retriage-bundle",
  "repair-consistency",
  "retire-mechanism",
  "restate-records",
  "resolve-conflicts",
  "add-feature",
  "prototype-feature",
  "change-compatibility",
  "retire-feature",
  "rename-concept",
  "apply-settled",
  "apply-settled-prototype",
  "run-owned-cleanup",
  "run-operation",
  "refactor-code",
  "write-procedure",
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
  "run-release",
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
