# require

## 1. 目的

`require` は要求定義を 1 ファイルに収束させるディレクトリです。仕様や実装の前に、プロダクトの要件を確定します。

## 2. 背景

要件が散在すると、spec pack が過剰に広がり、シナリオが曖昧になります。要求は 1 ファイルで集約し、次工程の入力を安定させます。

## 3. ここに配置するもの

- require.md（要求の単一成果物）

## 4. ここに配置してはならないもの

- 複数の要求ファイル乱立
- API/DB/UI の設計詳細（contracts へ）
- 実装案の詳細（spec/delta へ）

## 5. ディレクトリ構造

```text
.
├─ README.md
└─ require.md
```

## 6. テンプレート

```md
# Requirements

## Product concept

- <one paragraph>

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

## Requirements (EARS recommended)

- RQ-0001: When <trigger>, the system shall <response>.
```

## 7. 完成例

```md
# Requirements

## Product concept

- 訪問者がメールとパスワードでアカウントを作成し、ログインできる。

## Users

- 個人利用者

## Scope

- In scope: 登録、ログイン
- Out of scope: SSO

## Non-functional requirements

- Performance: 登録 API は 500ms 以内
- Reliability: 二重送信でも整合性を保つ
- Security: パスワードは保存しない（ハッシュ化）
- Usability: エラーは具体的に表示
- Operability: ローカルで再現可能

## Requirements (EARS recommended)

- RQ-0001: When the user submits valid credentials, the system shall create an account.
- RQ-0002: When the email already exists, the system shall return a conflict error.
```

## 8. チェックリスト

- [ ] 要件がテスト可能な形で書かれている
- [ ] 非機能要件が最低 1 つ以上ある
