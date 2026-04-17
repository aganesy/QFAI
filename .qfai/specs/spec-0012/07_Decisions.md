# 07 Decisions

## DR-0012-0001: CLI Command Removal

- Decision: Remove `qfai prototyping` CLI command
- Rationale: Prototyping is a skill-only workflow orchestrated by AI agents, not a standalone CLI command
- Status: Adopted
- Impact: All CLI-related code, tests, and references removed from codebase

## DR-0012-0002: Canonical Prototyping Surfaces (v1.7.14, DR-0109)

- Decision: PrototypingSurface を web/mobile/desktop/cli/mixed の 5 値に変更。-ui suffix を廃止し、"non-ui" を prototyping surface 外に分離
- Rationale: -ui suffix は冗長で、cli の追加により surface 名の統一性が低下していた。non-ui を prototyping surface 外に明示的に分離することで、discussion UI-bearing 判定と prototyping surface 列挙の混同を解消
- Status: Adopted
- Impact: 全 test fixture の surface 名更新、SKILL.md obligation matrix 更新、execution.ts error message 更新

## DR-0012-0003: Namespaced-Only Schema — legacy keys hard-reject (v1.7.14, DR-0112)

- Decision: prototyping.yaml の legacy top-level recommendation keys を hard error とする（warning QFAI-PROT-231/232 廃止）
- Rationale: v1.7.14 は current-only SSOT リリース。migration 期間を明確に終了し、legacy schema の存在自体を構造的に禁止
- Status: Adopted
- Impact: parseDiscussionFromObject() が legacy keys を検出すると recommendation: null を返却。execution/CLI/validator 全レイヤーで reject

## DR-0012-0004: Semantic Invariant SSOT (v1.7.14, DR-0113)

- Decision: recommendationSemantics.ts に validateRecommendationSemantics() を集約し、recommended_mode ∈ allowed_modes を全レイヤーで共有
- Rationale: semantic invariant の検証漏れは runtime error に直結。shared helper を SSOT とし、parser/resolver/execution/CLI/validator/preflight の全レイヤーが同一ロジックを参照
- Status: Adopted
- Impact: extractRecommendation() の返り値が { recommendation, warnings } tuple に変更。semantic-invalid は全レイヤーで reject

## DR-0012-0005: Classification Separation — discussion UI-bearing vs visual/browser evidence (v1.7.14, DR-0110)

- Decision: isUiBearingSurface() を廃止し、isDiscussionUiBearingPrototypingSurface() と requiresVisualBrowserEvidenceSurface() に分割
- Rationale: cli は discussion UI-bearing だが browser evidence は不要。単一関数で両方の関心事を判定するのは SRP 違反であり、cli パックに誤った browser QA 義務が課される
- Status: Adopted
- Impact: derivePrototypingObligations() の引数が isUiBearingSurface → needsVisualBrowserEvidence に変更

## DR-0012-0006: Independent Evaluator Panel 3-Layer Structure (v1.7.14)

- Decision: full-harness 評価に 3 層独立評価パネルを導入。L1: product-surface-reviewer（design quality）、L2: product-experience-architect（product experience）、L3: qa-gatekeeper（process audit）
- Rationale: 2 つのインシデントレポートで、generator が自己評価し品質を過大に報告する self-evaluation bias が確認された。独立した reviewer/worker を別コンテキストで起動し、改善履歴を渡さないことで構造的にバイアスを排除する
- Status: Adopted
- Impact: SKILL.md に Independent Evaluator Panel セクション追加。review-profiles.yml に full-harness プロファイル追加。agent-routing.yml に product-experience-architect を evidence phase conditional_agents に追加
- Rejected-A: 単一の reviewer による評価（multi-perspective 評価ができず、バイアスが残る）
  - DO NOT: full-harness 評価を単一エージェントで実施しない。Temptation: 1 agent で十分と思う
- Rejected-B: product-experience-architect を review-profiles.yml に登録（kind: worker のため QFAI-AGENT-010 validator が reject する）
  - DO NOT: kind: worker のエージェントを review-profiles.yml に登録しない。Temptation: evaluator panel の全員を review profile に入れたい

## DR-0012-0007: Score Scope Separation — Discussion ≠ Prototyping (v1.7.14)

- Decision: discussion 3-layer scores（design direction quality）と prototyping scoringTrace（implementation fidelity）を明確に分離し、コピーを禁止
- Rationale: インシデントレポートで、discussion aggregate scores がそのまま prototyping scoringTrace にコピーされ、実装品質の独立評価が行われなかったケースが確認された。両者は評価対象が異なる（what vs how well）
- Status: Adopted
- Impact: discussion SKILL.md に Score Scope 注記追加、aggregate テンプレートに Score Scope Limitation セクション追加、prototyping SKILL.md に scoringTrace Recording セクション追加

## DR-0012-0008: Evaluation Rigor 3-Tier Rubric (v1.7.14)

