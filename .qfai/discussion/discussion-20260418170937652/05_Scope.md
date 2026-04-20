# 05_Scope

## In Scope

1. `qfai-discussion` skill に design guideline research 必須化を追加する方針
2. discussion template に `design_guideline_research` category を追加する方針
3. TRD trend-derived template に quantitative `score_anchors` requirement を追加する方針
4. `qfai-validate` に coverage / concreteness rule を追加する方針
5. severity / rollout / compatibility を discussion レベルで定義すること
6. `/qfai-sdd` へ渡す実装論点と deferred OQ の整理

## Out of Scope

1. `packages/qfai/` 実装コードの直接変更
2. downstream project の UI 自体の修正
3. `.qfai/assistant/skills/qfai-prototyping` ローカル mitigation の恒久採用
4. 具体的な validator 実装アルゴリズムの最終決定
5. 外部ドキュメント参照のネットワーク実行方式の確定

## Anti-goals

- 静的デザインルール集を package 標準として押し付けない
- discussion artifact に spec SSOT を重複転記しない
- validator 導入だけで運用指針を省略しない

## Success Criteria

| ID | Criteria |
| --- | --- |
| SC-01 | UI-bearing discussion で guideline research が要求される方針が明文化されている |
| SC-02 | TRD `score_anchors` の定量性 requirement が REQ と decision に落ちている |
| SC-03 | validator rule の目的、対象、severity、適用範囲が明文化されている |
| SC-04 | `open OQ = 0` で `/qfai-sdd` に handoff できる |
