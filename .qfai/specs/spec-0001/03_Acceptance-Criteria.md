# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0001-0001
Scenario: v1421 layered spec の必須ファイル 9 件が定義されている
  Given specLayout.ts の REQUIRED_LAYERED_SPEC_FILES_V1421 を参照する
  When ファイル一覧を確認する
  Then 01_Spec.md, 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md, 05_Examples.md, 06_Test-Cases.md, 07_Decisions.md, 08_Open-questions.md, 09_delta.md の 9 ファイルが定義されている
```

```gherkin
# AC-0001-0002
Scenario: _policies の必須ファイル 10 件が定義されている
  Given specLayout.ts の REQUIRED_LAYERED_SHARED_FILES_V1421 を参照する
  When ファイル一覧を確認する
  Then 01_Objective.md から 10_delta.md までの 10 ファイルが定義されている
```

```gherkin
# AC-0001-0003
Scenario: レイアウト検出が v1421 を正しく判別する
  Given spec ディレクトリに 01_Spec.md, 02_User-stories.md, 05_Examples.md が存在する
  When collectSpecEntries() を実行する
  Then layout が "layered"、layeredStyle が "v1421" と判定される
```

```gherkin
# AC-0001-0004
Scenario: ID フォーマットが spec 番号付き 4-4 桁形式に準拠する
  Given spec-0001 のドキュメントを参照する
  When ID パターンを確認する
  Then US/AC/BR/EX/TC の各 ID が spec-0001 namespace の 4-4 桁形式に従っている
```

```gherkin
# AC-0001-0005
Scenario: トレーサビリティ連鎖の 5 段が定義されている
  Given QFAI フレームワークの仕様を参照する
  When トレーサビリティ連鎖を確認する
  Then discussion → specs → tests → code → verification の 5 段が定義されている
  And 各段の成果物が明記されている
```

```gherkin
# AC-0001-0006
Scenario: 必須トレーサビリティエッジが定義されている
  Given トレーサビリティ連鎖の定義が存在する
  When 必須エッジを確認する
  Then 01_Spec → CAP（Parent 参照）が必須である
  And acceptance criteria ごとに少なくとも 1 test case が必須である
  And business rule ごとに少なくとも 1 example が必須である
  And example ごとに少なくとも 1 test case が必須である
```

```gherkin
# AC-0001-0007
Scenario: upper-to-lower 参照が禁止されている
  Given _policies/ のファイルを参照する
  When 個別 spec ID を検索する
  Then US/AC/BR/EX/TC の ID および spec-XXXX 参照が含まれていない
```

```gherkin
# AC-0001-0008
Scenario: Escalation Hook の 4 トリガー条件が定義されている
  Given spec-XXXX/01_Spec.md を参照する
  When Escalation Hook セクションを確認する
  Then Ambiguous, Conflict, Missing, Trade-off の 4 条件が定義されている
```

```gherkin
# AC-0001-0009
Scenario: Drift Protocol の手順が定義されている
  Given drift-protocol.md を参照する
  When ドリフト検出時の手順を確認する
  Then STOP → CR → 承認 → owner skill rerun → 再開 の手順が定義されている
```

```gherkin
# AC-0001-0010
Scenario: The skill catalog lists the two entry skills
  Given the skill orchestration specification
  When the skill catalog is read
  Then it lists discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green and tdd-refactor
  And it lists qfai-run and qfai-maintain
```

```gherkin
# AC-0001-0011
Scenario: The skill order holds within every built-in plan
  Given the skill dependencies and the built-in route plans
  When the order is read against each plan
  Then the order is configure -.-> discussion → sdd → prototyping (optional) → atdd → verify
  And within each built-in plan the stages of these skills run in this order
  And the plan places every other stage
  And qfai-run sits above the order, and no plan dispatches it
  And there is no circular dependency
```

```gherkin
# AC-0001-0012
Scenario: The Canonical Workflow Stages are defined
  Given the Steering & Governance specification
  When the Canonical Workflow Stages are read
  Then seven stages are defined, from Stage 0 (steering refresh) to Stage 6 (verify)
  And Stage 0 is mandatory at every skill start
  And inside an active run, a shared Stage 0 snapshot satisfies it once its key is recomputed and matches
  And no stage-specific check is served from that snapshot
  And Stage 4 (prototyping) is optional
```

### AC-0001-0013: A stage skill with no name and no work order hands over

- US-Refs: US-0001-0010

```gherkin
# AC-0001-0013
# Source: discussion-20260923171450572#DAC-008-01
Scenario: A stage skill the host picked for free text edits nothing
  Given workflow mode active
  And a stage skill neither invoked by name nor handed a work order
  When the skill starts
  Then it edits nothing and passes the request to qfai-run
  And a skill handed a valid work order does only that work order
