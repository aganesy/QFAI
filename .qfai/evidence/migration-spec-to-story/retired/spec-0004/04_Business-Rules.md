# 04 Business Rules

## BR-0004-0001: Validate Is the Machine Gate

- AC-Refs: AC-0004-0001
- `qfai validate` checks schema, evidence, and canonical validator rules.

## BR-0004-0002: UI Evidence Is Screen-Scoped

- AC-Refs: AC-0004-0002
- Validation of prototyping evidence is keyed by declared screen IDs from canonical screen contracts.

## BR-0004-0003: Missing Screenshot

- AC-Refs: AC-0004-0003
- Missing screenshot evidence emits `QFAI-UIE-001`.

## BR-0004-0004: Missing HTML

- AC-Refs: AC-0004-0004
- Missing HTML snapshot evidence emits `QFAI-UIE-002`.

## BR-0004-0005: Safe Skip Without Screen Contract

- AC-Refs: AC-0004-0005
- If no canonical screen contract is available, the UI evidence artifact validator skips instead of over-firing.

## BR-0004-0006: Skill Contract Validator

- AC-Refs: AC-0004-0006
- The prototyping skill validator checks current section presence, canonical evidence paths, and CLI-removal wording.

## BR-0004-0007: Legacy Validator Slices

- AC-Refs: AC-0004-0007
- Legacy design-system or artifact validators may remain in validate while corresponding code still exists.
- They do not redefine the current public execution model.

## BR-0004-0008: DESIGN.md Presence Validator

- AC-Refs: AC-0004-0008
- DCON-030 reads root `DESIGN.md` at validate time and checks for the four required token tables (color, typography, radius, shadow) per `references/design-md-spec.md`.
- Absent file or unparseable structure emits `QFAI-DCON-030` at error severity; presence + parseability passes.

## BR-0004-0009: DESIGN.md Lock Hash Integrity

- AC-Refs: AC-0004-0009
- DCON-031 computes `sha256(DESIGN.md bytes)` and compares it against `<paths.contractsDir>/design/DESIGN.md.lock.yaml#sha256`.
- Mismatch emits `QFAI-DCON-031` at error severity, including both hashes in the message.

## BR-0004-0010: design-system Mirror Integrity

- AC-Refs: AC-0004-0010
- DCON-032 parses `<paths.contractsDir>/design/design-system.yaml` and compares its token tables byte-for-byte against the parsed token tables of root `DESIGN.md`.
- Any per-category divergence emits `QFAI-DCON-032` at error severity, naming the diverging category.

## BR-0004-0011: prototypingEvidenceV3 Schema Validation

- AC-Refs: AC-0004-0011
- prototypingEvidenceV3 validator enforces schema v3 on each `iter-NN/review.json`: required keys `scores` (4 UX axes ordinal), `proseCritique` (within its cap; the unit is selected by the text and neither unit has a lower bound), `pivotDirective` (∈ continue|refine|pivot), `layoutAntiPatternsDetected`, `designMdViolations`.
- Schema violation emits `QFAI-PROT-002` at error severity. v1.x fields (`mode`, `fullHarness`, `scoringTrace`, `allReviewerAxesPerfect100`) being present is an additional schema warning.

## BR-0004-0012: layoutAntiPatternsDetected Whitelist

- AC-Refs: AC-0004-0012
- Any string in `layoutAntiPatternsDetected` that `packages/qfai/assets/validators/layoutAntiPatterns.json` does not declare rejects the review.json.
- Detection of any `lap-*` token caps `informationArchitecture` at `acceptable` (cross-validated against AC-0012-0024 in spec-0012).

## BR-0004-0013: designMdViolations Shape and findDesignMdViolations Purity

- AC-Refs: AC-0004-0013, AC-0004-0014
- Each `designMdViolations` element MUST contain `kind` in `{color, font, radius, shadow}` and a string `found`. Extra fields are allowed.
- The producer `findDesignMdViolations(html, designMd)` is pure and deterministic; it MUST NOT touch `fs`, `process`, `Date.now`, network, or any side-channel.
- Non-empty `designMdViolations` blocks `/qfai-prototyping` convergence; convergence semantics are deferred to spec-0012, while spec-0004 only validates the data shape and producer purity.

## BR-0004-0014: 4-layer asset-tree enum is closed

