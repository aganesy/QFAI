# 05_Scope

## スコープ内

| 項目 | 説明 |
| --- | --- |
| SSOT スキル SKILL.md 編集 | `.qfai/assistant/skills/*/SKILL.md` 全9ファイル |
| AskUserQuestion Protocol セクション追加 | 各スキルに独立セクションとして追加 |
| スキル固有の質問例記載 | 各スキルのユーザー質問トリガーに基づく例示 |
| pr-merge パターンの踏襲 | AskUserQuestion 優先、通常メッセージでフォールバック |

## スコープ外

| 項目 | 理由 |
| --- | --- |
| init テンプレート変更 | ユーザーが SSOT のみを指定 |
| CLI コード変更 | md ファイル編集のみ |
| テスト変更 | md ファイル編集による影響なし |
| AskUserQuestion ツール自体の実装 | 既存機能の利用のみ |
| 共通参照ファイル（rcp_footer 方式）の作成 | 各スキル個別追加を選択 |
| pr-merge / pr-fix スキルの変更 | 既に実装済み |

## 成功基準

1. 全 9 SSOT スキルの SKILL.md に `User Questions (AskUserQuestion Protocol)` セクションが存在する
2. 各セクションが pr-merge の3行パターン（優先使用/構造化選択肢/フォールバック）を含む
3. 各スキル固有の質問例（e.g. 括弧内）がスキルの実際のユーザー質問トリガーと整合する
4. 配置場所が `[DRIFT-PROTOCOL:MANDATORY]` 直後で全スキル統一
5. `pnpm format:check && pnpm lint && pnpm check-types` がパスする（md変更のみのため影響は低い）
