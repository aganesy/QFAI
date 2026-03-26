# Review Request

## 基本情報

- レビュー対象: SDD (Software Design Document)
- レビュー日時: 2026-03-07T18:49:00.000Z
- レビューディレクトリ: `.qfai/review/review-20260307184900000/`
- ブランチ: main / コミット: 47e9010

## 対象アーティファクト

### ポリシーレイヤー (\_policies)

- `01_Objective.md` - プロダクト目的・スコープ
- `02_Initiative.md` - イニシアティブ
- `03_Capabilities.md` - CAP カタログ (CAP-0001 ~ CAP-0006)
- `04_Business-Flow.md` - ビジネスフロー (Mermaid 図付き)
- `05_Contracts.md` - コントラクトインデックス (CLI ツールのため全て 0 items)
- `06_Glossary.md` - 用語集
- `07_Constraints.md` - 制約条件 (TC/OC/LC/DL)
- `08_Decisions.md` - 共有意思決定 (0 items)
- `09_Open-questions.md` - オープンクエスチョン
- `10_delta.md` - 共有デルタ (0 items)

### スペックレイヤー (spec-0001 ~ spec-0006)

各スペックに 10 ファイル (01_Spec ~ 10_Plan):

- spec-0001: CAP-0001 プロジェクト初期化 (qfai init)
- spec-0002: CAP-0002 スペックバリデーション (qfai validate)
- spec-0003: CAP-0003 レポート生成 (qfai report)
- spec-0004: CAP-0004 診断ツール (qfai doctor)
- spec-0005: CAP-0005 ガードレール抽出 (qfai guardrails)
- spec-0006: CAP-0006 プロトタイピング検証 (qfai prototyping)

### コントラクト

- `.qfai/contracts/**` - CLI ツールのためコントラクトなし (根拠は `_policies/05_Contracts.md` に記載)

### エビデンス

- `sdd-spec-0001.md` ~ `sdd-spec-0006.md` - 各スペックの SDD 証跡

### バリデーション結果

- `.qfai/report/validate.log`
- `.qfai/report/specs-coverage/spec-*.md`

## バリデーションゲート状態

- error=10, warning=13, info=3
- スペック内容エラー: 0件
- 全 10 件のエラーは SDD スコープ外またはバリデータバグ:
  - QFAI-COV-201 x6: layerCoverage.ts の ID パターン不整合 (バリデータバグ)
  - QFAI-REVIEW-007 x1: review pack schema の既存問題
  - QFAI-PROT-101 x1: prototyping evidence (SDD スコープ外)
  - QFAI-ATDD-111/112 x2: テストアノテーション (SDD スコープ外)

## レビュー基準

1. スペック一貫性: スコープ / ストーリー / AC / EX の整合性
2. 意思決定の可観測性: delta / decisions / rejected の根拠記録
3. コントラクト妥当性: CLI ツールとしてコントラクト不要の根拠
4. トレーサビリティ: カバレッジシグナルの追跡可能性

## レビュアーロスター

10 名のレビュアーによる独立レビューを実施。各レビュアーの判定ファイルは `RXX_<id>.md` として本ディレクトリに格納。