- AC-Refs: AC-0004-0015
- The directory names allowed directly under `.qfai/assistant/` are exactly `{constitution, manifest, catalog, process}`. Any other name is surfaced as a warning during the deprecation window. The validator reads `assistantPaths.ts#CANONICAL_LAYER_NAMES` as the SSOT.
- With the `rule/ skill/ agent/ prompt/` assistant tree, the allowed names are exactly `{rule, skill, agent, prompt}`, and the project's own `skill.local/` is allowed beside them. A renamed layer has no period in which both names are accepted (`.qfai/contracts/cli/qfai-validate.md#assistant-tree`).

## BR-0004-0015: work-log frontmatter schema is closed

- AC-Refs: AC-0004-0016
- Required fields: `id`, `status`, `kind`, `created`, `updated`, `scope`, `blocking`, `promote-to`, `links`. Enums (canonical contract: `.qfai/contracts/cli/worklog-entry.schema.md`):
  - `status ∈ {active, handoff, archived}`
  - `kind ∈ {milestone, decision, risk, consultation-needed, unexpected, unscoped-discovery, handoff, blocker, scope-up, scope-down, spike}`
  - `scope ∈ {global, spec-NNNN}`
  - `blocking: boolean`
  - `promote-to: null | "spec-NNNN/07_Decisions.md"`
- A violation raises `W-WORKLOG-SCHEMA` (warning, non-blocking).
- On the story tree, `scope ∈ {global, BF-NNNN}` and `promote-to: null | "decisions.md"`; the other fields are unchanged (`.qfai/contracts/cli/worklog-entry.schema.md#story-tree-layout`).

## BR-0004-0016: link-integrity resolution

- AC-Refs: AC-0004-0017
- Each element of the `links:` array is `spec-NNNN`, `discussion-YYYYMMDDhhmmssSSS`, or a kebab-case entry ID with no required prefix. The validator probes the matching path (`.qfai/specs/spec-NNNN/`, `.qfai/discussion/discussion-*/`, or `.qfai/steering/<id>.md`), and an unresolved element raises `W-WORKLOG-BROKEN-LINK` (warning).
- On the story tree, an element is `BF-NNNN`, `DEC-NNNN`, `discussion-*` or an entry ID. `BF-NNNN` resolves to a `business-flow-NNNN/` directory under `paths.specsDir`, and `DEC-NNNN` to a row of `decisions.md`; the other two resolve as above (`.qfai/contracts/cli/worklog-entry.schema.md#story-tree-layout`).

## BR-0004-0017: justification non-empty required for drift findings

- AC-Refs: AC-0004-0018
- `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` finding objects は `justification: <string>` (non-empty, trimmed length > 0) を必須とする。空文字列・undefined・whitespace-only は schema 違反として advisory-failing error にする。

## BR-0004-0018: handoff entry 5-section schema

