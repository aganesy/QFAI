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
- **Declare apply-order dependencies.** `QFAI-CONTRACT-011` makes a second
  `QFAI-CONTRACT-ID` in one file a hard `error`, so any schema larger than one
  table necessarily becomes N cross-referencing files. State the resulting
  composition rather than leaving every consumer to reconstruct it from the DDL:
  - `db/`: a comment line `-- Depends on: CON-DB-0002, CON-DB-0003` (or `-`)
  - `api/` / `ui/`: a top-level `x-qfai-depends-on: [CON-API-0002]`, YAML flow
    or block form. An `api/` contract may also be `.json`, with the same key as
    a JSON array; `ui/` collects `.yaml` / `.yml` only.
  - Mirror the same list in `_policies/05_Contracts.md`'s `Depends On` column.
  - **Apply order only.** A reference resolved at run time — a deferred foreign
    key, an endpoint another calls during a request — is not an apply-order
    dependency and must not be listed. The apply graph is acyclic by
    construction; the runtime graph legitimately is not, and conflating them
    makes the declaration unusable for ordering.
  - `QFAI-CONTRACT-014` (error) reports a declared dependency naming a contract
    that does not exist. Getting the set wrong is otherwise silent: the wrong
    subset still applies cleanly and the tests still pass, against a schema
    missing the tables under test.
  - `QFAI-CONTRACT-015` (warning) reports a contract that states no apply order
    at all. Write `-` when nothing must be applied first: "no dependencies" and
    "never stated" are different claims, and only the first is checkable. The
    key on its own (`-- Depends on:` with nothing after it) is still silence,
    and so is a list holding anything but `CON-*` ids: in `CON-DB-0001, TBD`
    the resolvable half would otherwise make an undetermined order look
    settled, leaving `TBD` unreported by every check.
  - `QFAI-CONTRACT-032` (warning) reports a contract index table that dropped
    the `Depends On` column, and `QFAI-CONTRACT-033` (warning) reports a row
    whose cell disagrees with the declaration in the file that row names — a
    blank cell included, for the same reason: it records no claim at all.
  - `QFAI-CONTRACT-034` (warning) reports a contract that appears in no index
    table. Deleting the row hides the contract and its apply order from every
    reader of the index, and the row-level checks need a row to compare.
  - `QFAI-CONTRACT-035` (warning) reports a row whose `File` is not a file
    declaring that row's id. The mirror is checked by id, so a row pointing at
    another contract's file otherwise passes every check while sending the
    reader to the wrong contract. A glob or a `<slug>` placeholder names no one
    file and is left alone.
  - Only tables whose `Declared ID` column holds `CON-*` ids are held to these
    rules; a table indexing another artifact kind by slug is left alone, and an
    empty one qualifies only under a `DB` / `API` / `UI` contract heading.
    Coverage is read from a `Declared ID` cell that **is** a full `CON-*` id: a
    `Short ID` — in its own column or written into this one — cannot stand in
    for a blank or mistyped one. An example table inside a code fence is
    documentation, not index data, and is not read either.
