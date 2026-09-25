# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0001-0005
Scenario: トレーサビリティ連鎖の 5 段が定義されている
  Given QFAI フレームワークの仕様を参照する
  When トレーサビリティ連鎖を確認する
  Then discussion → specs → tests → code → verification の 5 段が定義されている
  And 各段の成果物が明記されている
```

```gherkin
# AC-0001-0009
Scenario: Drift Protocol の手順が定義されている
  Given drift-protocol.md を参照する
  When ドリフト検出時の手順を確認する
  Then STOP → CR → 承認 → owner skill rerun → 再開 の手順が定義されている
  And on the story tree, a change request is a row opening `Change request:` that is appended to `decisions.md` at TODO
  And on the story tree, approval moves that row to WIP, the owner skill reruns, and the row ends DONE
```

```gherkin
# AC-0001-0011
Scenario: Skill 依存関係が DAG で定義されている
  Given Skill 依存関係を参照する
  When 依存グラフを確認する
  Then configure -.-> discussion → sdd → prototyping(optional) → atdd → verify の順序が定義されている
  And 循環依存が存在しない
```

```gherkin
# AC-0001-0012
Scenario: Canonical Workflow Stages が定義されている
  Given Steering & Governance 仕様を参照する
  When Canonical Workflow Stages を確認する
  Then Stage 0（steering refresh）～ Stage 6（verify）の 7 ステージが定義されている
  And Stage 0 は全 Skill 開始時に必須である
  And Stage 4（prototyping）はオプショナルである
```

```gherkin
# AC-0001-0013
Scenario: The story tree root holds the two tables and the three layers
  Given a project whose specification is on the story tree
  When the entries directly under `paths.specsDir` are listed
  Then they include `decisions.md`, `open-questions.md`, `01_policy/` and `02_business-flow/`
  And the contract layer sits at `paths.contractsDir`, which is `03_contract/` under `paths.specsDir` by default
```

```gherkin
# AC-0001-0014
Scenario: The business-flow layer holds one directory per flow and per story
  Given a project on the story tree with at least one business flow
  When `02_business-flow/` is listed
  Then it holds `business-flows.md` and one `business-flow-NNNN/` directory per flow
  And each flow directory holds `business-flow.md` with a Mermaid diagram, `user-stories.md`, and one `user-story-NNNN-NNNN/` directory per story
```

```gherkin
# AC-0001-0015
Scenario: A story directory holds exactly three files
  Given a story directory on the story tree
  When its entries are listed
  Then they are exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md`
  And it holds no subdirectory
```

```gherkin
# AC-0001-0016
Scenario: The policy layer holds five files of principles
  Given a project on the story tree
  When `01_policy/` is listed
  Then it holds `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`
  And none of them states a concrete definition that belongs to a flow, a story or a contract
```

```gherkin
# AC-0001-0017
Scenario: The contract layer is indexed and states the gate commands once
  Given a project on the story tree
  When the contract layer at `paths.contractsDir` is read
  Then it holds `contracts.md`, `tech.md`, `structure.md` and the directories `api/`, `db/`, `ui/`, `cli/` and `design/`
  And `contracts.md` lists every contract file under those directories
  And the quality-gate commands appear only in the `## Standard commands (copy-paste)` section of `tech.md`
```

```gherkin
# AC-0001-0018
Scenario: The two tables carry four columns and their own status vocabulary
  Given a project on the story tree
  When `decisions.md` and `open-questions.md` are read
  Then each holds one table with exactly the columns ID, Content, Approach and Status
  And a `decisions.md` row has an ID of the form `DEC-NNNN` and a Status of TODO, WIP, DONE, `SUPERSEDED (by DEC-NNNN)` or REJECTED
  And an `open-questions.md` row has an ID of the form `OQ-NNNN` and a Status of TODO, WIP, DONE or DEFERRED
```

```gherkin
# AC-0001-0019
Scenario: Table rows are only appended
  Given a row that `decisions.md` or `open-questions.md` already holds on the story tree
  When the table changes
  Then the row is still there with the same ID, Content and Approach
  And only its Status may differ
  And a new decision or question is a new row at the end of the table
```

```gherkin
# AC-0001-0020
Scenario: Triage records, change requests and retired stories are decision rows
  Given a project on the story tree
  When a triage operation, a change request or a story retirement is recorded
  Then it is recorded as a row of `decisions.md`
  And no file is written under `.qfai/decisions/` and no `01_Spec-retired.md` file exists
```

```gherkin
# AC-0001-0021
Scenario: Each ID has one of seven shapes and is declared once
  Given a project on the story tree
  When every declared ID is collected
  Then each has one of the shapes `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN` or `OQ-NNNN`
  And no ID is declared twice in the tree
```

```gherkin
# AC-0001-0022
Scenario: An ID carries the number of the directory it sits in
  Given a story directory inside a flow directory on the story tree
  When the IDs it declares are read
  Then the story ID starts with the flow's number
  And every AC and EX ID starts with the story ID
  And each directory name matches the ID it holds
```

```gherkin
# AC-0001-0023
Scenario: Each EX cites exactly one AC, and every AC has an EX
  Given a story on the story tree
  When the rows of its `03_Example.md` are read
  Then each EX row names exactly one existing AC of the same story in its `AC-Ref` cell
  And every AC of the story is named by at least one EX
```

```gherkin
# AC-0001-0024
Scenario: Business rules and examples cite each other many-to-many
  Given the contracts and stories of a project on the story tree
  When the examples of every business rule are read
  Then every BR cites at least one existing EX
  And every EX is cited by at least one BR