- AC-Refs: AC-0004-0019
- `kind: handoff` の本文は 5 必須セクション (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first`) を順序通り含む (canonical contract: `.qfai/contracts/cli/worklog-entry.schema.md`)。1 セクションでも欠落 → `R-HANDOFF-INCOMPLETE` (error, advisory-failing)。順序の入れ替わりは warning ではなく検査対象外 (将来検討)。

## BR-0004-0019: promotion gate triplet

- AC-Refs: AC-0004-0020
- A decision promotion is satisfied only when all three conditions hold: (a) a row in the declared `promote-to: spec-NNNN/07_Decisions.md` target cites the entry ID as a whole token; (b) the entry is `archived`; and (c) its `promoted-to` field holds that row's DR ID. If any one is missing, `W-PENDING-PROMOTION` is raised.
- On the story tree, a promotion is satisfied when a `decisions.md` row cites the entry ID as a whole token, the entry is `archived`, and its `promoted-to` holds that row's DEC ID. If any one is missing, `W-PENDING-PROMOTION` is raised (`.qfai/contracts/cli/qfai-validate.md#work-log-and-reviewer-gate`).

## BR-0004-0020: stale window is 90 days

- AC-Refs: AC-0004-0021
- `W-WORKLOG-STALE` の閾値は `now - updated > 90 days`。1 day = 86400 seconds、now は validator 実行時の UTC ISO-8601。閾値定数は `assistantPaths.ts#WORKLOG_STALE_DAYS = 90` の SSOT 参照。

## BR-0004-0021: sunset minor named in deprecation warning

- AC-Refs: AC-0004-0022
- `D-DEPRECATED-PATH` warning 本文には sunset minor version (例: `v1.10.0`) が文字列リテラルで含まれる。曖昧表現 (例: "次の release") は使用禁止。sunset SSOT は `core/paths/assistantPaths.ts#legacyAssistantSteeringSunsetLabel` (`"1.10.0"`)。

## BR-0004-0022: project_memory block required per skill

- AC-Refs: AC-0004-0023
- The trailing YAML block of `<paths.skillsDir>/qfai-*/SKILL.md` always contains the `project_memory:` key, with the sub-keys `reads:` (an array of layer-relative paths) and `writes:` (an array, which may be empty).

## BR-0004-0023: SKILL.md broken-ref surface

- AC-Refs: AC-0004-0024
- The validator path-resolves every `.qfai/assistant/...` path reference in a SKILL.md body. A reference that does not resolve raises `W-SKILL-DOC-BROKEN-REF` (warning). A reference that does not exist under a canonical layer defined in `assistantPaths.ts` is treated as broken.
- With the `rule/ skill/ agent/ prompt/` assistant tree, the canonical layers are `rule/`, `skill/`, `agent/` and `prompt/`, so a reference into `constitution/`, `manifest/`, `catalog/` or `process/` is broken (`.qfai/contracts/cli/qfai-validate.md#assistant-tree`).

## BR-0004-0024: informational pass-through preserved

- AC-Refs: AC-0004-0025
- `W-USER-EDIT-PRESERVED` は info severity の pass-through。warning/error として escalation してはいけない。validate report の "Informational" section に表示し、`counts.info` に算入する。

## BR-0004-0025: validate.json profile disambiguation

- AC-Refs: AC-0004-0031
- `qfai validate` の出力 path は次の SSOT 規約に従う:
  - profile-suffixed: `.qfai/report/validate-<profile>.json` — profile 別に独立、上書き禁止
  - always-latest: `.qfai/report/validate.json` — 直近 run を反映、top-level `profile: <string>` field を必須とする
- profile が明示されない run では `profile: "default"` を採用する。並行する複数 profile 実行で profile-suffixed path が衝突しないことが保証される。

## BR-0004-0026: legacy validate.json deprecation window

- AC-Refs: AC-0004-0032
- 旧 `.qfai/output/validate.json` への書き込みは deprecation window 中継続するが、書き込みと同時に `D-DEPRECATED-PATH` warning を fire する。warning 本文には sunset 版 `1.10.0` を文字列リテラルで含める (曖昧表現禁止、BR-0004-0021 の sunset-named パターンを再利用)。
- 実行時の tool 版が sunset 以上に達した時点で同条件は error にエスカレートし、旧 path への書き込みは停止する。SSOT 定数は spec-0004 owned validator 側で参照する。

## BR-0004-0027: SSOT-sync pair-changed CI lane

- AC-Refs: AC-0004-0033, AC-0004-0034
- 新 CI lane (`pnpm ci:lint` 配下) は次の pair-changed invariant を強制する:
  - 片方のみ変更: `findDesignMdViolations.ts` または `generator-prompt.md` のうち一方のみが PR で変更された場合、lane は FAIL し `R-PROMPT-SCANNER-DRIFT` (severity error) を emit する
  - 両方変更: 両ファイルが同一 PR で touched なら lane は pass する
  - 両方未変更: lane は silently pass する (no finding)
- pair の SSOT は本 BR (lane 設定は実装側で同 BR を参照)。lane は `.agents/rules/distributed-surface.md` の layer-1/2/3 mirror invariant pattern を再利用する。

## BR-0004-0028: R-PROMPT-SCANNER-DRIFT justification 3-part contract

- AC-Refs: AC-0004-0035
- `R-PROMPT-SCANNER-DRIFT` finding object は `justification: <string>` (non-empty, trimmed length > 0) を必須とする。`justification:` 本文は次の 3 要素を含むこと:
  1. 修正されたファイル path
  2. 対応する修正が欠落しているカウンターパート path
  3. match を確認できない契約条項 (clause text or anchor)
- 3 要素のうち 1 つでも欠落した justification は schema 違反として advisory-failing error として扱う。`qfai validate` は empty / whitespace-only / undefined を即時 reject する (BR-0004-0017 の R-WORKLOG-DRIFT パターンと同形)。

## BR-0004-0029: certify reads validate.json with profile awareness

- AC-Refs: AC-0004-0031, AC-0004-0032
- certify 系コマンドが `validate.json` を読む際は top-level `profile` field を必ず照合し、期待 profile と一致しない場合は読込を中断し再実行コマンドを operator に提示する。
- 旧 `.qfai/output/validate.json` を読む下流は deprecation window 中は許容するが、`D-DEPRECATED-PATH` warning を伝搬する。sunset 後は読込自体を error として扱う。

## BR-0004-0030: SaaS-package validate profile (REQ-0166 validate side)

- AC-Refs: AC-0004-0036
- `qfai validate --profile saas-package` PASSes only when ALL three conditions hold: (a) the prototyping-profile validate PASSes, (b) a DCON-005 design-system attestation is present at `<paths.contractsDir>/design/design-system.yaml`, and (c) the CLI-HANDOFF cross-skill handoff schema PASSes (per `_policies/05_Contracts.md` §CHG-006).
- ATDD-class and implement-class gates MUST be SKIPPED under this profile, and each skip MUST be surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity info) finding naming the skipped gate.
- This is the validate side of REQ-0166; the certify side (`qfai prototyping certify --scope saas-package`) is owned by spec-0014 (same Source REQ, file-local IDs). The skipped gates named here MUST match what the certify-side `notes:` field reports.

