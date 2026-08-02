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

## What validation checks in a `.sql` contract

Scope is **apply-ability, not semantic correctness**. `.sql` used to be the only
contract kind the validator never parsed — the "this contract does not parse" check
guarding UI and API files was unreachable for it — so a DB contract that cannot
run passed `npx qfai validate --profile sdd --fail-on error`. It now has a structural lane:

| Finding             | Fires when                                                                    | Severity |
| ------------------- | ----------------------------------------------------------------------------- | -------- |
| `QFAI-CONTRACT-021` | an unterminated string, comment or dollar-quoted body, or unbalanced `(`      | error    |
| `QFAI-DB-002`       | one file creates the same object twice — only the last definition is in force | error    |

`QFAI-DB-002` covers tables, views, indexes, functions, procedures, types and
domains. **Triggers are excluded**: a trigger name is unique per table, not per
schema, so two same-named triggers on different tables are correct SQL and
reporting them would be a false positive on valid input.
| `QFAI-DB-001` | a dangerous statement (`DROP TABLE`, `TRUNCATE`, …) | warning |

The statement splitter honours SQL quoting, so a `;` inside a literal, a
comment, a `$$ … $$` body or parentheses does not end a statement.

**Not checked**: nothing here type-checks a query, resolves a column, or
verifies the schema against the API contract. A green run means the file could
be handed to a database and does not contradict itself about what it defines —
it does not mean the schema is right. Cross-contract agreement remains the
authoring obligation below.

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

## Checklist

- Contract IDs exist and are unique.
- Specs reference only existing contract IDs.
- Design contracts are sufficient for prototyping, ATDD, and implementation without discussion-pack fallback.
- Every API-mandated terminal state / status value / error code is representable in the paired DB contract.
- `QFAI-CONTRACT-040` findings are resolved or explicitly triaged, not carried forward.
