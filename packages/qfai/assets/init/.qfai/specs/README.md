# specs

## 1. 目的

`specs` は Spec Pack を格納するディレクトリです。Spec Pack は「主要機能スライス」を最小単位に分割し、verify 可能な粒度で仕様と受入シナリオを定義します。

## 2. 背景

1 つの spec に複数機能を詰め込むと、テストと実装がアドリブ化しやすくなります。Spec Pack を分割し、判断の単位を小さく固定します。

## 3. ここに配置するもの

- Spec Pack（ディレクトリ単位）
  - spec.md
  - delta.md
  - scenario.feature

## 4. ここに配置してはならないもの

- 1 つの spec.md に複数機能の仕様を詰め込むこと
- 1 つの scenario.feature に複数シナリオを入れること
- 実装コードやテストコード

## 5. ディレクトリ構造

```text
.
├─ README.md
└─ <spec packs>
```

## 6. Spec Pack の構造例

```text
spec-0001
├─ spec.md
├─ delta.md
└─ scenario.feature
```

## 7. 必須ルール

### 7.1 Spec Pack は 1 主要スライスのみ

次のいずれかに該当する場合は Spec Pack を分割します。

- spec.md に BR を 2 件以上書きたくなる
- scenario.feature に Scenario を 2 件以上書きたくなる
- 複数のユーザージャーニーを 1 つにまとめている

### 7.2 scenario.feature は 1 ファイル 1 シナリオ

scenario.feature は `Scenario:` または `Scenario Outline:` をちょうど 1 つだけ含みます。

### 7.3 contract 参照は実在のみ

spec.md と scenario.feature の双方に QFAI-CONTRACT-REF を記載します。参照する contract ID は contracts 配下に実在している必要があります。不要なら none を指定します。

## 8. テンプレート

### 8.1 spec.md

```md
# SPEC-0001: <短いタイトル>

QFAI-CONTRACT-REF: <contract-id-1>, <contract-id-2>

# 不要なら:

# QFAI-CONTRACT-REF: none

## Goal

- この Spec Pack が提供する価値を 1-2 文で。

## Scope

- In scope:
- Out of scope:

## Business Requirements

- [BR-0001][P0] <要求を 1 文で。>

## Acceptance Criteria

- [ ] <AC-1>
- [ ] <AC-2>
```

### 8.2 delta.md

```md
# Delta

## Summary

- <要点を 1-3 行>

## Decision Log

| ID      | Topic  | Candidates | Decision              | Rationale | Implementation constraint |
| ------- | ------ | ---------- | --------------------- | --------- | ------------------------- |
| DL-0001 | <論点> | A / B / C  | Adopt: B, Reject: A/C | <理由>    | **A/C は実装しない**      |

## Verification plan

- <箇条書き>
```

### 8.3 scenario.feature

```gherkin
# QFAI-CONTRACT-REF: <contract-id-1>, <contract-id-2>
# 不要なら:
# QFAI-CONTRACT-REF: none
@SPEC-0001 @SC-0001 @BR-0001
Feature: <機能名>

  Scenario: <1つの行動スライス>
    Given <前提>
    When <操作>
    Then <期待結果>
```

## 9. 完成例

### 9.1 spec.md

```md
# SPEC-0001: アカウントを作成できる

QFAI-CONTRACT-REF: api-0001-user-registration, db-0001-users, ui-0001-user-registration

## Goal

- 訪問者がメールとパスワードでアカウントを作成できる。

## Scope

- In scope: 登録、最小の入力バリデーション
- Out of scope: パスワードリセット、SSO

## Business Requirements

- [BR-0001][P0] 訪問者はメールとパスワードを送信してアカウントを作成できる。

## Acceptance Criteria

- [ ] 正常系でアカウントが作成され、サインイン状態になる。
- [ ] 既存メールの場合はエラーメッセージが表示される。
```

### 9.2 scenario.feature

```gherkin
# QFAI-CONTRACT-REF: api-0001-user-registration, db-0001-users, ui-0001-user-registration
@SPEC-0001 @SC-0001 @BR-0001
Feature: ユーザー登録

  Scenario: 正しい入力でアカウント作成できる
    Given 訪問者は登録画面にいる
    When 新規メールとパスワードを送信する
    Then アカウントが作成され、サインイン状態になる
```

## 10. チェックリスト

- [ ] Spec Pack が 1 主要スライスに収まっている
- [ ] scenario.feature に Scenario が 1 つだけある
- [ ] spec.md の BR が 1 つだけある
- [ ] QFAI-CONTRACT-REF の参照先が実在する
- [ ] delta.md の Decision Log に Reject（不採用の選択肢）が記録されている
