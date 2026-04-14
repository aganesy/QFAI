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