- Decision: 全評価軸に 3-tier rubric（existence_gate/quality_criteria/excellence_criteria）を義務化し、L1/L2/L1-manual の finding 分類体系を導入
- Rationale: インシデントレポートで、evaluator が要素の存在チェックなしに高スコアを付与するケースが確認された。rubric による段階的評価で、存在しない要素への高スコア付与を構造的に防止
- Status: Adopted
- Impact: SKILL.md に Evaluation Rigor Rules セクション追加

## DR-0012-0009: Minimum-of-L1-L2 Scoring Rule (v1.7.14)

- Decision: イテレーションの weightedTotal を L1（product-surface-reviewer）と L2（product-experience-architect）の最小値とする
- Rationale: 一方の evaluator が高く、他方が低い場合に平均化するとデザイン品質の重大な問題が隠蔽される。最小値により、両評価者が合意しない限り accept に至らない
- Status: Adopted
- Impact: SKILL.md scoringTrace Recording セクション、BR-0012-0025 に反映

## DR-0012-0010: converged requires iterationCount>=2 + plateauLookback>=2 (v1.7.15)

- Decision: converged 判定は iterationCount >= 2 を必須条件とし、CalibrationLoader schema で plateauLookback >= 2 を強制する
- Context: R03 non-blocking note from discussion review; single-iteration converged は evidence truthfulness を損なう
- Rationale: 最低 2 iteration がなければ plateau 判定も score progression 比較も不可能。CalibrationLoader が schema レベルで plateauLookback < 2 を reject することで runtime での矛盾を防止
- Status: Adopted
- Impact: termination.ts, calibration.ts schema, CalibrationLoader validation

## DR-0012-0011: Reviewer placeholder reject list frozen (v1.7.15)

- Decision: reviewer placeholder reject list を "qfai", "default", "auto", "system", "unknown", "" の 6 値に凍結する
- Rationale: これらの値は全て runtime が自動挿入する可能性のあるフォールバック値。リストを凍結することで reject 条件が予測可能になる
- Status: Adopted
- Impact: reviewerIdentity.ts, execution.ts CLI gate, prototypingEvidence.ts validator

## DR-0012-0012: commitSha mandatory in full-harness (v1.7.15)

- Decision: full-harness 実行時に commitSha を必須とし、取得不能時は runtime error
- Rationale: commitSha なしでは evidence の再現性が保証できない。CI/CD 環境では常に取得可能であり、取得不能は環境異常を示す
- Status: Adopted
- Impact: gitRevision.ts, execution.ts

## DR-0012-0013: packVersion from pack metadata only (v1.7.15)

- Decision: packVersion は CalibrationLoader 経由で pack metadata から動的取得。ハードコード禁止
- Rationale: packVersion のハードコードは calibration pack と runtime summary の不一致を招く。metadata からの動的取得で single-source-of-truth を維持
- Status: Adopted
- Impact: calibration.ts, execution.ts, bundleWriter.ts

## DR-0012-0014: weightedTotal = min(l1.total, l2.total) always (v1.7.15)

- Decision: computeWeightedTotal は常に Math.min(l1.total, l2.total) を返す。他の算出方式を禁止
- Rationale: DR-0012-0009 の再確認。v1.7.15 では runtime implementation で min が確実に使われることを保証する
- Status: Adopted
- Impact: panelScore.ts

## DR-0012-0015: specCoverage from real diffs only (v1.7.15)

- Decision: specCoverage は loadDeclaredSpecArtifacts() と collectObservedRuntimeArtifacts() の実差分から生成。zero-seeded 出力を禁止
- Rationale: zero-seeded specCoverage は coverage metrics を無意味にする。実測値のみが品質判断に有用
- Status: Adopted
- Impact: specCoverageBuilder.ts (新規), execution.ts

## DR-0012-0016: uiFidelity observation-only (DOM jsdom + browserQa + render evidence) (v1.7.15)

- Decision: uiFidelity は DOM parse (jsdom) / browser QA / render evidence からのみ構成。synthetic mockPaths pass を禁止
- Rationale: observation-only policy により uiFidelity が実装実態を正確に反映。synthetic 値は品質の偽装
- Status: Adopted
- Impact: uiFidelityBuilder.ts, uiObservation.ts

## DR-0012-0017: CalibrationLoader wired in execution.ts (not config.ts) (v1.7.15)

- Decision: CalibrationLoader は execution.ts で loadConfig() 後に呼び出す。config.ts への統合は行わない
- Rationale: calibration loading は execution-time concern であり、config normalization とは独立。execution.ts に配置することで full-harness path のみで calibration が必要という意図が明確になる
- Status: Adopted
- Impact: execution.ts, CalibrationLoader

## DR-0012-0018: Fail-fast no silent fallback (v1.7.15)

- Decision: 必須 evidence 欠落時は runtime error で即座に失敗。デフォルト値補完・silent fallback・graceful degradation を禁止
- Rationale: silent fallback は evidence truthfulness を破壊する。fail-fast により問題が早期に検出され、不正な evidence の生成を防止
- Status: Adopted
- Impact: execution.ts, prototypingEvidence.ts, all evidence builder modules

