# spec-0017: Copilot Review Instructions Distribution

## Parent

CAP-0017 — Copilot レビューインストラクション配布 (Copilot Review Instructions)

## Scope

qfai init への Copilot レビューインストラクション配布機能追加。`.github/instructions/` に汎用コードレビュー指示テンプレート（code-review, principles）を create-only で配置し、既存ファイルを保護する。

## Success Criteria

1. `qfai init` を新規リポジトリで実行すると `.github/instructions/code-review.instructions.md` と `.github/instructions/principles.instructions.md` が生成される
2. 既存の `.github/instructions/` ファイルがあるリポジトリで `qfai init` しても既存ファイルが上書きされない
3. `--force` を付けても instructions ファイルは上書きされない
4. `qfai init --dry-run` で instructions の配置予定が正しくレポートされる
5. 既存テストスイートが壊れない

## Requirements Summary

| REQ ID   | Summary                                          |
| -------- | ------------------------------------------------ |
| REQ-0001 | 汎用 code-review.instructions.md 配置（create-only, YAML frontmatter, severity prefixes, no language-specific checks） |
| REQ-0002 | 汎用 principles.instructions.md 配置（create-only, YAML frontmatter, SOLID/KISS/YAGNI/DRY） |
| REQ-0003 | create-only 保護（--force disabled）             |
| REQ-0004 | テンプレートアセット格納（packages/qfai/assets/init/.github/instructions/） |
| REQ-0005 | レポート統合（created/skipped に instructions を含める） |
| REQ-0006 | ディレクトリ自動作成（.github/instructions/）    |
| REQ-0007 | SDD 追記用マーカーコメント `<!-- qfai:language-rules -->` |
| REQ-0008 | init 後のアクティベーション案内メッセージ        |

## NFR Copy-down

| NFR ID   | Summary                                    | Source          |
| -------- | ------------------------------------------ | --------------- |
| NFR-0001 | 冪等性（複数回実行 = 同一結果）            | _policies NFR   |
| NFR-0002 | 後方互換性（既存動作に変更なし）           | _policies NFR   |
| NFR-0003 | GitHub Copilot Instructions 仕様準拠       | _policies NFR   |
| NFR-0004 | パフォーマンス（追加オーバーヘッド <100ms）| _policies NFR   |

## Escalation Hook

Cross-cutting policies (Glossary, Constraints, Decisions) are managed in `_policies/`. This spec references but does not duplicate them:

- Glossary: `_policies/06_Glossary.md` — Copilot Instructions, SDD Insertion Marker, create-only Protection
- Constraints: `_policies/07_Constraints.md` — TC-25, TC-26, OC-16, OC-17
- Decisions: `_policies/08_Decisions.md` — DR-0022 through DR-0026

## Discussion Source

`.qfai/discussion/discussion-20260322091309602/`
