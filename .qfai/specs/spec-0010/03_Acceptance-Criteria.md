# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0010-0001
Scenario: 5 つの Steering 文書の構造と役割が定義されている
  Given spec-0010 が存在する
  When Steering 文書構造セクションを参照する
  Then manifest.md の役割が Decision Spine として定義されている
  And product.md の役割が Product Steering として定義されている
  And structure.md の役割が Structure Steering として定義されている
  And tech.md の役割が Tech Steering として定義されている
  And test-layers.md の役割が Test Layers Policy として定義されている
  And 各文書に責務・適用範囲が記載されている
```

```gherkin
# AC-0010-0002
Scenario: 5 つの Instructions 文書の構造と役割が定義されている
  Given spec-0010 が存在する
  When Instructions 文書構造セクションを参照する
  Then workflow.md の役割が QFAI Default Workflow として定義されている
  And drift-protocol.md の役割が Drift Protocol として定義されている
  And constitution.md の役割が Constitution（9 Articles）として定義されている
  And agent-selection.md の役割がエージェント選択ルールとして定義されている
  And requirements-decomposition.md の役割が要件分解ルールとして定義されている
  And 各文書に責務・適用範囲が記載されている
```

```gherkin
# AC-0010-0003
Scenario: Review Roster & RCP の仕組みが定義されている
  Given spec-0010 が存在する
  When Review Roster セクションを参照する
  Then 10 reviewers の一覧と役割が定義されている
  And PASS/FAIL/N/A の評決ルールが定義されている
  And N/A には na_rule による理由が必須である旨が記載されている
  And Any FAIL 時のループ復帰ルールが定義されている
  And review-pack の append-only ポリシーが定義されている
```

```gherkin
# AC-0010-0004
Scenario: Constitution（Article I〜IX）の位置づけが説明されている
  Given spec-0010 が存在する
  When Constitution セクションを参照する
  Then Article I（Evidence over confidence）が記載されている
  And Article II（No invented facts）が記載されている
  And Article III（Project fit mandatory）が記載されている
  And Article IV（SDD is the source of truth）が記載されている
  And Article V（Traceability is mandatory）が記載されている
  And Article VI（Clarification budget）が記載されている
  And Article VII（Minimal scope with explicit deltas）が記載されている
  And Article VIII（Quality gates decide）が記載されている
  And Article IX（Preflight confidence gate）が記載されている
  And すべての Article が非交渉条項であり例外なしである旨が明記されている
```

```gherkin
# AC-0010-0005
Scenario: Canonical Workflow Stages（Stage 0〜6）の全体像が定義されている
  Given spec-0010 が存在する
  When Canonical Workflow Stages セクションを参照する
  Then Stage 0（steering refresh）の目的・入出力・遷移条件が定義されている
  And Stage 1（discussion）の目的・入出力・遷移条件が定義されている
  And Stage 2（requirements）の目的・入出力・遷移条件が定義されている
  And Stage 3（specification）の目的・入出力・遷移条件が定義されている
  And Stage 4（prototyping）の目的・入出力・遷移条件が定義されている
  And Stage 5（acceptance tests）の目的・入出力・遷移条件が定義されている
  And Stage 6（verify）の目的・入出力・遷移条件が定義されている
  And Stage 0 が全 Skill 開始時に必須である旨が明記されている
  And Stage 4 がオプショナルである旨が明記されている
```

## AC Catalog (optional)

| AC_ID        | Title                                   | Notes    | Priority |
| ------------ | --------------------------------------- | -------- | -------- |
| AC-0010-0001 | Steering 文書の構造と役割定義           | REQ-0014 | P1       |
| AC-0010-0002 | Instructions 文書の構造と役割定義       | REQ-0015 | P1       |
| AC-0010-0003 | Review Roster & RCP の仕組み定義        | REQ-0016 | P1       |
| AC-0010-0004 | Constitution（Article I〜IX）の位置づけ | REQ-0017 | P1       |
| AC-0010-0005 | Canonical Workflow Stages の全体像定義  | REQ-0018 | P1       |
