# 08 Glossary

## Term Definitions

| Term              | Definition                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| QFAI              | Quality-First AI - AI コーディングエージェント向けの品質第一開発キット                                    |
| SDD               | Specification-Driven Development - 仕様駆動開発。仕様を先に定義し、それに基づいて実装する手法             |
| ATDD              | Acceptance Test-Driven Development - 受入テスト駆動開発。受入条件を先にテストとして定義する手法           |
| TDD               | Test-Driven Development - テスト駆動開発。Red-Green-Refactor サイクル                                     |
| Spec              | Specification - 仕様。QFAI では `.qfai/specs/spec-XXXX/` 配下の構造化ファイル群                           |
| Layered Spec      | レイヤードスペック。`_policies/`（共有）と `spec-XXXX/`（個別）に分離した仕様構造                         |
| Spec Pack         | レガシーの単一18ファイルバンドル形式のスペック                                                            |
| \_policies        | 共有ポリシーディレクトリ。複数 spec-XXXX にまたがる横断的な仕様（Objective, Initiative, Capabilities 等） |
| Discussion Pack   | ディスカッションパック。15ファイル構成の統合討議成果物（`.qfai/discussion/discussion-*/`）                |
| OQ                | Open Question - 未解決の質問/課題。`11_OQ-Register.md` で管理                                             |
| OQ Register       | 全 OQ を管理する台帳。Disposition（open/resolved/deferred/rejected）で状態管理                            |
| Contract          | コントラクト。UI/API/DB の定義ファイル。`.qfai/contracts/` 配下                                           |
| Traceability      | トレーサビリティ。要件→テストの追跡可能性。US→AC→BR→EX→TC のチェーン                                      |
| Traceability Edge | トレーサビリティの参照関係。AC→TC, BR→EX, EX→TC 等                                                        |
| Validator         | バリデータ。特定の検証ルールを実装する async 関数。`Issue[]` を返す                                       |
| Issue             | バリデーション結果の個別項目。code, severity, message, file 等を持つ                                      |
| Waiver            | ウェイバー。特定ルールの suppress（抑制）または downgrade（重要度下げ）                                   |
| CAP               | Capability - 能力/機能単位。`CAP-XXXX` 形式。`_policies/03_Capabilities.md` で定義                        |
| US                | User Story - ユーザーストーリー。`US-XXXX` 形式                                                           |
| AC                | Acceptance Criteria - 受入条件。`AC-XXXX` 形式                                                            |
| BR                | Business Rule - ビジネスルール。`BR-XXXX` 形式                                                            |
| EX                | Example - 具体例。`EX-XXXX` 形式。Gherkin シナリオで記述                                                  |
| TC                | Test Case - テストケース。`TC-XXXX` 形式                                                                  |
| SC                | Scenario - シナリオ。`SC-DDDD-DDDD` 形式（spec-id-scenario-id）                                           |
| ATDD Annotation   | テストファイル内のトレーサビリティアノテーション。`QFAI:SPEC-XXXX:US-YYYY` 等                             |
| Review Pack       | レビューパック。`review-*/` 配下の review*request.md, Rxx*\*.md, summary.json                             |
| RCP               | Review Completion Process - レビュー完了プロセス                                                          |
| Drift Protocol    | ドリフトプロトコル。仕様とコードの乖離を検出・記録する仕組み                                              |
| Skill             | スキル。AI エージェントに対するタスク指示セット（SKILL.md + テンプレート）                                |
| Agent             | エージェント。特定の役割を持つ AI ペルソナ（Architect, QA Engineer 等）                                   |
| Steering          | ステアリング。レビューロスター・ゲートルール等のガバナンス設定                                            |
| fast-glob         | Node.js のファイルグロブライブラリ。ファイル検索に使用                                                    |
| jsdom             | DOM 実装ライブラリ。UI フィデリティ自動検証で使用                                                         |
| tsup              | TypeScript ビルドツール。ESM/CJS デュアルビルドに使用                                                     |
| Vitest            | テストフレームワーク。ユニット/インテグレーションテストに使用                                             |

## Abbreviations

| Abbreviation | Full Form                                    |
| ------------ | -------------------------------------------- |
| CLI          | Command-Line Interface                       |
| CI/CD        | Continuous Integration / Continuous Delivery |
| DOM          | Document Object Model                        |
| ESM          | ECMAScript Modules                           |
| CJS          | CommonJS                                     |
| SSOT         | Single Source of Truth                       |
| NFR          | Non-Functional Requirement                   |
| REQ          | Functional Requirement                       |
| API          | Application Programming Interface            |
| UI           | User Interface                               |
| DB           | Database                                     |
| YAML         | YAML Ain't Markup Language                   |
| JSON         | JavaScript Object Notation                   |
| OSS          | Open Source Software                         |

## Usage Rules

- 全成果物で上記の用語定義に従い、一貫した用語を使用すること
- 新しい用語が登場した場合は本 Glossary に追加すること
- 略語は初出時にフルフォームを併記すること
