---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# ドメイン概要

注文管理（船番・ブロック番号で管理する受注）とユーザー管理を中心としたスキーマ。

## 主要テーブル

- **TOrderHeader**: 注文ヘッダ。主キーは `shipNo` + `blockNo` + `orderNo`。注文日・発注担当・納期・合計金額・登録/更新情報を保持。
- **TOrderMeisai**: 注文明細。主キーは `shipNo` + `blockNo` + `orderNo` + `orderMeisaiNo`。規格・寸法・単価・フラグ類・登録/更新情報を保持。
- **MUser**: ユーザー情報（ユーザID/所属区分/氏名/ハッシュ済みパスワード/メールアドレス）。主キーは `userId` + `syozokuKbn`。
- **MSystem**: システムコードマスタ（区分/コード/値）。
- **m-xxx**: 規格/材質/長さなどのマスタ（`m-kikaku-ex`, `m-kouji-code`, `m-shot-unit`, `m-sunpo-ex`, `m-zairyo` など）。
- **TOperateHistory**: 操作履歴（ユーザー/処理種別/画面/結果/メッセージ等）。

## リゾルバ

- `newUser`（src/backend/user-management/resolver/new-user.ts）: メール重複をチェックし、`User` に挿入。成功時に `userId` を返す。

## 権限・アクセス

- DB 定義は `defaultPermission` / `defaultGqlPermission` を適用し、Tailor 権限の設定に従う。
- フロントは AppShell の AuthGuard で保護し、ユーザープロファイルメニューを表示。

## フロントエンドで利用するデータ

- 注文詳細取得: `useOrderDetail` が `TOrderHeaderBy` と `TOrderMeisais` を shipNo / blockNo / orderNo で参照し、`mSystems` と `mUsers` を合わせて取得。
- 注文番号の扱い: `orderInsertNo` から `orderNo` 抽出ロジックは TODO（暫定で 1 固定）。実装時は仕様を確認すること。

## ドメイン上の注意

- ヘッダ/明細とも登録・更新ユーザーと日時を保持しており、更新時は必ずセットする。
- shipNo + blockNo + orderNo をまたぐ一貫性（合計金額/員数/重量など）はヘッダと明細で整合するように計算・バリデーションを行う。
