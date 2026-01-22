# steering

## 1. 目的

`steering` はプロジェクト文脈の SSOT です。AI が要件・契約・仕様を作成する前に、前提・制約・方針をここで揃えます。

## 2. 背景

プロジェクト情報が曖昧だと、spec が架空の前提（DB/API/UI）を参照しやすくなります。`steering` に事実と方針を集約し、曖昧さを最小化します。

## 3. ここに配置するもの

- product: 何を作るか、誰のためか、成功条件
- tech: 技術スタック、制約
- structure: リポジトリ構造、実行コマンド、品質ゲート
- manifest: 意思決定の骨格

## 4. ここに配置してはならないもの

- specs の詳細（spec pack へ）
- contracts の詳細（contracts へ）
- 架空の事実（不明なら TBD とする）

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ product.md
├─ tech.md
├─ structure.md
└─ manifest.md
```

## 6. テンプレート

### 6.1 product.md

```md
# Product

## Goal

- <what success looks like>

## Users

- <who>

## Scope

- In scope:
- Out of scope:

## Non-functional requirements

- Performance:
- Reliability:
- Security:
- Usability:
- Operability:
```

### 6.2 tech.md

```md
# Tech

## Stack

- Language:
- Framework:
- DB:

## Constraints

- <constraint>
```

### 6.3 structure.md

```md
# Structure

## Key paths

- <path list>

## Quality gates

- <commands list>
```

### 6.4 manifest.md

```md
# Manifest

## Principles

- <principle>

## Decision rules

- <rule>

## Governance

- <who decides>
```

## 7. 完成例

```md
# Product

## Goal

- ユーザーがタスクを登録し、完了できる。

## Users

- 個人利用者

## Scope

- In scope: タスクの CRUD
- Out of scope: チーム機能

## Non-functional requirements

- Performance: 主要画面は 200ms 以内で反応
- Reliability: 失敗時に再試行可能
- Security: 個人情報は暗号化
- Usability: エラーは具体的に表示
- Operability: ローカルで再現可能
```

## 8. チェックリスト

- [ ] 不明点は TBD とし、Open Question にできる
- [ ] 仕様が参照する事実（パス/コマンド/制約）が明記されている
