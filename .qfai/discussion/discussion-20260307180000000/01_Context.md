# 01_Context

| Key           | Value                                      |
| ------------- | ------------------------------------------ |
| Discussion ID | discussion-20260307180000000               |
| Date          | 2026-03-07                                 |
| Owner         | user                                       |
| Source        | Repository analysis (QFAI v1.5.3 codebase) |

## Goal and Completion Criteria

**Goal**: QFAI リポジトリの実装を徹底分析し、完全な仕様（spec）を `/qfai-sdd` で生成するための、正確かつ網羅的なディスカッションパックを作成する。

**Completion Criteria**:

- QFAI の全機能（init, validate, report, doctor, guardrails, prototyping）の要件が REQ/NFR として整理されていること
- バリデーションルール（QFAI-XXXX コード群）の体系が文書化されていること
- コントラクト・トレーサビリティ・レイヤードスペックの仕組みが明確化されていること
- 開発経緯（v0.2.1 から v1.5.3 まで）の主要決定が記録されていること
- Open Question がゼロであること

## Stakeholders

| Role              | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| Product Owner     | QFAI 開発者・メンテナ（aganesy）                                |
| Target Users      | AI コーディングエージェント（Claude, GitHub Copilot, Codex 等） |
| Integration Users | AI アシスタント統合を行う開発チーム                             |
| Community         | OSS 利用者・コントリビュータ                                    |

## Background

### Business Context

AI コーディングエージェントは高速にコードを生成できるが、要件の誤解・仕様からのドリフト・ハルシネーションによる品質低下が課題となっている。QFAI は「品質第一」の原則で、SDD（Specification-Driven Development）、ATDD（Acceptance Test-Driven Development）、TDD（Test-Driven Development）を統合し、客観的なバリデーションゲートを提供することでこの問題を解決する。

### Technical Context

- **アーキテクチャ**: pnpm monorepo（`packages/qfai/`）
- **技術スタック**: TypeScript 5.6.3, Node.js >=18.0.0, tsup（ビルド）, Vitest（テスト）
- **依存関係**: @cucumber/gherkin（Gherkin パース）, yaml（YAML パース）, jsdom（DOM クローリング）, fast-glob（ファイル検索）
- **配布**: npm パッケージ（`npx qfai init` でプロジェクト初期化）
- **CLI エントリポイント**: `packages/qfai/src/cli/index.ts`

### Historical Context

| Version | Key Change                                                      |
| ------- | --------------------------------------------------------------- |
| v0.2.1  | 初期リリース - 基本バリデーション                               |
| v1.2.x  | デザインバンドル導入                                            |
| v1.3.x  | スキルラッパー（Copilot/Codex/Claude）導入                      |
| v1.4.16 | レガシーレイヤード形式                                          |
| v1.4.17 | レイヤードスペック形式導入（`_shared/` → `_policies/`）         |
| v1.4.25 | レイヤードスペック改革（重要アーキテクチャ変更）                |
| v1.4.26 | ATDD コードトレーサビリティハードゲート                         |
| v1.4.36 | UI フィデリティ自動生成（jsdom DOM クローリング）               |
| v1.5.0  | 統合ディスカッションパック（15 ファイル、discuss/require 統合） |
| v1.5.3  | ポリシー命名統一（`_shared/` → `_policies/`）                   |

## Inputs

### Existing Facts

- ソースコード: `packages/qfai/src/` 配下の約91個の TypeScript ファイル（約9,500行）
- 33個のバリデータ関数、50以上のルールコード
- 39個のエージェント定義、9個のカノニカルスキル
- テンプレートアセット: `packages/qfai/assets/init/`
- テスト: Vitest ベースのユニット/インテグレーションテスト

### External References

- GitHub リポジトリ: `github.com/aganesy/QFAI`
- CHANGELOG.md: 全バージョン履歴
- docs/: マイグレーションガイド、ルール説明、スキーマ定義

### Assumptions

- 本ディスカッションの対象は QFAI CLI ツール自体の仕様であり、QFAI を適用する対象プロジェクトの仕様ではない
- CLI は GUI を持たない（ただし `prototyping` コマンドで DOM クローリング機能あり）
- ライセンスは MIT

## Key Issues

1. **バリデーションルール体系の完全な文書化**: 50以上のルールコード（QFAI-XXXX）の網羅的整理
2. **レイヤードスペックの設計意図**: なぜ `_policies/` と `spec-XXXX/` に分離したのか
3. **ATDD トレーサビリティの強制戦略**: テストファイルアノテーション（QFAI:SPEC-XXXX:US-YYYY）の意図と限界
4. **ディスカッションパックの妥当性チェック**: 15ファイル構造と OQ ゲートの設計根拠
5. **コントラクトシステムの範囲**: UI/API/DB コントラクトの定義と検証の詳細
6. **ウェイバーシステム**: 例外管理の仕組みと有効期限ルール
