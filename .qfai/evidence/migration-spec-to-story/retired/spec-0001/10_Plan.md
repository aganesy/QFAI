# 10 Plan

- Spec: spec-0001
- Parent: CAP-0001

## Implementation approach

### フレームワーク設計仕様の特性

CAP-0001 はフレームワーク設計仕様であり、実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。既に `specLayout.ts`、`specPack.ts`、`specPackIds.ts` として実装済み。

### 主要成果物

| 成果物             | パス                                               | 操作 | 説明                                   |
| ------------------ | -------------------------------------------------- | ---- | -------------------------------------- |
| spec-pack 構造定義 | `.qfai/specs/spec-0001/01_Spec.md` ~ `09_delta.md` | 新規 | 統合された spec-pack 構造仕様          |
| 実装コード（既存） | `packages/qfai/src/core/specLayout.ts`             | 参照 | v1421 レイアウト検出・必須ファイル定義 |
| 実装コード（既存） | `packages/qfai/src/core/validators/specPack.ts`    | 参照 | spec-pack バリデーション               |
| 実装コード（既存） | `packages/qfai/src/core/specPackIds.ts`            | 参照 | ID フォーマット検証                    |

### 検証戦略

- E_SPEC_MISSING_FILESET: spec-0001 の必須ファイル存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0001 が記載
- QFAI-COV-201: AC → TC エッジ充足
- QFAI-COV-202: BR → EX エッジ充足
- QFAI-COV-203: EX → TC エッジ充足

### Story-tree layout

This spec's part of the change runs in four steps of the work order. It has no
P1 or P5 work.

1. **P2: schemas and templates.**
   - One schema per story-tree file under `packages/qfai/assets/mdschema/story/`:
     the sixteen fixed files BR-0001-0047 lists, plus the Markdown CLI contract.
     Each schema gets an entry in `packages/qfai/assets/mdschema/manifest.yml`.
   - Tree files are matched by `{specsDir}` patterns and contract-layer files by
     `{contractsDir}` patterns. `packages/qfai/assets/scripts/check-mdschema.mjs`
     expands `{contractsDir}` from `paths.contractsDir`, the same way it expands
     `{specsDir}` (BR-0001-0048).
   - One template per schema under
     `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/spec/`,
     laid out like the tree it describes. P6 renames `skills/` to `skill/`, the
     path the ledger cells name. The contract layer's templates sit in
     `03_contract/`, its default place. Every numeric segment of an ID in a
     template uses the sample band (X7).
   - The CLI contract schema makes `## Rules` optional, because a contract with no
     rule has no such section. The entry matches this repository's own
     `.qfai/contracts/cli/*.md` from P2, and none of those has the section.
   - `check-mdschema.mjs` splits `readManifest` into a text parser and the file
     read, and exports
     `documentsWithoutOneEntry(manifestText, files, { specsDir, contractsDir })`
     beside `readManifest` and `patternToRegExp`. It expands the patterns and
     returns each file whose count of entries without a `when:` predicate is not
     exactly one (BR-0001-0047). Its callers pass the fixed files from E1's layout
     declaration (TC-0001-0086, 0087).
2. **P3: layout, grammar, reader and rows.**
   - E1, E2 and E3 below land with their first consumers. Those consumers are
     the validator families that spec-0004's plan wires into `qfai validate`.
   - The drift rows (BR-0001-0017 to 0019, 0034) extend
     `packages/qfai/src/core/validators/upstreamSsotGuard.ts` in the same step.
3. **P6: assistant tree.**
   - `packages/qfai/src/core/paths/assistantPaths.ts` names `rule/`, `skill/`,
     `agent/` and `prompt/` (BR-0001-0050, 0051), and `pnpm sync:ssot` rewrites
     this repository's copy.
   - Same commit: `packages/qfai/tests/integration/specPackSpec0001.test.ts`
     reads `drift-protocol.md` and `constitution.md` from `rule/`. That changes
     the `constitution` segment at lines 57 and 68–69, and the read at line 240
     that uses them.
