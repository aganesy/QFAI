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

## Executability (MUST)

A contract this file calls "downstream execution truth" has to have been
executed. Everything else qfai asserts about a `db/` contract — one
correctly-prefixed unique ID, four dangerous-SQL patterns at `warning` — is
satisfied by a file that cannot run.

- **Apply every `db/` contract to a scratch database.** Applying cleanly is the
  floor, not the gate: contracts that apply without a single error still fail at
  runtime, because the failure is a resolution error inside a PL/pgSQL body,
  not a syntax error.
- **Drive every declared write path at least twice.** The second traversal is
  what exercises head-advance and expected-version guards; a single pass proves
  the first insert and nothing after it. Defects that appear only on traversal
  two are a normal share of the total, not an exotic case.
- **Record it** in `.qfai/evidence/sdd-<spec-id>.md` as a line of the form:

  ```
  - Executability: CON-DB-NNNN — applied to scratch DB; every declared write path driven twice; <command> / <result>
  ```

  `QFAI-CONTRACT-031` (`warning`) reports a `db/` contract with no such line. It
  is a **presence check**: it does not execute SQL and makes no claim about
  correctness. Neither a syntax-level parse nor a structural comparison would
  have caught the observed defects, so a cheap record of "this was actually
  driven" is what the omission needs.

The cost of skipping this is not paid in Phase 0. It is paid inside a TDD
micro-cycle, by an implementer who is forbidden from fixing the contract and has
to stop the batch.

## Checklist

- Contract IDs exist and are unique.
- Specs reference only existing contract IDs.
- Design contracts are sufficient for prototyping, ATDD, and implementation without discussion-pack fallback.
- Every `db/` contract has been applied to a scratch database and every declared write path driven
  **at least twice**, with the command and result recorded in `.qfai/evidence/sdd-<spec-id>.md`
  (`QFAI-CONTRACT-031`).
- Every API-mandated terminal state / status value / error code is representable in the paired DB contract.
- `QFAI-CONTRACT-040` findings are resolved or explicitly triaged, not carried forward.
