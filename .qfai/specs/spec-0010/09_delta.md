# 09 Delta

## Change Summary

- Change ID: DELTA-0010-0001
- Date: 2026-03-09
- Primary: spec-0010 初回作成
- Tags: steering, governance, framework-spec, layered-spec
- Summary: CAP-0010（Steering & Governance）のレイヤードスペック形式での初回作成

## Rationale

- discussion-20260309025837892 で承認された C-3 案に基づき、Steering/Instructions/Review Roster/Constitution/Canonical Workflow Stages の設計契約をフレームワーク設計仕様として仕様化
- steering/_.md および instructions/_.md が運用 SSOT、spec は設計契約と位置づけ定義を記録

## Candidates Considered

1. Steering/Instructions ファイルの内容を spec にフルコピー
2. spec は設計契約と位置づけを記録し、Steering/Instructions ファイルを SSOT として維持（採用）
3. Steering/Instructions ファイルを廃止し spec に一元化

## Adopted

- Adopted: spec は設計契約と位置づけを記録し、Steering/Instructions ファイルを SSOT として維持
- Why: Steering/Instructions ファイルは AI エージェントが各ステージ開始時に直接参照する運用 SSOT であり、spec フォーマットでは運用不可
- Evidence: discussion-20260309025837892/99_delta.md

## Rejected

- Candidate: Steering/Instructions ファイルの内容を spec にフルコピー
- Reason: 二重管理コストが高く、不整合リスクが増大
- DO NOT: Steering/Instructions ファイルの運用詳細を spec にフルコピーしない
- Temptation: 「spec だけで完結させたい」と感じた時

- Candidate: Steering/Instructions ファイルを廃止し spec に一元化
- Reason: これらのファイルは AI エージェントが直接参照する SSOT であり、spec フォーマットでは運用不可
- DO NOT: Steering/Instructions ファイルを廃止しない
- Temptation: 「二重管理を根本解消したい」と感じた時

## Impact

- Affects: `.qfai/specs/spec-0010/` 配下の全ファイル、`_policies/03_Capabilities.md`、`_policies/04_Business-Flow.md`、`_policies/06_Glossary.md`
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行・証跡記録
- Owner: /qfai-sdd（本スキル）
- Due: 本バッチ完了時

---

## Change Summary (DELTA-0010-0002)

- Change ID: DELTA-0010-0002
- Date: 2026-03-14
- Primary: AskUserQuestion MUST 化（Behavior）
- Tags: constitution, communication, skill, askuserquestion, must, governance
- Summary: discussion-20260314053646704 に基づき、AskUserQuestion MUST 化の設計契約を spec-0010 に追加

## Rationale (DELTA-0010-0002)

- 全 9 QFAI スキルで AskUserQuestion Protocol が SHOULD レベルだったため、エージェントが無視してプレーンテキストで質問するケースが多発
- constitution.md Article X として非交渉条項化し、コンパクト実行後も P1 再読み込みで保持される設計
- communication.md に Protocol セクション追加、全 SKILL.md を MUST 表現に統一

## Candidates Considered (DELTA-0010-0002)

1. SKILL.md のみ修正し constitution は変更しない
2. constitution.md Article X + communication.md + 全 SKILL.md を同時に MUST 化（採用）
3. Article VI を削除して Article X に統合

## Adopted (DELTA-0010-0002)

- Adopted: constitution.md Article X 追加 + communication.md 更新 + 全 9 SKILL.md MUST 改訂の三段構え
- Why: constitution.md は P1 再読み込み対象のためコンパクト耐性がある。多層防御で無視リスクを最小化
- Evidence: discussion-20260314053646704/99_delta.md, review-20260314053646704/summary.json (PASS)

## Rejected (DELTA-0010-0002)

- Candidate: SKILL.md のみ修正し constitution は変更しない
- Reason: コンパクト実行後に SKILL.md の MUST ルールが消失するリスク
- DO NOT: AskUserQuestion ルールを constitution 外に留めない
- Temptation: 「SKILL.md だけで十分」と感じた時

- Candidate: Article VI（Clarification budget）を削除して Article X に統合
- Reason: Article VI は質問数制限、Article X は質問方法であり独立した関心事
- DO NOT: Article VI を削除しない
- Temptation: 「質問に関する条項を一本化したい」と感じた時

- Candidate: --auto フラグを MUST ルールの例外として定義
- Reason: --auto は「質問不要モード」であり、MUST ルールの例外ではない
- DO NOT: --auto を MUST ルールの例外にしない
- Temptation: 「--auto 時は AskUserQuestion 不要だから例外にしたい」と感じた時

## Impact (DELTA-0010-0002)

- Affects: `spec-0010/01..06`, `10_Plan`, `_policies/06_Glossary`, `_policies/08_Decisions` (DR-0012), `_policies/10_delta`
- Implementation targets: constitution.md (Article X), communication.md, 9 SKILL.md
- Validation: `qfai validate` でエラー 0
