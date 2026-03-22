# 06_REQ — 機能要件

## 要件一覧

### REQ-0001: 汎用 code-review インストラクション配置

- **説明**: `qfai init` 実行時に `.github/instructions/code-review.instructions.md` を配置する。内容は言語非依存の汎用コードレビュー指示とする。
- **ソース**: SRC-0001, SRC-0007
- **受入条件**:
  - ファイルが存在しない場合に配置される
  - YAML frontmatter (`applyTo`, `excludeAgent`) を含む
  - 重要度プレフィックス（BLOCKER/MAJOR/MINOR/NIT/FYI）の定義を含む
  - 言語固有チェックを含まない

### REQ-0002: 汎用 principles インストラクション配置

- **説明**: `qfai init` 実行時に `.github/instructions/principles.instructions.md` を配置する。内容はソフトウェア設計原則レビュー指示とする。
- **ソース**: SRC-0002, SRC-0007
- **受入条件**:
  - ファイルが存在しない場合に配置される
  - YAML frontmatter を含む
  - SOLID、KISS、YAGNI、DRY 等の普遍的原則を含む
  - 言語固有の例を含まない

### REQ-0003: create-only 保護（force 無効）

- **説明**: `.github/instructions/` 配下のファイルは create-only とし、`--force` フラグでも上書きしない。
- **ソース**: SRC-0007
- **受入条件**:
  - 既存ファイルがある場合、`--force` なしで skip
  - 既存ファイルがある場合、`--force` ありでも skip
  - skip されたファイルがレポートに表示される

### REQ-0004: テンプレートアセット格納

- **説明**: 配布用テンプレートを `packages/qfai/assets/init/.github/instructions/` に格納する。
- **ソース**: SRC-0003, SRC-0005
- **受入条件**:
  - `code-review.instructions.md` と `principles.instructions.md` がアセットディレクトリに存在する
  - `npm pack` / ビルド時にアセットに含まれる

### REQ-0005: レポート統合

- **説明**: `qfai init` のレポート出力に `.github/instructions/` ファイルの created/skipped 状態を含める。
- **ソース**: SRC-0003
- **受入条件**:
  - 新規配置時: created カウントに含まれる
  - skip 時: skipped paths に `.github/instructions/*` パスが表示される

### REQ-0006: ディレクトリ自動作成

- **説明**: `.github/instructions/` ディレクトリが存在しない場合、自動的に作成する。
- **ソース**: SRC-0003
- **受入条件**:
  - `.github/` が存在しない場合でも `.github/instructions/` が再帰的に作成される
  - `.github/` が既存の場合、他のファイル/ディレクトリに影響しない

### REQ-0007: SDD 追記用マーカーコメント

- **説明**: 配布する instructions テンプレートに、`/qfai-sdd` が言語固有ルールを追記する際の挿入ポイントとなるマーカーコメントを含める。
- **ソース**: Devils-Advocate Review (Challenge 7), OQ-0003
- **受入条件**:
  - `code-review.instructions.md` に `<!-- qfai:language-rules -->` マーカーを含む
  - `principles.instructions.md` に `<!-- qfai:language-rules -->` マーカーを含む
  - マーカーはファイル末尾付近に配置

### REQ-0008: init 後のアクティベーション案内

- **説明**: `qfai init` 完了時に、Copilot レビュー機能のアクティベーション方法をユーザーに案内する。
- **ソース**: Devils-Advocate Review (Challenge 4)
- **受入条件**:
  - instructions ファイルが新規配置された場合、stdout にアクティベーション案内を出力
  - 案内内容: PR コメントで `@github-copilot review` するか、GitHub Actions ワークフローを設定する旨
