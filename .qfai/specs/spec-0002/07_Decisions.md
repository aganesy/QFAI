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
