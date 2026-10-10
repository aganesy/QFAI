---
category: project
update-frequency: occasional
dependencies:
  - 00_universal/thinking.md
  - 00_universal/quality.md
  - 00_universal/communication.md
  - 01_specialties/planning.md
  - 01_specialties/testing.md
  - 02_project/development.md
  - 02_project/tech-stack.md
  - 02_project/patterns.md
version: 1.0.0
---

# Spec-Driven Development (QFAI Toolkit) Operations Guide

QFAI treats the story tree under `.qfai/spec/` as the specification source.
The discussion pack supplies upstream context. Contract rules derive from
examples in the business flows.

## Overall Flow (by artifact)

```text
.qfai/discussion (upstream input when available)
        ↓
.qfai/spec/01_policy
        ↓
.qfai/spec/02_business-flow (BF → US → AC → EX)
        ↓
.qfai/spec/03_contract (BR → EX)
        ↓
qfai validate → .qfai/report/validate.json
        ↓
qfai report → .qfai/report/report.md
```

## Key Points by Phase

### Phase 0: Importing requirements

- A discussion pack under `.qfai/discussion/` is the usual input, and it is
  optional. A spec set taken in without one is recorded as import-lite evidence
  instead.

### Phase 1: Policy and business flows

- Write policy first, then each concrete business flow and its stories,
  acceptance criteria and examples. This repository groups its stories into
  four flows: development, pull request CI, workspace diagnosis, and migration.
- Each story has `01_User-story.md`, `02_Acceptance-Criteria.md` and
  `03_Example.md`. Each EX cites one AC. See `02_project/naming.md`.
- Record decisions and unresolved questions in `decisions.md` and
  `open-questions.md`.

### Phase 2: Writing contracts

- Write contract rules from the agreed examples. A BR belongs to one contract
  and cites the EX IDs it explains.
- Place contracts under `.qfai/spec/03_contract/` and keep
  `03_contract/contracts.md` current. API, DB and UI contracts retain
  their `QFAI-CONTRACT-ID` declarations; a CLI contract declares `CLI-NNNN` in
  its H1.

### Phase 3: Validation and reporting

- Confirm zero errors with `npx qfai validate --fail-on error`
- Generate the report with `npx qfai report`

## Read a CLI contract

Read the ownership boundary and relevant business-rule rows when investigating
one known CLI contract. If the BR-ID is known, select its complete row:

```sh
rg -n --fixed-strings -- '| BR-0009-0098 |' .qfai/spec/03_contract/cli/cli-0009-qfai-init.md
```

If the BR-ID is unknown, search for a topic in the same known file:

```sh
rg -n --fixed-strings -- 'Stop' .qfai/spec/03_contract/cli/cli-0009-qfai-init.md
```

Keep all matching rows as candidates. Read each selected row's complete
Statement and Examples, then follow its EX references and relevant rules in
other contracts. A keyword search can miss related obligations.

These lookups locate material for a focused investigation. They do not replace
a required review of the whole contract or the change's impact. Read the full
contract when that review is required. Do not truncate Statement or Examples
to fit the output.

## Quality Gates (minimum)

- Each business flow and story has its required files and valid IDs.
- Every spec-tree document conforms to its schema (`QFAI-DOCSCHEMA-001`).
- The `BF → US → AC → EX ← BR` links resolve, with no undeclared ID.
- Every BF has an E2E test, every AC an integration or API test, and every EX
  a selected non-E2E test, unless a `DONE` decision row exempts its own item.
- Contract index entries resolve to their files.
- `validate` reports zero errors

## Before Moving to Implementation

- For existing implementation patterns, see `.instruction/02_project/patterns.md`
- If anything is still unclear, ask instead of implementing