4. **P7: cutover.**
   - The REMOVE row lands. The spec-pack items retire, the 33 live ledger rows are
     tombstoned under `## TDD-ID reservations`, and `specPackSpec0001.test.ts`
     goes with the TCs it annotates.
   - Article V of `packages/qfai/assets/init/.qfai/assistant/rule/constitution.md`
     is rewritten to the chain BF → US → AC → EX ← BR (TC-0001-0025).
   - `rule/drift-protocol.md` states a change request as a `decisions.md` row,
     with the protected set of BR-0001-0017.
   - `specLayout.ts` and the readers of `.qfai/decisions/` go with the spec-pack
     validators.
   - One grammar module remains. The retired spec-pack shapes leave
     `packages/qfai/src/core/ids.ts`, the story-tree shapes move into it, and
     `storyTree/ids.ts` is deleted. `core/ids.ts` stays because its importers
     and the `CON-*`, `DR` and fence-masking parts outlive the change. The ledger
     rows that name `storyTree/ids.ts` are re-pointed in the same commit.
   - `buildContractIndex` takes over the `cli/` and `design/` enumeration from E2
     (see E2).

#### E1: story-tree layout and ID grammar

Paths: `packages/qfai/src/core/storyTree/layout.ts` and
`packages/qfai/src/core/storyTree/ids.ts`. Lands at P3.

What goes through it:

- **The layout declaration.** It covers:
  - the root entries of `paths.specsDir`;
  - the five policy files;
  - the business-flow layer;
  - the three story files;
  - the contract-layer entries.

  Records go to `decisions.md` only. The declaration names no `.qfai/decisions/`
  location and no `01_Spec-retired.md` (BR-0001-0035).

- **Path resolution.** Paths resolve from `paths.specsDir` and
  `paths.contractsDir` through `packages/qfai/src/core/config.ts#resolvePath`.
  There is no second resolver.
- **The spec-pack predicate** that validate uses (X8): `paths.specsDir` holds a
  `spec-*/` or `_policies/` directory. Init's wider test, which also counts
  `.qfai/contracts/`, stays inline in `init.ts`. X8 stands (user answer U2):
  no fallback to the old default path when `paths.specsDir` is absent.
- **ID rules.**
  - the seven ID shapes (BR-0001-0036)
  - prefix and directory agreement (BR-0001-0037)
  - where each ID is declared (BR-0001-0039)
- **`nextId`.** The highest ID of a shape in its scope, plus one (BR-0001-0038).
  It is pure: the caller passes the IDs the tree names, including those that
  `decisions.md` rows name. E1 therefore reads no file and does not depend on E3.
- **Annotation patterns:** `QFAI:BF-`, `QFAI:AC-` and `QFAI:EX-`.

What it reuses:

- The `BF-NNNN` and `US-NNNN-NNNN` patterns in `packages/qfai/src/core/ids.ts`.
  Both layouts spell them the same way.
- The `QFAI:BF-` annotation, through `parseTestFlowRefs` in
  `packages/qfai/src/core/businessFlow.ts`. The flow-document half of that module
  is not reused. It retires at P7 with its validators, under spec-0004's
  old-validators REMOVE row.

The shapes that differ from the spec-pack grammar (`AC-NNNN-NNNN-NN`,
`EX-NNNN-NNNN-NN`, `BR-NNNN`) and the two new shapes (`DEC-NNNN`, `OQ-NNNN`)
live in `storyTree/ids.ts` until P7. The spec-pack validators still read the
old shapes until then.

Usages at P3, by consumers that exist when E1 lands:

1. `packages/qfai/src/core/validate.ts`:
   - layout selection (BR-0004-0043 / EX-0004-0046)
   - the old-layout error (BR-0004-0074, 0075 / EX-0004-0079)
