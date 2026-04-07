# 07 Decisions

## Decisions

### DR-0002-0001: 旧 spec-0023/0026/0034 を spec-0002 に統合

- Date: 2026-04-01
- Context: 旧 spec-0023（Discussion Design Hardening）、spec-0026（UIUX Authoring Foundation）、spec-0034（Discussion Canonical Architecture）はいずれも discussion-pack の構造・品質に関する仕様
- Options:
  1. 3 spec を独立に維持
  2. 3 spec を 1 つに統合（採用）
  3. UI 関連のみ抽出して新 spec を作成
- Adopted: 3 spec を spec-0002 に統合
- Why: discussion-pack 構造、UI-bearing 検出、サイドカー生成、評価モデルは全て discussion フェーズの一部であり、1 つの spec で管理する方が一貫性が高い
- Rejected: 独立維持は discussion フェーズ内の相互参照が多く、整合性維持のコストが高い

### DR-0002-0002: 3-layer モデルを canonical として採用

- Date: 2026-04-01
- Context: 旧 spec-0034 で invariant / trend-derived / product-specific の 3-layer が canonical model として定義。旧 4-axis（usability/consistency/accessibility/delight）は非推奨
- Adopted: 3-layer model を canonical とし、4-axis は migration window（v1.7.8 warning → v1.8.0 error）で段階的に廃止
- Why: 3-layer は評価軸の性質をより正確に反映し、trend research との統合が自然

### DR-0002-0003: Surface Classification 二分割 (v1.7.14, DR-0110)

- Date: 2026-04-07
- Context: v1.7.13 の単一 isUiBearingSurface() では cli surface が discussion UI-bearing と browser evidence required の両方に分類され、cli パックに不要な browser QA 義務が課される
- Adopted: isDiscussionUiBearingPrototypingSurface()（cli 含む）と requiresVisualBrowserEvidenceSurface()（cli 除外）に分割
- Why: cli は UI 設計意図の文書化が必要だが、Playwright 等による browser evidence は不要。関心事の分離により誤った義務付けを防止

### DR-0002-0004: Strategy Decision Canonical Vocabulary (v1.7.14, DR-0114)

- Date: 2026-04-07
- Context: v1.7.13 の strategy validator は 8 フィールド構造チェックのみで、decision 値は任意文字列。比較・集計が困難
- Adopted: canonical enum（template, component-library, design-system, native-pattern, bespoke, none）を導入し、selection_required に対応する状態機械を強制
- Why: canonical vocabulary により strategy 意思決定の自動分析が可能。状態機械の強制により意味的整合性を保証

### DR-0002-0005: "selected anchor" Wording 正規化 (v1.7.14)

- Date: 2026-04-07
- Context: "selected direction" と "selected anchor" が混在し、用語の不統一がバリデータとテンプレートの整合性を阻害
- Adopted: "selected anchor" に統一。エラーコード DDH-SELECTED-DIRECTION → DDH-SELECTED-ANCHOR に変更
- Why: "anchor screen" は設計意思決定の具体的なアウトプットを指す用語としてより正確
