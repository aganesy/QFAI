# 10 Plan

- Spec: spec-0001
- Parent: CAP-0001

## 実装戦略

### 主要モジュール

| モジュール             | パス                                     | 操作      | 説明                                                                      |
| ---------------------- | ---------------------------------------- | --------- | ------------------------------------------------------------------------- |
| init コマンド          | `packages/qfai/src/cli/commands/init.ts` | 修正      | CLI エントリポイント。symlink/git config/prune/copilot 更新ロジックを集約 |
| init アセット          | `packages/qfai/assets/init/`             | 新規/修正 | テンプレートファイル群（ディレクトリ構造、qfai.config.yaml テンプレート） |
| FS ユーティリティ      | `packages/qfai/src/cli/lib/fs.ts`        | 修正      | 冪等なファイル書き込み（exist チェック + スキップ）ヘルパー               |
| アセットユーティリティ | `packages/qfai/src/cli/lib/assets.ts`    | 修正      | アセット参照パス解決                                                      |

### ディレクトリ構造生成対象

- `.qfai/assistant/`
- `.qfai/specs/`
- `.qfai/contracts/`
- `.qfai/discussion/`
- `.qfai/evidence/`
- `.qfai/review/`
- `.qfai/report/`

### Symlink 生成対象

- `.claude/skills/` - Skill ディレクトリ symlink（→ .qfai/assistant/skills/qfai-\*）
- `.agents/skills/` - Skill ディレクトリ symlink
- `.codex/skills/` - Skill ディレクトリ symlink
- `.github/skills/` - Skill ディレクトリ symlink
- `.claude/agents/` - Agent ファイル symlink（→ .qfai/assistant/agents/\*.md）
- `.github/agents/` - Agent ファイル symlink（.agent.md 命名変換）

### 削除対象

- `.claude/commands/qfai-*.md` - 旧 Claude Code コマンドラッパー
- `.github/prompts/qfai-*.prompt.md` - 旧 GitHub Copilot プロンプトラッパー
- 旧ラッパーディレクトリ（symlink でない qfai-\* ディレクトリ）

## テスト戦略

### L5 E2E テスト（tests/e2e/）

| テストファイル                            | アノテーション              | 検証内容                                                           |
| ----------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `tests/e2e/init-basic.test.ts`            | QFAI:SPEC-0001:US-0001-0001 | 空ディレクトリでの init 実行、7サブディレクトリ生成確認            |
| `tests/e2e/init-idempotent.test.ts`       | QFAI:SPEC-0001:US-0001-0002 | 2回実行で既存ファイルスキップ、新規のみ追加                        |
| `tests/e2e/init-force.test.ts`            | QFAI:SPEC-0001:US-0001-0003 | --force でスキル上書き、skills.local/ 保護確認                     |
| `tests/e2e/init-dry-run.test.ts`          | QFAI:SPEC-0001:US-0001-0004 | --dry-run でファイル非作成、[CREATE]/[SKIP] 出力確認               |
| `tests/e2e/init-wrappers.test.ts`         | QFAI:SPEC-0001:US-0001-0005 | ラッパーファイル生成・参照パス確認                                 |
| `tests/e2e/init-legacy.test.ts`           | QFAI:SPEC-0001:US-0001-0006 | レガシーファイル検出・.qfai/.legacy/ 退避確認                      |
| `tests/e2e/init-symlinks.test.ts`         | QFAI:SPEC-0001:US-0001-0007 | commands/prompts 廃止 + skill symlink 確認                         |
| `tests/e2e/init-agent-symlinks.test.ts`   | QFAI:SPEC-0001:US-0001-0008 | Agent symlink 確認（.claude/agents/, .github/agents/）             |
| `tests/e2e/init-git-config.test.ts`       | QFAI:SPEC-0001:US-0001-0009 | git config + Windows エラーハンドリング                            |
| `tests/e2e/init-copilot-update.test.ts`   | QFAI:SPEC-0001:US-0001-0010 | copilot-instructions.md 参照先更新                                 |
| `tests/e2e/init-migration.test.ts`        | QFAI:SPEC-0001:US-0001-0011 | stale asset 検出・マイグレーション実行・ロールバック・冪等性確認   |
| `tests/e2e/validate-version-norm.test.ts` | QFAI:SPEC-0001:US-0001-0012 | バージョン不整合検出・一貫性正常ケース・プレリリースバージョン対応 |
| `tests/e2e/validate-module-docs.test.ts`  | QFAI:SPEC-0001:US-0001-0013 | 未ドキュメントモジュール警告・壊れた参照エラー・正常ケース確認     |