## DR-0012-0019: Pre-scored l1/l2 path elimination (v1.7.15 rev2, DR-0209)

- Decision: runFullHarness() request 型から l1/l2 を削除。scoring は runtime 内一元実行
- Rationale: pre-scored 値の存在が evidence-grounded でないスコアの採用経路を作る
- Status: Adopted
- Impact: types.ts, execution.ts, all callers

## DR-0012-0020: l2Evidence.ts new file (v1.7.15 rev2, DR-0210)

- Decision: l2Evidence.ts を core/prototyping/ に新設し、3 builder 関数で実 artifact から L2 入力を導出
- Rationale: execution.ts 内の L2 dummy object を構造的に排除
- Status: Adopted
- Impact: l2Evidence.ts (new), execution.ts

## DR-0012-0021: CalibrationLoader fail-open removal (v1.7.15 rev2, DR-0211)

- Decision: DEFAULT_PACK / version="1.0.0" 補完 / thresholds default 注入の全パスを削除
- Rationale: fail-closed 設計で calibration の存在と正当性を保証
- Status: Adopted
- Impact: calibrationLoader.ts, execution.ts

## DR-0012-0022: TerminationContext CalibrationPack only (v1.7.15 rev2, DR-0212)

- Decision: history.ts の termination 関数は CalibrationPack のみ受け入れ
- Rationale: pack 以外の plateauLookback 解決経路を廃止
- Status: Adopted
- Impact: history.ts

## DR-0012-0023: Screen-level UiObservation (v1.7.15 rev2, DR-0213)

- Decision: ScreenObservation 型で screen-level 保持。flatten 集約廃止
- Rationale: screen 単位の insufficient-evidence 検出を可能にする
- Status: Adopted
- Impact: uiObservation.ts, uiFidelityBuilder.ts, types.ts

## DR-0012-0024: bundleWriter schema v2 only (v1.7.15 rev2, DR-0214)

- Decision: schema v2 のみ出力。v1/v2 並存禁止
- Rationale: schema 分岐はメンテナンスコストと consumer 混乱を招く
- Status: Adopted
- Impact: bundleWriter.ts

## DR-0012-0025: DB coverage binary policy (v1.7.15 rev2, DR-0216)

- Decision: declared DB objects ありで観測なし → full-harness failure
- Rationale: missing 続行は evidence truthfulness を損なう
- Status: Adopted
- Impact: specCoverage.ts, execution.ts

## DR-0012-0026: TDD impl-first backfill for v1.7.15 rev2

- Decision: v1.7.15 rev2 の runtime 実装が先行完了しているため、TC-0012-0046..0070 の TDD エントリは exception (impl-first backfill) として登録
- Rationale: 実装は v1.7.15 rev2 SDD → ATDD → implement の流れで runtime.ts/types.ts/l2Evidence.ts 等が先行実装済み。テストは ATDD integration test として作成・PASS 済み。TDD ledger 上は exception として記録し、既存テスト結果を evidence に紐付ける
- Status: Adopted
- Impact: spec-0012/tdd/test-list.md (25 entries)

## DR-0012-0027: Parameterized Route Pattern-Based Matching (v1.7.15 rev4, OQ-0004 resolution)

- Decision: パラメタライズドルート（e.g., `/orders/:id`）のマッチングにパターンベースマッチング（Option B）を採用
- Status: Adopted
- Rationale: exact match のみでは動的ルートの Browser QA エビデンスチェーンが断裂する。canonical normalization はオーバーエンジニアリング
- Alternatives: (A) Exact match only — 動的ルート未対応 / (B) Pattern-based matching (adopted) / (C) Canonical normalization — 過度な複雑化
- Source: OQ-0004, discussion-20260414195449523
- Policy DR: DR-0222

## DR-0012-0028: 4-Layer full-harness Reject (v1.7.15 rev4)

- Decision: cli + full-harness を CLI / derivePrototypingObligations / runFullHarness / バリデータの 4 層で拒否
- Status: Adopted
- Rationale: rev2 の 3 層防御を 4 層に拡張し、バリデータ層でも早期拒否を実現
- Source: discussion-20260414195449523, WS-1
- Policy DR: DR-0217

## DR-0012-0029: Screen Contract-Based Browser QA Targets (v1.7.15 rev4)

- Decision: Browser QA ターゲットを `"/primary"` 固定値から `40_screen_contracts.md` に基づく動的導出に変更
- Status: Adopted
- Rationale: 固定値では複数画面の測定漏れが発生
- Source: discussion-20260414195449523, WS-2
- Policy DR: DR-0218

## DR-0012-0030: Browser QA Evidence Chain Hard-Fail (v1.7.15 rev4)

- Decision: `evidenceRefs.browserQa` 空時はハードフェイル（サイレントパス禁止）
- Status: Adopted
- Rationale: fail-closed ポリシー一環。エビデンスチェーン中断は監査追跡不能
- Source: discussion-20260414195449523, WS-3
- Policy DR: DR-0219

## DR-0012-0031: Canonical Route Semantics (v1.7.15 rev4)

