# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Level: L-struct（構造バリデーション — `qfai validate` による静的検証）

## Test Case Table (required)

| TC-ID        | Level   | AC-Refs      | EX-Ref       | Steps                                                                                                           | Expected                                                                                               | Notes                              |
| ------------ | ------- | ------------ | ------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| TC-0010-0001 | L-struct | AC-0010-0001 | EX-0010-0001 | 1. `.qfai/assistant/steering/` 配下のファイル一覧を取得する                                                    | manifest.md, product.md, structure.md, tech.md, test-layers.md の 5 ファイルが存在する                 | Steering 文書構成の構造検証        |
| TC-0010-0002 | L-struct | AC-0010-0001 | EX-0010-0002 | 1. manifest.md を読み込む 2. 必須セクションの存在を検証する                                                    | product mission, axioms, compatibility rubric, governance, evidence セクションが存在する               | manifest.md 責務の構造検証         |
| TC-0010-0003 | L-struct | AC-0010-0002 | EX-0010-0003 | 1. `.qfai/assistant/instructions/` 配下のファイル一覧を取得する                                                | workflow.md, drift-protocol.md, constitution.md, agent-selection.md, requirements-decomposition.md が存在 | Instructions 文書構成の構造検証    |
| TC-0010-0004 | L-struct | AC-0010-0003 | EX-0010-0004 | 1. `.qfai/assistant/steering/review-roster.yml` を読み込む 2. reviewers エントリ数を検証する                   | 10 reviewers のエントリが定義されている                                                                | Review Roster 構成の構造検証       |
| TC-0010-0005 | L-struct | AC-0010-0003 | EX-0010-0005 | 1. review-roster.yml のスキーマを検証する 2. verdict フィールドの許容値を確認する                              | verdict は PASS, FAIL, N/A のいずれか。N/A の場合 na_rule フィールドが必須                             | 評決ルールの構造検証               |
| TC-0010-0006 | L-struct | AC-0010-0003 | EX-0010-0006 | 1. FAIL 発生時のフロー定義を検証する                                                                           | FAIL → 即時修正 → 新 review-pack → 最初のレビュアーから再開のフローが定義されている                   | FAIL ループ復帰の定義検証          |
| TC-0010-0007 | L-struct | AC-0010-0003 | EX-0010-0007 | 1. review-pack の書き込みポリシーを検証する                                                                    | append-only ポリシーが定義されている                                                                   | append-only の定義検証             |
| TC-0010-0008 | L-struct | AC-0010-0004 | EX-0010-0009 | 1. constitution.md を読み込む 2. Article I〜IX の存在を検証する                                                | 9 Articles（Article I〜Article IX）がすべて記載されている                                              | Constitution 9 Articles 網羅性検証 |
| TC-0010-0009 | L-struct | AC-0010-0004 | EX-0010-0008 | 1. Constitution の適用範囲定義を検証する                                                                        | 非交渉条項・例外なし原則が明記されている                                                               | 非交渉原則の定義検証               |
| TC-0010-0010 | L-struct | AC-0010-0005 | EX-0010-0012 | 1. Canonical Workflow Stages 定義を読み込む 2. ステージ数を検証する                                            | Stage 0〜Stage 6 の 7 ステージが定義されている                                                        | 7 ステージ構成の構造検証           |
| TC-0010-0011 | L-struct | AC-0010-0005 | EX-0010-0010 | 1. Stage 0 の定義を検証する                                                                                    | Stage 0（steering refresh）が全 Skill 開始時に必須である旨が定義されている                             | Stage 0 必須実行の定義検証         |
| TC-0010-0012 | L-struct | AC-0010-0005 | EX-0010-0011 | 1. Stage 4 の定義を検証する                                                                                    | Stage 4（prototyping）がオプショナルである旨が定義されている                                           | Stage 4 オプショナルの定義検証     |
| TC-0010-0013 | L-struct | AC-0010-0005 | EX-0010-0013 | 1. 各ステージの遷移条件定義を検証する                                                                          | 各ステージに入力・出力・遷移条件が定義されている                                                       | 遷移条件の定義検証                 |