2. `packages/qfai/src/cli/commands/init.ts`:
   - the seed set (BR-0003-0049 / EX-0003-0052)
   - old-layout detection (BR-0003-0052 / EX-0003-0057, 0058)
3. `packages/qfai/src/core/validators/storyTreeStructure.ts`: the
   story-directory and ID-grammar families (BR-0004-0044 to 0047 / EX-0004-0047
   to 0050; BR-0001-0027, 0036, 0037 / EX-0001-0035 to 0038, 0054 to 0059).

Later consumers:

- P5: migration steps 1, 4 and 8 (EX-0018-0041, 0043, 0063, 0064)
- P7: the scaffold option checks (EX-0008-0014)
- P7: per-flow report directories (BR-0005-0013)
- P7: work-log `BF-NNNN` links (`worklog-entry.schema.md#story-tree-layout`)

#### E2: story-tree reader

Path: `packages/qfai/src/core/storyTree/tree.ts`, with the internal part
`packages/qfai/src/core/storyTree/contractRules.ts`. Lands at P3.

What goes through it:

- **One read of the tree into a model.** `buildStoryTreeModel(files)` takes a
  `ReadonlyMap` from each path to its text and returns the model. The disk
  reader lists the tree, reads each file and calls it, so the model is built
  the same way from disk and from texts. The model holds:
  - flows and stories
  - ACs, and EXs with their `AC-Ref`
  - rules with their examples and rule refs
  - the rows of both tables, through E3
  - every declaration with its file (BR-0001-0039)

  The model is sorted, so its readers are deterministic.

- **Rule forms** (BR-0001-0043, 0044;
  `.qfai/contracts/cli/qfai-validate.md#business-rules-in-contracts`):
  - YAML and JSON (`x-qfai-rules`, `x-qfai-rule-refs`), through the `yaml`
    dependency.
  - SQL comment lines (`-- Rule`, `-- Examples:`, `-- Rule refs:`), read the way
    `packages/qfai/src/core/contractsDecl.ts#extractDeclaredDependencies` reads
    `-- Depends on:`.
  - The Markdown `## Rules` table and its `Rule refs:` line, through
    `parseAllMarkdownTables` and `extractH2Sections`.
- **Contract discovery.**
  - `packages/qfai/src/core/contractIndex.ts#buildContractIndex` finds `ui/`,
    `api/` and `db/`.
  - E2 finds `cli/` and `design/` itself, on the story-tree path only.
    `contractReferences.ts` takes those two directories from E2 there.

  `buildContractIndex` is not extended in place before P7. Its six callers on the
  spec-pack path are `report.ts`, `specPackReport.ts`, `contractReferences.ts`,
  `contracts.ts`, `validators/ids.ts` and `specPack.ts`. Extended now, they would
  start reading this repository's `cli/` files (NFR-0105).

Usages at P3:

1. `storyTreeStructure.ts` reads the model for the EX-to-AC, BR-to-EX and
   ID-grammar families (EX-0004-0064 to 0071; EX-0001-0061 to 0077).
2. `packages/qfai/src/core/validators/storyTreeObligations.ts` reads the
   declared BF, AC and EX sets. It uses them for the test-obligation,
   undeclared-annotation and exempted families (EX-0004-0072 to 0078).
