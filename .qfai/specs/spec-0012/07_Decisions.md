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
