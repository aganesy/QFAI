# 11 OQ Register

## OQ Table

| OQ-ID   | Title                                                               | Gate | Disposition | Owner | Rationale                                                                               | Options                                                                                                                                               | Recommendation                                                                                                         | Next-Decision-Point | Due | Evidence                                                                                        |
| ------- | ------------------------------------------------------------------- | ---- | ----------- | ----- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- | --- | ----------------------------------------------------------------------------------------------- |
| OQ-0001 | フレームワーク仕様CAPのテストケース粒度                             | sdd  | resolved    | agent | 新規CAP-0007〜0010はCLIコマンドではないため、テストケースの定義方法を決定する必要がある | A) qfai validateの構造検証ルールのみをTCとする（recommended） / B) 仕様遵守チェックリストをTCとする / C) テストケースを定義しない                     | Option A: qfai validateの構造検証ルールをTCとして定義する。バリデータが検証可能な範囲でテスタブルな仕様とする          | N/A                 | N/A | Interview Q&A: ユーザーがC-3案を承認、フレームワーク設計仕様としてのCAP定義を確認               |
| OQ-0002 | SKILL.mdとspecsの二重管理リスク                                     | sdd  | resolved    | agent | SKILL.mdがSSOT、specsは設計意図の上位文書。変更時の同期コスト                           | A) specsはSKILL.mdへの参照のみとし実装詳細を書かない（recommended） / B) specsにSKILL.mdの内容を完全コピーする / C) SKILL.mdを廃止しspecsに一元化する | Option A: specsは設計意図・制約・相互関係を記録し、実装詳細はSKILL.mdをSSOTとして参照する                              | N/A                 | N/A | 01_Context.md Assumptions: 「SKILL.mdとagent定義ファイルは引き続きSSOTであり、specsは上位文書」 |
| OQ-0003 | 39エージェントの全量カタログの粒度                                  | sdd  | resolved    | agent | 39エージェントを全量spec-0008に記載する際の詳細度                                       | A) ID・名前・ミッション・カテゴリの要約テーブル（recommended） / B) 各エージェントの全契約をspecにフル展開 / C) カテゴリ別に代表エージェントのみ記載  | Option A: 要約テーブルで全量を網羅し、詳細はagent定義ファイルをSSOT参照する                                            | N/A                 | N/A | 05_Scope.md SC-005: 39/39 coverageをshould優先度で設定                                          |
| OQ-0004 | \_policies/04_Business-Flow.mdへのAssistant Frameworkフロー追加範囲 | sdd  | resolved    | agent | 既存Business-FlowはCLIコマンドフローのみ。追記範囲を決定する必要がある                  | A) Canonical Workflow Stages（Stage 0〜6）をMermaid図で追記（recommended） / B) Skill依存関係図のみ追記 / C) 追記せず、spec-0007/spec-0010のみで説明  | Option A: Canonical Workflow StagesをMermaid図で\_policies/04_Business-Flow.mdに追記する                               | N/A                 | N/A | 02_Inception-Deck.md Section 6で既にMermaid図を作成済み                                         |
| OQ-0005 | 既存\_policies/03_Capabilities.mdのCAP追加フォーマット              | sdd  | resolved    | agent | 既存フォーマットにCAP-0007〜0010をどう追記するか                                        | A) 既存フォーマットに準拠して追記（recommended） / B) CLIコマンドCAPと分離して別セクションを作る                                                      | Option A: 既存フォーマットに準拠し、CLIコマンドCAPの後に連番で追記する。ただし「フレームワーク設計仕様」カテゴリを明記 | N/A                 | N/A | 09_Constraints.md TC-3: \_policiesは追記のみ                                                    |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- `Options` must include at least two alternatives and one recommended option.
- `Recommendation` must explicitly state the recommended option.
- All 11 columns are mandatory for every row.
