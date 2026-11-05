---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# Naming Conventions

## Principles

- The ID is the authoritative reference; the file name is supplementary.
- Business flows group user stories; examples cite their acceptance criterion,
  and contract rules cite examples.
- Use `.qfai/spec/` as the configured `paths.specsDir`. Its policy, flow and
  contract layers are described below.

## Story-tree files

```text
.qfai/spec/
  decisions.md
  open-questions.md
  01_policy/
    objective.md
    initiative.md
    principle.md
    glossary.md
    constraint.md
  02_business-flow/
    business-flows.md
    business-flow-NNNN/
      business-flow.md
      user-stories.md
      user-story-NNNN-NNNN/
        01_User-story.md
        02_Acceptance-Criteria.md
        03_Example.md
  03_contract/
    contracts.md
    tech.md
    api/ db/ ui/ cli/ design/
```

The story-tree validator checks required files and rejects nested story
directories. The former spec-pack layout raises `QFAI-LAYOUT-001`.

Every Markdown file in the tree conforms to its closed schema in
`packages/qfai/assets/mdschema/`, which fixes its headings, their order and the
one kind of content each section holds. `qfai validate` reports a violation as
`QFAI-DOCSCHEMA-001`.

## ID Formats

- business flow: `BF-0001`
- user story: `US-0001-0001` under `BF-0001`
- acceptance criterion: `AC-0001-0001-01` under its story
- example: `EX-0001-0001-01` with one `AC-Ref`
- business rule: `BR-0001` in a contract, citing its examples
- decision and open question: `DEC-yyyymmddhhMMss`, `OQ-yyyymmddhhMMss`, the UTC
  time the row is written; a second already taken moves to the next free one.
  Legacy `DEC-0001` and `OQ-0001` rows keep their IDs.

A decision or question ID takes no candidate. Every other new ID comes from
`node scripts/story-ids.mjs next <scope>...`, for example
`next EX-0001-0054`. It is a candidate, not a reservation. The command
counts a snapshot of main, the latest 100 updated open pull requests and the
working tree. It does not guarantee unique allocation for unpublished branches
or simultaneous checks followed by pushes.

Commit the ID and reference changes before running check, and use a clean index
and working tree. Run `node scripts/story-ids.mjs check` before push. If it returns
0, push the same HEAD immediately. On a collision, renumber the ID and references
with a fresh `next` candidate, commit them, then check again. After any change or
merge, check again before pushing.

A collision returns 1 and names the ID and published branch that also adds it.
For a DEC or OQ ID, two rows were written in the same second: delete this
branch's own row and append it again under a new timestamp ID, updating the
citations this branch added. A row another branch holds is never renumbered.
An unfinished merge returns 2 without comparing IDs. Finish the merge, then
check again; this refusal is not a successful collision check.

## Contracts

- API, DB and UI contracts declare one
  `QFAI-CONTRACT-ID: <KIND>-NNNN`, such as `API-0002`.
- A CLI contract declares `# CLI-NNNN: <title>` as its H1 and is named
  `cli/cli-NNNN-<slug>.md`.
- `03_contract/contracts.md` lists every contract by that ID.

## Examples and test annotations

- `03_Example.md` holds one table with the columns
  `EX-ID | AC-Ref | Input | Expected`, as its schema fixes.
- E2E tests annotate `QFAI:BF-0001`; integration and API tests annotate
  `QFAI:AC-0001-0001-01`; selected non-E2E tests annotate
  `QFAI:EX-0001-0001-01`.
