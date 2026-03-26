# 08 Glossary

## Term Definitions

| Term | Definition | Context | Source |
| ---- | ---------- | ------- | ------ |
| Design Audit | UI-bearing artifact に対する静的な設計品質監査。7 audit dimension で構造的不備を検知する | v1.7.2 の主要機能 | SRC-0001 |
| Slop | AI 生成 UI に見られる再現性のある低品質パターン。generic AI SaaS shell, token bypass, CTA inflation 等 | QFAI における slop の定義。主観的な「好み」ではなく、再現性のある雑さに限定 | SRC-0001 |
| Slop Guardrails | slop パターンを rule-based に検知するバリデータ。designSlop.ts + designSlopPatterns.json で構成 | v1.7.2 の主要機能 | SRC-0001 |
| Audit Dimension | Design audit の検査軸。tokenDiscipline, visualHierarchy, stateCoverage, densityBalance, referenceTranslation, antiPatternRisk, flowClarity の 7 つ | designAudit.ts の構造 | SRC-0001 |
| Rule Tier | rule の重要度分類。structural-blocking (Tier 1), strong-advisory (Tier 2), style-heuristic (Tier 3) | severity mapping の入力 | SRC-0001 |
| Quality Profile | rule tier から severity へのマッピングを制御するプロファイル。default, high, strict の 3 種 | config.uiux.qualityProfile | SRC-0001 |
| Token Drift | design token が定義されているにもかかわらず、contracts/mocks で raw 値が繰り返し使用される状態 | tokenDiscipline dimension | SRC-0001 |
| UI-bearing | discussion pack が UI 関連のアーティファクト/セクションを含むかどうかの判定 | v1.7.0 で導入された概念 | SRC-0002 |
| Anchor Screen | DDP/Story Workshop で選択された主要画面。CTA hierarchy や state coverage の評価対象 | designAudit.ts の検査対象 | SRC-0001 |
| DDP | Design Direction Pack。visual_thesis, content_plan, interaction_thesis 等を含む設計方向性文書 | 既存の ddpValidation.ts が検証 | SRC-0003 |

## Abbreviations

| Abbreviation | Full Form | Notes |
| ------------ | --------- | ----- |
| DDP | Design Direction Pack | 設計方向性パック |
| CTA | Call To Action | ユーザーアクション誘導要素 |
| SLP | Slop Pattern | AI slop カテゴリ ID プレフィックス |
| AUD | Audit | Design audit ルール ID プレフィックス |
| NFR | Non-Functional Requirement | 非機能要件 |
| CWV | Core Web Vitals | ブラウザパフォーマンス指標（v1.7.2 スコープ外） |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
