# 02 User Stories

## US Catalog

- US-0027-0001: UIX-VAL deterministic validation of UI/UX artifacts
- US-0027-0002: UIX-REV semantic review integration
- US-0027-0003: Actionable report output with rule ID and fix suggestion
- US-0027-0004: Migration support for legacy projects
- US-0027-0005: Non-UI project immunity from UIX checks
- US-0027-0006: Verify-pack integration for UIX-VAL rules
- US-0027-0007: Canonical validator registration for UIX-VAL

## US-0027-0001: UIX-VAL deterministic validation of UI/UX artifacts

- Parent: CAP-0027
- Source: discussion-20260329120000000, REQ-0027-0001, REQ-0027-0002, REQ-0027-0003, REQ-0027-0004, REQ-0027-0005, REQ-0027-0006, REQ-0027-0007, REQ-0027-0008, REQ-0027-0009, REQ-0027-0012
- Goal: validate 実行者として、UI-bearing packs の sidecar presence, strategy completeness, scoring axes, option comparison, screen contracts を deterministic に検証したい。LLM に依存せず再現可能な結果を得るため。
- Non-goals: semantic quality の自動判定（UIX-REV scope）、runtime evidence の収集
- Notes: All UIX-VAL-\* validators follow async pattern `(root, config) => Promise<Issue[]>`. Semantic rule IDs use `UIX-VAL-` prefix.

### Example Seeds

| Perspective         | Example                                                                                          | Status |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| Happy path          | UI-bearing pack with complete uiux/ sidecar -> all UIX-VAL checks pass, zero issues              | seed   |
| Negative path       | UI-bearing pack missing uiux/ sidecar -> UIX-VAL-SIDECAR-MISSING emitted                         | seed   |
| Edge / boundary     | Strategy rationale exactly 20 chars -> passes threshold; 19 chars -> UIX-VAL-STRATEGY-INCOMPLETE | seed   |
| Permission / role   | Read-only file system -> validator reads but does not write, no IO error                         | seed   |
| State transition    | Pack starts incomplete, sidecar added, re-validate -> issues resolved                            | seed   |
| Idempotency / retry | Same fixture validated 10 times -> identical issue set each run                                  | seed   |

## US-0027-0002: UIX-REV semantic review integration

- Parent: CAP-0027
- Source: discussion-20260329120000000, REQ-0027-0013, REQ-0027-0014, REQ-0027-0022
- Goal: validate 実行者として、UIX-REV プロンプトテンプレートによる strategy quality, axis overlap, trend translation, product-specificity, anchor weakness の semantic review を受けたい。人間レビュアーが見逃す構造的弱点を早期検出するため。
- Non-goals: taste judgment as hard gate, automated fix application
- Notes: UIX-REV outputs accept/refine/pivot recommendations. Prompts are independently revertable (NFR-0027-0010).

### Example Seeds

| Perspective         | Example                                                                                         | Status                              |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | Well-structured strategy -> UIX-REV returns `accept` recommendation                             | seed                                |
| Negative path       | Generic fallback strategy with no product-specificity -> UIX-REV returns `pivot` recommendation | seed                                |
| Edge / boundary     | Strategy with minor axis overlap -> UIX-REV returns `refine` with specific suggestion           | seed                                |
| Permission / role   | N/A - reviewer prompts consumed by LLM, no role distinction                                     | seed (skipped: no role distinction) |
| State transition    | Initial `pivot` -> user revises strategy -> re-review returns `accept`                          | seed                                |
| Idempotency / retry | Same prompt template applied twice -> structurally equivalent output format                     | seed                                |

## US-0027-0003: Actionable report output with rule ID and fix suggestion

- Parent: CAP-0027
- Source: discussion-20260329120000000, REQ-0027-0018
- Goal: validate 実行者として、全 validation issue に rule ID, file path, severity, description, fix suggestion が含まれるようにしたい。レポートを見ただけで修正アクションを取れるようにするため。
- Non-goals: 自動修正の実行、IDE integration
- Notes: Error messages are self-contained (NFR-0027-0006). Schema assertion on report JSON output.

### Example Seeds

| Perspective         | Example                                                                                       | Status                              |
| ------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | Issue with all 5 fields (rule ID, file path, severity, description, fix suggestion) present   | seed                                |
| Negative path       | Validator emits issue missing fix suggestion -> schema validation catches incomplete issue    | seed                                |
| Edge / boundary     | File path with special characters (spaces, unicode) -> correctly escaped in report            | seed                                |
| Permission / role   | N/A - report output is read-only artifact                                                     | seed (skipped: no role distinction) |
| State transition    | First run has errors, user fixes, re-run -> previously reported issues absent from new report | seed                                |
| Idempotency / retry | Same input validated twice -> identical report output                                         | seed                                |

## US-0027-0004: Migration support for legacy projects

- Parent: CAP-0027
- Source: discussion-20260329120000000, REQ-0027-0016, REQ-0027-0020, REQ-0027-0021
- Goal: レガシープロジェクト管理者として、missing uiux/ sidecar の検出と step-by-step migration guidance を受けたい。既存プロジェクトの v1.7.4 対応をスムーズに行うため。
- Non-goals: 自動 migration 実行、breaking change による強制移行
- Notes: Migration checks default to warning severity. Config key `uiux.migration.strict: true` escalates to error. 3-phase ratchet: Phase 1 (warning-only, 30 days), Phase 2 (strict opt-in), Phase 3 (strict default).

