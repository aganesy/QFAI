# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0004 初回作成
- Tags: doctor, diagnostics, cli
- Summary: qfai doctor コマンドのスペック一式を新規作成

## Rationale

- qfai init で生成されたワークスペースの健全性を事前検証する診断ツールが必要
- validate 実行前に設定・構造の問題を特定し、開発者の問題解決を支援する

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: 各 spec が独立したディレクトリとして管理され、複数 CAP 間のスケーラビリティと並行開発が可能
- Evidence: specs/\_policies/ + specs/spec-0004/ ディレクトリ構造

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: 単一ファイルに全スペックを集約すると、CAP 追加時にファイルサイズが肥大化し、差分管理・レビューが困難になる
- DO NOT: spec-pack 形式に戻さないこと。spec-0004 の成果物を単一ファイルにバンドルしてはならない
- Temptation: 単一ファイルの方がシンプルに見えるが、複数 CAP のスケーラビリティが損なわれ、AI エージェントのコンテキストウィンドウ消費も増大する

## Impact

- Affects: `.qfai/specs/spec-0004/` 配下の全ファイル
- Validation: 全テストケース（TC-0004-0001..TC-0004-0018）が pass すること

## Follow-ups

- Phase 5 実装開始
- Owner: Implementer
- Due: TBD

---

### DELTA-0002 (2026-03-10)

- **Primary**: 10_Plan.md に i18n 実装方式セクション追加
- **Tags**: i18n, static-dictionary, GAP-03

#### Adopted

- 静的辞書ファイル（JSON）+ フォールバック英語方式
- **Rationale**: TC-04（最小依存）制約に適合。日本語のみサポートで i18next は過剰（OQ-0003 解決）

#### Rejected

- i18next ライブラリ採用 — TC-04 制約違反、YAGNI 原則に反する
- **DO NOT**: 多言語対応ライブラリを導入しないこと（必要になるまで）
- **Temptation**: 「将来の多言語対応に備えたい」が、YAGNI 原則を優先

#### Impact

- spec-0004/10_Plan.md
