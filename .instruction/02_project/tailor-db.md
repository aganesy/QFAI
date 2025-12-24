# TailorDB 実装ルール

## 型名の命名規則

TailorDB の型名は以下の正規表現パターンに従う必要があります：

```
^[A-Z][a-zA-Z0-9]{0,62}$
```

### ルール

- **大文字で始まる**（パスカルケース）
- **英数字のみ使用可能**（アンダースコア `_` やハイフン `-` は使用不可）
- **最大63文字**

### 例

| NG             | OK            |
| -------------- | ------------- |
| `d_blnego`     | `DBlnego`     |
| `m_can_size`   | `MCanSize`    |
| `t_debit_note` | `TDebitNote`  |
| `user_profile` | `UserProfile` |

## インデックス定義

### id フィールドの制約

TailorDB では `id` は自動生成されるフィールドのため、**ユーザー定義のインデックスには使用できません**。

### NG パターン

```typescript
.indexes({
  name: "my_table_pk",
  fields: ["someField", "id"],  // NG: id は使用不可
  unique: true,
})
```

### OK パターン

```typescript
.indexes({
  name: "my_table_pk",
  fields: ["someField"],  // OK: id を含めない
  unique: true,
})
```

### 複合インデックスの例

```typescript
.indexes(
  { name: "order_pk", fields: ["orderNo", "itemNo"], unique: true },
  { name: "order_date_idx", fields: ["orderDate"] },
  { name: "order_status_idx", fields: ["status", "createdAt"] },
)
```

## ファイル命名規則

DB 定義ファイルは `src/backend/**/db/` 配下に配置し、ケバブケースで命名します：

- `m-can-size.ts` （マスタテーブル）
- `t-order-header.ts` （トランザクションテーブル）
- `d-blnego.ts` （データテーブル）
- `e-barcode.ts` （エラーテーブル）

## 基本的な型定義テンプレート

```typescript
import { db } from "@tailor-platform/sdk";
import {
  defaultGqlPermission,
  defaultPermission,
} from "@/backend/shared/db/permission";

export const myTable = db
  .type("MyTable", {
    // プライマリキー構成フィールド
    code: db.string().description("コード"),

    // その他のフィールド
    name: db.string({ optional: true }).description("名称"),
    amount: db.float({ optional: true }).description("金額"),
    count: db.int({ optional: true }).description("件数"),
    targetDate: db.date({ optional: true }).description("対象日"),
    createdAt: db.datetime({ optional: true }).description("作成日時"),
  })
  .indexes({
    name: "my_table_pk",
    fields: ["code"],
    unique: true,
  })
  .permission(defaultPermission)
  .gqlPermission(defaultGqlPermission);
```