## BR-0004-0031: `primary_tasks` shape acceptance + count band (REQ-0164)

- AC-Refs: AC-0004-0037
- `auditProfile.ts` MUST accept BOTH the legacy string-only `primary_tasks` form AND the structured form `{ id: string, label: string, acceptance: string }` with all three required and `additionalProperties: false` (per DR-0268).
- String-only items MUST continue to PASS during the deprecation window (one-minor window per OC-63); a `D-DEPRECATED-*` warning may fire on string-only at sunset.
- The `QFAI-AUD-020` warning text MUST name the recommended count band `3..7` (per DR-0267).

## BR-0004-0032: pack-location lint lane emits R-PACK-LOCATION-DRIFT (REQ-0167)

- AC-Refs: AC-0004-0038
- `packages/qfai/scripts/check-pack-locations.mjs` MUST scan staged / changed directories (not a full-tree walk, per DR-0274) for `review-*/` or `discussion-*/` directories outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`) and be wired into `pnpm ci:lint`.
- On a misplaced directory the lane MUST emit `R-PACK-LOCATION-DRIFT` (severity error, advisory-failing) referencing `.agents/rules/root-additions-policy.md` and proposing the correct allowed-root path.

## BR-0004-0033: pack-location lane is scoped and non-flagging on clean PRs (REQ-0167)

- AC-Refs: AC-0004-0039
- The lane MUST pass silently (no `R-PACK-LOCATION-DRIFT`) when pack directories are added only under allowed roots or when no pack directory is touched.
- Pre-existing legacy packs on unrelated PRs MUST NOT be re-flagged — scope is staged/changed dirs only (per DR-0274).

## BR-0004-0043: The detected layout selects the validators

- AC-Refs: AC-0004-0041
- A project is on the spec-pack layout when its `paths.specsDir` holds a `spec-*/` or `_policies/` directory, and on the story tree otherwise.
- The story-tree finding families run only on the story tree. A tree holding both layouts raises `QFAI-LAYOUT-001` and runs no story-tree family (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0044: A story directory holds exactly three files

- AC-Refs: AC-0004-0042
- A `user-story-NNNN-NNNN/` directory holds exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md`, and no subdirectory.
- Any missing or extra entry is an error in `sdd` naming the directory and each such entry (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0045: Seven ID shapes

- AC-Refs: AC-0004-0043
- On the story tree an ID has one of seven shapes: `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN`, `OQ-NNNN`.
- A defined ID that does not match its shape is an error in `sdd` naming the ID and the file that defines it (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0046: An ID is defined once in the tree

- AC-Refs: AC-0004-0044
- Each ID of the seven shapes is defined once across the whole story tree.
- An ID defined more than once is one error in `sdd` naming the ID and every file that defines it (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0047: An ID agrees with where it sits

- AC-Refs: AC-0004-0045
- A story ID starts with its flow's number, and an AC or EX ID starts with its story's ID. A `business-flow-NNNN/` or `user-story-NNNN-NNNN/` directory is named after the ID it holds.
- Any disagreement is an error in `sdd` naming the ID and the file that defines it (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0048: `contracts.md` lists every contract file

- AC-Refs: AC-0004-0046
- On the story tree, every contract file under `paths.contractsDir` has a row in `contracts.md`.
- An unlisted file raises `QFAI-CONTRACT-034` at error in `sdd`, keyed by the `CON-*` ID the file declares, and by file path for a file under `cli/` or `design/` that declares none (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0049: The steering-placeholder check reads the contract layer

- AC-Refs: AC-0004-0047
- On the story tree, `QFAI-ASSETS-003` reads `tech.md` and `structure.md` under `paths.contractsDir`, the Standard commands section of `tech.md` included, and no catalog copy of either file.
- The finding names the file and each section still holding a shipped placeholder. The quality-gate commands live only in that Standard commands section.

## BR-0004-0050: The two tables have exactly four columns

- AC-Refs: AC-0004-0048
- The table in `decisions.md` and the table in `open-questions.md` have exactly the columns ID, Content, Approach and Status.
- Any other column, or a missing one, is an error in `sdd` naming the file and the column (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0051: Status vocabulary per table

- AC-Refs: AC-0004-0049
- Both tables use TODO, WIP and DONE. `decisions.md` adds `SUPERSEDED (by DEC-NNNN)` and REJECTED; `open-questions.md` adds DEFERRED.
- A SUPERSEDED Status is checked for the shape `SUPERSEDED (by DEC-NNNN)`, not for the existence of the DEC row it names.
- A Status outside its table's vocabulary is an error in `sdd` naming the file and the row ID (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0052: Each table holds its own ID shape

- AC-Refs: AC-0004-0050
- `decisions.md` rows carry `DEC-NNNN` IDs and `open-questions.md` rows carry `OQ-NNNN` IDs.
- A row whose ID has the other table's shape is an error in `sdd` naming the file and the row ID (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0053: A row a validator reads opens with a keyword

- AC-Refs: AC-0004-0051
- A row that a validator reads opens its Content cell with a keyword and a colon, followed by the IDs or paths it refers to, separated by commas.
- Status alone decides whether the row is in force: `Test exception:` while DONE, `Change request:` while WIP or DONE, `Unadjudicated:` while TODO or WIP (`.qfai/contracts/cli/qfai-validate.md#rows-a-validator-reads`).

## BR-0004-0054: An unadjudicated question fails the gate while open

- AC-Refs: AC-0004-0052
- On the story tree, `QFAI-SPACK-102` reads an `open-questions.md` row opening `Unadjudicated:` with Status TODO or WIP, and raises an error naming the file and the row ID (`.qfai/contracts/cli/qfai-validate.md#rows-a-validator-reads`).
- The status vocabulary of `open-questions.md` is unchanged by this rule.

## BR-0004-0055: Table rows are only appended

- AC-Refs: AC-0004-0053
- In the `drift` profile, a row of `decisions.md` or `open-questions.md` that the base holds may change only its Status cell.
- A removed row, or a changed ID, Content or Approach cell, is an error naming the file, the row ID and the changed cell. An ID change has no exception. The rule covers both tables whether or not a change request names them (`.qfai/contracts/cli/qfai-validate.md#drift-gate`).

## BR-0004-0056: An unresolvable base reports nothing

- AC-Refs: AC-0004-0054
- Both story-tree `drift` checks compare against `baseBranch` from `qfai.config.yaml` (default `origin/main`) as `<base>...HEAD`.
- When git cannot answer, because the base ref is missing or the project is not a repository, neither check reports anything (`.qfai/contracts/cli/qfai-validate.md#drift-gate`).

## BR-0004-0057: The protected set

- AC-Refs: AC-0004-0055
- On the story tree the protected set is `01_policy/**` and `02_business-flow/**` under `paths.specsDir`, everything under `paths.contractsDir`, `decisions.md` and `open-questions.md` (`.qfai/contracts/cli/qfai-validate.md#drift-gate`).

## BR-0004-0058: A change-request row in force authorises a protected change

- AC-Refs: AC-0004-0055
- A protected file changed since the base needs a `decisions.md` row opening `Change request:` that names the file, with Status WIP or DONE.
- Without one, the `tdd` and `drift` profiles raise an error naming the path. A row at TODO authorises nothing (`.qfai/contracts/cli/qfai-validate.md#drift-gate`).

## BR-0004-0059: Raising a change request needs no authorisation

- AC-Refs: AC-0004-0056
- A change to `decisions.md` confined to `Change request:` rows, appending one at any Status or changing the Status of one, is the one unauthorised change to a protected file that raises no error.
- Every other change to `decisions.md` needs a change-request row in force that names the file (`.qfai/contracts/cli/qfai-validate.md#drift-gate`).

## BR-0004-0060: An EX names exactly one AC of its own story

- AC-Refs: AC-0004-0057
- Each EX row names exactly one AC in its `AC-Ref` cell, and that AC is defined in the same story.
- An EX naming no AC, several ACs, an undefined AC, or an AC of another story is an error in `sdd` naming the EX ID and its file (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0061: Every AC has an example

- AC-Refs: AC-0004-0058
- Every AC is named in the `AC-Ref` cell of at least one EX.
- An AC with none is an error in `sdd` naming the AC ID and its file (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0062: One rule shape in three file forms

- AC-Refs: AC-0004-0059
- A business rule lives in the contract file that enforces it, with the fields `id` (`BR-NNNN`), `statement` and `examples` (one or more full EX IDs).
- The forms are a top-level `x-qfai-rules:` list in YAML or JSON, `-- Rule BR-NNNN:` followed by `-- Examples:` lines in SQL, and a `## Rules` table with the columns BR-ID, Statement and Examples in Markdown. A file-level rule-refs list names rules another contract defines (`.qfai/contracts/cli/qfai-validate.md#business-rules-in-contracts`).

## BR-0004-0063: Every rule cites examples that exist

- AC-Refs: AC-0004-0060
- Every rule names at least one EX in its examples, and every EX it names is defined in the tree.
- A rule with no examples, or naming an undefined EX, is an error in `sdd` naming the BR ID and the contract file. A SQL `-- Rule` line with no `-- Examples:` line after it has no examples (`.qfai/contracts/cli/qfai-validate.md#business-rules-in-contracts`).

## BR-0004-0064: Every EX is cited by a rule

- AC-Refs: AC-0004-0061
- Every EX is named in the examples of at least one rule. The citation runs one way, rule to example, so an uncited EX is found by reading every rule.
- A rule-refs entry does not count as citing the referenced rule's examples. An uncited EX is an error in `sdd` naming the EX ID and its file (`.qfai/contracts/cli/qfai-validate.md#business-rules-in-contracts`).

## BR-0004-0065: A rule ref names a defined rule

- AC-Refs: AC-0004-0062
- Every rule-refs entry names a BR that some contract defines.
- An entry naming an undefined BR is an error in `sdd` naming the BR ID and the file that carries the reference (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0066: The directory decides a test file's layer

- AC-Refs: AC-0004-0063, AC-0004-0064
- A test file's layer comes from its directory, through the crosswalk `test-layers.md` declares: `<paths.testsDir>/e2e/**` is E2E, and `<paths.testsDir>/integration/**` and `<paths.testsDir>/api/**` are integration and API (`.qfai/contracts/cli/qfai-validate.md#what-counts-as-a-test`).
- `QFAI:BF-`, `QFAI:AC-` and `QFAI:EX-` annotations are the only coverage annotations on the story tree.

## BR-0004-0067: A business flow owes an E2E test

- AC-Refs: AC-0004-0063
- A BF is covered only by a `QFAI:BF-NNNN` annotation in a file under the E2E layer.
- An uncovered BF with no exception in force is an error in `atdd` naming the BF ID and its file (`.qfai/contracts/cli/qfai-validate.md#what-counts-as-a-test`).

## BR-0004-0068: An acceptance criterion owes an integration or API test

- AC-Refs: AC-0004-0064
- An AC is covered only by a `QFAI:AC-NNNN-NNNN-NN` annotation in a file under the integration or API layer.
- An uncovered AC with no exception in force is an error in `atdd` naming the AC ID and its file (`.qfai/contracts/cli/qfai-validate.md#what-counts-as-a-test`).

## BR-0004-0069: An example owes a test

- AC-Refs: AC-0004-0065
- An EX is covered by a `QFAI:EX-NNNN-NNNN-NN` annotation in any file `validation.traceability.testFileGlobs` selects.
- An uncovered EX with no exception in force is an error in `tdd` naming the EX ID and its file (`.qfai/contracts/cli/qfai-validate.md#what-counts-as-a-test`).

## BR-0004-0070: A BF or AC annotation sits in its own layer

- AC-Refs: AC-0004-0066
- A `QFAI:BF-` annotation in a file outside the E2E layer, or a `QFAI:AC-` annotation in a file outside the integration and API layers, is an error in `atdd` naming the file and the annotation (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0071: An annotation names a defined ID

- AC-Refs: AC-0004-0067
- A `QFAI:BF-`, `QFAI:AC-` or `QFAI:EX-` annotation naming an ID the tree does not define is an error in `atdd` and `tdd` naming the file and the ID (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0072: A test exception holds only while DONE and does not cascade

- AC-Refs: AC-0004-0068
- A `decisions.md` row opening `Test exception:` names the BF, AC or EX IDs it exempts, with the reason in Approach. It holds only while its Status is DONE.
- It exempts only the obligation of each named ID's own shape: a BF its E2E test, an AC its integration or API test, an EX its test. It does not reach the ACs of the BF's stories or the EXs of the AC (`.qfai/contracts/cli/qfai-validate.md#rows-a-validator-reads`).

## BR-0004-0073: An exempted item is listed, and an unknown ID exempts nothing

- AC-Refs: AC-0004-0068
- Each item an exception in force exempts is listed at info in `atdd` and `tdd`, naming the ID and the DEC row.
- A named ID the tree does not define exempts nothing: the obligation error stays, and no other finding is raised for the row (`.qfai/contracts/cli/qfai-validate.md#rows-a-validator-reads`).

## BR-0004-0074: The old layout is one error in every profile

- AC-Refs: AC-0004-0069
- When `paths.specsDir` holds a `spec-*/` or `_policies/` directory, every profile raises one `QFAI-LAYOUT-001` error whose message names, in one sentence, the path and `/qfai-migration-spec-to-story` (`.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0004-0075: The old-layout error suppresses the story-tree families

- AC-Refs: AC-0004-0069
- When the old-layout error fires, no story-tree finding family runs in that run, so the one sentence that says what to do is not buried (`.qfai/contracts/cli/qfai-validate.md#profiles`).

## BR-0004-0077: The source-comment guard learns the story-tree ID shapes

- AC-Refs: AC-0004-0071
- The `src-comment` rule of `packages/qfai/scripts/lint-shipping.ts` rejects a comment line in `packages/qfai/src/**/*.ts` carrying an ID of the seven story-tree shapes with a numeric segment outside the sample band: `0001` to `0009` for each four-digit segment, and `01` to `09` for the two-digit tail.
- The new patterns do not match an old composite `DEC-NNNN-NNNN` or `OQ-NNNN-NNNN` ID a second time. The post-build guard and the smoke test hold the same pattern set, as `.agents/rules/distributed-surface.local.md` requires.

## BR-0004-0078: `--flow` scopes a validate run to named business flows

- AC-Refs: AC-0004-0072
- On the story tree, `qfai validate --flow BF-NNNN` checks the named flow, its stories, their ACs and EXs, and the rules that cite those EXs. Each `--flow` value adds its flow to the scope, as each `--spec` value does today.
- The result goes to `validate.flow-<ids>.json` beside the configured `validate.json`. `validate.json`, `validate-<profile>.json` and the legacy path are not written, so parallel runs over different flows do not overwrite one another (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).

## BR-0004-0079: `--spec` is refused on the story tree

- AC-Refs: AC-0004-0073
- On the story tree, `qfai validate --spec <spec-id>` exits 2, and its message names `--flow BF-NNNN` as the option that scopes a run (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).

## BR-0004-0080: An unusable `--flow` value writes no scoped result

- AC-Refs: AC-0004-0074
- A `--flow` value that is not a `BF-NNNN` ID, or that names a flow the tree does not define, is an error finding naming the value.
- The run then writes no `validate.flow-*.json`, so a failing scope never writes the file a healthy one would (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).

## BR-0004-0081: A base with no story tree reports nothing

- AC-Refs: AC-0004-0075
- When the merge base of `baseBranch` and HEAD holds no `decisions.md` at the configured `paths.specsDir`, neither story-tree `drift` check reports anything.
- Such a base is the branch that migrates a project or a project's first `qfai init`: it has no story tree to protect, and every protected file would read as changed (`.qfai/contracts/cli/qfai-validate.md#drift-gate`).
