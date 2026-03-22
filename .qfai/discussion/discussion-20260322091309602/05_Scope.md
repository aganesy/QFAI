# 05_Scope

## スコープ内

| ID | 項目 | 説明 |
|---|---|---|
| SC-01 | テンプレートアセット作成 | `assets/init/.github/instructions/` に汎用版 code-review と principles の2ファイルを作成 |
| SC-02 | init.ts 配置ロジック | `.github/instructions/` ファイルを create-only で配置するロジックを追加 |
| SC-03 | create-only 保護 | `--force` でも上書きしない保護メカニズム |
| SC-04 | init テスト追加 | 配置・skip・冪等性・force 無効のテストケース |
| SC-05 | レポート統合 | created/skipped に instructions ファイルを含める |

## スコープ外

| 項目 | 理由 |
|---|---|
| copilot-review.yml ワークフロー配布 | シークレット依存、ユーザー環境固有 |
| PULL_REQUEST_TEMPLATE.md 配布 | プロジェクト固有性が高い |
| 言語固有チェックの配布 | SDD フェーズで `/qfai-sdd` が追記する設計 |
| 既存 instructions との自動マージ | 複雑性が高く create-only で十分 |
| `/qfai-sdd` の言語固有ルール追記実装 | 別スペック候補（v1.6.3 内で着手可能だが別管理） |

## 成功基準

1. `qfai init` を新規リポジトリで実行すると `.github/instructions/code-review.instructions.md` と `.github/instructions/principles.instructions.md` が生成される
2. 既存の `.github/instructions/` ファイルがあるリポジトリで `qfai init` しても既存ファイルが上書きされない
3. `--force` を付けても instructions ファイルは上書きされない
4. `qfai init --dry-run` で instructions の配置予定が正しくレポートされる
5. 既存テストスイートが壊れない
