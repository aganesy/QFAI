# contracts/db

## 1. 目的

`contracts/db` は DB の契約を置くディレクトリです。マイグレーション履歴ではなく「仕様が参照する DB の形」を固定します。

## 2. 背景

DB の形が曖昧だと spec が架空参照しやすくなります。テーブル/カラム/制約の最小スナップショットを定義し、参照の整合性を担保します。

## 3. ここに配置するもの

- DB contract SQL（ファイル名規約: db-XXXX-<slug>.sql）

## 4. ここに配置してはならないもの

- マイグレーションツールの履歴
- 実装依存の ORM 設定

## 5. ディレクトリ構造

```text
.
├─ README.md
└─ <db contracts>
```

## 6. テンプレート

```sql
-- QFAI-CONTRACT-ID: db-0001-users
-- Title: Users table

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

## 7. 完成例

```sql
-- QFAI-CONTRACT-ID: db-0001-users
-- Title: Users table

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

## 8. チェックリスト

- [ ] QFAI-CONTRACT-ID が先頭にある
- [ ] spec が参照するテーブル/カラムが含まれる
- [ ] 実装依存の設定を含めていない
