# 05 Scope

## In Scope

1. **CLI コマンド体系**: init, validate, report, doctor, guardrails, prototyping の全機能仕様
2. **バリデーションルール体系**: 50以上の QFAI-XXXX ルールコードの定義・動作仕様
3. **スペックレイアウトシステム**: レイヤードスペック（`_policies/` + `spec-XXXX/`）の構造・必須ファイル・ID体系
4. **ディスカッションパックシステム**: 15ファイル構造、OQ ゲート、readiness チェック
5. **コントラクトシステム**: UI/API/DB コントラクトの定義・検証・参照整合性
6. **トレーサビリティシステム**: US→AC→BR→EX→TC チェーン、ATDD コードアノテーション
7. **ウェイバーシステム**: ルール抑制・ダウングレード・有効期限
8. **設定システム**: qfai.config.yaml のスキーマ・デフォルト値・パス解決
9. **レポートシステム**: Markdown/JSON 出力形式、ランログ
10. **マルチツール統合**: Claude Code, GitHub Copilot, Codex, Anthropic Agents ラッパー生成
11. **アセットシステム**: テンプレートの構成・バージョン管理・マイグレーション
12. **レビューアーティファクト**: review-pack 構造、summary.json スキーマ

## Out of Scope

1. **IDE プラグイン / GUI 開発**: CLI のみ
2. **AI エージェント自体のホスティング・実行**: QFAI はバリデーションツールのみ
3. **コード品質分析**: ESLint/SonarQube 等の静的解析の代替ではない
4. **テスト自動生成**: テストファイルのアノテーション検証のみ
5. **自然言語の意味解析**: 構造・形式の検証のみ
6. **ビジュアルリグレッションテスト**: UI フィデリティは DOM 構造レベルの検証
7. **CI ランナー機能**: バリデーション結果を CI が解釈する前提

## Constraints

| Type        | Constraint                                          |
| ----------- | --------------------------------------------------- |
| Technical   | Node.js >= 18.0.0 必須                               |
| Technical   | TypeScript ESM/CJS デュアルビルド（tsup）            |
| Operational | CI/CD 環境で 2分以内に完了すること                    |
| Legal       | MIT ライセンス                                       |
| Dependency  | @cucumber/gherkin v37+ for Gherkin パース             |
| Dependency  | jsdom v26+ for DOM クローリング                       |

## Success Criteria

| Criteria                                                    | Measurement                               |
| ----------------------------------------------------------- | ----------------------------------------- |
| 全 CLI コマンドの要件が REQ として定義されている             | REQ-0001 ~ REQ-XXXX の網羅性             |
| 全バリデーションルールが NFR/REQ で参照可能                 | QFAI-XXXX コードと REQ/NFR の対応表       |
| レイヤードスペック構造が完全に定義されている                 | specLayout.ts の全パターンをカバー        |
| トレーサビリティの全エッジが仕様化されている                | AC→TC, BR→EX, EX→TC の完全定義           |
| コントラクト検証ルールが仕様化されている                   | UI/API/DB 各コントラクトタイプのルール    |
| OQ が全て resolved または deferred                          | 11_OQ-Register.md で open=0              |

## Assumptions

- QFAI の仕様は現在のコードベース（v1.5.3）を正とする
- レガシー形式（spec-pack, v1.4.16 以前）のサポートは互換性維持のために残すが、新規推奨はレイヤード形式
- 日本語と英語の両方で出力をサポートする必要がある