### Example Seeds

| Perspective         | Example                                                                                 | Status |
| ------------------- | --------------------------------------------------------------------------------------- | ------ |
| Happy path          | Legacy project with missing uiux/ -> warning with step-by-step migration guide          | seed   |
| Negative path       | Legacy project with `uiux.migration.strict: true` and missing uiux/ -> error severity   | seed   |
| Edge / boundary     | Project with stale sidecar (outdated template version) -> warning with upgrade guidance | seed   |
| Permission / role   | CI/CD pipeline with strict config -> migration errors block pipeline                    | seed   |
| State transition    | Phase 1 (warning) -> Phase 2 (strict opt-in) -> Phase 3 (strict default)                | seed   |
| Idempotency / retry | Same legacy project validated twice -> identical migration guidance output              | seed   |

## US-0027-0005: Non-UI project immunity from UIX checks

- Parent: CAP-0027
- Source: discussion-20260329120000000, REQ-0027-0017
- Goal: 非 UI プロジェクト管理者として、UIX-VAL/UIX-REV チェックが完全にスキップされ zero issues であることを保証したい。false positive によるノイズを排除するため。
- Non-goals: non-UI プロジェクトに対する UI 検出の manual override
- Notes: Non-UI detection uses the shared UI-bearing detection function (REQ-0027-0002). Zero issues means empty array, not suppressed issues.

### Example Seeds

| Perspective         | Example                                                                                  | Status                              |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | CLI tool project (no UI signals) -> zero UIX-VAL/UIX-REV issues                          | seed                                |
| Negative path       | Project with HTML in code fences only -> correctly classified as non-UI, zero issues     | seed                                |
| Edge / boundary     | API-only project with OpenAPI spec containing HTML descriptions -> non-UI classification | seed                                |
| Permission / role   | N/A - detection is automatic, no role distinction                                        | seed (skipped: no role distinction) |
| State transition    | Project adds UI component -> re-validate detects UI-bearing, UIX checks activate         | seed                                |
| Idempotency / retry | Same non-UI project validated twice -> zero issues both times                            | seed                                |

## US-0027-0006: Verify-pack integration for UIX-VAL rules

- Parent: CAP-0027
- Source: discussion-20260329120000000, REQ-0027-0015, REQ-0027-0019, REQ-0027-0023
- Goal: QFAI メンテナーとして、verify-pack tests が UIX-VAL ルールの pass/fail を end-to-end で検証するようにしたい。リグレッションを防止し validator 品質を保証するため。
- Non-goals: verify-pack による UIX-REV prompt quality の自動テスト
- Notes: Each UIX-VAL rule has dedicated pass and fail fixtures. CHANGELOG test count correction (25->26) included per REQ-0027-0023.

### Example Seeds

| Perspective         | Example                                                                          | Status                              |
| ------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | Pass fixture with complete sidecar -> UIX-VAL-SIDECAR-MISSING not emitted        | seed                                |
| Negative path       | Fail fixture with missing sidecar -> UIX-VAL-SIDECAR-MISSING emitted             | seed                                |
| Edge / boundary     | Fixture with borderline content (exactly 20-char rationale) -> pass, not fail    | seed                                |
| Permission / role   | N/A - verify-pack is internal test infrastructure                                | seed (skipped: no role distinction) |
| State transition    | New UIX-VAL rule added -> corresponding pass/fail fixtures required before merge | seed                                |
| Idempotency / retry | verify-pack run twice -> identical results                                       | seed                                |

## US-0027-0007: Canonical validator registration for UIX-VAL

- Parent: CAP-0027
- Source: REQ-0010, REQ-0011, DR-0101
- Goal: QFAI メンテナーとして、全 UIX-VAL バリデータが canonical entrypoint `runCanonicalUixValidators()` を通じて登録・実行されるようにしたい。validator truth-path を一本化し、旧アグリゲータとの二重実行を排除するため。
- Non-goals: 旧アグリゲータの即時削除（DR-0101 により互換ラッパーとして維持）
- Notes: v1.7.11 Workstream F: Validator Truth-Path。全 UIX-VAL-\* バリデータは canonical registration API を通じて登録する。

### Example Seeds

| Perspective         | Example                                                                                   | Status                              |
| ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | All UIX-VAL validators registered via canonical entrypoint -> validate runs all correctly | seed                                |
| Negative path       | Validator registered via old aggregator only -> deprecation warning emitted               | seed                                |
| Edge / boundary     | Zero UIX-VAL validators registered -> canonical entrypoint returns empty Issue[]          | seed                                |
| Permission / role   | N/A - registration is internal API                                                        | seed (skipped: no role distinction) |
| State transition    | Migration from old aggregator -> canonical registration -> old aggregator becomes wrapper | seed                                |
| Idempotency / retry | Same validators registered twice -> no duplicate execution, identical results             | seed                                |
