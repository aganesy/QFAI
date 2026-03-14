# 99 Delta

## Change Summary

| Date | Change Type | Section | Summary | Rationale |
| ---- | ----------- | ------- | ------- | --------- |
| 2026-03-14 | adopted | constitution.md | Article X（AskUserQuestion MUST ルール）を追加 | ユーザー要望「MUST レベルに昇格し、コンパクト実行後もルールが残るようにする」に対応。非交渉条項として constitution に記載することで最高優先度を付与 |
| 2026-03-14 | adopted | communication.md | AskUserQuestion Protocol セクションを追加 | 通信ルールの一元管理場所に AskUserQuestion 使用義務・フォールバック手順・--auto フラグとの整合性を明記 |
| 2026-03-14 | adopted | qfai-discussion/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 全スキル統一の MUST 化対応。OQ-0004 の解決に従い SDD フェーズで文言テンプレートを統一する |
| 2026-03-14 | adopted | qfai-sdd/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-atdd/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-configure/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-prototyping/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-tdd-green/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-tdd-red/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-tdd-refactor/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |
| 2026-03-14 | adopted | qfai-verify/SKILL.md | AskUserQuestion Protocol セクションの文言を SHOULD から MUST に改訂 | 同上 |

## Rejected Decisions

| Date | Rejected Option | Reason | Recurrence Prevention |
| ---- | --------------- | ------ | --------------------- |
| 2026-03-14 | Article VI（Clarification budget）を削除して Article X に一元化 | Article VI は「質問の数の上限」を規定し、Article X は「質問の方法」を規定する独立した条項。対象が異なるため削除は不要 | DO NOT: Article VI を削除しない。Temptation: ルールを統合して Article 数を減らしたくなる |
| 2026-03-14 | --auto フラグを AskUserQuestion MUST の「例外」として定義する | --auto は「質問が不要な実行モード」であり、AskUserQuestion のルールと競合しない。例外扱いは混乱を招く | DO NOT: --auto を MUST ルールの例外として定義しない。Temptation: --auto 時は質問しないから例外だと思いたくなる |
| 2026-03-14 | 非対応環境でのフォールバックを「努力義務なし（平文のみ）」とする | 努力義務を設けることで、非対応環境でも可能な限り構造化された質問を提示できる | DO NOT: フォールバック時に構造化の努力義務を省略しない。Temptation: 非対応環境では平文だけでよいと思いたくなる |

## Discussion Pack 参照

- **Discussion Pack**: `discussion-20260314053646704`
- **関連 OQ**: OQ-0001〜OQ-0005（全件解決済み）
- **関連 REQ**: REQ-0001〜REQ-0006
- **関連 NFR**: NFR-0001〜NFR-0006
