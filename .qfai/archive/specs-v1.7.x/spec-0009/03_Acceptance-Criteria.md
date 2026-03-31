# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0009-0001
Scenario: トレーサビリティ連鎖の5段定義が存在する
  Given QFAI フレームワークの仕様文書が存在する
  When トレーサビリティ連鎖の定義を確認する
  Then discussion → specs → tests → code → verification の5段が定義されている
  And 各段の成果物が明記されている
  And 段間のトレーサビリティエッジが定義されている
```

```gherkin
# AC-0009-0002
Scenario: 各段の成果物が明確に定義されている
  Given トレーサビリティ連鎖の5段定義が存在する
  When 各段の成果物を確認する
  Then discussion 段は discussion-pack（15ファイル）→ REQ/NFR seeds を生成する
  And specs 段は _policies/ + spec-XXXX/ → US/AC/BR/EX/TC を生成する
  And tests 段は tests/e2e/, tests/api/, tests/integration/ に QFAI アノテーション付きテストを配置する
  And code 段は spec に整合した実装を配置する
  And verification 段は qfai validate + evidence を生成する
```

```gherkin
# AC-0009-0003
Scenario: Layered Spec Architecture の2層構造が定義されている
  Given QFAI フレームワークの仕様文書が存在する
  When Layered Spec Architecture の定義を確認する
  Then _policies/（共有ポリシー層）が定義されている
  And spec-XXXX/（Capability固有層）が定義されている
  And 1 CAP = 1 spec directory の対応関係が定義されている
```

```gherkin
# AC-0009-0004
Scenario: _policies/ の必須ファイル構成が定義されている
  Given Layered Spec Architecture が定義されている
  When _policies/ の構成を確認する
  Then 01_Objective から 10_delta までのファイルが列挙されている
```

```gherkin
# AC-0009-0005
Scenario: spec-XXXX/ の必須ファイル構成が定義されている
  Given Layered Spec Architecture が定義されている
  When spec-XXXX/ の構成を確認する
  Then 01_Spec から 10_Plan までのファイルが列挙されている
```

```gherkin
# AC-0009-0006
Scenario: 実行コンシューマーのデフォルト読み取り範囲が定義されている
  Given Layered Spec Architecture が定義されている
  When 実行コンシューマーの読み取りルールを確認する
  Then デフォルトで spec-XXXX/01_Spec.md のみを読むことが定義されている
  And _policies/ はデフォルトでは読まないことが定義されている
```

```gherkin
# AC-0009-0007
Scenario: upper-to-lower 参照が禁止されている
  Given 参照方向ルールが定義されている
  When _policies/ ファイルの参照制約を確認する
  Then _policies/ は US/AC/BR/EX/TC の ID を含んではならないことが定義されている
  And _policies/ は spec-XXXX 参照を含んではならないことが定義されている
```

```gherkin
# AC-0009-0008
Scenario: lower-to-upper 参照が許可されている
  Given 参照方向ルールが定義されている
  When spec-XXXX/ の参照制約を確認する
  Then spec-XXXX は CAP, NFR, _policies/ への参照が許可されていることが定義されている
```

```gherkin
# AC-0009-0009
Scenario: Escalation Hook のトリガー条件が定義されている
  Given Escalation Hook の定義が存在する
  When トリガー条件を確認する
  Then Ambiguous（複数の有効な実装が存在）が定義されている
  And Conflict（NFR/Policy/AC が矛盾）が定義されている
  And Missing（必要な制約やポリシーが不明）が定義されている
  And Trade-off（性能 vs セキュリティ vs DX の判断が必要）が定義されている
```

```gherkin
# AC-0009-0010
Scenario: Escalation Hook のターゲットが定義されている
  Given Escalation Hook の定義が存在する
  When エスカレーションターゲットを確認する
  Then _policies/01_Objective.md がターゲットとして定義されている
  And _policies/02_Initiative.md がターゲットとして定義されている
  And _policies/07_Constraints.md がターゲットとして定義されている
  And _policies/08_Decisions.md がターゲットとして定義されている
```

```gherkin
# AC-0009-0011
Scenario: Drift Protocol のコアルールが定義されている
  Given Drift Protocol の定義が存在する
  When コアルールを確認する
  Then downstream は承認なしに upstream SSOT を編集してはならないことが定義されている
```

```gherkin
# AC-0009-0012
Scenario: ドリフト検出時の Change Request 手順が定義されている
  Given Drift Protocol の定義が存在する
  When ドリフト検出時の手順を確認する
  Then STOP → CR（3つ以上の選択肢）→ ユーザー承認 → owner skill rerun → 再開 の手順が定義されている
```

```gherkin
# AC-0009-0013
Scenario: Drift Protocol の許可された例外が定義されている
  Given Drift Protocol の定義が存在する
  When 許可された例外を確認する
  Then .qfai/evidence/** の append/update のみが許可例外として定義されている
```

```gherkin
# AC-0009-0014
Scenario: 必須トレーサビリティエッジが定義されている
  Given トレーサビリティ連鎖の定義が存在する
  When 必須エッジを確認する
  Then 01_Spec → CAP（Parent 参照）が必須エッジとして定義されている
  And AC → TC（各 AC に最低1つの TC）が必須エッジとして定義されている
  And BR → EX（各 BR に最低1つの EX）が必須エッジとして定義されている
  And EX → TC（各 EX が TC で実現される）が必須エッジとして定義されている
```

## AC Catalog (optional)

| AC_ID        | Title                               | Notes    | Priority |
| ------------ | ----------------------------------- | -------- | -------- |
| AC-0009-0001 | 5段連鎖定義の存在                   | REQ-0009 | P1       |
| AC-0009-0002 | 各段の成果物定義                    | REQ-0009 | P1       |
| AC-0009-0003 | 2層構造の定義                       | REQ-0010 | P1       |
| AC-0009-0004 | \_policies/ 必須ファイル構成        | REQ-0010 | P2       |
| AC-0009-0005 | Capability 固有層の必須ファイル構成 | REQ-0010 | P2       |
| AC-0009-0006 | 実行コンシューマーの読み取り範囲    | REQ-0010 | P1       |
| AC-0009-0007 | upper-to-lower 参照禁止             | REQ-0011 | P1       |
| AC-0009-0008 | lower-to-upper 参照許可             | REQ-0011 | P1       |
| AC-0009-0009 | Escalation トリガー条件             | REQ-0012 | P1       |
| AC-0009-0010 | Escalation ターゲット               | REQ-0012 | P1       |
| AC-0009-0011 | Drift Protocol コアルール           | REQ-0013 | P1       |
| AC-0009-0012 | ドリフト検出時 CR 手順              | REQ-0013 | P1       |
| AC-0009-0013 | Drift Protocol 許可例外             | REQ-0013 | P2       |
| AC-0009-0014 | 必須トレーサビリティエッジ          | REQ-0009 | P1       |