- Decision: runtimeGate / specCoverage で canonical path 比較を採用（URL 直接使用禁止）
- Status: Adopted
- Rationale: クエリパラメータ等を含む URL の誤判定バグ排除
- Source: discussion-20260414195449523, WS-4
- Policy DR: DR-0220

## DR-0012-0032: L2 Structured Parse Priority (v1.7.15 rev4)

- Decision: L2 エビデンスで構造化パース優先、ヒューリスティック縮小
- Status: Adopted
- Rationale: ヒューリスティック依存はエビデンス精度低下
- Source: discussion-20260414195449523, WS-5
- Policy DR: DR-0221

## DR-0012-0033: prototyping.yaml Surface Field — Validator Reject Only (v1.7.15 rev5, OQ-0002 resolution)

- Decision: cli/api/backend surface を prototyping.yaml surface フィールドで宣言した場合、schema level での変更は行わず、validator reject のみで対応する
- Rationale: schema level で cli/api/backend を reject すると後方互換を壊す可能性がある。runtime での validator reject だけで十分な機能的制御が可能
- Status: Adopted (OQ-0002 resolved)
- Impact: prototypingEvidence.ts validator に surface field rejection ルール追加

## DR-0012-0034: parameterized Route Mapping — Pattern-Based Matching (v1.7.15 rev5, OQ-0004 resolution)

- Decision: Browser QA でパラメタライズドルート（/orders/:id 等）のマッチングにパターンベースマッチング（Option B）を採用
- Rationale: exact match のみでは SPA のダイナミックルートを正確にカバーできない。:param パターンをワイルドカードとして処理することで実際のSPA構造に対応
- Status: Adopted (OQ-0004 resolved)
- Impact: runtimeObservation.ts / specCoverage.ts のルートマッチングロジック

## DR-0012-0035: packResolver Error Type — PrototypingError Derived Type (v1.7.15 rev5, OQ-0006 resolution)

- Decision: packResolver.ts のエラー型を PrototypingError 派生型として定義（pack-not-found / pack-malformed を区別）
- Rationale: 既存エラー階層と整合し、error handling パターンが統一される
- Status: Adopted (OQ-0006 resolved)
- Impact: packResolver.ts エラー型設計

## DR-0012-0036: PROTOTYPING_SUPPORTED_SURFACES = [web, mobile, desktop, mixed] (v1.7.15 rev6, OQ-0001 resolution)

- Decision: `PROTOTYPING_SUPPORTED_SURFACES` = `["web", "mobile", "desktop", "mixed"]`; `mixed` is included as a legitimate cross-platform UI surface
- Rationale: `mixed` is a valid cross-platform UI surface in the QFAI surface taxonomy; excluding it without a documented technical reason would create an unintended gap in multi-surface prototyping scenarios. Option B (exclude `mixed`) was rejected because it had no supporting rationale.
- Status: Adopted (OQ-0001 resolved)
- Source: discussion-20260415161758193, OQ-0001
- Rejected-A: Exclude `mixed` from PROTOTYPING_SUPPORTED_SURFACES
  - DO NOT exclude `mixed` from the surface allowlist without a documented technical reason.
  - Temptation: `mixed` seems ambiguous; cleaner to enumerate only single-surface values.

## DR-0012-0037: surfacePolicy.ts as Standalone Standalone File (v1.7.15 rev6, OQ-0002 resolution)

- Decision: `surfacePolicy.ts` is created as a standalone file at `src/core/prototyping/surfacePolicy.ts` (not inlined into `mode.ts`)
- Rationale: `mode.ts` already owns obligations derivation logic; adding surface policy constants there would violate SRP. Independent file enables isolated unit tests and allows CLI/validator layers to import without a transitive dependency on obligations logic.
- Status: Adopted (OQ-0002 resolved)
- Source: discussion-20260415161758193, OQ-0002
- Rejected-A: Inline surface allowlist constants in `mode.ts`
  - DO NOT add `PROTOTYPING_SUPPORTED_SURFACES` to `mode.ts`.
  - Temptation: fewer files; simpler imports.

## DR-0012-0038: CalibrationLoader Resolution Failure → throw Error Immediately (v1.7.15 rev6, OQ-0003 resolution)

- Decision: `CalibrationLoader` resolution failure throws `Error` immediately with `packPath` in the message; no typed error subclass; no result-object return
- Rationale: `CalibrationLoader` is a precondition step; the harness cannot run without a resolved pack. Precondition failures in packages/qfai use throw semantics. Typed errors (Option C) are unnecessary unless callers need to distinguish CalibrationPackError; no such caller exists. Result objects (Option B) require translation in every consumer.
- Status: Adopted (OQ-0003 resolved)
- Source: discussion-20260415161758193, OQ-0003
- Rejected-A: Return typed `CalibrationPackError` subclass
  - DO NOT create a typed error subclass for CalibrationLoader failures unless callers need instanceof checks.
  - Temptation: typed errors provide better instanceof-based handling.