### L3 Integration テスト（tests/integration/）

| テストファイル                                        | アノテーション                                          | 検証内容                                                   |
| ----------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `tests/integration/init-fs-ops.test.ts`               | QFAI:SPEC-0001:TC-0001-0001, TC-0001-0002, TC-0001-0003 | FS 操作単体テスト（ディレクトリ作成、設定ファイル生成）    |
| `tests/integration/init-idempotent.test.ts`           | QFAI:SPEC-0001:TC-0001-0005, TC-0001-0006, TC-0001-0007 | 冪等性ロジック単体テスト                                   |
| `tests/integration/init-force.test.ts`                | QFAI:SPEC-0001:TC-0001-0008, TC-0001-0009               | --force ロジック単体テスト                                 |
| `tests/integration/init-dry-run.test.ts`              | QFAI:SPEC-0001:TC-0001-0010, TC-0001-0011, TC-0001-0012 | --dry-run ロジック単体テスト                               |
| `tests/integration/init-wrappers.test.ts`             | QFAI:SPEC-0001:TC-0001-0013, TC-0001-0014               | ラッパー生成ロジック単体テスト                             |
| `tests/integration/init-legacy.test.ts`               | QFAI:SPEC-0001:TC-0001-0015, TC-0001-0016               | レガシー退避ロジック単体テスト                             |
| `tests/integration/init-error.test.ts`                | QFAI:SPEC-0001:TC-0001-0004                             | 権限エラー等の異常系テスト                                 |
| `tests/integration/init-help.test.ts`                 | QFAI:SPEC-0001:TC-0001-0017                             | --help 出力テスト                                          |
| `tests/integration/init-symlink-create.test.ts`       | QFAI:SPEC-0001:TC-0001-0021, TC-0001-0022, TC-0001-0023 | symlink 作成ロジック単体テスト（skill dir + agent file）   |
| `tests/integration/init-symlink-idempotent.test.ts`   | QFAI:SPEC-0001:TC-0001-0028, TC-0001-0029               | symlink 冪等性・壊れた symlink 修復                        |
| `tests/integration/init-prune.test.ts`                | QFAI:SPEC-0001:TC-0001-0019, TC-0001-0020, TC-0001-0030 | commands/prompts/旧ラッパー prune                          |
| `tests/integration/init-gitconfig.test.ts`            | QFAI:SPEC-0001:TC-0001-0025, TC-0001-0026, TC-0001-0027 | git config + Windows エラー + macOS/Linux 正常             |
| `tests/integration/init-copilot.test.ts`              | QFAI:SPEC-0001:TC-0001-0031                             | copilot-instructions.md 参照先更新                         |
| `tests/integration/init-symlink-paths.test.ts`        | QFAI:SPEC-0001:TC-0001-0024, TC-0001-0032               | README.md 除外 + 相対パス正規化                            |
| `tests/integration/init-migration.test.ts`            | QFAI:SPEC-0001:TC-0001-0039, TC-0001-0040, TC-0001-0041 | stale asset 検出・ガイダンス出力・サポート外バージョン拒否 |
| `tests/integration/init-migration-state.test.ts`      | QFAI:SPEC-0001:TC-0001-0042, TC-0001-0043, TC-0001-0044 | no-op/確認プロンプト/ロールバックロジック                  |
| `tests/integration/init-migration-idempotent.test.ts` | QFAI:SPEC-0001:TC-0001-0045                             | migrated 状態での冪等性                                    |
| `tests/integration/validate-version.test.ts`          | QFAI:SPEC-0001:TC-0001-0046, TC-0001-0047, TC-0001-0048 | バージョン不整合検出・正常ケース・プレリリースバージョン   |
| `tests/integration/validate-module-docs.test.ts`      | QFAI:SPEC-0001:TC-0001-0049, TC-0001-0050, TC-0001-0051 | 未ドキュメントモジュール警告・壊れた参照・正常ケース       |

### L4 API テスト

- 対象外: QFAI は API サービスではないため

### v1.7.6 Remediation 追加モジュール（DELTA-0003）

