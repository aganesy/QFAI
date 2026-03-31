# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Default read set: このファイル + 関連コントラクトのみ
- `_policies` は読み取り専用のエスカレーションコンテキストであり、デフォルトでは読み込まない

## Scope

- In:
  - ロースター登録（`review-roster.yml` への `devils-advocate` / `pattern-doubler` 追加）
  - デリゲーション役割定義（`agent-selection.md` への両エージェントの役割・責務・委任ルール追加）
  - スキル統合（全 9 QFAI スキルの `SKILL.md` へのレビュー委任ステップ追加）
  - RCP フッター更新（各スキルの `rcp_footer.md` への新レビュアー記載追加）
  - ゲートルール更新（`review-gate.rules.yml` への新レビュアー 2 名分のゲートルール追加）
  - 行動原則定義（各エージェントのプロンプト指示としての行動原則定義）
- Out:
  - AI 実装コード（プロンプトエンジニアリングの実装コード）
  - TypeScript コア変更（`qfai` パッケージ本体のコード変更）
  - テストコード（`packages/qfai/test/**` の変更）
  - 既存 10 レビュアーの役割変更
  - pr-fix / pr-merge スキルへの適用

## Applicable NFR

- NFR-0001: レビューサイクル時間は既存サイクルの 2 倍以内
- NFR-0002: ロースター設定の一元管理（`review-roster.yml` 単一ファイル）
- NFR-0003: 既存 10 レビュアーの動作・順序・判定ロジックに変更を加えない
- NFR-0004: 新レビュアー追加時の変更ファイル数は 5 以下
- NFR-0005: FAIL 判定が他レビュアーと同じブロッキングメカニズムで動作する
- NFR-0006: レビュー結果が RCP アーティファクト（R??\_\*.md）に記録される
- NFR-0007: 無限ループを検知・打ち切る仕組みがある

## Applicable Policy

- POL-01: 全否定エージェントは具体的代替案を必ず提示する
- POL-02: パターン倍増エージェントは追加パターンの根拠を示す
- POL-03: 無限ループ防止策を必ず実装する
- POL-04: 既存 10 レビュアーの動作に影響を与えない
- POL-05: 両エージェントのレビュー結果は RCP に完全記録する
- POL-06: 新エージェントの FAIL 判定基準は SKILL.md に明文化する
- POL-07: 無限ループ検知時は自動でレビューを打ち切り、OQ に登録する
- POL-08: 全レビュアーは FAIL 判定時に具体的な代替案・修正案を必ず提示する

## Evidence Summary

- Evidence: `.qfai/discussion/discussion-20260315033313220/` 以下の全ドキュメント
  - `06_REQ.md` — REQ-0001〜REQ-0014
  - `07_NFR.md` — NFR-0001〜NFR-0007
  - `10_Policy.md` — POL-01〜POL-07
  - `11_OQ-Register.md` / `12_OQ-Resolution-Log.md` — 全 7 OQ 解決済み

## Relevant Requirements

- REQ-0001: 全否定エージェントのロースター登録
- REQ-0002: 全否定エージェントのデリゲーション役割定義
- REQ-0003: 全否定エージェントのレビュー観点定義
- REQ-0004: 全否定エージェントのブロッキング力
- REQ-0005: パターン倍増エージェントのロースター登録
- REQ-0006: パターン倍増エージェントのデリゲーション役割定義
- REQ-0007: パターン倍増エージェントのレビュー観点定義
- REQ-0008: パターン倍増エージェントのブロッキング力
- REQ-0009: 全スキル SKILL.md への全否定エージェント統合
- REQ-0010: 全スキル SKILL.md へのパターン倍増エージェント統合
- REQ-0011: RCP フッターの更新
- REQ-0012: review-gate.rules.yml の更新
- REQ-0013: 全否定エージェントの行動原則定義
- REQ-0014: パターン倍増エージェントの行動原則定義
- REQ-0015: 全レビュアー共通の代替案提示義務

## Entry points

- US range in this spec: US-0012-0001..US-0012-0005
- Primary actors: QFAI メンテナー、QFAI エージェント（自動実行）、QFAI ユーザー
- Notes: 本 spec は設定ファイル・ドキュメント変更のみを対象とする。AI 実装コードは対象外。

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: 複数の有効な実装が存在する（例: can_be_na の扱い）。
- Conflict: NFR / Policy / AC が競合する（例: NFR-0001 パフォーマンスと NFR-0007 無限ループ防止の優先順位）。
- Missing: 必要な制約またはポリシーが不明確。
- Trade-off: パフォーマンス vs 安全性 vs DX のトレードオフが必要。

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
