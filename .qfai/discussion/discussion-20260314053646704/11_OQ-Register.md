# 11 OQ Register

## Open Question 一覧

**オープン件数: 0**

| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due | Evidence |
| ----- | ----- | ---- | ----------- | ----- | --------- | ------- | -------------- | ------------------- | --- | -------- |
| OQ-0001 | フォールバック条件の定義 | discussion | resolved | agent | AskUserQuestion が使えない環境の定義が曖昧だった | A) 「非 VS Code Copilot Chat 環境」と定義、B) 「ツールが呼び出しエラーを返した場合」と定義、C) 「エージェントが判断」 | A) 明確な環境定義を採用 | 本 discussion 内 | 2026-03-14 | REQ-0004 にフォールバック条件を定義済み |
| OQ-0002 | --auto フラグと MUST ルールの整合性 | discussion | resolved | agent | --auto 時に AskUserQuestion MUST ルールと矛盾しないか不明だった | A) --auto は MUST の例外とする、B) --auto は「質問不要モード」として別定義する、C) --auto 時もフォールバック適用 | B) 「質問が不要な実行モード」として別定義。例外ではない | 本 discussion 内 | 2026-03-14 | REQ-0006 および POL-002 に定義済み |
| OQ-0003 | Article VI（Clarification budget）との整合性 | discussion | resolved | agent | Article X 追加後に Article VI の「最大 5 質問」との関係が曖昧になる懸念 | A) Article VI を削除、B) Article X に「Article VI の制限の中で AskUserQuestion を使う」と明記、C) 変更不要（独立した条項として共存） | C) 変更不要。Article VI は「質問の数」、Article X は「質問の方法」を規定する独立した条項。両立する | 本 discussion 内 | 2026-03-14 | 09_Constraints.md に記載。Article VI の変更なし |
| OQ-0004 | SKILL.md 改訂の文言テンプレート | discussion | resolved | agent | 全 9 SKILL.md で統一した MUST 表現にするためのテンプレートが必要 | A) SDD フェーズで統一テンプレートを定義する、B) discussion 段階で文言例を定義する、C) 各スキルで個別に判断 | A) SDD フェーズで統一テンプレートを定義し、全 SKILL.md に適用する | SDD フェーズ | 2026-03-14 | REQ-0001、NFR-0002 に記載済み |
| OQ-0005 | AskUserQuestion 非対応環境でのフォールバック努力義務 | discussion | resolved | agent | 非対応環境で「構造化を維持する努力義務」を課すかどうかが不明 | A) 努力義務あり（構造化を維持しようとする）、B) 努力義務なし（平文でよい）、C) スキルごとに判断 | A) 努力義務あり。REQ-0004 に「構造化の維持を努力する」を明記 | 本 discussion 内 | 2026-03-14 | REQ-0004 に努力義務を記載済み |