| モジュール                 | パス                                     | 操作 | 説明                                                             |
| -------------------------- | ---------------------------------------- | ---- | ---------------------------------------------------------------- |
| マイグレーション機能       | `packages/qfai/src/cli/commands/init.ts` | 修正 | `detectStaleAssets()`, `runMigration()`, `checkMigrationState()` |
| バージョン整合性検証       | `packages/qfai/src/core/validators/`     | 追加 | バージョン不整合検出バリデーター（changelog/steering/source）    |
| モジュールドキュメント検証 | `packages/qfai/src/core/validators/`     | 追加 | 内部モジュールドキュメント存在・参照整合性チェック               |

### 実装方針: マイグレーション

- マイグレーション処理は 3 段階（検出 → 実行 → 完了確認）で実装する
- サポート対象: 現行メジャー.マイナーから 1 世代前まで（例: v1.7.x → v1.6.x まで）
- 手動移行必須: それ以前のバージョン（例: v1.4.x 以前）
- 冪等性: 実行済みプロジェクトに対する再実行は安全な no-op とする

## 依存関係

- 他 spec への依存: なし
- spec-0001 は他の全 spec（spec-0002, spec-0003）に先行して実装可能
- spec-0002, spec-0003 は spec-0001 で生成される `.qfai/` 構造に依存する
- spec-0001 の symlink 関連変更は他 spec に影響なし
- `init.ts` の `syncIntegrationWrappers()` が主要変更箇所

## リスクと軽減策

| リスク                                          | 影響度 | 軽減策                                                                                 |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| ファイルシステム権限差異（Windows/macOS/Linux） | 中     | CI マトリックスで 3 OS テスト。TC-0001-0004 でエラーハンドリング検証                   |
| テンプレートファイル更新時の互換性              | 中     | assets/ のテンプレートにバージョンメタデータを埋め込み、--force 時にバージョン比較     |
| ラッパー生成先の既存ファイル衝突                | 低     | 冪等性ロジック（US-0001-0002）で既存ファイルスキップ。ログで明示表示                   |
| レガシーファイルパターンの拡張                  | 低     | 非推奨ファイルリストを設定ファイル（または定数）で管理し、拡張容易性を確保             |
| Windows Developer Mode OFF                      | 高     | エラーメッセージに Developer Mode 有効化手順を含む。TC-0001-0026 で検証                |
| AI ツールの symlink 解決の透過性                | 中     | 主要ツール（Claude Code, GitHub Copilot, Codex）で手動検証。問題発見時は fallback 検討 |
| 壊れた symlink の検出と再作成                   | 中     | `fs.lstat()` + `fs.readlink()` で検出。TC-0001-0029 で検証                             |
| バージョン比較ロジックの複雑性                  | 中     | semver ライブラリを使用してバージョン比較を実装。サポート範囲を定数で管理し拡張容易に  |
| マイグレーション中断時のデータ損失              | 高     | トランザクション的なロールバック機構を実装。中間状態を .qfai/.migration-state に記録   |
| バージョン表記の誤検出（コメント内バージョン）  | 低     | バージョン検出パターンを厳密に定義（vX.Y.Z 形式のみ対象）。テストで誤検出を網羅確認    |

## 実装順序

1. **US-0001-0001**: ワークスペース初期化（基盤機能、他 US の前提条件）
2. **US-0001-0002**: 冪等な初期化（US-0001-0001 の上に構築）
3. **US-0001-0004**: ドライラン（US-0001-0001/0002 のロジックに --dry-run フラグを追加）
4. **US-0001-0003**: 強制更新（US-0001-0002 の冪等性ロジックに --force バイパスを追加）
5. **US-0001-0005**: マルチツールラッパー生成（独立機能、US-0001-0001 後に実装可能）
6. **US-0001-0006**: レガシーファイル退避（独立機能、US-0001-0001 後に実装可能）
7. **US-0001-0009**: Git symlink 設定（symlink 生成の前提条件、`git config core.symlinks true`）
8. **US-0001-0007**: commands/prompts 廃止 + skill symlink 統合（メイン symlink 機能）
9. **US-0001-0008**: Agent symlink 化（US-0001-0007 と並行可能）
10. **US-0001-0010**: copilot-instructions.md 更新（独立機能、US-0001-0007 後に実行可能）
11. **US-0001-0011**: マイグレーションとアップグレードサポート（REQ-0018、US-0001-0001/0002 の基盤の上に構築）
12. **US-0001-0012**: バージョン表記の正規化（REQ-0019、独立機能、validate コマンドへの拡張）
13. **US-0001-0013**: 内部モジュールワークフロードキュメント（REQ-0019、US-0001-0012 と並行可能）
