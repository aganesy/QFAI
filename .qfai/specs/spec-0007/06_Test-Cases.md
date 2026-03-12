# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- 本 spec はフレームワーク設計仕様のため、TC は構造検証ルール（qfai validate チェック）であり、ランタイムテストではない。Level は L-struct を使用する。

## Test Case Table (required)

| TC-ID        | Level    | AC-Refs                   | EX-Ref       | Steps                                                                                                     | Expected                                                                                    | Notes                    |
| ------------ | -------- | ------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| TC-0007-0001 | L-struct | AC-0007-0001              | EX-0007-0001 | spec-0007 の Skill カタログを検証し、各エントリの 5 属性を確認                                            | 全 Skill に name, purpose, argument-hint, roles, mandatory-outputs が定義されている         | カタログ属性完全性       |
| TC-0007-0002 | L-struct | AC-0007-0001              | EX-0007-0002 | spec-0007 の Skill カタログのエントリ数を数える                                                           | 9 エントリが存在する                                                                        | カタログ総数             |
| TC-0007-0003 | L-struct | AC-0007-0001              | EX-0007-0003 | spec-0007 と SKILL.md の間で目的記述の整合性を確認                                                        | 矛盾が存在しない                                                                            | SSOT 整合性              |
| TC-0007-0004 | L-struct | AC-0007-0002              | EX-0007-0004 | 依存関係グラフが正しい順序で定義されていることを確認                                                      | configure -.-> discussion → sdd → prototyping → atdd → verify                               | パイプライン順序         |
| TC-0007-0005 | L-struct | AC-0007-0002              | EX-0007-0005 | configure の依存種別を確認                                                                                | soft dependency（-.->）として定義されている                                                 | soft dependency          |
| TC-0007-0006 | L-struct | AC-0007-0002              | EX-0007-0006 | prototyping のオプショナル属性を確認                                                                      | optional として定義されている                                                               | オプショナル Skill       |
| TC-0007-0007 | L-struct | AC-0007-0002              | EX-0007-0007 | 依存関係グラフに循環がないことを確認                                                                      | DAG（有向非巡回グラフ）である                                                               | 循環依存禁止             |
| TC-0007-0008 | L-struct | AC-0007-0005              | EX-0007-0008 | tdd-red, tdd-green, tdd-refactor の deprecated ステータスを確認                                           | 3 Skill 全てに deprecated が明記されている                                                  | 非推奨ステータス         |
| TC-0007-0009 | L-struct | AC-0007-0005              | EX-0007-0009 | 非推奨 Skill の移行先を確認                                                                               | 3 Skill 全ての移行先が qfai-atdd と指定されている                                           | 移行先                   |
| TC-0007-0010 | L-struct | AC-0007-0003              | EX-0007-0010 | 各 Skill の完了契約に 3 要素が含まれていることを確認                                                      | mandatory-artifacts, oq-exit-condition, gate-pass-condition が定義されている                | 完了契約構成             |
| TC-0007-0011 | L-struct | AC-0007-0003              | EX-0007-0011 | mandatory-artifacts がパスまたはパスパターンで指定されていることを確認                                    | ファイルパスまたはグロブパターン形式である                                                  | 成果物パス形式           |
| TC-0007-0012 | L-struct | AC-0007-0003              | EX-0007-0012 | oq-exit-condition が定量的に検証可能であることを確認                                                      | 数値条件（OQ 0 件等）で定義されている                                                       | OQ exit 条件             |
| TC-0007-0013 | L-struct | AC-0007-0004              | EX-0007-0013 | Evidence ファイルパスが命名規則に従っていることを確認                                                     | `.qfai/evidence/<skill>-<id>.md` パターンに合致する                                         | パス命名                 |
| TC-0007-0014 | L-struct | AC-0007-0004              | EX-0007-0014 | Evidence ファイルの必須セクションを確認                                                                   | Summary, Result, Timestamp セクションが存在する                                             | 必須セクション           |
| TC-0007-0015 | L-struct | AC-0007-0004              | EX-0007-0015 | .gitignore に `.qfai/evidence/` が含まれていないことを確認                                                | デフォルトで追跡対象である                                                                  | gitignore ポリシー       |
| TC-0007-0016 | L-struct | AC-0007-0001,AC-0007-0003 | EX-0007-0016 | パイプライン全体で Skill 出力→次 Skill 入力のトレーサビリティを確認                                       | discussion→sdd→atdd→verify の各遷移で出力と入力が対応している                               | トレーサビリティ         |
| TC-0007-0017 | L-struct | AC-0007-0006              | EX-0007-0017 | 全 9 スキルの SKILL.md で `## User Questions (AskUserQuestion Protocol)` セクションの存在と配置位置を確認 | 全 9 スキルにセクションが存在し、DRIFT-PROTOCOL 直後に配置されている                        | セクション存在・配置検証 |
| TC-0007-0018 | L-struct | AC-0007-0007              | EX-0007-0018 | 任意のスキルの AskUserQuestion Protocol セクション内に「優先使用」バレットが存在するか確認                | 「AskUserQuestion が利用可能な場合は優先使用」旨の記載が存在する                            | 優先使用ルール検証       |
| TC-0007-0019 | L-struct | AC-0007-0007              | EX-0007-0019 | 任意のスキルの AskUserQuestion Protocol セクション内に「構造化選択肢優先」バレットが存在するか確認        | 「構造化選択肢をサポートする場合、フリーテキストよりそれを優先する」旨の記載が存在する      | 構造化選択肢ルール検証   |
| TC-0007-0020 | L-struct | AC-0007-0007              | EX-0007-0020 | 任意のスキルの AskUserQuestion Protocol セクション内に「フォールバック」バレットが存在するか確認          | 「利用不可の場合は通常メッセージで選択肢を明記して確認する」旨の記載が存在する              | フォールバック検証       |
| TC-0007-0021 | L-struct | AC-0007-0008              | EX-0007-0021 | 全 9 スキルの AskUserQuestion Protocol セクション内のスキル固有例がそのスキルのドメインに固有であるか確認 | 各スキルに 1 つ以上の固有質問場面が括弧内で例示されており、スキル間で内容が差別化されている | スキル固有例検証         |
| TC-0007-0022 | L-struct | AC-0007-0006              | EX-0007-0022 | `.qfai/assistant/skills/*/SKILL.md` の 9 ファイルを走査し、AskUserQuestion Protocol セクション数を数える  | 9 ファイル全てにセクションが存在する（deprecated スキル含む）                               | 全スキル網羅検証         |