- **Target schema is the applier's, not the contract's.** A `db/` contract
  declares unqualified object names and is applied into whatever schema the
  runner selects (`SET search_path`, `USE`, the connection's default). Do not
  hard-code a schema qualifier: a contract that names one cannot be applied into
  a per-test or per-tenant schema, which is what the integration layer needs.
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
- Record the pairing you reconciled in the `Reconciled With` column of `_policies/05_Contracts.md`,
  as `CON-*` ids or `-`, so the scope is declared rather than guessed. Nothing else recovers it
  later: `Depends On` is apply order by its own definition, and `QFAI-CONTRACT-040` matches on
  normalized field names, so neither can say which of several contracts declaring `status` this
  pairing actually was. A later `/qfai-sdd --contract <CON-ID>` rerun reads that column to decide
  what it has to reconcile.

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

## Obligation Reconciliation (MUST) — Phase 2c

Cross-contract reconciliation above compares contracts to each other. This
compares contracts to the **obligations written after them**.

Phase 0 authors contracts. `BR` / `AC` / `TC` are written in Phase 2. The
contract is therefore frozen before the obligations that must ride on it exist,
and "Contracts-first" is only defensible if something later checks that the
obligations are realizable. That check is this one, and it runs in **Phase 2c**,
after Phase 2b and before Phase 3 Plan finalize — early enough that a contract
change still flows into the plan and the delta.

**In contract-scoped mode (`/qfai-sdd --contract <CON-ID>`) neither neighbour
runs, so Phase 2c sits between Phase 0 and Phase 4**, scoped to the `BR` / `AC`
of the specs that reference the contracts this run touched. That invocation inverts the
ordering assumed above: the obligations already exist and the contract is what
just changed, so the check is not a formality there — it is what makes the
rerun safe. Dropping it closes a Change Request over obligations that may have
stopped being realizable, with a delta entry saying the change was handled.
Six things change with it, and all six are `MUST`:

- **Target the obligations that already exist.** The per-obligation rules below
  say "produced in Phase 2", and Phase 2 does not run in this mode. Read that
  as the `BR` / `AC` the in-scope specs already hold; a literal reading gives an
  empty set, and an empty set passes the phase without checking anything.
- **Take the scope from what Phase 0 touched, not from the argument.** Phase 0's
  mandatory Cross-contract Reconciliation may amend a contract the invocation
  did not name — typically the paired DB contract of a named API contract, when
  a state or status value moved. Every contract this run changed or re-adjusted
  is in scope, and so is every spec referencing any of them, transitively. A
  spec that references only the paired contract is exactly the one the named-ID
  scope would miss. **Touched, not written**: under a `confirm-only` Change
  Request the run writes nothing at all, so a write-keyed scope is empty and
  the mandatory phase would confirm the Change Request without reading one
  `BR` / `AC`. There, scope on the contracts Phase 0 _reconciled_ — the named
  contract and every contract paired against it — and take the specs
  referencing any of those. **Read the pairing, do not infer it.** It is the
  `Reconciled With` column of `_policies/05_Contracts.md`, which Cross-contract
  Reconciliation above requires be filled in when a pairing is reconciled.
  Where that column is absent, because the index predates it, enumerate by the
  rule `QFAI-CONTRACT-040` already applies instead: every contract declaring a
  domain for a field whose normalized name (separators dropped, case folded)
  matches one the named contract declares — all of them, not the one that looks
  intended. `Depends On` is not that set, and neither is a judgement call: a
  pair guessed per agent is a scope that differs per agent, which is the missed
  spec this bullet exists to prevent.
- **Re-expand the scope after every contract write this phase makes.** The
  resolution rule below is contract-side, and the contract it amends need not
  be one Phase 0 touched: repairing one spec's obligation can move a shared
  contract that other, un-enumerated specs are the only referents of. Scope
  computed once from Phase 0 leaves those obligations unread while Phase 4
  closes the Change Request over them. After each contract write, recompute
  the specs referencing every contract now in scope, and **re-reconcile every
  obligation in scope, not only the ones that just entered** — the write was
  made for one obligation and can break another that already passed against
  the same contract, in that spec or in one enumerated earlier. Terminate on
  the joint condition: repeat until a pass adds no spec **and** writes no
  contract. Scope growth alone is the wrong bell, because a repair that breaks
  a settled obligation adds no spec at all. A pass that keeps writing without
  settling is two obligations contradicting each other over one contract, not
  a loop to run again: halt and widen the Change Request.

- **Repair only the contracts this run is approved to touch.** The two rules
  above widen what is _read_ — every existing `BR` / `AC` an in-scope spec
  holds — and those specs also name contracts this run never touched. A
  mismatch against one of them is a real finding, but repairing it edits an
  upstream artifact the Change Request's impact scope and approved actions
  never listed, and the re-expansion above then pulls in that contract's own
  referents: an approval for `A` grown into a rewrite of `B` and everything
  downstream of it. The writable set is the contracts in scope — the ones
  Phase 0 touched, plus a contract a repair to one of them must move with it to
  keep Cross-contract Reconciliation true. A mismatch outside that set is
  recorded and halts the rerun as its own Change Request; the closure never
  grows through a contract no one approved.
- **Resolve on the contract side; amending an obligation is out of write
  scope.** The in-phase repair rule below assumes Phase 2, 2b and 3 still run
  behind it. Here they do not, so a rewritten `BR` / `AC` leaves the `EX` / `TC`
  in `06_Test-Cases.md`, the rows in `tdd/test-list.md` and `10_Plan.md` stating
  the old obligation, and Phase 4 would close the Change Request over that gap.
  When a mismatch cannot be resolved in the contract, halt and widen the Change
  Request to a spec-scoped `/qfai-sdd <spec-id>` rerun instead.
- **Under a `confirm-only` Change Request, run it read-only.**
  `constitution/drift-protocol.md#when-drift-is-detected` lets that mode write
  nothing but the CR reference, so record no per-obligation outcome and repair
  neither side. Reconcile, and halt on the first mismatch: a `confirm-only`
  rerun cannot honestly confirm a contract whose approved obligations have
  stopped being realizable, and the halt returns the question to the Change
  Request, where `re-derive` is available.

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
- Every `db/` contract has been applied to a scratch database and every declared write path driven
  **at least twice**, with the command and result recorded in `.qfai/evidence/sdd-<spec-id>.md`
  (`QFAI-CONTRACT-031`).
- Every API-mandated terminal state / status value / error code is representable in the paired DB contract.
- Every `BR` / `AC` names a realizing contract, and every persisted attribute it names resolves to a
  column, field or enum member there — reachable directly or by a stated join (Phase 2c).
- `QFAI-CONTRACT-040` findings are resolved or explicitly triaged, not carried forward.
