# 07 Decisions

Decision Records for this spec. A `DR-*` cited from the `DR-ID` column of
`tdd/test-list.md` — which every `exception` row is required to carry — resolves
against this file, so an entry here is what makes that citation checkable.

## ID scheme

- **Spec-scoped**: `DR-NNNN-MMMM`. Use this form for a decision that binds only
  this spec. Setting `NNNN` to the spec's own number is the recommended
  convention and keeps the id self-locating, but validation checks the shape,
  not the match — do not read a passing run as confirmation of the pairing.
- **Policy-level**: `DR-NNNN`, declared in `_policies/08_Decisions.md` instead.
  Cite it from here rather than re-declaring it; an ID declared twice has two
  owners.

`npx qfai validate` accepts both shapes. A `DR-ID` cell matching neither raises
`TDDLIST_EXCEPTION_INVALID_DR`; one that resolves to no entry in either file
raises `TDDLIST_EXCEPTION_UNRESOLVED_DR`.

## Decisions

Every record below was settled in the delegated Phase 2 grilling of the
`/qfai-sdd` batch run. Each took the griller's recommendation; the record is in
`.qfai/evidence/sdd-batch-20260923100952585.md#phase-2-grilling-decisions`.

### DR-0018-0001: the migration guide ships inside the skill

- Status: accepted
- Context: a person needs to read what the migration does before running it,
  and the guide has to reach an adopter's machine.
- Decision: ship the guide as `references/migration-guide.md` in the
  `/qfai-migration-spec-to-story` skill, and name the release as `2.0.0`,
  without a `v`.
- Decision, rejected alternatives: `SKILL.md` itself, which is instructions to
  an AI rather than to a person; `packages/qfai/docs/`, which does not ship.
- Consequences: the guide passes the distributed-surface guards like every
  shipped file.
- Related: AC-0018-0027, BR-0018-0058

### DR-0018-0002: step 1 moves entry by entry and moves a colliding entry aside

- Status: accepted
- Context: once the assistant tree is renamed, `qfai init` writes `skill/` and
  `agent/` before a project can migrate, so step 1 always finds some
  destinations already present. The skill does not require a clean working
  tree, so a legacy directory may hold an adopter's uncommitted edits.
- Decision: move each legacy directory entry by entry. An entry whose
  destination is absent is renamed into it, so an adopter's own skill lands in
  `skill/`. An entry whose destination exists is moved to
  `.qfai/evidence/migration-spec-to-story/legacy/<dir>/` and listed under
  `## Operations`. The emptied legacy directory is then removed. Nothing is
  deleted, no report section is added, and the write set is unchanged.
- Decision, rejected alternatives: deleting the legacy governed directories,
  which can lose uncommitted edits (the author's recommendation, which the
  author flagged as critical); listing each conflict for a person, which adds a
  `## For a person` section step 1 does not print; refusing with exit 2, which
  would fire on every project.
- Consequences: a second run finds nothing to move and changes nothing. The
  contract's step-1 description gains a sentence saying so.
- Related: AC-0018-0008, AC-0018-0009, BR-0018-0019, BR-0018-0020

### DR-0018-0003: consumed sources are removed, and what has no destination is archived

- Status: accepted
- Context: if nothing removes the old files, the spec-pack directories survive
  the migration and the old-layout error never clears. Some files, such as
  `10_Plan.md`, `16_Traceability-ledger.md` and `tdd/`, have no destination.
- Decision: each step removes a source once all its content is written
  elsewhere. A file holding content with no destination goes to
  `.qfai/evidence/migration-spec-to-story/retired/<spec-id>/` instead of being
  deleted, so the evidence pointers of the old ledgers still resolve. A
  directory left empty is removed.
