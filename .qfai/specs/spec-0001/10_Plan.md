# 10 Plan

- Spec: spec-0001
- Parent: CAP-0001

## 実装戦略

### 主要モジュール

| モジュール | パス | 操作 | 説明 |
| --- | --- | --- | --- |
| init コマンド | `packages/qfai/src/cli/commands/init.ts` | 修正 | CLI エントリポイント。--force, --dry-run, --help オプション処理 |
| init アセット | `packages/qfai/assets/init/` | 新規/修正 | テンプレートファイル群（ディレクトリ構造、qfai.config.yaml テンプレート） |
| ラッパー生成 | `packages/qfai/src/cli/commands/init/wrappers.ts` | 新規 | Claude/Copilot/Codex/Agents ラッパー生成ロジック |
| レガシー退避 | `packages/qfai/src/cli/commands/init/legacy.ts` | 新規 | 非推奨ファイル検出・.qfai/.legacy/ 退避ロジック |
| FS ユーティリティ | `packages/qfai/src/cli/lib/fs.ts` | 修正 | 冪等なファイル書き込み（exist チェック + スキップ）ヘルパー |
| アセットユーティリティ | `packages/qfai/src/cli/lib/assets.ts` | 修正 | アセット参照パス解決 |

### ディレクトリ構造生成対象

- `.qfai/assistant/`
- `.qfai/specs/`
- `.qfai/contracts/`
- `.qfai/discussion/`
- `.qfai/evidence/`
- `.qfai/review/`
- `.qfai/report/`

### ラッパー生成対象

- `.claude/commands/` - Claude Code ラッパー
- `.github/prompts/` - GitHub Copilot ラッパー
- `.codex/skills/` - Codex ラッパー
- `.agents/skills/` - Anthropic Agents ラッパー

## テスト戦略

### L5 E2E テスト（tests/e2e/）

| テストファイル | アノテーション | 検証内容 |
| --- | --- | --- |
| `tests/e2e/init-basic.test.ts` | QFAI:SPEC-0001:US-0001-0001 | 空ディレクトリでの init 実行、7サブディレクトリ生成確認 |
| `tests/e2e/init-idempotent.test.ts` | QFAI:SPEC-0001:US-0001-0002 | 2回実行で既存ファイルスキップ、新規のみ追加 |
| `tests/e2e/init-force.test.ts` | QFAI:SPEC-0001:US-0001-0003 | --force でスキル上書き、skills.local/ 保護確認 |
| `tests/e2e/init-dry-run.test.ts` | QFAI:SPEC-0001:US-0001-0004 | --dry-run でファイル非作成、[CREATE]/[SKIP] 出力確認 |
| `tests/e2e/init-wrappers.test.ts` | QFAI:SPEC-0001:US-0001-0005 | ラッパーファイル生成・参照パス確認 |
| `tests/e2e/init-legacy.test.ts` | QFAI:SPEC-0001:US-0001-0006 | レガシーファイル検出・.qfai/.legacy/ 退避確認 |

### L3 Integration テスト（tests/integration/）

| テストファイル | アノテーション | 検証内容 |
| --- | --- | --- |
| `tests/integration/init-fs-ops.test.ts` | QFAI:SPEC-0001:TC-0001-0001, TC-0001-0002, TC-0001-0003 | FS 操作単体テスト（ディレクトリ作成、設定ファイル生成） |
| `tests/integration/init-idempotent.test.ts` | QFAI:SPEC-0001:TC-0001-0005, TC-0001-0006, TC-0001-0007 | 冪等性ロジック単体テスト |
| `tests/integration/init-force.test.ts` | QFAI:SPEC-0001:TC-0001-0008, TC-0001-0009 | --force ロジック単体テスト |
| `tests/integration/init-dry-run.test.ts` | QFAI:SPEC-0001:TC-0001-0010, TC-0001-0011, TC-0001-0012 | --dry-run ロジック単体テスト |
| `tests/integration/init-wrappers.test.ts` | QFAI:SPEC-0001:TC-0001-0013, TC-0001-0014 | ラッパー生成ロジック単体テスト |
| `tests/integration/init-legacy.test.ts` | QFAI:SPEC-0001:TC-0001-0015, TC-0001-0016 | レガシー退避ロジック単体テスト |
| `tests/integration/init-error.test.ts` | QFAI:SPEC-0001:TC-0001-0004 | 権限エラー等の異常系テスト |
| `tests/integration/init-help.test.ts` | QFAI:SPEC-0001:TC-0001-0017 | --help 出力テスト |

### L4 API テスト

- 対象外: QFAI は API サービスではないため

## 依存関係

- 他 spec への依存: なし
- spec-0001 は他の全 spec（spec-0002, spec-0003）に先行して実装可能
- spec-0002, spec-0003 は spec-0001 で生成される `.qfai/` 構造に依存する

## リスクと軽減策

| リスク | 影響度 | 軽減策 |
| --- | --- | --- |
| ファイルシステム権限差異（Windows/macOS/Linux） | 中 | CI マトリックスで 3 OS テスト。TC-0001-0004 でエラーハンドリング検証 |
| テンプレートファイル更新時の互換性 | 中 | assets/ のテンプレートにバージョンメタデータを埋め込み、--force 時にバージョン比較 |
| ラッパー生成先の既存ファイル衝突 | 低 | 冪等性ロジック（US-0001-0002）で既存ファイルスキップ。ログで明示表示 |
| レガシーファイルパターンの拡張 | 低 | 非推奨ファイルリストを設定ファイル（または定数）で管理し、拡張容易性を確保 |

## 実装順序

1. **US-0001-0001**: ワークスペース初期化（基盤機能、他 US の前提条件）
2. **US-0001-0002**: 冪等な初期化（US-0001-0001 の上に構築）
3. **US-0001-0004**: ドライラン（US-0001-0001/0002 のロジックに --dry-run フラグを追加）
4. **US-0001-0003**: 強制更新（US-0001-0002 の冪等性ロジックに --force バイパスを追加）
5. **US-0001-0005**: マルチツールラッパー生成（独立機能、US-0001-0001 後に実装可能）
6. **US-0001-0006**: レガシーファイル退避（独立機能、US-0001-0001 後に実装可能）
