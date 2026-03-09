# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                            | Expected                                                                                                                                  | Notes                    |
| ------------ | ------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| EX-0009-0001 | BR-0009-0001 | QFAI フレームワークの連鎖定義を確認                                              | discussion, specs, tests, code, verification の5段が列挙されている                                                                         | 5段連鎖の存在確認        |
| EX-0009-0002 | BR-0009-0002 | discussion 段の成果物定義を確認                                                  | discussion-pack（15ファイル）→ REQ/NFR seeds の入出力関係が記述されている                                                                  | discussion 段            |
| EX-0009-0003 | BR-0009-0003 | specs 段の成果物定義を確認                                                       | _policies/ + Capability 固有ディレクトリ → US/AC/BR/EX/TC の入出力関係が記述されている                                                     | specs 段                 |
| EX-0009-0004 | BR-0009-0004 | tests 段の配置先を確認                                                           | tests/e2e/, tests/api/, tests/integration/ が定義され、QFAI アノテーション必須が記述されている                                             | tests 段                 |
| EX-0009-0005 | BR-0009-0005 | verification 段の出力を確認                                                      | qfai validate + evidence が定義されている                                                                                                 | verification 段          |
| EX-0009-0006 | BR-0009-0006 | _policies/ のファイル一覧を確認                                                  | 01_Objective, 02_Initiative, 03_Capabilities, 04_Business-Flow, 05_Contracts, 06_Glossary, 07_Constraints, 08_Decisions, 09_Open-questions, 10_delta が列挙されている | _policies/ 構成          |
| EX-0009-0007 | BR-0009-0007 | Capability 固有ディレクトリのファイル一覧を確認                                  | 01_Spec, 02_User-stories, 03_Acceptance-Criteria, 04_Business-Rules, 05_Examples, 06_Test-Cases, 07_Decisions, 08_Open-questions, 09_delta, 10_Plan が列挙されている   | Capability 固有層構成    |
| EX-0009-0008 | BR-0009-0008 | CAP-0001 と対応する仕様ディレクトリの対応を確認                                  | 01_Spec.md に Parent: CAP-0001 が記述されている                                                                                           | 1 CAP = 1 spec           |
| EX-0009-0009 | BR-0009-0009 | 実行スキルの読み取り範囲を確認                                                   | 01_Spec.md の Consumer View に「_policies is read-only escalation context and must not be read by default」が記述されている                | デフォルト読取範囲       |
| EX-0009-0010 | BR-0009-0010 | _policies/01_Objective.md で個別仕様 ID を検索                                   | US/AC/BR/EX/TC の ID および個別仕様ディレクトリ参照が見つからない                                                                         | upper-to-lower 禁止      |
| EX-0009-0011 | BR-0009-0011 | 仕様ディレクトリの 01_Spec.md で CAP, NFR, _policies 参照を検索                  | Parent: CAP-0001, NFR 参照, \_policies/ への参照が含まれている                                                                            | lower-to-upper 許可      |
| EX-0009-0012 | BR-0009-0012 | 01_Spec.md の Escalation Hook セクションを確認                                   | Ambiguous, Conflict, Missing, Trade-off の4条件が When to Escalate に列挙されている                                                       | トリガー4条件            |
| EX-0009-0013 | BR-0009-0013 | 01_Spec.md の Escalation Targets セクションを確認                                | _policies/01_Objective.md, 02_Initiative.md, 07_Constraints.md, 08_Decisions.md がターゲットとして列挙されている                           | ターゲット4ファイル      |
| EX-0009-0014 | BR-0009-0014 | .qfai/assistant/instructions/drift-protocol.md の Core rule を確認               | 「Do not edit upstream SSOT artifacts unless explicit user approval exists」が記述されている                                               | コアルール               |
| EX-0009-0015 | BR-0009-0015 | drift-protocol.md の When drift is detected セクションを確認                     | STOP → CR（3+ options）→ 承認 → owner skill rerun → 再開 の5ステップが記述されている                                                      | 5ステップ手順            |
| EX-0009-0016 | BR-0009-0016 | drift-protocol.md の Allowed exceptions セクションを確認                         | .qfai/evidence/** append/update のみが許可例外として記述されている                                                                        | 許可例外                 |
| EX-0009-0017 | BR-0009-0017 | 任意の仕様ディレクトリの 01_Spec.md の Parent フィールドを確認                   | 「Parent: CAP-0001」が存在する                                                                                                            | 01_Spec → CAP エッジ    |
| EX-0009-0018 | BR-0009-0018 | 06_Test-Cases.md で AC 参照カラムを確認                                          | 全 AC が少なくとも1つの TC の参照に含まれている                                                                                            | AC → TC エッジ           |
| EX-0009-0019 | BR-0009-0019 | 任意の仕様ディレクトリの 05_Examples.md で BR-Ref カラムを確認                   | 全 BR が少なくとも1つの EX の BR-Ref に含まれている                                                                                        | BR → EX エッジ           |
| EX-0009-0020 | BR-0009-0020 | 任意の仕様ディレクトリの 06_Test-Cases.md で EX-Ref カラムを確認                 | EX が TC の EX-Ref に含まれている                                                                                                          | EX → TC エッジ           |