- Rejected-B: Return `{ error: string }` result object from CalibrationLoader
  - DO NOT return error objects from CalibrationLoader; throw is the correct pattern for precondition failures.
  - Temptation: result objects allow callers to inspect and re-wrap errors without try/catch.

## DR-0012-0039: reviewerLogs[].verdict Stores Mapped Vocabulary (v1.7.15 rev6, OQ-0004 resolution)

- Decision: `reviewerLogs[].verdict` stores the post-mapping vocabulary (`approve`, `revise`, `reject`, `abandon`); pre-mapping values are not stored
- Rationale: The validator checks `reviewerLogs[].verdict` against the mapped vocabulary. Storing original pre-mapping values would require a translation step in every consumer, increasing validator branching. The audit requirement is to see the final semantic verdict, not the raw harness signal.
- Status: Adopted (OQ-0004 resolved)
- Source: discussion-20260415161758193, OQ-0004
- Rejected-A: Store original pre-mapping vocabulary in reviewerLogs[].verdict
  - DO NOT store pre-mapping values (e.g., `accept`, `plateau-stop`) in reviewerLogs[].verdict.
  - Temptation: preserving original values maintains trace fidelity of harness signals.

## DR-0012-0040: uiContractId in Observation Schema → hard-error (v1.7.15 rev6, OQ-0005 resolution)

- Decision: Any observation record that contains a `uiContractId` field causes a hard-error in the validator; backward compatibility is abandoned
- Rationale: Backward compat is explicitly abandoned per design doc. Silently ignoring `uiContractId` would mask stale test fixtures that still use the old field, making them harder to identify. Hard-error forces immediate cleanup and surfaces the problem.
- Status: Adopted (OQ-0005 resolved)
- Source: discussion-20260415161758193, OQ-0005
- Rejected-A: Silently ignore `uiContractId` field if present in observation records
  - DO NOT silently ignore `uiContractId` in observation records.
  - Temptation: silent ignore is safe and non-breaking for existing consumers.

### DR-0012-0041: packHash Exclusion from calibrationRef (OQ-0001, rev7)

- Decision: Exclude `packHash` from `calibrationRef` in v1.7.15 rev7. `packPath + packVersion + configPath` is sufficient for audit closure.
- Context: Design doc §3-4 uses conditional phrasing "packHash（導入する場合）". The v1.7.15-07 audit does not mandate hash-level integrity. Adding packHash requires hash computation infrastructure not present.
- Rationale: Option B (defer packHash) adopted. Conditional design doc language confirms deferral is correct.
- Rejected-A: Include packHash — stronger integrity, but no audit requirement and infrastructure cost.
  - DO NOT add packHash to calibrationRef in v1.7.15. Temptation: stronger integrity guarantee.
- Source: OQ-0001, discussion-20260415203030886

### DR-0012-0042: Error Class Location — prototyping/errors.ts (OQ-0002, rev7)

- Decision: New file `packages/qfai/src/core/prototyping/errors.ts` for the 6 error classes (not core/errors.ts).
- Context: SRP: prototyping-domain errors should be co-located with prototyping modules and independently testable.
- Rationale: Option A (prototyping/errors.ts) adopted. Core errors.ts must not own domain-specific error classes.
- Rejected-B: Extend core/errors.ts — fewer files but violates SRP; couples prototyping errors to the general module.
  - DO NOT add prototyping-domain error classes to core/errors.ts. Temptation: fewer files.
- Source: OQ-0002, discussion-20260415203030886

### DR-0012-0043: configPath in calibrationRef — Optional (OQ-0003, rev7)

- Decision: `configPath?: string` (optional) in `FullHarnessRequest.calibrationRef` and validator comparison.
- Context: Design doc §3-4 states "configPath（summary に出すなら）" — conditional. Making it mandatory breaks no-overlay configurations.
- Rationale: Option A (optional) adopted. Validator compares only when configPath is present in summary.
- Rejected-B: Mandatory configPath — breaks configs that don't use a config overlay.
  - DO NOT make configPath mandatory in calibrationRef. Temptation: stricter API.
- Source: OQ-0003, discussion-20260415203030886

### DR-0012-0044: Obsolete Field Detection — normalize-time (OQ-0004, rev7)

- Decision: Detect obsolete scalar calibration fields at normalize-time in config.ts (not parse-time).
- Context: Consistent with existing config normalization flow in config.ts; no JSON schema changes required.
- Rationale: Option A (normalize-time) adopted. Aligns with codebase's existing config.ts patterns.
- Rejected-B: parse-time detection — earlier error but requires JSON schema changes; inconsistent with existing approach.
  - DO NOT implement parse-time scalar field detection for this change. Temptation: earlier error is better.
- Source: OQ-0004, discussion-20260415203030886

### DR-0012-0045: surfacePolicy Rejection Message — Generated from Constant (OQ-0005, rev7)

- Decision: Generate rejection message by joining `PROTOTYPING_SUPPORTED_SURFACES` (e.g., `.join(", ")`).
- Context: Hardcoded string was the root cause of stale "cli" entry. Generating from constant applies DRY.
- Rationale: Option B (generate from constant) adopted. Message auto-updates when constant changes; prevents stale recurrence.
- Rejected-A: Hardcode "web/mobile/desktop/mixed" — simple fix but same staleness risk recurs when constant changes.
  - DO NOT hardcode the surface list in the rejection message string. Temptation: simpler to hardcode.
