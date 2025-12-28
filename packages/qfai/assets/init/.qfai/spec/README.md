# Spec / Scenario / Decisions

このディレクトリは「仕様（Spec）」「シナリオ（Scenario）」「意思決定（ADR）」の入口です。

## 置くべきファイル

- Spec: `spec-0001-<slug>.md`（必須）
- Scenario: `scenarios/*.feature`
- Decisions: `decisions/ADR-0001.md` など

## 最小例（Spec）

```md
# SPEC-0001: 注文登録の最小要件

## 背景

- 例: 受注の登録ルールを明文化し、手戻りを減らすため

## スコープ

- 例: 新規受注の登録と承認

## 非ゴール

- 例: 既存受注の履歴移行は対象外

## 用語

- 例: 受注 = 顧客からの注文情報

## 前提

- 例: 承認者は1名以上配置されている

## 決定事項

- 例: 承認は1段階で完了とする

## 業務ルール

- [BR-0001] 受注は承認者が承認するまで確定しない
- [BR-0002] 承認済みの受注のみ出荷依頼に進める
```

## BR の書き方（重要）

- **1 ルール = 1 BR** を守る
- 小項目がある場合は **別 BR を採番**する（`BR-0001.1` は使わない）
- 参照は常に BR ID を使う

## Scenario の最小要件

- `@SC-xxxx` / `@SPEC-xxxx` / `@BR-xxxx` をタグで明示
- `Given / When / Then` を含める
- UI/API/DATA 契約に接続する（トレーサビリティのエラー回避）

## CI でチェックされること（抜粋）

- Spec: 必須セクションの有無、SPEC/BR ID の存在、ID 形式
- Scenario: SC/SPEC/BR の参照、Given/When/Then の有無
- Traceability: BR→SC、SC→契約（UI/API/DATA）の接続

## 依存関係

- Spec → Scenario → Contracts
- Decisions（ADR）→ Spec / BR

## 良い例 / 悪い例

- 良い例: `BR-0001` が Scenario で参照され、UI/API/DATA のいずれかに接続している
- 悪い例: Spec に `SC-xxxx` を書く（Spec は SC を参照しない）

## 良い運用 / 悪い運用

- 良い運用: Spec/Scenario/Contracts を同じ ID でつなぐ
- 悪い運用: Spec の BR が Scenario に出てこない（孤立）
