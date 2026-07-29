# Stage 1 Triage Procedure

Stage 1 sits between preflight (Stage 0) and Phase 0 (Contracts-first).
Its goal is to decide, **before any spec edit begins**, what operation
each incoming requirement implies on the existing specs.

## Principle: append-first

The default operation is **UPDATE on an existing active spec** (APPEND /
MODIFY / REMOVE). CREATE is reserved for genuine scope deviations that
introduce a brand-new capability. Past incidents arose because
requirements that should have been BR additions to an existing spec
were spun off into stand-alone specs, fragmenting traceability.

Concretely, before persisting any Triage row:

1. Read every active spec's `01_Spec.md` Scope, `03_Acceptance-Criteria.md`,
   and `04_Business-Rules.md`. The classifier output is a _proposal_; the
   final decision must be informed by reading the candidate spec body.
2. Pick the spec whose scope most closely absorbs the new requirement.
3. Append a new BR/AC/EX/TC there. Never CREATE-as-shortcut. A spec over the
   size threshold is a **signal, not an operation**: record the breach in the
   row's `Rationale` and start a capability-ownership review. Propose
   **SPLIT** only if that review shows the spec genuinely owns more than one
   `CAP-NNNN`; if it owns exactly one, the operation stays **UPDATE:APPEND**
   and the reasoned non-split is recorded. A count-driven SPLIT of a
   single-capability spec is illegal — `validateSpecSplitByCapability` raises
   `QFAI-SPLIT-102` / `QFAI-SPLIT-104` at `error`, so it has no legal end
   state. See `_policies/11_Slice-Policy.md` step 4.
4. Only when no active spec's scope can absorb the requirement, AND the
   underlying capability is itself new, propose **CREATE**. Add the new
   `CAP-NNNN` to `_policies/03_Capabilities.md` _first_, then cite it in
   the Triage row's Rationale column. `QFAI-TRIAGE-006` will fail the
   validator otherwise.

The classifier (`src/core/sddTriage.ts::classifyTriage`) implements an
append-first fallback: when the REQ's capability does not match exactly,
it still proposes APPEND on the active spec whose title/capability/scope
shares the most subject tokens. CREATE is emitted only when there is
**zero** token overlap with any active spec.

## Operation set (8 first-class)

| Operation | Sub-op | When to choose                                                                                                                                                                                                                                                                                                                                          | Approval |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| CREATE    | -      | New subject; no active spec owns the capability                                                                                                                                                                                                                                                                                                         | Required |
| UPDATE    | APPEND | Add new US/AC/BR/EX/TC to an active spec (no semantic change)                                                                                                                                                                                                                                                                                           | -        |
| UPDATE    | MODIFY | Change the meaning of an existing US/AC/BR/EX/TC                                                                                                                                                                                                                                                                                                        | -        |
| UPDATE    | REMOVE | Delete an existing US/AC/BR/EX/TC (cuts downstream refs)                                                                                                                                                                                                                                                                                                | Required |
| DELETE    | -      | Subject was removed from the product; the spec itself goes away                                                                                                                                                                                                                                                                                         | Required |
| SPLIT     | -      | One spec carries >1 capability; split into N specs                                                                                                                                                                                                                                                                                                      | Required |
| MERGE     | -      | Multiple specs converge on one capability; collapse them                                                                                                                                                                                                                                                                                                | Required |
| SUPERSEDE | -      | Responsibilities move to a new spec; flip status, keep history. Also covers single-spec **RENAME** (subject change at the same ID is normally UPDATE:MODIFY; if the spec ID itself must change while scope stays the same — i.e. **RENUMBER** — emit SUPERSEDE: create the new ID, mark the old as superseded). MERGE handles multi-spec consolidation. | Required |

## Inputs

1. Latest discussion-pack `06_REQ.md` / `07_NFR.md` / `99_delta.md`.
2. `_policies/03_Capabilities.md` (CAP catalog).
3. `_policies/11_Slice-Policy.md` (operation rules + size thresholds).
4. Active spec summaries from `01_Spec.md` headers across `.qfai/specs/spec-*`.

## Procedure

