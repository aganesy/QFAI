# 09 Delta

## Candidates

| Date       | Candidate                       | Source             | Status   |
| ---------- | ------------------------------- | ------------------ | -------- |
| 2026-03-22 | syncIntegrationWrappers 内配置  | OQ-0001 / DR-0022  | Adopted  |
| 2026-03-22 | アセットファイル管理            | OQ-0002 / DR-0023  | Adopted  |
| 2026-03-22 | SDD 追記は別スペック管理        | OQ-0003 / DR-0024  | Adopted  |
| 2026-03-22 | `applyTo: "**/*"`               | OQ-0004 / DR-0025  | Adopted  |
| 2026-03-22 | excludeAgent: coding-agent      | OQ-0005 / DR-0026  | Adopted  |
| 2026-03-22 | instructions アップグレードパス | OQ-0006 / Deferred | Deferred |

## Adoption Rationale

### DR-0022: syncIntegrationWrappers 内配置

- Adopted because: `copilot-instructions.md` と同じ関数内で一貫したパターン（exists-check + create-only）を適用する
- Impact: init.ts の syncIntegrationWrappers に Step 3.5 を追加

### DR-0023: アセットファイル管理

- Adopted because: 70-110 行のテンプレートはハードコードでは可読性が低下する
- Impact: `packages/qfai/assets/init/.github/instructions/` に 2 ファイル追加

### DR-0024: SDD 追記は別スペック管理

- Adopted because: 配置と追記は独立機能であり、スコープ肥大を防ぐ
- Impact: spec-0017 は配置のみ。`<!-- qfai:language-rules -->` マーカーで将来の追記ポイントを確保

### DR-0025: `applyTo: "**/*"`

- Adopted because: コードレビューは全ファイル対象が自然。現行設定踏襲

### DR-0026: excludeAgent: coding-agent

- Adopted because: coding-agent はコード生成エージェントでありレビュー指示の適用対象外。現行設定踏襲

## Rejected Options

| Date       | Rejected Option                               | Reason                                         | Recurrence Prevention                                                                                      |
| ---------- | --------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-03-22 | 独立関数 syncInstructionsFiles（OQ-0001）     | 配置ロジック分散による一貫性低下               | DO NOT: .github/ 生成ロジックを複数関数に分散しない。Temptation: 関心の分離を優先して独立関数にしたい      |
| 2026-03-22 | init.ts 内ハードコード（OQ-0002）             | 長文テンプレート（70行超）の可読性低下         | DO NOT: 70行超のテンプレートをソースコード内にハードコードしない。Temptation: 依存ファイルを増やしたくない |
| 2026-03-22 | 配置と SDD 追記の同時実装（OQ-0003 Option A） | スコープ肥大                                   | DO NOT: 異なる機能を1つのスペックに詰め込まない。Temptation: 関連するから一緒にやりたい                    |
| 2026-03-22 | SDD 追記を v1.6.4 送り（OQ-0003 Option B）    | 不要な先送り（別スペックで v1.6.3 内着手可能） | DO NOT: 別スペックで着手可能なものを次バージョンに先送りしない                                             |

## Deferred Items

| OQ-ID   | Title                           | Deferred-Until | Mitigation                  |
| ------- | ------------------------------- | -------------- | --------------------------- |
| OQ-0006 | instructions アップグレードパス | v1.7.0         | 手動削除→再 init で更新可能 |

## Impact Analysis

- **Files modified (implementation):**
  - `packages/qfai/src/cli/commands/init.ts` — syncIntegrationWrappers にStep 3.5 追加
  - `packages/qfai/tests/cli/init.test.ts` — 12 テストケース追加
- **Files created (implementation):**
  - `packages/qfai/assets/init/.github/instructions/code-review.instructions.md`
  - `packages/qfai/assets/init/.github/instructions/principles.instructions.md`
- **No breaking changes:** create-only semantics, no existing behavior modified
