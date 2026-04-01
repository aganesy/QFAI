# 04 Business Rules

## BR-0014-0001: Full-Scan Mandatory

- AC-Refs: AC-0014-0001

- `/qfai-verify` MUST always run full-scan verification.
- Do NOT use Preflight Diff or diff-only shortcuts (DR-0007 intent preserved).

## BR-0014-0002: Gate Execution Order

- AC-Refs: AC-0014-0002

- Repository gates run in stable order: format -> lint -> typecheck -> tests -> build/package.

## BR-0014-0003: Error Waiver Prohibition

- AC-Refs: AC-0014-0003

- Waivers are only for `warning` / `info` findings.
- Error-level waivers MUST be treated as failures and the root cause fixed.

## BR-0014-0004: CI Validation Mode

- AC-Refs: AC-0014-0004

- CI MUST run default/full validation: `qfai validate --fail-on error`.
- `--phase refinement` is local-only and MUST NOT be used in CI.

## BR-0014-0005: Completion Separation

- AC-Refs: AC-0014-0005

- Gate execution (devops-ci-engineer) and completion approval (completion-reviewer) MUST be separate.
- qa-gatekeeper MUST confirm gate coverage before approval.

## BR-0014-0006: UIX-VAL Async Pattern

- AC-Refs: AC-0014-0006

- All UIX-VAL validators follow `(root, config) => Promise<Issue[]>` pattern.
- Each issue includes: rule ID, severity, file path, description, fix suggestion.
