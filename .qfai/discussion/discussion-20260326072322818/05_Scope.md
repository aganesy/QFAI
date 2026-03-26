# 05 Scope

## In Scope

- designAudit.ts: 7 audit dimension による静的 design quality 監査
- designSlop.ts: AI slop guardrails（SLP-01〜SLP-06 カテゴリ）
- designSlopPatterns.json: slop rule 定義ファイル
- config 拡張: uiux.audit セクション（enabled, slopDetection, etc.）
- report 拡張: Design Audit / Slop Guardrails の分離グループ表示
- Quality Profile (default/high/strict) による rule tier → severity マッピング
- validators/index.ts への登録
- テスト: designAudit.test.ts, designSlop.test.ts 新規 + 既存テスト更新
- ドキュメント / CHANGELOG 更新

## Out of Scope

- browser QA（console/network/CWV/axe）
- screenshot critique
- external AI critique adapter（Gemini CLI 等）
- automatic fix / rewrite
- visual regression baseline 管理
- Figma / Genspark / MCP 依存の導入
- render evidence 必須化
- 既存バリデータのロジック書き換え（最小限の拡張のみ）

## Constraints

- Technical constraints: 既存 Issue 型・config 構造との互換性維持、Node 18/20 サポート
- Operational constraints: `qfai validate` コマンド拡張のみ（新コマンド不可）
- Legal / compliance constraints: なし

## Success Criteria

| Criterion | Measurement | Target | Priority |
| --------- | ----------- | ------ | -------- |
| SC-001 | design audit findings が UI-bearing pack で出力される | 7 dimension すべてカバー | must |
| SC-002 | slop findings が stable rule ID 付きで出力される | SLP-01〜SLP-06 カバー | must |
| SC-003 | quality profile による severity 制御が動作する | 3 profile × 3 tier | must |
| SC-004 | report に分離セクションがある | 2 セクション | must |
| SC-005 | false positive が管理可能 | config で無効化可能 | should |
| SC-006 | 既存テストが全パス | CI green | must |

## Assumptions

- v1.7.0 Discussion Design Hardening が完了済み
- 既存の Issue 型と config 構造は v1.7.2 でも維持される
- render evidence は optional であり、静的監査は独立して成立する
