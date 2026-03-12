# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                     | Expected                                                                                                                                         | Notes                    |
| ------------ | ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| EX-0007-0001 | BR-0007-0001 | qfai-discussion の Skill カタログエントリを参照           | name=qfai-discussion, purpose=ディスカッションパック作成, argument-hint=CAP-ID, roles=SpecWriter, mandatory-outputs=15 ファイル が定義されている | カタログ属性の具体例     |
| EX-0007-0002 | BR-0007-0002 | 当該 Spec の Skill カタログを数える                       | 9 エントリ（discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor）が存在する                                  | 総数チェック             |
| EX-0007-0003 | BR-0007-0003 | 当該 Spec の qfai-sdd の purpose と SKILL.md の目的を比較 | 矛盾がない（Spec は設計契約、SKILL.md はランタイム詳細）                                                                                         | SSOT 整合性確認          |
| EX-0007-0004 | BR-0007-0004 | 依存関係グラフを参照                                      | configure -.-> discussion → sdd → prototyping → atdd → verify の順序が定義されている                                                             | メインパイプライン       |
| EX-0007-0005 | BR-0007-0005 | configure を実行せずに discussion を実行しようとする      | configure は soft dependency のため実行可能だが、未設定の場合は警告が出る旨が記載されている                                                      | soft dependency の具体例 |
| EX-0007-0006 | BR-0007-0006 | sdd 完了後に prototyping をスキップして atdd を実行       | prototyping はオプショナルなのでスキップ可能である旨が記載されている                                                                             | オプショナル Skill       |
| EX-0007-0007 | BR-0007-0007 | atdd → sdd の逆方向依存を定義しようとする                 | 循環依存となるため禁止。依存グラフは DAG であること                                                                                              | 循環依存禁止の具体例     |
| EX-0007-0008 | BR-0007-0008 | qfai-tdd-red のカタログエントリを参照                     | status=deprecated が明記されている                                                                                                               | 非推奨ステータス         |
| EX-0007-0009 | BR-0007-0009 | qfai-tdd-green のカタログエントリを参照                   | migration-target=qfai-atdd が明記されている                                                                                                      | 移行先の具体例           |
| EX-0007-0010 | BR-0007-0010 | qfai-verify の完了契約を参照                              | mandatory-artifacts, oq-exit-condition, gate-pass-condition の 3 要素が定義されている                                                            | 完了契約の構成要素       |
| EX-0007-0011 | BR-0007-0011 | qfai-discussion の mandatory-artifacts を参照             | `.qfai/discussion/<cap-id>/` 配下の 15 ファイルがパスパターンで指定されている                                                                    | 成果物パス指定           |
| EX-0007-0012 | BR-0007-0012 | qfai-sdd の oq-exit-condition を参照                      | 「08_Open-questions.md の未解決 OQ が 0 件」等の定量条件が定義されている                                                                         | OQ exit 条件の具体例     |
| EX-0007-0013 | BR-0007-0013 | qfai-verify の Evidence ファイルパスを確認                | `.qfai/evidence/verify-<cap-id>.md` の命名規則に従っている                                                                                       | パス命名規則の具体例     |
| EX-0007-0014 | BR-0007-0014 | Evidence ファイルのセクション構造を確認                   | Summary, Result, Timestamp セクションが存在する                                                                                                  | 必須セクション確認       |
| EX-0007-0015 | BR-0007-0015 | .gitignore を確認                                         | `.qfai/evidence/` がデフォルトで .gitignore に含まれていない                                                                                     | gitignore ポリシー       |
| EX-0007-0016 | BR-0007-0016 | discussion の必須出力と sdd の入力を比較                  | discussion の出力（discussion pack 15 ファイル）が sdd の入力前提条件と一致する                                                                  | トレーサビリティチェーン |
| EX-0007-0017 | BR-0007-0017 | qfai-discussion の SKILL.md で DRIFT-PROTOCOL 直後のセクションを確認 | `## User Questions (AskUserQuestion Protocol)` セクションが DRIFT-PROTOCOL 直後、FORMAT SSOT の前に配置されている | 配置場所統一の具体例 |
| EX-0007-0018 | BR-0007-0018 | qfai-sdd の AskUserQuestion Protocol セクション内容を参照 | 「AskUserQuestion が利用可能な場合は優先使用」旨のバレットが存在する | 優先使用ルールの具体例 |
| EX-0007-0019 | BR-0007-0019 | qfai-atdd の AskUserQuestion Protocol セクション内容を参照 | 「構造化選択肢をサポートする場合、フリーテキストよりそれを優先する」旨のバレットが存在する | 構造化選択肢の具体例 |
| EX-0007-0020 | BR-0007-0020 | qfai-verify の AskUserQuestion Protocol セクション内容を参照 | 「利用不可の場合は、同じ質問を通常メッセージで選択肢を明記して確認する」旨のバレットが存在する | フォールバックの具体例 |
| EX-0007-0021 | BR-0007-0021 | qfai-discussion と qfai-sdd の AskUserQuestion Protocol セクションの括弧内例示を比較 | discussion は「Simulation mode 選択、scope confirmation」等、sdd は「OQ resolution、NFR 優先度判断」等、各スキル固有の場面が例示されている | スキル固有例の差分確認 |
| EX-0007-0022 | BR-0007-0022 | 全 9 スキルの SKILL.md を列挙し、AskUserQuestion Protocol セクションの有無を確認 | 9 スキル全て（deprecated 含む tdd-red, tdd-green, tdd-refactor も含む）にセクションが存在する | 全スキル網羅の確認 |
