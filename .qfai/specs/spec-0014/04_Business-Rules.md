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

## BR-0014-0013: Removed Compatibility Surface

- AC-Refs: AC-0014-0013

- Package surface から `validators/legacy/` namespace を除去し、production path は canonical exports のみを利用する。
- IssueCategory は `"canonical" | "change"` のみとし、`"compatibility"` は再導入しない。
- 互換性判定は hidden shim ではなく canonical validators が返す migration errors で扱う。

## BR-0014-0014: Canonical Validator Set in Verify

- AC-Refs: AC-0014-0012

- verify が使用する runCanonicalUixValidators() は canonical.ts 経由で 12 validator functions を実行する（classification, foundation, taste, trend, threeLayerModel, forbiddenLegacyFiles, threeLayerFamilyCompleteness, scoringReady, strategy, screenContract, comparisonValidator, oqClosure）。
- verify 固有の制約: --phase refinement は local-only、CI は default/full のみ
- UIX-REV semantic reviewers は runCanonicalUixValidators() とは別に、verify skill 内で実行される

## BR-0014-0015: Stale Sidecar Migration Errors

- AC-Refs: AC-0014-0014

- Legacy `uiux/10_strategy.md` は `UIX-VAL-STRATEGY-LEGACY-FILENAME` で fail し、canonical filename への rename guidance を返す。
- Legacy 4-axis evaluation content や forbidden legacy files は `UIX-VAL-3LAYER-*` で fail し、3-layer canonical family への移行を要求する。
- warning-only compatibility window を前提にせず、stale artifacts は canonical validator family で明示的に拒否する。
