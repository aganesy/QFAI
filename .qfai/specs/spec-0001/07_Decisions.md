# 07 Decisions

## Decisions

### DR-0001-0001: 旧 spec-0007/0009/0010 を spec-0001 に統合

- Date: 2026-04-01
- Context: 旧 spec-0007（Skill Orchestration）、spec-0009（Traceability & Spec Architecture）、spec-0010（Steering & Governance）はいずれもフレームワーク設計仕様であり、spec-pack 構造に密接に関連していた
- Options:
  1. 3 spec を独立に維持
  2. 3 spec を 1 つに統合（採用）
  3. 関連部分のみ抽出して新 spec を作成
- Adopted: 3 spec を spec-0001 に統合
- Why: spec-pack 構造定義、トレーサビリティ、Governance は相互参照が多く、1 つの spec として管理する方が整合性の維持が容易
- Rejected: 独立維持は参照コストが高い
