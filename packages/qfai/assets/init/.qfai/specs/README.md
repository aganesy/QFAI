# Specs (Spec Pack)

このディレクトリは「Spec / Delta / Scenario」を **1セット（Spec Pack）** として管理するための入口です。

## 置くべきファイル

- `spec-0001/spec.md`（必須）
- `spec-0001/delta.md`（必須）
- `spec-0001/scenario.feature`（必須・Gherkin）

> `spec-0001` は **4桁連番**。Spec ID も **4桁（SPEC-0001）** です。

## Spec（spec.md）最小例

```md
# SPEC-0001: 注文登録の最小要件

QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001, THEMA-001

## 背景

- 例: 受注の登録ルールを明文化し、手戻りを減らすため

## 業務ルール

- [BR-0001][P2] 受注は承認者が承認するまで確定しない
```

### BR の書き方

- **1ルール = 1 BR** を守る
- Priority は **P0/P1/P2/P3** のいずれかを必ず付与
- BR 定義は **`## 業務ルール` セクション内のみ**（他セクションは参照扱い）

### Contract 参照の書き方

- `QFAI-CONTRACT-REF:` 行で契約IDを宣言する（複数行可）
- 参照不要な場合は `QFAI-CONTRACT-REF: none`

## Delta（delta.md）

- 互換維持 / 仕様変更の **どちらか1つ**に必ずチェックする
- 根拠と影響範囲を明記する

## Scenario（scenario.feature）最小要件

- **Gherkin 記法**（Given/When/Then）
- **1ファイル = 1 Scenario**（Scenario Outline 含む）
- `# QFAI-CONTRACT-REF: ...` をコメント行で **必須宣言**（参照なしは `none`）
- `@SPEC-xxxx` は Feature レベルに **ちょうど1つ**必要
- Scenario / Scenario Outline には `@SC-xxxx` が **ちょうど1つ**必要
- Scenario / Scenario Outline には `@BR-xxxx` が **1つ以上**必要

## CI でチェックされること（抜粋）

- Spec: 必須セクション、SPEC/BR ID、BR Priority、ID 形式、Contract 参照の実在性、Contract 参照の必須宣言
- Delta: 変更区分（互換/変更）のチェック状態
- Scenario: Feature/Scenario の存在、タグ要件、Given/When/Then、契約参照の宣言/形式
- Traceability: BR→SC、Spec→Contract、SC→Test の接続、BR の所属 SPEC 整合
- IDs: 定義 ID の重複検知（Spec/Scenario/Contracts）