```

```gherkin
# AC-0001-0025
Scenario: A business rule lives in the contract that enforces it
  Given a business rule of a project on the story tree
  When the contract layer is read
  Then the rule is declared once, in the contract file that enforces it, in the form that file type allows
  And every other contract that relies on it lists its ID as a rule ref
```

```gherkin
# AC-0001-0026
Scenario: A test annotates the ID its layer verifies
  Given a test file of a project on the story tree
  When its layer is read from its directory
  Then an E2E test annotates a BF
  And an integration or API test annotates an AC
  And every other test annotates an EX
```

```gherkin
# AC-0001-0027
Scenario: Only BF, AC and EX annotations count as coverage
  Given a test of a project on the story tree annotated only with the `QFAI:SPEC-NNNN:` prefix or a contract ID
  When coverage is computed
  Then that annotation covers no item
```

```gherkin
# AC-0001-0028
Scenario: Every story-tree Markdown file has one schema entry and one template
  Given the mdschema manifest and the `qfai-sdd` templates
  When each Markdown file of the story tree is matched against them
  Then each of the sixteen fixed files and the Markdown CLI contract matches exactly one manifest entry, paired with one template
  And `documentsWithoutOneEntry` in `check-mdschema.mjs` reports no file
```

```gherkin
# AC-0001-0029
Scenario: The sample story tree passes both document lints
  Given the sample story tree built from the `qfai-sdd` templates
  When `pnpm lint:mdschema` and `pnpm lint:mermaid` run on it
  Then both report no failure
```

```gherkin
# AC-0001-0030
Scenario: The assistant tree has four top-level directories
  Given an assistant tree in the `rule/ skill/ agent/ prompt/` layout
  When the entries directly under `.qfai/assistant/` are listed
  Then they are `rule/`, `skill/`, `agent/` and `prompt/`, plus `skill.local/` where the project created one
  And `constitution/`, `manifest/`, `catalog/` and `process/` are absent
```

```gherkin
# AC-0001-0031
Scenario: A shared assistant file goes to rule/ and a single-skill file to its skill
  Given an assistant file in the `rule/ skill/ agent/ prompt/` layout
  When its readers are counted
  Then a file read by several skills or by the CLI sits under `rule/`
  And a file read by one skill sits under that skill's `references/`
```

## AC Catalog (optional)

| AC-ID        | Title                                                      | Notes                                                                                      | Priority |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| AC-0001-0005 | トレーサビリティ 5 段                                      | REQ-0004                                                                                   | P1       |
| AC-0001-0009 | Drift Protocol                                             | REQ-0007                                                                                   | P1       |
| AC-0001-0011 | Skill 依存関係                                             | REQ-0008                                                                                   | P1       |
| AC-0001-0012 | Canonical Workflow                                         | REQ-0009                                                                                   | P1       |
| AC-0001-0013 | Story tree root                                            | US-0001-0010; discussion-20260923063306456#REQ-0001                                        | P1       |
| AC-0001-0014 | Business-flow layer                                        | US-0001-0010; discussion-20260923063306456#REQ-0003                                        | P1       |
| AC-0001-0015 | Story directory                                            | US-0001-0010; discussion-20260923063306456#REQ-0003                                        | P1       |
| AC-0001-0016 | Policy layer                                               | US-0001-0011; discussion-20260923063306456#REQ-0002                                        | P1       |
| AC-0001-0017 | Contract layer                                             | US-0001-0011; discussion-20260923063306456#REQ-0005                                        | P1       |
| AC-0001-0018 | Two tables                                                 | US-0001-0012; discussion-20260923063306456#REQ-0011                                        | P1       |
| AC-0001-0019 | Append-only rows                                           | US-0001-0012; discussion-20260923063306456#REQ-0011                                        | P1       |
| AC-0001-0020 | Decision rows for triage, change requests, retired stories | US-0001-0012; discussion-20260923063306456#REQ-0012                                        | P1       |
| AC-0001-0021 | Seven ID shapes                                            | US-0001-0013; discussion-20260923063306456#REQ-0004                                        | P1       |
| AC-0001-0022 | ID prefix and directory                                    | US-0001-0013; discussion-20260923063306456#REQ-0004                                        | P1       |
| AC-0001-0023 | EX to AC                                                   | US-0001-0014; discussion-20260923063306456#REQ-0008                                        | P1       |
| AC-0001-0024 | BR to EX                                                   | US-0001-0014; discussion-20260923063306456#REQ-0007                                        | P1       |
| AC-0001-0025 | BR in its contract                                         | US-0001-0014; discussion-20260923063306456#REQ-0006                                        | P1       |
| AC-0001-0026 | Annotation per layer                                       | US-0001-0015; discussion-20260923063306456#REQ-0009                                        | P1       |
| AC-0001-0027 | Annotations that count                                     | US-0001-0015; discussion-20260923063306456#REQ-0009                                        | P1       |
| AC-0001-0028 | One schema and template per file                           | US-0001-0016; discussion-20260923063306456#REQ-0022                                        | P1       |
| AC-0001-0029 | Document lints pass                                        | US-0001-0016; discussion-20260923063306456#NFR-0006                                        | P1       |
| AC-0001-0030 | Assistant tree top level                                   | US-0001-0017; discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018 | P1       |
| AC-0001-0031 | Assistant file placement                                   | US-0001-0017; discussion-20260923063306456#REQ-0017                                        | P1       |