- Source: OQ-0005, discussion-20260415203030886

### DR-0012-0046: pathUtils.ts as New Standalone Leaf Module (OQ-0001, rev8)

- Decision: New file `packages/qfai/src/core/prototyping/pathUtils.ts` for the 3 shared ref helpers (`toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, `isConcreteArtifactRef`). Must be a leaf module — no import from `execution.ts` or its transitive importers.
- Context: Inline implementation in `specCoverage.ts` would scatter the grammar; a shared module prevents future divergence across 5 ref sites.
- Rationale: Option A (standalone leaf module) adopted. Leaf constraint prevents circular imports that cause TypeScript to silently produce `undefined` for circularly imported values.
- Rejected-B: Inline helpers in each consumer site — no shared grammar; divergence would recur.
  - DO NOT implement ref grammar helpers inline in individual consumer modules. Temptation: fewer files.
- Source: OQ-0001, discussion-20260416023323603

### DR-0012-0047: measurement.ts Scope — Conditional Update (OQ-0002, rev8)

- Decision: Include `measurement.ts` in rev8 scope only if it uses absolute paths in ref output. Review during implementation; update to shared helpers only if needed.
- Context: Design doc §3-3 does not explicitly name `measurement.ts` as a ref-producing site. Conservative scope avoids unnecessary changes.
- Rationale: Option B (conservative scope) adopted. Only touch `measurement.ts` if ref grammar violation confirmed; avoids scope creep.
- Rejected-A: Unconditionally update `measurement.ts` — safe but unnecessarily expands PR diff.
  - DO NOT unconditionally include `measurement.ts` without confirming it uses absolute paths. Temptation: completeness.
- Source: OQ-0002, discussion-20260416023323603

### DR-0012-0048: runtimeGate.evidenceRefs Empty Array — Always Validator Error (OQ-0003, rev8)

- Decision: An empty array `runtimeGate.evidenceRefs: []` is always a validator error (fail-closed). There is no case where an empty array is valid.
- Context: Full-harness UI-only output always has at least one concrete evidence artifact. Allowing an empty array would mask builders that write the field but fail to populate it.
- Rationale: Option A (fail-closed) adopted. DR-0012-0048 confirmed: empty array = validator error, consistent with OQ-0003 resolution in discussion pack.
- Rejected-B: Allow empty array as "no refs yet" — masks silent builder failure; OQ-0003 resolution explicitly rejects this.
  - DO NOT treat empty runtimeGate.evidenceRefs as valid. Temptation: lenient for partial runs.
- Source: OQ-0003, discussion-20260416023323603

### DR-0012-0049: ui[] Row Validation Inline in prototypingEvidence.ts (OQ-0001, rev9)

- Decision: Validate runtimeGate.ui[] row fields inline inside validateRuntimeGate() in prototypingEvidence.ts (Option A adopted)
- Context: Two options existed — inline in prototypingEvidence.ts vs extract to a separate validateRuntimeGateUiRow() utility. The design doc §6-1-2 explicitly names prototypingEvidence.ts as the changed file.
- Rationale: Inline implementation keeps validation cohesive with existing runtimeGate validation. Design doc §6-1-2 specifies prototypingEvidence.ts as the changed file. If ui[] row validation grows significantly in future cycles, extraction can be revisited.
- Rejected: Extract to separate utility file (Option B) — creates an unnecessary module boundary for a small, cohesive validation addition.
  - DO NOT extract ui[] row validation to a new utility file. Temptation: small function = extract to new file.
- Source: discussion-20260416092414328 OQ-0001

### DR-0012-0050: browserQaEvidenceRefs[] Always Required Non-Empty (OQ-0002, rev9)

- Decision: browserQaEvidenceRefs[] is always required non-empty; empty array is always a validator error (Option A adopted)
- Context: Two options — always error vs allow empty when no browser QA run recorded. Design doc §3-2 is explicit on fail-closed policy; §3-3 abolishes string leniency. Rev8 OQ-0003 established the precedent.
- Rationale: Fail-closed policy (§3-2) applies uniformly to all leaf arrays. Empty evidenceRefs is always an error — same principle as runtimeGate.evidenceRefs (rev8). Partial runs that cannot populate browserQaEvidenceRefs[] must fail the builder, not cause the validator to allow leniency.
- Rejected: Allow empty if no browser QA run (Option B) — contradicts §3-2, §3-3, and rev8 precedent.
  - DO NOT allow empty browserQaEvidenceRefs[] as a valid state. Temptation: partial run means partial evidence is acceptable.
- Source: discussion-20260416092414328 OQ-0002

### DR-0012-0051: Per-Axis Validation Granularity (OQ-0003, rev9)

- Decision: Validate each axis independently; empty evidenceRefs[] on any single axis is a validator error (Option A adopted)
- Context: Two granularities — per-axis (error if any axis is empty) vs aggregate (error only if all axes are empty). Design doc §6-1-3 is explicit: "array 必須、空配列禁止、各値は concrete artifact ref" (per-element, not aggregate).
- Rationale: Per-axis validation is the correct fail-closed granularity consistent with the overall strict traceability goal. Aggregate leniency would allow a subset of axes to have empty evidence while appearing valid.
- Rejected: Aggregate leniency (Option B) — contradicts §6-1-3 per-element requirements.
  - DO NOT use aggregate validation for axes[].evidenceRefs[]. Temptation: only error if all axes fail reduces false positives.
- Source: discussion-20260416092414328 OQ-0003

### DR-0012-0052: Full README Enumeration of All Concrete-Ref Leaf Fields (OQ-0004, rev9)

- Decision: Extend README to explicitly enumerate all fields now under the concrete-ref contract, including rev9 leaf fields (Option A adopted)
- Context: Two options — full enumeration vs minimal extension note. Design doc §5-6 DoD: "docs / validator mismatch が消える" and "一部 field だけ strict という状態が説明と実装のどちらにも残らない".
- Rationale: DoD §5-6 requires the docs/validator mismatch to be fully eliminated. A minimal note would likely leave a partial mismatch. Full enumeration is the only approach that satisfies the DoD. Design doc §9 explicitly prohibits "README の表現を弱めて整合したことにする".
- Rejected: Minimal extension note (Option B) — leaves docs/validator partial-strictness mismatch unresolved.
  - DO NOT use a minimal note for README update. Temptation: minimize churn by adding only a brief note.
- Source: discussion-20260416092414328 OQ-0004

### DR-0012-0049: ui[] Row Validation Inline in prototypingEvidence.ts (OQ-0001, rev9)

- Decision: `runtimeGate.ui[]` 行レベル3フィールドの validation は `prototypingEvidence.ts` の既存 `validateRuntimeGate()` 内にインラインで実装（Option A）
- Context: design doc §6-1-2 が変更ファイルとして `prototypingEvidence.ts` を明示。小規模な凝集した validation ユニットを別ファイルに抽出してもアーキテクチャ上の利点がない。
- Rationale: Option A (inline) adopted. インラインは凝集性を保ち design doc §6-1-2 に忠実。将来的に ui[] 行 validation が大幅に成長した場合は抽出を再検討できる。
- Rejected-B: Extract `validateRuntimeGateUiRow()` to separate utility — 小規模 validation ユニットの不要な module 分割。
  - DO NOT extract small cohesive row-level validation to a separate module unless the function grows significantly. Temptation: cleaner isolation.
- Source: OQ-0001, discussion-20260416092414328

### DR-0012-0050: browserQaEvidenceRefs[] Always Required Non-Empty (OQ-0002, rev9)

- Decision: `runtimeGate.ui[].browserQaEvidenceRefs[]` は「browser QA 未実施」ケースでも常に required non-empty。空配列はハードフェイル（Option A）。
- Context: design doc §3-2 fail-closed ポリシー、§3-3「string なら通す」leniency 廃止。rev8 OQ-0003 で `runtimeGate.evidenceRefs` 空配列を拒否した precedent と一貫。
- Rationale: Option A (always required non-empty) adopted. Partial run で `browserQaEvidenceRefs[]` を埋められない場合はビルダーが失敗すべきであり、validator が空を許容すべきでない。
- Rejected-B: Allow empty when no browser QA run — design doc §3-2, §3-3 違反および rev8 OQ-0003 precedent と矛盾。
  - DO NOT allow empty browserQaEvidenceRefs[]. Temptation: lenient for partial/dev-only runs.
- Source: OQ-0002, discussion-20260416092414328

### DR-0012-0051: Per-Axis evidenceRefs[] Validation Granularity (OQ-0003, rev9)

- Decision: `fullHarness.iterations[].l1/l2.axes[].evidenceRefs[]` の validation を per-axis 粒度で実施（Option A）。任意の axis の空配列が validator error。
- Context: design doc §6-1-3 "array 必須、空配列禁止、各値は concrete artifact ref" — per-element 記述。集約レニエンシー（全 axis 空のときのみ error）を採用すると一部 axis がエビデンスなしでもパスする。
- Rationale: Option A (per-axis) adopted. Per-axis validation は package-wide fail-closed 原則と一致し、design doc §6-1-3 の literal text に従う。
- Rejected-B: Aggregate leniency (error only if all axes empty) — partial-axis 無証拠を許容し per-axis traceability contract を破壊。
  - DO NOT use aggregate leniency for axis evidenceRefs validation. Temptation: fewer errors on partial runs.
- Source: OQ-0003, discussion-20260416092414328

### DR-0012-0052: Full README Enumeration of All Concrete-Ref Leaf Fields (OQ-0004, rev9)

- Decision: `packages/qfai/README.md` に concrete-ref contract の全 leaf フィールドを明記する完全列挙アプローチを採用（Option A）
- Context: DoD §5-6「docs/validator mismatch が消える」かつ「一部 field だけ strict という状態が説明と実装のどちらにも残らない」が hard gate。design doc §9 が「README の表現を弱めて整合したことにする」を明示禁止。
- Rationale: Option A (full enumeration) adopted. Option B（最小限の注記のみ）では partial mismatch が残る可能性が高く DoD §5-6 を満たさない。
- Rejected-B: Add brief note only — DoD §5-6 違反。docs/validator partial-strictness mismatch が残存。
  - DO NOT use minimal note approach for README update. Temptation: minimize README churn.
- Source: OQ-0004, discussion-20260416092414328

## DR-0012-0053: terminationReason→finalDecision/reviewerSignoff mapping (v1.7.15 rev10, OQ-0001 resolution)

- Decision: All three terminationReason values (abandoned, max-iterations, plateau) map to finalDecision=abandoned and reviewerSignoff.status=abandoned
- Rationale: Auto-termination is always abandonment by definition. "Accepted" status requires separate human reviewer signoff that is orthogonal to the harness termination reason. Keeping a single mapping reduces validator complexity and prevents semantic confusion between termination cause and final disposition.
- Status: Adopted
- Alternatives: (A) All map to abandoned (adopted) / (B) plateau maps to accepted / (C) per-value individual mapping
- Impact: prototypingEvidence.ts validator, execution.ts state machine

## DR-0012-0054: assertConcreteArtifactRefs in pathUtils.ts (v1.7.15 rev10, OQ-0002 resolution at SDD)

- Decision: assertConcreteArtifactRefs() (plural, array-level wrapper) is added to the existing pathUtils.ts module. No new refSemantics.ts file is created.
- Rationale: pathUtils.ts was created in rev8 as the ref grammar helpers SSOT. Adding the array-level wrapper there maintains the module's cohesion and avoids proliferating small modules. The reuse-count threshold (3+ files) has not been reached for refSemantics.ts extraction.
- Status: Adopted
- Source: OQ-0002 from discussion-20260416195444737 (deferred to SDD) → resolved here
- Impact: pathUtils.ts (+1 exported function), prototypingEvidence.ts consumer

## DR-0012-0055: All 8 evidenceRefs categories use assertConcreteArtifactRefs (v1.7.15 rev10, OQ-0003 resolution)

- Decision: All 8 categories in iterations[].evidenceRefs (including runtimeGate and specCoverage) use assertConcreteArtifactRefs() from pathUtils.ts
- Rationale: WS-3 spec says "all categories" explicitly. OQ-0003 resolved at discussion: no justification for excluding runtimeGate/specCoverage. Consistency (NFR-0004) requires all categories to follow the same rule.
- Status: Adopted
- Impact: prototypingEvidence.ts validator

## DR-0012-0056: declaredRef anchor always required (v1.7.15 rev10, OQ-0004 resolution)

- Decision: specs[].coverageRefs[].declaredRef must match /^\.qfai\/specs\/.+#(L\d+|\S+)$/. Anchor is always required. Bare file paths are invalid.
- Rationale: The purpose of declaredRef is to point to a specific declaration location. A bare file path fails to identify which declaration within the file is being referenced, breaking the traceability chain. OQ-0004 resolved at discussion.
- Status: Adopted
- Impact: specCoverage.ts (regex defined inline; no separate refSemantics.ts)
- Rejected: bare path allowed (RJ: insufficient traceability precision)


## DR-0012-0057: OQ-0001 Resolution — PerSpecCoverage Dead Fields Removal (v1.7.15 rev11)

- Decision: `PerSpecCoverage` 型から dead fields (`apiEndpoints`, `dbObjects`) を削除し、0/empty 初期化コードを除去する。
- Context: discussion-20260417072340789 OQ-0001 — specCoverage.ts の型定義を SDD フェーズで確認して決定。
- Rationale: 型定義とコードを確認したところ、`apiEndpoints`/`dbObjects` は常に 0/empty で返却されており実際の値を持たない dead fields である。削除することで型が実態を正確に反映し、不必要な 0 初期化コードが除去される。
- Status: Adopted
- Impact: specCoverage.ts の型定義更新、buildPerSpecCoverage() 初期化コード更新
- Source: OQ-0001, discussion-20260417072340789

## DR-0012-0058: OQ-0004 Resolution — specCoverage/refSemantics Test File Policy (v1.7.15 rev11)

- Decision: TDD フェーズ開始時に `packages/qfai/tests/core/prototyping/` 配下を確認し、ファイルが存在すれば拡張、存在しなければ新規作成する。
- Context: discussion-20260417072340789 OQ-0004 — 設計書 rev11 sec.7-8/7-9 は「新規または既存拡張」と記載。
- Rationale: BR-0012-0134/0135 に "new if absent, extend if present" ポリシーとして反映済み。TDD フェーズでの実装時にファイル存在確認が必要。
- Status: Adopted (deferred to TDD phase for implementation decision)
- Impact: specCoverage.test.ts / refSemantics.test.ts の新規作成または拡張
- Source: OQ-0004, discussion-20260417072340789