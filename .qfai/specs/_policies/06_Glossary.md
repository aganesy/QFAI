# 06 Glossary

## 用語定義

| Term                      | Definition                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QFAI                      | Quality-First AI - AI コーディングエージェント向けの品質第一開発キット                                                                                           |
| SDD                       | Specification-Driven Development - 仕様駆動開発。仕様を先に定義し、それに基づいて実装する手法                                                                    |
| ATDD                      | Acceptance Test-Driven Development - 受入テスト駆動開発。受入条件を先にテストとして定義する手法                                                                  |
| TDD                       | Test-Driven Development - テスト駆動開発。Red-Green-Refactor サイクル                                                                                            |
| Spec                      | Specification - 仕様。QFAI では `.qfai/specs/spec-XXXX/` 配下の構造化ファイル群                                                                                  |
| Layered Spec              | レイヤードスペック。`_policies/`（共有）と `spec-XXXX/`（個別）に分離した仕様構造                                                                                |
| Spec Pack                 | レガシーの単一18ファイルバンドル形式のスペック                                                                                                                   |
| \_policies                | 共有ポリシーディレクトリ。複数 spec-XXXX にまたがる横断的な仕様（Objective, Initiative, Capabilities 等）                                                        |
| Discussion Pack           | ディスカッションパック。15ファイル構成の統合討議成果物（`.qfai/discussion/discussion-*/`）                                                                       |
| OQ                        | Open Question - 未解決の質問/課題。`11_OQ-Register.md` で管理                                                                                                    |
| OQ Register               | 全 OQ を管理する台帳。Disposition（open/resolved/deferred/rejected）で状態管理                                                                                   |
| Contract                  | コントラクト。UI/API/DB の定義ファイル。`.qfai/contracts/` 配下                                                                                                  |
| Traceability              | トレーサビリティ。要件からテストへの追跡可能性                                                                                                                   |
| Traceability Edge         | トレーサビリティの参照関係                                                                                                                                       |
| Validator                 | バリデータ。特定の検証ルールを実装する async 関数。`Issue[]` を返す                                                                                              |
| Issue                     | バリデーション結果の個別項目。code, severity, message, file 等を持つ                                                                                             |
| Waiver                    | ウェイバー。特定ルールの suppress（抑制）または downgrade（重要度下げ）                                                                                          |
| CAP                       | Capability - 能力/機能単位。`CAP-XXXX` 形式。`_policies/03_Capabilities.md` で定義                                                                               |
| ATDD Annotation           | テストファイル内のトレーサビリティアノテーション                                                                                                                 |
| Review Pack               | レビューパック。`review-*/` 配下のレビュー成果物                                                                                                                 |
| Drift Protocol            | ドリフトプロトコル。仕様とコードの乖離を検出・記録する仕組み                                                                                                     |
| Skill                     | スキル。QFAI ワークフローの独立した実行単位。SKILL.md で定義され、入力・出力・ロール・完了契約・Evidence 要件を持つ                                              |
| Agent                     | エージェント（サブエージェント）。Skill 内で委任される専門化された作業者。39 種類が定義され、Mission・Inputs・Deliverables・Stop Conditions・Sign-off 構造を持つ |
| Orchestrator              | 作業命令の作成・委任・統合・結果提示のみを行うメタエージェント。第一草稿の直接生成と自己承認が禁止されている                                                     |
| Steering                  | ステアリング。manifest, product, structure, tech, test-layers の 5 文書で構成される意思決定の背骨                                                                |
| Instructions              | 操作プレイブック。workflow, drift-protocol, constitution, agent-selection, requirements-decomposition の 5 文書                                                  |
| Constitution              | 9 つの非交渉条項（Article I〜IX）。Evidence over confidence、No invented facts、SDD is SSOT 等。例外なし                                                         |
| Capability Probe          | Skill 開始時にサブエージェント利用可否を確認する軽量テスト。失敗時は Simulation Mode の承認を要求する                                                            |
| Simulation Mode           | サブエージェント利用不可時にユーザー承認のもとでロールを逐次エミュレートするフォールバック。明示的 opt-in 必須                                                   |
| Escalation Hook           | spec-XXXX/01_Spec.md に記載される \_policies への参照委譲メカニズム。NFR・policy・requirements の copy-down を行う                                               |
| Traceability Chain        | discussion → specs → tests → code → verification の 5 段階連鎖。各段の成果物が ID で追跡可能                                                                     |
| Change Request            | Drift Protocol 発動時に作成される変更提案。context, proposed change, 3+ 選択肢, 推奨, 影響範囲を含む                                                             |
| Review Roster             | review-roster.yml で定義される 10 人のレビュアーリスト。scope, must_check, can_be_na, na_rule を持つ                                                             |
| RCP                       | Review Cycle Protocol。レビュー周回手順。append-only、FAIL 即修正、roster 先頭から再実行                                                                         |
| Canonical Workflow Stages | Stage 0（steering refresh）〜 Stage 6（verify）の 7 段階ワークフロー                                                                                             |
| Work Orders Summary       | サブエージェント委任の記録テーブル。Step, Role, Task title, Input refs, Output refs, Status の列を持つ                                                           |
| Completion Contract       | 各 Skill の完了条件。必須成果物一覧、OQ exit 条件、Gate pass 条件を含む                                                                                          |
| Evidence                  | Skill 実行の客観的証拠。.qfai/evidence/ 配下に markdown（人間向け）+ json（機械向け）で記録。gitignored                                                          |
| Reference Direction Rule  | upper-to-lower 禁止（\_policies に US/AC/BR/EX/TC を書かない）、lower-to-upper 許可の参照方向規則                                                                |

## 略語一覧

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
| CR           | Change Request                               |
| RCP          | Review Cycle Protocol                        |

## 使用ルール

- 全成果物で上記の用語定義に従い、一貫した用語を使用すること
- 新しい用語が登場した場合は本 Glossary に追加すること
- 略語は初出時にフルフォームを併記すること
