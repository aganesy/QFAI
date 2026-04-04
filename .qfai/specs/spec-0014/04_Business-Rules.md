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

## BR-0014-0007: Evidence States Must Be Truthful

- AC-Refs: AC-0014-0009

- Evidence state MUST be one of the canonical states: `captured`, `skipped`, `failed`, `missing`, `not-applicable`.
- Placeholder text (e.g., "TODO", "N/A placeholder", "TBD", "paste output here") in evidence bodies MUST be rejected as invalid.
- If evidence cannot be captured, the state MUST reflect the actual reason (skipped/failed/missing/not-applicable), not a fabricated "captured" with empty body.

## BR-0014-0008: Browser QA Findings Not Always Empty

- AC-Refs: AC-0014-0010, AC-0014-0011

- Browser QA runner MUST execute actual checks against the target — not a stub returning hard-coded empty findings.
- If no findings are detected, the result MUST include execution metadata (runner version, timestamp, target URL/surface) alongside "0 findings".
- A response with 0 findings AND no execution metadata triggers a warning for potential runner malfunction.

## BR-0014-0009: Canonical Validator Family

- AC-Refs: AC-0014-0011

- The verify workflow MUST enforce the 3-layer evaluation model (D-001) as the canonical validator family.
- Only validators registered in the canonical set are executed; unregistered validators MUST be rejected with an error.
- The canonical set is defined by the project configuration and MUST NOT be overridden at runtime without explicit waiver.

## BR-0014-0013: Phase1 Ratchet in Verify Context

- AC-Refs: AC-0014-0012

- verify 経由で qfai validate が実行される際、config.uiux.phase1ReleaseDate が設定されている場合は applyPhase1Ratchet() が適用される
- リリース日から 30 日以内: 全 UIX-VAL-* エラーが warning に降格
- 30 日超過: ratchet 期限切れ、UIX-VAL-* はそのまま error
- verify は常に full-scan であるため、ratchet は全 UIX-VAL issues に適用される

## BR-0014-0014: Canonical Validator Set in Verify

- AC-Refs: AC-0014-0012

- verify が使用する runCanonicalUixValidators() は 12 modular validators を並列実行する（canonical.ts, foundation.ts, comparisonValidator.ts, oqClosure.ts, rollout.ts, scoringReady.ts, strategy.ts, screenContract.ts, trend.ts, threeLayer.ts, tasteInterview, prototypingRecommendation.ts）
- verify 固有の制約: --phase refinement は local-only、CI は default/full のみ
- UIX-REV semantic reviewers は runCanonicalUixValidators() とは別に、verify skill 内で実行される
