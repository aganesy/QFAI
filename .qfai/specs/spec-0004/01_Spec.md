# 01 Spec

- Spec: spec-0004
- Parent: CAP-0004
- Consolidates: old spec-0002

## Consumer View

- Primary SSOT for execution: `spec-0004/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: validate コマンドの全機能（33+ バリデータ実行、--fail-on, --format, --phase, --platform, validate.json 出力、ランログ、ウェイバー適用、phase guard）
- Out: report/init/doctor/guardrails

## Applicable NFR

- NFR-0001: バリデーション実行時間 - 中規模プロジェクト（spec 5個）で 10秒以内
- NFR-0002: 大規模プロジェクト対応 - spec 50個、テストファイル 1000個で 60秒以内
- NFR-0003: ファイル探索効率 - fast-glob によるストリーム処理、上限 10,000件
- NFR-0010: バリデーション正確性 - 誤検知率（False Positive）5% 未満
- NFR-0011: ウェイバー正確性 - ウェイバー適用による意図しない Issue 消失なし
- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証
- NFR-0061: 終了コード規約 - 0=成功, 1=失敗（failOn 基準）

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: validate.json 出力、ランログ（.qfai/report/run-\*/）

## Relevant Requirements

- REQ-0010: スペックバリデーション - `qfai validate` で全バリデータ（33+）を順次実行し、Issue[] を集約する
- REQ-0011: バリデーションフェーズ - `--phase full|atdd|tdd|refinement` でスコープ制御
- REQ-0012: 終了コード制御 - `--fail-on error|warning|never` で終了コード制御
- REQ-0013: GitHub Actions 出力 - `--format github` でアノテーション形式（最大100件、重複排除）
- REQ-0014: バリデーション結果 JSON 出力 - validate.json に構造化結果出力
- REQ-0015: ランログ生成 - `.qfai/report/run-*/` にタイムスタンプ付き実行ログ保存
- REQ-0100: スペック必須ファイル検証 - レイヤードスペックの必須ファイル存在チェック
- REQ-0101: ID フォーマット検証 - ID 形式・重複チェック
- REQ-0102: トレーサビリティエッジ検証 - AC->TC, BR->EX, EX->TC, Spec->CAP 参照整合性
- REQ-0103: ATDD コードアノテーション検証 - テストファイル内のアノテーション検証
- REQ-0104: ディスカッションパック検証 - 15ファイル存在、内容充足、blocking OQ 検出
- REQ-0105: コントラクト検証 - UI/API/DB コントラクト ID 整合性
- REQ-0108: Mermaid 図形式検証
- REQ-0110: ウェイバー適用 - waivers.yml に基づく suppress / downgrade
- REQ-0112: ビジネスフロー Mermaid 必須

## Entry points

- US range in this spec: US-0004-0001..US-0004-0015
- Primary actors: QA エンジニア / AI エージェント
- Notes: `qfai validate` でスペック・コントラクト・トレーサビリティを包括検証する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