- Decision, rejected alternatives: deleting files with no destination (the
  author's recommendation); a final sweep step; leaving removal to a person.
- Consequences: the old layout disappears as the steps run, and nothing is
  lost.
- Related: AC-0018-0007, BR-0018-0014, BR-0018-0015, BR-0018-0016

### DR-0018-0004: step 3 moves the shared policy files; step 4 moves capabilities and flows

- Status: accepted
- Context: the contract's step descriptions do not say which step moves
  `_policies/05_Contracts.md`, `06_Glossary.md`, `07_Constraints.md`,
  `03_Capabilities.md` and `04_Business-Flow.md`.
- Decision: step 3 moves `05`, `06` and `07` with the other policy content.
  Step 4 moves `03` and `04`, because only the plan's flows give their content
  a destination.
- Decision, rejected alternative: a new step, which would change the settled
  step list.
- Consequences: the contract's step descriptions gain a clarifying sentence.
- Related: AC-0018-0012, AC-0018-0014, BR-0018-0027, BR-0018-0034

### DR-0018-0005: step 3 states each fact once by moving whole sections

- Status: accepted
- Context: the five merged files each take content from two or more sources,
  and discussion requirement REQ-0023 requires each fact stated once.
- Decision: move content section by section, following the source map. Write a
  paragraph identical to one already in the destination once. Send a section
  the map does not name to its source file's default destination:
  `objective.md` for `catalog/product.md`, `principle.md` for
  `catalog/manifest.md`. As the only source-map exception, archive the entire
  original `_policies/11_Slice-Policy.md` and copy none of its sections to
  `principle.md`. Current triage operations, approval, impact cascade and ID
  allocation remain in the shipped `qfai-sdd/references/sdd-triage.md`. The
  skill removes paraphrased duplicates from the other merged sources after step 3.
- Decision, rejected alternative: listing every unmapped section for a person,
  which adds a report section step 3 does not print.
- Decision, rejected alternative: copying template-matching sections of the old
  slice policy into `principle.md`. The old capability, spec-pack, test-case,
  size-threshold and positional-gap rules conflict with the story tree; the
  shipped SDD triage reference already has the current rules.
- Consequences: a duplicate that is not word for word is the AI's to find, not
  the script's.
- Related: AC-0018-0012, AC-0018-0025, BR-0018-0027, BR-0018-0028,
  BR-0018-0029, BR-0018-0055

### DR-0018-0006: progress is read from the tree

- Status: accepted
- Context: the contract requires a step to refuse when an earlier step has not
  run, and a project with nothing to migrate must be recognised.
- Decision: infer both from the tree. A step after step 1 refuses while a
  source path of step 1's rename map still exists; steps 5 to 8 refuse while
  the ID map is absent. On a tree with no old layout and no ID map every step
  prints `none` and exits 0, and the skill reports nothing to migrate when all
  steps do.
- Decision, rejected alternatives: a progress file, which a second run would
  have to update; init's old-layout predicate alone, which cannot tell the
  steps apart.
- Consequences: no file records progress, so idempotency holds by
  construction.
- Related: AC-0018-0002, AC-0018-0025, BR-0018-0005, BR-0018-0056

### DR-0018-0007: the old non-functional lists go to a person

- Status: accepted
- Context: each `01_Spec.md` lists its applicable non-functional requirements,
  and the story tree has no place for that list: contracts carry only rules.
- Decision: step 7 lists each pack's `## Applicable NFR` under
  `## For a person`, naming the contracts that pack's rules went to.
- Decision, rejected alternatives: a non-functional field in contracts, which
  contradicts the contract rule schema; dropping the list.
- Consequences: step 7 exits 3 on any project whose packs list a requirement.
- Related: AC-0018-0020, BR-0018-0048

### DR-0018-0008: a configured path is neither moved nor rewritten

- Status: accepted
- Context: a project may set `paths.specsDir` or `paths.contractsDir` to its
  own path rather than the default.
- Decision: step 1 moves a directory and rewrites its config key only where
  the key holds the old default. A configured path stays where the project put
  it.
- Decision, rejected alternative: always moving to the new default, which
  would override a choice the project made.
- Related: AC-0018-0008, BR-0018-0018

### DR-0018-0009: step 4 computes the test-case-to-example map

- Status: accepted
- Context: steps 5, 6 and 8 all need to know which example proves each old
  test case, and an example's story depends on the criterion its test cases
  name.
- Decision: step 4 computes the map, using step 6's criterion derivation, and
  writes it into the ID map once. Steps 5, 6 and 8 read it.
- Decision, rejected alternative: step 5 appending to the ID map, which the
  contract forbids: step 4 writes it once.
- Related: AC-0018-0014, BR-0018-0033, BR-0018-0035

### DR-0018-0010: the status map for the two tables

- Status: accepted
- Context: the old records use their own status words, and the two tables
  accept only their own vocabulary.
- Decision: for decisions, `proposed` becomes TODO, `accepted` DONE,
  `superseded` SUPERSEDED, `rejected` REJECTED and `re-open` WIP. A record with
  no status becomes DONE, and any other status TODO. For open questions, `open`
  becomes TODO, `deferred` DEFERRED and `resolved` DONE; `unadjudicated`
  becomes a TODO row opening `Unadjudicated:`, and any other status TODO.
- Decision, rejected alternative: listing unknown statuses for a person, which
  adds a report section step 2 does not print.
- Related: AC-0018-0010, AC-0018-0011, BR-0018-0023, BR-0018-0025,
  BR-0018-0026

### DR-0018-0011: old deferral markers are reported wherever they are

- Status: accepted
- Context: `x-qfai-status: planned` and `x-qfai-status: external` lines can sit
  in test files and in the story blocks step 4 carries into the new tree.
- Decision: step 8 reports every such line, in test files and under the spec
  tree, under `## Annotations kept`.
- Decision, rejected alternative: test files only, which would leave the
  markers step 4 carried unreported.
- Related: AC-0018-0022, BR-0018-0051

### DR-0018-0012: this spec is not split or trimmed to a size threshold

- Status: accepted
- Context: this spec carries more than 50 test cases. The Triage size test
  `acCount <= 30 && tcCount <= 50` is read only by Triage routing, and no
  validator enforces it.
- Decision: keep every rule and its example. Do not fold rules together to get
  under the threshold.
- Consequences: a later requirement on the migration skill is routed to this
  spec as an append, with its size stated in the Triage rationale.
- Related: `_policies/11_Slice-Policy.md`

### DR-0018-0013: rules cite their CLI contract in the rule text

- Status: accepted
- Context: `Contract-Refs` traces only API, database and UI contracts, and this
  spec follows CLI contracts.
- Decision: write `-` in `Contract-Refs` and name the contract file and section
  in each rule's `Rule` cell.
- Decision, rejected alternative: short contract IDs in `Contract-Refs`, which
  no tool traces here (the author's recommendation).
- Related: `04_Business-Rules.md` § `Reference Column Conventions`

## Re-open records

`Status: re-open` is the `[RE-OPEN]` decision record the Delta Rejected Guard
(`.qfai/assistant/constitution/shared-skill-operating-baseline.md`) requires before a candidate
listed under a delta's `## Rejected` may be re-adopted. It is an ordinary entry
in this file, so it inherits the ID scheme above and resolves the same way.

A re-open entry carries three things beyond a normal decision:

- `Re-opens:` — the prior `DR-*` being reconsidered. It must be a declared ID,
  and it cannot be the entry's own nor a re-open that points back at it: a pair
  citing each other has no prior decision anywhere in the loop.
- `Decision:` — what changed since the rejection. A re-open that repeats the
  original argument is the reintroduction the guard exists to stop, and the
  sample block's own `<...>` prompt counts as unwritten.
- `Approved by:` / `Approved at:` — the explicit approval, the time as
  `YYYY-MM-DDThh:mm:ssZ`. Until both are filled, the entry stays
  `Status: proposed`.

The rejected candidate in the same spec's delta points back at it through
`## Rejected`'s `Re-opened by:` line. Both directions are required, so the
rejection and the re-adoption are readable from either end.

`npx qfai validate` reports `QFAI-DECISION-001` when the entry's own ID is off
the scheme or `Re-opens:` is missing, malformed, self-referential or circular,
`QFAI-DECISION-002` when it resolves to no declared record, `QFAI-DECISION-003`
when the approval is absent or `Approved at:` is not a real
`YYYY-MM-DDThh:mm:ssZ` instant, `QFAI-DECISION-004` when the delta's
`Re-opened by:` and this entry do not name each other,
`QFAI-DECISION-005` when `Decision:` is missing, `QFAI-DECISION-006` when a
candidate the delta lists under `## Rejected` reappears under `## Adopted` with
no `Re-opened by:` of its own, and `QFAI-DECISION-007` when the same `DR-*` is
declared twice in this file, which leaves the re-opened decision ambiguous. A
re-open asserted anywhere else — a PR description, a commit message — is not
one.
