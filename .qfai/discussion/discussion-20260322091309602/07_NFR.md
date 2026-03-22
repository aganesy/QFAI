# 07_NFR — 非機能要件

## 要件一覧

### NFR-0001: 冪等性

- **説明**: `qfai init` を複数回実行しても結果が同一であること。instructions ファイルが2回目以降で重複生成されないこと。
- **測定基準**: 3回連続実行で2回目以降すべて skipped
- **ソース**: SRC-0003（既存の冪等性設計）

### NFR-0002: 後方互換性

- **説明**: 既存の `qfai init` の動作（root/、.qfai/、symlink 等）に変更がないこと。
- **測定基準**: 既存テストスイート全パス
- **ソース**: SRC-0004

### NFR-0003: GitHub Copilot Instructions 仕様準拠

- **説明**: 配布する instructions ファイルが GitHub Copilot の仕様に準拠していること。
- **測定基準**: frontmatter の `applyTo` と `excludeAgent` フィールドが有効な形式
- **ソース**: SRC-0008

### NFR-0004: パフォーマンス

- **説明**: instructions 配置による `qfai init` の実行時間増加が無視できる程度であること。
- **測定基準**: 追加オーバーヘッド < 100ms
- **ソース**: 一般的な CLI パフォーマンス要件
