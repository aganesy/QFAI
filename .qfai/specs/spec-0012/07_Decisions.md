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
