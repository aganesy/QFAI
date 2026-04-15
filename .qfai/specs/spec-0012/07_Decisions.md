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