3. `packages/qfai/src/core/flowScope.ts` (E4, in spec-0004's plan) reads the
   named flow, its stories, their ACs and EXs, and the rules that cite those EXs
   (`.qfai/contracts/cli/qfai-validate.md#flow-scope`; BR-0004-0078 /
   EX-0004-0083).
4. `packages/qfai/src/core/validators/contractReferences.ts` takes the `cli/`
   and `design/` files from E2 for the unlisted-contract family, and `ui/`,
   `api/` and `db/` from `buildContractIndex` (BR-0001-0030 / EX-0001-0041,
   0042; BR-0004-0048 / EX-0004-0051).

Later consumers:

- P5: migration steps 4 and 7 re-read what they wrote, to stay idempotent
  (EX-0018-0045, 0055 to 0058)
- P7: the per-flow report (BR-0005-0013)
- P7: the scaffold, resolving a story's ACs (EX-0008-0014)

#### E3: decisions and open-questions rows

Path: `packages/qfai/src/core/storyTree/tables.ts`. Lands at P3.

What goes through it:

- **Parsing.** `decisions.md` and `open-questions.md` parse into
  `{id, content, approach, status}` rows through `parseFirstMarkdownTable`.
  Parsing also checks the column set and the Status vocabulary (BR-0001-0032,
  0033).
- **Keyword rows.** A classifier reads the `Test exception:`, `Change request:`
  and `Unadjudicated:` rows with their refs. A predicate says when each keyword
  row is in force
  (`.qfai/contracts/cli/qfai-validate.md#rows-a-validator-reads`).
- **The row diff from base to head.** It reports:
  - rows removed
  - cells changed
  - rows appended
  - whether the change stays inside change-request rows (BR-0001-0019, 0034)

  The diff is a pure function over two texts.

- **The base content**, read by `readFileAtBase`. That is a new function in
  `packages/qfai/src/core/gitChanges.ts`, beside `getChangedFilesAgainstBase`.
  It reads a file at the merge base of `baseBranch` and HEAD. When git cannot
  answer it returns nothing, and nothing gives no finding (OQ-0175).

Usages at P3:

1. `storyTreeStructure.ts`: the two-tables family, and `QFAI-SPACK-102` on the
   story tree (EX-0004-0053 to 0055, 0057; EX-0001-0044 to 0048).
2. `storyTreeObligations.ts`: `Test exception:` rows (EX-0004-0077, 0078).
3. `upstreamSsotGuard.ts`: `Change request:` authorisation and the
   row-rewritten family (EX-0004-0058 to 0063, 0086, 0087; EX-0001-0027 to 0031,
   0049 to 0051, 0095, 0096), and the base-without-story-tree predicate
   (EX-0004-0089).

Later consumers:

- P5: migration step 2, which appends rows and stays idempotent (EX-0018-0028
  to 0034)
- P7: the reviewer gate and the work log
  (`.qfai/contracts/cli/qfai-validate.md#work-log-and-reviewer-gate`)

#### Modules that consume the elements

These are consumers, not elements. Each serves one profile or extends a family
that already has an owner.

- `storyTreeStructure.ts` holds the families of the `sdd` profile:
  - story directory
  - ID grammar
  - two tables
  - EX to AC
  - BR to EX
- `storyTreeObligations.ts` holds the families of the `atdd` and `tdd` profiles:
  - obligation
  - misplaced annotation
  - undeclared annotation
  - exempted items
- Families extended in place:
  - `upstreamSsotGuard.ts`: row-rewritten and upstream-edit
  - `contractReferences.ts`: the unlisted contract, keyed by file for `cli/` and
    `design/`, which it takes from E2 on the story-tree path
  - `core/validate.ts`: layout selection and the old-layout error
- The layer crosswalk stays in `packages/qfai/src/core/atddTraceability.ts`. It
  exports the existing private `resolveTestKind`, which returns a test file's
  kind. `atddAcceptanceLayerFilter` already calls it and stays `kind !== null`,
  and `storyTreeObligations.ts` classifies annotations through the same
  function (EX-0001-0078 to 0083).

#### Alternatives rejected

| Alternative                                               | Why not                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A `story-tree` kind in `specLayout.ts#collectSpecEntries` | That file is deleted at P7. The new modules are written once, and the old file goes whole                        |
| Extending `buildContractIndex` in place now               | Its six spec-pack callers would read `cli/` and `design/` files in this repository before it migrates (NFR-0105) |
| E1 at P1                                                  | No consumer exists before P3. It lands with its first three                                                      |
| `nextId` inside migration step 4                          | BR-0001-0038 is a grammar rule, and its L1 cases (TC-0001-0060, 0097) call it directly                           |
| The contract-rule reader as an element of its own         | It has two callers at most, E2 and migration step 7, and step 7 reads existing rules through E2                  |

## Test approach

### L-struct 構造検証（qfai validate）

| 検証項目               | ルール ID                 | 対応 TC 範囲       |
| ---------------------- | ------------------------- | ------------------ |
| 必須ファイルセット存在 | E_SPEC_MISSING_FILESET    | TC-0001-0001, 0002 |
| Parent CAP 参照        | E_SPEC_MISSING_PARENT     | TC-0001-0024       |
| v1421 レイアウト検出   | カスタム検証              | TC-0001-0003, 0004 |
| ID フォーマット        | QFAI-SPACK-XXX            | TC-0001-0005       |
| トレーサビリティ連鎖   | カスタム検証              | TC-0001-0006~0009  |
| 参照方向ルール         | E_POLICIES_UPPER_TO_LOWER | TC-0001-0010, 0011 |
| Escalation Hook        | カスタム検証              | TC-0001-0012       |
| Drift Protocol         | カスタム検証              | TC-0001-0013~0015  |
| Skill カタログ         | カスタム検証              | TC-0001-0016~0018  |
| Canonical Workflow     | カスタム検証              | TC-0001-0019, 0020 |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

### Story-tree layout

| Layer | Where                              | What it proves                                                                                                                                                                                                                                                        |
| ----- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1    | `packages/qfai/tests/unit/`        | The layout declaration (TC-0001-0032 to 0034, 0039, 0040, 0052, 0053), the grammar and `nextId` (TC-0001-0060, 0061, 0097), and the rule forms from in-memory YAML, SQL and Markdown texts (TC-0001-0073 to 0076)                                                     |
| L1    | `packages/qfai/tests/unit/`        | The `storyTreeStructure.ts` families (TC-0001-0035 to 0038, 0044 to 0048, 0054 to 0059, 0062 to 0072, 0077). Each case passes the file texts to `buildStoryTreeModel(files)` and runs the family on the model. No case creates a directory or calls `validateProject` |
| L1    | `packages/qfai/tests/unit/`        | The drift rows, with base and head passed as texts (TC-0001-0026 to 0031, 0049 to 0051, 0095, 0096). No git runs at L1: spec-0004's L3 drift cases exercise `readFileAtBase` in a real repository                                                                     |
| L1    | `packages/qfai/tests/unit/`        | Annotation classification and coverage through the exported `resolveTestKind` (TC-0001-0078 to 0085)                                                                                                                                                                  |
| L1    | `packages/qfai/tests/unit/`        | `documentsWithoutOneEntry` on a manifest text with the `open-questions.md` entry removed (TC-0001-0087)                                                                                                                                                               |
| L3    | `packages/qfai/tests/integration/` | The unlisted-contract family on a `mkdtemp` tree, because `contractReferences.ts` reads `api/` through `buildContractIndex` from disk (TC-0001-0041, 0042)                                                                                                            |
| L3    | `packages/qfai/tests/integration/` | The sample tree, built in `mkdtemp` from the shipped templates with one flow and one story: gate commands stated once (TC-0001-0043), both lints (TC-0001-0089, 0090), `{contractsDir}` with `paths.contractsDir: docs/contracts` (TC-0001-0088)                      |
| L3    | `packages/qfai/tests/integration/` | `documentsWithoutOneEntry` on the shipped `manifest.yml`, with each entry paired to its template on disk (TC-0001-0086)                                                                                                                                               |
| L3    | `packages/qfai/tests/integration/` | The shipped assistant tree after P6 (TC-0001-0091 to 0094), and Article V of the shipped `rule/constitution.md` after P7 (TC-0001-0025)                                                                                                                               |
| L5    | `packages/qfai/tests/e2e/`         | One test per story row (TDD-0104 to 0111), written by the ATDD pass of this change                                                                                                                                                                                    |

No case sits at L2 or L4: nothing here is a component or an API surface.

TDD-0052 (TC-0001-0043) has no finding family behind it (P3-D11).

- Its oracle reads the `## Standard commands (copy-paste)` section of the shipped
  `tech.md` template.
- It then searches every other file of the sample tree for each command listed
  there.
- The product artifact is the template set, so a template that restates a
  command fails the case.
- No family in `qfai-validate.md` owns the check and none is added (X12). The
  TC's wording, "the check", is recorded as drift and not changed (X11).

Boundaries with a case of their own:

- an AC with a three-digit tail (TC-0001-0055)
- one ID declared in two files (TC-0001-0056)
- a story prefix naming another flow, and a directory name disagreeing with its
  ID (TC-0001-0058, 0059)
- a table with a header row and no data row, which is valid (TC-0001-0044)
- `SUPERSEDED (by DEC-NNNN)`, parentheses included, among valid Status values
  (TC-0001-0046)
- a gap left unfilled, and a retired ID not reissued (TC-0001-0060, 0097)
- a change-request row at WIP, at DONE and at TODO (TC-0001-0027 to 0029)
- a change confined to change-request rows: one appended at WIP, and one moved
  from TODO to WIP (TC-0001-0095, 0096)
- `paths.contractsDir` outside `paths.specsDir` (TC-0001-0033, 0088)

## NFR approach

- **NFR-0105.** `qfai validate --fail-on error` on this repository stays at
  error 0 after every commit of the change. The story-tree families run only on
  a story tree, so this repository's spec-pack tree meets none of them until it
  migrates at P7.
  - Breach: an error, or any story-tree finding code, in this repository's
    validate output in a commit before the P7 migration.
- **NFR-0106.** Every new TC keeps one ledger row, and every new BR has at
  least one EX.
  - Breach: a `QFAI-TDDLIST-*` finding naming spec-0001, or a TC in
    `06_Test-Cases.md` with no ledger row.
- **NFR-0101.** The tree is described once for code, in `storyTree/layout.ts`,
  and once for documents, in `manifest.yml`.
  - Breach: a story-tree file name such as `01_User-story.md` written as a
    literal in `packages/qfai/src/` outside `storyTree/layout.ts`, found by grep.
- **discussion-20260923063306456#NFR-0006.** `mdschemaSchemas.test.ts` passes
  in both directions, and both lints pass on the sample tree.
  - Breach: TC-0001-0086, 0089 or 0090 fails.

## Dependencies

- spec-0001 は QFAI の構造設計原則を定義するため、全 spec が本 spec の原則に従う
- spec-0002（discussion-pack 構造定義）は本 spec の spec-pack 構造ルールに準拠する

### Story-tree layout

- **spec-0004** wires the families into `qfai validate` for each profile. It
  also owns layout selection, the old-layout error and E4, the flow scope. E1 to
  E3 land in the same P3 commits.
- **spec-0003** seeds the tree from the templates written at P2, and switches
  the `specsDir` and `contractsDir` defaults at P3.
- **spec-0003 and spec-0017** land the three guard pattern sets at P1, a pull
  request of its own merged before the pull request whose P2 templates carry
  sample-band IDs.
- **spec-0013** has `/qfai-sdd` write the tree from these templates at P7. Its
  plan cites E1 to E3 from here.
- **spec-0018** reuses E1 (layout, grammar, `nextId`), E2 (re-reads) and E3
  (step 2) at P5.

## Risk mitigation

| リスク                       | 影響度 | 軽減策                                                    |
| ---------------------------- | ------ | --------------------------------------------------------- |
| 統合による情報欠落           | 中     | 09_delta.md に Consolidation Mapping を記録               |
| specLayout.ts との不整合     | 中     | 実装コードを SSOT とし、spec は設計意図の文書化に留める   |
| 参照方向ルール違反の見落とし | 高     | qfai validate の E_POLICIES_UPPER_TO_LOWER_REF で自動検出 |
| トレーサビリティエッジの欠損 | 高     | qfai validate の QFAI-COV-201~203 で自動検出              |

### Story-tree layout

| Risk                                                                                                                                                                                        | Likelihood / impact | Mitigation                                                                                                                                                   | Trigger to act                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Two ID grammars coexist from P3 to P7, and a caller reads the wrong one                                                                                                                     | medium / medium     | Only story-tree modules import `storyTree/ids.ts`. The P7 commit merges the two into `core/ids.ts`                                                           | A module on the spec-pack path imports `storyTree/ids.ts`, or a spec-pack finding reads `AC-NNNN-NNNN-NN`   |
| The P2 templates carry sample-band IDs that a shipping guard rejects                                                                                                                        | low / high          | The guard pattern sets land at P1, a pull request merged before the one that adds the templates. Templates use the sample band on every numeric segment (X7) | `lint:shipping` or the post-build guard fails on a P2 template                                              |
| The CLI contract entry matches this repository's `.qfai/contracts/cli/*.md` from P2                                                                                                         | high / medium       | The CLI contract schema requires only what every CLI contract here already carries, and `## Rules` is optional                                               | `pnpm lint:mdschema` on this repository fails on a file under `.qfai/contracts/cli/` in the P2 commit       |
| Two contract enumerations coexist until P7: `buildContractIndex`, and E2's own for `cli/` and `design/`                                                                                     | medium / low        | The P7 commit that deletes the six spec-pack callers moves E2's enumeration into `buildContractIndex`                                                        | The P7 diff deletes those callers and E2 still enumerates `cli/` or `design/` itself                        |
| P7 deletes the spec-pack parsers while E2 and E3 still import the table helpers in `specPackParsers.ts`                                                                                     | medium / high       | The P7 deletion keeps `parseFirstMarkdownTable`, `parseAllMarkdownTables` and `splitMarkdownRow`, or moves them to `core/parse/markdown.ts` first            | The P7 deletion list includes one of those three helpers                                                    |
| `Owning module` cells name paths that exist only in part of the work order: TDD-0052 names `assistant/skill/` (from P6), and TDD-0069, 0070 and 0114 name `storyTree/ids.ts` (merged at P7) | high / low          | A cell names the path the work ends on where one exists, as TDD-0052 does. The commit that removes a path rewrites every ledger cell still naming it         | A grep of `.qfai/specs/*/tdd/test-list.md` for a removed path is non-empty after the commit that removes it |
| `specPackSpec0001.test.ts` reads `drift-protocol.md` and `constitution.md` under `constitution/`, which P6 renames                                                                          | high / medium       | The P6 commit changes that test's paths (lines 57, 68–69, and the read at line 240)                                                                          | The test fails on a missing file in the P6 commit                                                           |
| The spec-pack and story-tree chains coexist here (about 30 AC at peak), and the plan text above that cites `specLayout.ts` as the source of truth reads as current after P7                 | medium / low        | The P7 commit that lands the REMOVE row takes those plan rows out with the items they describe                                                               | This plan still names `specLayout.ts`, `specPack.ts` or `specPackIds.ts` after P7                           |
| The new L3 cases and the E2E story rows raise `QFAI-ATDD-111` and `QFAI-ATDD-112` in the dogfood lanes while they are `todo`                                                                | high / medium       | The ATDD and implement passes of this change write those tests before it merges, so no pin is added (P3-C1)                                                  | A dogfood lane reports `QFAI-ATDD-111` or `QFAI-ATDD-112` naming spec-0001 on the merge candidate           |
