# Contract Artifact Rules

Use this file when `/qfai-sdd` creates or updates `.qfai/contracts/**`.

## Purpose

Contracts are version-managed downstream execution truth and inputs:

- `api/`: OpenAPI YAML
- `db/`: SQL schema contracts
- `ui/`: UI contract YAML
- `design/`: root `DESIGN.md` (brand SSOT) + lock, design system YAML, and handoff YAML. Evaluator axes are fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` and no longer authored as separate rubric / calibration contracts.

Discussion UI/UX files are upstream discovery artifacts. `/qfai-sdd` normalizes approved decisions into `.qfai/contracts/**`; downstream skills read contracts, not discussion UI/UX files.

## Rules

- Keep contract files minimal: only what specs and tests actually reference.
- UI contracts must be mockable for prototypes: define stable `elements`, `actions`, `markers`, and `mockPaths` with enough inspection-target text for Playwright evidence.
- `api/`, `db/`, and `ui/` contracts must declare `QFAI-CONTRACT-ID` at the top.
- Use prefixes `CON-API-*`, `CON-DB-*`, and `CON-UI-*`.
- `design/` files do not require `QFAI-CONTRACT-ID`, but they are execution-time SSOT for UI-bearing work.
- Breaking changes require delta notes.
- `_policies/05_Contracts.md` is the contract index; it must align with `.qfai/contracts/**` and must not become behavior SSOT.

## Cross-contract Reconciliation (MUST)

Contracts are validated per file; agreement _between_ contracts is an authoring obligation.

- Every terminal state, status enum value, and error code an API contract mandates MUST have a
  representable counterpart in the paired DB contract. An outcome the API requires but the DB
  domain (`CHECK (... IN (...))`, `CREATE TYPE ... AS ENUM`, inline `ENUM(...)`) cannot store is a
  contradiction, not an implementation detail.
- Failure and rejection paths count. If the API consumes a transaction on a validation failure,
  the DB must have an honest terminal value for that failure — do not reuse a success state whose
  own preconditions cannot hold on failure, and do not relabel a rejection as an expiry.
- Resolve the contradiction in the contracts, in Phase 0. Never resolve it downstream by
  fabricating values that satisfy both.
- Record the pairing you reconciled in `_policies/05_Contracts.md` so the scope is declared rather
  than guessed.

`QFAI-CONTRACT-040` mechanizes the state/status-domain part of this rule at `warning` severity. It
is a partial check: error codes, response-status sets, and non-enum domains are still reconciled by
the author and the reviewer gate.

## Obligation Reconciliation (MUST) — Phase 2c

Cross-contract reconciliation above compares contracts to each other. This
compares contracts to the **obligations written after them**.

Phase 0 authors contracts. `BR` / `AC` / `TC` are written in Phase 2. The
contract is therefore frozen before the obligations that must ride on it exist,
and "Contracts-first" is only defensible if something later checks that the
obligations are realizable. That check is this one, and it runs in **Phase 2c**,
after Phase 2b and before Phase 3 Plan finalize — early enough that a contract
change still flows into the plan and the delta.

For every `BR` / `AC` produced in Phase 2:

- **Name the contract that realizes it.** An obligation whose realizing
  contract cannot be named is not reconciled; it is unowned.
- **Resolve every persisted attribute the obligation names to a concrete column,
  field or enum member in that contract.** "Attribute" means anything the
  obligation requires the system to store, distinguish or report on — an axis of
  attribution, a status the obligation branches on, a value it aggregates by.
- **Reachability counts, not adjacency.** When the attribute lives in a
  different relation, state the join that reaches it. If no join reaches it, the
  obligation is unrealizable however valid both contracts are.
- **Vocabulary mixing is the usual cause, and it does not look like a typo.**
  An obligation that mixes the vocabulary of two contracts designed for
  different purposes — an operational ledger and an evidentiary one — reads
  perfectly and cannot be satisfied by either. Two internally valid, mutually
  consistent contracts is exactly the state in which this defect survives.
- Record the outcome per obligation, not per spec: which contract, which
  columns/fields, and the join when one is needed.

**A failure here is resolved in the contract or in the obligation, in this
phase.** Both are owned by `/qfai-sdd`, so amending either is not drift — but
carrying the mismatch downstream is, because the implementer who eventually
meets it cannot fix either side.

Execution-based checking does not substitute for this. An obligation whose
attributes are missing produces a declared path that **succeeds** when driven:
the query returns rows, the endpoint answers, the suite is green. Failure
surfaces defects; this class is concealed by success, and only a reading of the
obligation against the contract finds it.

## Checklist

- Contract IDs exist and are unique.
- Specs reference only existing contract IDs.
- Design contracts are sufficient for prototyping, ATDD, and implementation without discussion-pack fallback.
- Every API-mandated terminal state / status value / error code is representable in the paired DB contract.
- Every `BR` / `AC` names a realizing contract, and every persisted attribute it names resolves to a
  column, field or enum member there — reachable directly or by a stated join (Phase 2c).
- `QFAI-CONTRACT-040` findings are resolved or explicitly triaged, not carried forward.
