# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Level: L-struct（構造バリデーション — `qfai validate` による静的検証）

## Test Case Table (required)

| TC-ID        | Level    | AC-Refs      | EX-Ref       | Steps                                                                                        | Expected                                                                                                  | Notes                               |
| ------------ | -------- | ------------ | ------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-0010-0001 | L-struct | AC-0010-0001 | EX-0010-0001 | 1. `.qfai/assistant/steering/` 配下のファイル一覧を取得する                                  | manifest.md, product.md, structure.md, tech.md, test-layers.md の 5 ファイルが存在する                    | Steering 文書構成の構造検証         |
| TC-0010-0002 | L-struct | AC-0010-0001 | EX-0010-0002 | 1. manifest.md を読み込む 2. 必須セクションの存在を検証する                                  | product mission, axioms, compatibility rubric, governance, evidence セクションが存在する                  | manifest.md 責務の構造検証          |
| TC-0010-0003 | L-struct | AC-0010-0002 | EX-0010-0003 | 1. `.qfai/assistant/instructions/` 配下のファイル一覧を取得する                              | workflow.md, drift-protocol.md, constitution.md, agent-selection.md, requirements-decomposition.md が存在 | Instructions 文書構成の構造検証     |
| TC-0010-0004 | L-struct | AC-0010-0003 | EX-0010-0004 | 1. `.qfai/assistant/steering/review-roster.yml` を読み込む 2. reviewers エントリ数を検証する | 10 reviewers のエントリが定義されている                                                                   | Review Roster 構成の構造検証        |
| TC-0010-0005 | L-struct | AC-0010-0003 | EX-0010-0005 | 1. review-roster.yml のスキーマを検証する 2. verdict フィールドの許容値を確認する            | verdict は PASS, FAIL, N/A のいずれか。N/A の場合 na_rule フィールドが必須                                | 評決ルールの構造検証                |
| TC-0010-0006 | L-struct | AC-0010-0003 | EX-0010-0006 | 1. FAIL 発生時のフロー定義を検証する                                                         | FAIL → 即時修正 → 新 review-pack → 最初のレビュアーから再開のフローが定義されている                       | FAIL ループ復帰の定義検証           |
| TC-0010-0007 | L-struct | AC-0010-0003 | EX-0010-0007 | 1. review-pack の書き込みポリシーを検証する                                                  | append-only ポリシーが定義されている                                                                      | append-only の定義検証              |
| TC-0010-0008 | L-struct | AC-0010-0004 | EX-0010-0009 | 1. constitution.md を読み込む 2. Article I〜X の存在を検証する                               | 10 Articles（Article I〜Article X）がすべて記載されている                                                 | Constitution 10 Articles 網羅性検証 |
| TC-0010-0009 | L-struct | AC-0010-0004 | EX-0010-0008 | 1. Constitution の適用範囲定義を検証する                                                     | 非交渉条項・例外なし原則が明記されている                                                                  | 非交渉原則の定義検証                |
| TC-0010-0010 | L-struct | AC-0010-0005 | EX-0010-0012 | 1. Canonical Workflow Stages 定義を読み込む 2. ステージ数を検証する                          | Stage 0〜Stage 6 の 7 ステージが定義されている                                                            | 7 ステージ構成の構造検証            |
| TC-0010-0011 | L-struct | AC-0010-0005 | EX-0010-0010 | 1. Stage 0 の定義を検証する                                                                  | Stage 0（steering refresh）が全 Skill 開始時に必須である旨が定義されている                                | Stage 0 必須実行の定義検証          |
| TC-0010-0012 | L-struct | AC-0010-0005 | EX-0010-0011 | 1. Stage 4 の定義を検証する                                                                  | Stage 4（prototyping）がオプショナルである旨が定義されている                                              | Stage 4 オプショナルの定義検証      |
| TC-0010-0013 | L-struct | AC-0010-0005 | EX-0010-0013 | 1. 各ステージの遷移条件定義を検証する                                                        | 各ステージに入力・出力・遷移条件が定義されている                                                          | 遷移条件の定義検証                  |
| TC-0010-0014 | L-struct | AC-0010-0006 | EX-0010-0014 | 1. constitution.md を読み込む 2. Article X セクションの存在と MUST 表現を検証する            | Article X が存在し AskUserQuestion の MUST 使用が規定されている                                           | Article X 追加の検証                |
| TC-0010-0015 | L-struct | AC-0010-0007 | EX-0010-0018 | 1. communication.md を読み込む 2. AskUserQuestion Protocol セクションの存在を検証する        | MUST 使用・構造化選択肢・フォールバック・--auto 整合性が記載されている                                    | communication.md 更新の検証         |
| TC-0010-0016 | L-struct | AC-0010-0008 | EX-0010-0018 | 1. 全 9 SKILL.md を読み込む 2. AskUserQuestion Protocol の MUST 表現を検証する               | 全スキルで MUST 表現が使用され SHOULD 表現が残っていない                                                  | SKILL.md MUST 統一の検証            |
| TC-0010-0017 | L-struct | AC-0010-0009 | EX-0010-0015 | 1. constitution.md のフォールバック条件を検証する                                            | 技術的利用不可時の理由明示義務と構造化選択肢維持の努力義務が定義されている                                | フォールバック定義の検証            |
| TC-0010-0018 | L-struct | AC-0010-0010 | EX-0010-0019 | 1. --auto フラグの挙動定義を検証する                                                         | ゼロ質問ルールと前提明示記録が定義されている。例外ではなく質問不要モードとして記載                        | --auto 整合性の検証                 |
| TC-0010-0019 | L-struct | AC-0010-0006 | EX-0010-0017 | 1. constitution.md の P1 再読み込み仕様を確認する                                            | Article X がコンパクト実行後も P1 として再読み込みされる設計になっている                                  | コンパクト耐性の検証                |
| TC-0010-0020 | L-struct | AC-0010-0009 | EX-0010-0020 | 1. フォールバック条件の理由明示必須ルールを検証する                                          | 理由なしフォールバックが許容されない旨が明記されている                                                    | 理由なしフォールバック防止の検証    |
