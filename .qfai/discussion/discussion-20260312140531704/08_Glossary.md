# 08_Glossary

| 用語 | 定義 |
| --- | --- |
| AskUserQuestion | VS Code Copilot Chat が提供するユーザーへの質問機能。ターミナルやログではなく Chat UI 上で選択肢付き質問を提示できる |
| SSOT | Single Source of Truth。`.qfai/assistant/skills/` 配下の SKILL.md を指す |
| 構造化選択肢 | AskUserQuestion で提示する、番号付きまたは YES/NO 形式の明確な回答候補 |
| フォールバック | AskUserQuestion が利用不可の場合に通常メッセージで質問を代替する挙動 |
| DRIFT-PROTOCOL | 各スキルの必須遵守セクション。スキル逸脱を検知・報告するルール |
| init テンプレート | `.qfai/assistant/skills/*/init/template.md` に配置されるスキル初期化テンプレート。本スコープでは対象外 |
| pr-merge パターン | `.github/skills/pr-merge/SKILL.md` に実装済みの AskUserQuestion 使用パターン。今回の参照モデル |
| スキル固有例 | 各スキルの実際の質問トリガーに合わせた AskUserQuestion の使用例（例: Simulation mode 承認、OQ 解決） |