```

### AC-0001-0014: Stage-skill descriptions state when to use them

- US-Refs: US-0001-0010

```gherkin
# AC-0001-0014
# Source: discussion-20260923171450572#DAC-008-02
Scenario: Each stage-skill description opens with its trigger condition
  Given the description of each skill a built-in plan names
  When it is read
  Then it opens with when to use the skill: invoked by name, or handed a QFAI work order
  And it does not summarize the skill's pipeline
```

### AC-0001-0015: A stage invoked by name runs standalone

- US-Refs: US-0001-0010

```gherkin
# AC-0001-0015
# Source: discussion-20260923171450572#DAC-008-03
Scenario: A direct invocation ends at its own stage
  Given a stage skill invoked by name
  When it runs
  Then it runs standalone and ends at that stage
  And a request to take it to the end becomes a whole run
```

### AC-0001-0016: Orchestrated-mode rules live in one reference per skill

- US-Refs: US-0001-0010

```gherkin
# AC-0001-0016
# Source: discussion-20260923171450572#REQ-0052
Scenario: A skill's orchestrated-mode rules are kept out of its SKILL.md body
  Given each skill a built-in plan names
  When its files are read
  Then its orchestrated-mode rules are in one references/orchestrated-mode.md
  And its SKILL.md cites that file with one line
  And its SKILL.md holds no other orchestrated-mode text
```

### AC-0001-0017: No stage skill blocks model invocation

- US-Refs: US-0001-0010

```gherkin
# AC-0001-0017
# Source: discussion-20260923171450572#REQ-0051
Scenario: qfai-run can still call every stage skill
  Given each skill a built-in plan names
  When its SKILL.md frontmatter is read
  Then it carries no disable-model-invocation key
```

### AC-0001-0018: The constitution states request authority and orchestrated binding

- US-Refs: US-0001-0009

```gherkin
# AC-0001-0018
# Source: discussion-20260923171450572#REQ-0057
Scenario: The governance text covers a workflow run
  Given the shipped constitution and shared baselines
  When they are read
  Then they state what authorizes a run's work and how a work order binds a stage to its target
  And no article gains an exception
```

### AC-0001-0019: workflow.md keeps routes apart from change types

- US-Refs: US-0001-0009

```gherkin
# AC-0001-0019
# Source: discussion-20260923171450572#REQ-0057
Scenario: A route is not a change type
  Given the shipped workflow.md
  When it is read
  Then it states that the workflow routes are orthogonal to the existing change types
```

## AC Catalog (optional)

| AC-ID        | Title                             | Notes        | Priority |
| ------------ | --------------------------------- | ------------ | -------- |
| AC-0001-0001 | v1421 spec 必須ファイル           | REQ-0001     | P1       |
| AC-0001-0002 | \_policies 必須ファイル           | REQ-0001     | P1       |
| AC-0001-0003 | レイアウト検出 v1421              | REQ-0002     | P1       |
| AC-0001-0004 | ID フォーマット                   | REQ-0003     | P1       |
| AC-0001-0005 | トレーサビリティ 5 段             | REQ-0004     | P1       |
| AC-0001-0006 | 必須トレーサビリティ              | REQ-0004     | P1       |
| AC-0001-0007 | upper-to-lower 禁止               | REQ-0005     | P1       |
| AC-0001-0008 | Escalation Hook                   | REQ-0006     | P1       |
| AC-0001-0009 | Drift Protocol                    | REQ-0007     | P1       |
| AC-0001-0010 | Skill カタログ                    | REQ-0008     | P1       |
| AC-0001-0011 | Skill 依存関係                    | REQ-0008     | P1       |
| AC-0001-0012 | Canonical Workflow                | REQ-0009     | P1       |
| AC-0001-0013 | Stage-skill handover              | US-0001-0010 | P1       |
| AC-0001-0014 | Trigger-condition descriptions    | US-0001-0010 | P1       |
| AC-0001-0015 | Standalone invocation             | US-0001-0010 | P1       |
| AC-0001-0016 | One orchestrated-mode reference   | US-0001-0010 | P1       |
| AC-0001-0017 | No disable-model-invocation       | US-0001-0010 | P1       |
| AC-0001-0018 | Request authority and binding     | US-0001-0009 | P1       |
| AC-0001-0019 | Routes orthogonal to change types | US-0001-0009 | P1       |