1. **Enumerate active specs.** Skip specs whose `Status:` is
   `superseded`, `deprecated`, or `removed`.
2. **List incoming REQs/NFRs.** One row per requirement, capability tag
   if known.
3. **Run the append-first classifier** (`classifyTriage`) for an initial
   proposal. Treat the output as a _hypothesis_ — every row must be
   re-checked by reading the proposed spec body before persisting.
4. **Walk the impact cascade.** For every REQ, scan _every_ active spec
   (not just the proposed primary) and record companion edits. See the
   "Impact cascade" section below.
5. **Approval pass.** For every row whose Operation requires approval
   (CREATE, DELETE, SPLIT, MERGE, SUPERSEDE) or whose Sub-op is REMOVE,
   present an AskUserQuestion with the proposed operation. Record the
   approver in the `Approved By` column.
6. **Persist.** Write the Triage table into:
   - `<spec>/09_delta.md` for rows that touch a single spec, and
   - `_policies/10_delta.md` for cross-spec rows (SPLIT / MERGE /
     SUPERSEDE) and policy-only changes.
7. **Stop.** Do not enter Phase 0 until every required-approval row has
   an approver recorded and every CREATE row cites a registered CAP.

## Impact cascade (1 REQ → N rows)

A single requirement frequently affects multiple specs. The agent MUST:

1. Identify the _primary_ spec (the one absorbing the new BR/AC).
2. Walk every other active spec and check whether the change forces a
   companion edit:
   - Existing US/AC/BR/EX/TC that references the changed concept →
     **UPDATE:MODIFY** in that spec.
   - Now-obsolete US/AC/BR/EX/TC → **UPDATE:REMOVE** in that spec.
   - Glossary / contract impact → record in `_policies/10_delta.md`.
3. Emit one Triage row per affected spec. The same `Source` (REQ ID) may
   appear on multiple rows — this is the canonical cascade pattern.

Example cascade for `REQ-0042 (rename token "draft" -> "proposal")`:

| Source   | Subject                      | Existing Spec | Operation | Sub-op | Approved By | Rationale                        |
| -------- | ---------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------- |
| REQ-0042 | rename "draft" -> "proposal" | spec-0003     | UPDATE    | MODIFY | -           | primary owner                    |
| REQ-0042 | rename "draft" -> "proposal" | spec-0007     | UPDATE    | MODIFY | -           | AC-0007-0004 references the term |
| REQ-0042 | rename "draft" -> "proposal" | spec-0009     | UPDATE    | REMOVE | user@host   | BR-0009-0002 obsoleted by rename |

## Triage table format

```markdown
## Triage

| Source   | Subject     | Existing Spec | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | ------------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | spec-NNNN     | UPDATE    | APPEND | -           | <why>     |
```

Required columns: `Source`, `Subject`, `Existing Spec`, `Operation`.
Conditional: `Sub-op` (UPDATE only), `Approved By` (approval-required
ops), `Rationale` (recommended for every row).

## Validators

- `QFAI-TRIAGE-001` (warning): delta.md has `## Change Summary` but no
  `## Triage` section.
- `QFAI-TRIAGE-002` (error): table is missing or required columns are
  absent.
- `QFAI-TRIAGE-003` (error): Operation is not one of the 8 ops.
- `QFAI-TRIAGE-004` (error): UPDATE row without a valid Sub-op
  (APPEND / MODIFY / REMOVE).
- `QFAI-TRIAGE-005` (error): approval-required Operation has no
  `Approved By` value.
- `QFAI-TRIAGE-006` (error): CREATE row without a `CAP-NNNN` reference
  in the Rationale column, or referencing a CAP that is not registered
  in `_policies/03_Capabilities.md`. This is the structural gate that
  enforces the append-first principle: CREATE is only permitted when a
  new capability is being added to the catalog.

## Status field interaction

- SUPERSEDE rewrites the source spec's `01_Spec.md` to
  `Status: superseded` and sets `Superseded-by: spec-NNNN`.
- DELETE removes the spec directory entirely (record reason in delta).
- Deprecated specs require `Deprecated-at: YYYY-MM-DD`.
- Triage classification ignores non-active specs.
