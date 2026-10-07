# Contract Artifact Rules

Use this file when `/qfai-sdd` creates or updates `<paths.contractsDir>/**`. Write the concrete EX before its enforcing BR.

## Contents

- Purpose
- Rules
- What validation checks in a `.sql` contract
- Cross-contract Reconciliation
- Executability
- Obligation realizability
- Review checklist

## Purpose

Contracts are version-managed downstream execution truth and inputs:

- `api/`: OpenAPI YAML
- `db/`: SQL schema contracts
- `ui/`: UI contract YAML

The brand SSOT is root `DESIGN.md` at the project root, and screens are `ui/`
contracts. A project's contracts live in those three directories. `cli/` holds
the command-surface contracts of the QFAI repository itself and is not a kind a
project adds. No other directory under `<paths.contractsDir>` holds a contract,
and `QFAI-CONTRACT-034` reports a file in one. Evaluator axes are not a contract
either: the review validation the QFAI CLI applies fixes them (restated in
`.qfai/assistant/skill/qfai-prototyping/references/reviewer-prompt.md`).

Discussion UI/UX files are **non-normative** discovery / reference artifacts — not upstream SSOT (`.qfai/assistant/rule/drift-protocol.md#core-rule`). `/qfai-sdd` normalizes approved decisions into `<paths.contractsDir>/**`; downstream skills read contracts, not discussion UI/UX files. A contradiction between a pack and a contract is resolved in the contract, not by amending the pack.

## Rules

- Keep contract files minimal: only what flows, stories, and tests actually reference.
- UI contracts must be mockable for prototypes: define stable `elements` and
  `actions` with enough inspection-target text for Playwright evidence.
- **The `prototype` mapping is optional, and what it declares is checked.** A
  UI contract that omits `prototype` is asked for nothing, so `markers` and
  `mockPaths` are not required. A contract that writes them is held to them:
  `QFAI-CONTRACT-037` looks for a declared marker in the code, and
  `QFAI-CONTRACT-038` reports a `prototype.mode` outside the vocabulary
  (`interactive`), naming the release at which it stops being a warning.
  Nothing branches on `mode`, so a value outside the vocabulary breaks no run —
  it tells a reader the prototype is something it is not. `mockPaths` is read
  by nobody and by no lane; it is a note to whoever reviews the prototype.
- **A declared marker is looked for in the code.** `QFAI-CONTRACT-037` reports a
  `data-qfai` value a UI contract writes literally that no file under the
  configured source directory mentions. Without it a declared element can be
  rendered by nothing and no gate notice: an element nobody built is also an
  element no test names, so the one-way check from test to contract cannot see
  it. Only the markers the contract writes count, so a contract that names none
  is asked for nothing. A marker counts as rendered wherever its text appears,
  not only where the attribute is written out — a framework that builds the
  attribute from a variable still writes the marker somewhere.
- **Every entry under `screens` is a screen, once.** Each UI-bearing contract declares one full `UI-NNNN` ID and a nonempty `screens[]` list. Each screen has an ID and route, unique within its contract. The prototyping cycle covers all declared UI-bearing contract IDs; filenames do not select a legacy spec tier. `QFAI-CONTRACT-042` names malformed screen entries.
- **A contract's ID comes from its directory.** `api/` holds `API` contracts,
  `db/` `DB` and `ui/` `UI`; the QFAI repository's own `cli/` holds `CLI`
  contracts. The ID is `<KIND>-NNNN`.
  Its number is one more than the highest contract number of any kind, so
  `API-0002` and `DB-0002` cannot both exist. A number is never reused, even
  after its contract is removed.
- **The file is named after the ID**: `<kind>-NNNN-<slug>.<ext>`, such as
  `api/api-0002-orders.yaml` or `db/db-0003-orders.sql`.
- **The ID is declared once, in the file.** A Markdown contract declares it in
  its H1: `# CLI-0001: <title>`. A YAML or SQL contract declares it on a
  `QFAI-CONTRACT-ID: API-0002` comment line at the top. A Markdown file under
  `api/`, `db/` or `ui/` is not a contract, whatever its H1 says:
  `QFAI-CONTRACT-034` reports it, and no other check counts it.
- **Rules are numbered after their contract.** A business rule's ID is
  `BR-<contract number>-NNNN`: `BR-0002-0001` is the first rule of `API-0002`.
  Only that contract declares it: under `x-qfai-rules` in YAML or JSON, on
  `-- Rule` and `-- Examples:` lines in SQL, and in the `## Business rules`
  table (`BR-ID`, `Statement`, `Examples`) of a Markdown contract.
- **References point one way.** A rule cites examples and nothing else. Only
  the implementation, its code and tests, cites a rule. A contract never names
  an implementation file and never cites a rule another contract declares. To
  find the contracts a flow relies on, read the rules whose `Examples` cite
  that flow's examples.
- An owner rerun addresses an `api/` / `db/` / `ui/` contract whose ID is the
  thing under repair by its repo-relative path:
  `/qfai-sdd --contract <paths.contractsDir>/ui/<file>`.
- **Declare apply-order dependencies.** `QFAI-CONTRACT-011` makes a second
  `QFAI-CONTRACT-ID` in one file a hard `error`, so any schema larger than one
  table necessarily becomes N cross-referencing files. State the resulting
  composition rather than leaving every consumer to reconstruct it from the DDL:
  - `db/`: a comment line `-- Depends on: DB-0002, DB-0003` (or `-`)
  - `api/` / `ui/`: a top-level `x-qfai-depends-on: [API-0002]`, YAML flow
    or block form. An `api/` contract may also be `.json`, with the same key as
    a JSON array; `ui/` collects `.yaml` / `.yml` only.
  - Mirror the same list in `<paths.contractsDir>/contracts.md`'s `Depends On` column.
  - **Apply order only.** A reference resolved at run time — a deferred foreign
    key, an endpoint another calls during a request — is not an apply-order
    dependency and must not be listed. The apply graph is acyclic by
    construction; the runtime graph legitimately is not, and conflating them
    makes the declaration unusable for ordering.
  - `QFAI-CONTRACT-014` (error) reports a declared dependency naming a contract
    that does not exist. Getting the set wrong is otherwise silent: the wrong
    subset still applies cleanly and the tests still pass, against a schema
    missing the tables under test.
  - `QFAI-CONTRACT-015` reports a contract that states no apply order
    at all. Write `-` when nothing must be applied first: "no dependencies" and
    "never stated" are different claims, and only the first is checkable. The
    key on its own (`-- Depends on:` with nothing after it) is still silence,
    and so is a list holding anything but contract IDs: in `DB-0001, TBD`
    the resolvable half would otherwise make an undetermined order look
    settled, leaving `TBD` unreported by every check.
- **The index lists every contract.** `<paths.contractsDir>/contracts.md` holds
  one `## Contract Index` table with the columns `ID`, `Title`, `File`,
  `Depends On`, `Reconciled With` and `Purpose`, one row per contract in ID
  order. `Title` is the contract's title, `File` its repository-relative path
  in backticks, `Depends On` and `Reconciled With` contract IDs or `-`, and
  `Purpose` one sentence. The index points at contracts; it never states a rule.
- `QFAI-CONTRACT-034` reports a contract file under a kind directory that
  declares no ID of that kind, is not named after its ID, or has no row that
  agrees with its ID and path. It also reports a row that names no contract
  file, and a number two contracts declare.
- **Target schema is the applier's, not the contract's.** A `db/` contract
  declares unqualified object names and is applied into whatever schema the
  runner selects (`SET search_path`, `USE`, the connection's default). Do not
  hard-code a schema qualifier: a contract that names one cannot be applied into
  a per-test or per-tenant schema, which is what the integration layer needs.
- Breaking changes require a decision row and affected-flow evidence.

## What validation checks in a `.sql` contract

Scope is **apply-ability, not semantic correctness**. Without this lane a DB contract
that cannot run would pass `npx qfai validate --profile sdd --fail-on error`, since the
"this contract does not parse" check guarding UI and API files does not reach `.sql`.
The structural lane:

| Finding             | Fires when                                                                    | Severity |
| ------------------- | ----------------------------------------------------------------------------- | -------- |
| `QFAI-CONTRACT-021` | an unterminated string, comment or dollar-quoted body, or unbalanced `(`      | error    |
| `QFAI-DB-002`       | one file creates the same object twice — only the last definition is in force | error    |
| `QFAI-DB-001`       | a dangerous statement (`DROP TABLE`, `TRUNCATE`, …)                           | warning  |

`QFAI-DB-002` covers tables, views, indexes, functions, procedures, types and
domains. **Triggers are excluded**: a trigger name is unique per table, not per
schema, so two same-named triggers on different tables are correct SQL and
reporting them would be a false positive on valid input.

The statement splitter honours SQL quoting, so a `;` inside a literal, a
comment, a `$$ … $$` body or parentheses does not end a statement.

**Not checked**: nothing here type-checks a query, resolves a column, or
verifies the schema against the API contract. A green run means the file could
be handed to a database and does not contradict itself about what it defines —
it does not mean the schema is right. Cross-contract agreement remains the
authoring obligation below.

## Cross-contract Reconciliation

Contracts are validated per file; agreement _between_ contracts is an authoring obligation.

- Every terminal state, status enum value, and error code an API contract mandates must have a
  representable counterpart in the paired DB contract. An outcome the API requires but the DB
  domain (`CHECK (... IN (...))`, `CREATE TYPE ... AS ENUM`, inline `ENUM(...)`) cannot store is a
  contradiction, not an implementation detail.
- Failure and rejection paths count. If the API consumes a transaction on a validation failure,
  the DB must have an honest terminal value for that failure — do not reuse a success state whose
  own preconditions cannot hold on failure, and do not relabel a rejection as an expiry.
- Resolve the contradiction in the contracts, in the contract-authoring stage. Never resolve it downstream by
  fabricating values that satisfy both.
- Record the pairing you reconciled in the `Reconciled With` column of `<paths.contractsDir>/contracts.md`,
  as contract IDs or `-`, so the scope is declared rather than guessed. Nothing else recovers it
  later: `Depends On` is apply order by its own definition, and `QFAI-CONTRACT-040` matches on
  normalized field names, so neither can say which of several contracts declaring `status` this
  pairing actually was. A later `/qfai-sdd --contract <contract-ID>` rerun reads that column to decide
  what it has to reconcile.

`QFAI-CONTRACT-040` mechanizes the state/status-domain part of this rule. It reports `warning`, and
`error` only when **every** contract declaring that field name bounds it with an ENUM: there the
value is refused at insert time whichever of them is the real pairing, so no implementation
satisfies both contracts. One `CHECK (... IN (...))` among the candidates keeps it a `warning` —
that bound can be dropped or declared `NOT VALID`, and an ENUM on a different table's same-named
column rejects nothing here. When the candidates disagree, the finding names which contract
declared the ENUM, and lists the allowed values per contract rather than as one domain; narrowing
the pairing itself is what the `Reconciled With` column above is for.

It is a partial check either way: error codes, response-status sets, and non-enum domains are still
reconciled by the author and the reviewer gate.

### Derived, not stored

A state value the API mandates is sometimes **computed at read time and never stored** — a status
the screen shows that is a pure function of stored columns plus the clock. `QFAI-CONTRACT-040` has
no way to know that from the schema, and for such a value both of its remedies are wrong: widening
the DB domain makes it _possible_ to store a value the contract says must not be stored (and a
clock-derived value goes stale the moment the clock moves, which is why it is not stored), while
deleting it from the API removes a value the UI contract requires.

Declare it in the **DB** contract, which is the artifact that owns storage:

```sql
-- Derived (not stored): status = standby, powered_off from enabled, connection_status, health_status, JST clock
```

- **The comment marker is required and the key starts the line**, as with `-- Depends on:`, so prose
  _about_ a derivation is not itself a declaration.
- **The `from` clause is required.** Naming the inputs is what makes the claim reviewable; without
  it the marker would be a way to silence the rule rather than a way to answer it.
- **The value list is all-or-nothing.** An empty element means the author was mid-edit, and the
  whole declaration is ignored rather than half-read.
- It is declared on the **DB** side and not as an `x-` extension on the API property on purpose: an
  API contract asserting "this is not stored" would let the side making the demand silence the side
  that answers it.

`QFAI-CONTRACT-041` reports a declaration that does no work: one that does not parse — so the
author believes they answered a finding that is still standing — and one naming a value the API
does not require, or that the DB domain stores after all. A value **nobody declared** still raises
`QFAI-CONTRACT-040`, or the marker would be a silencer.

The format is new, so the first authors to use it are answering another finding voluntarily and
will get the grammar wrong in the ways the message exists to teach. The message names the exact
shape it wants for that reason.

## Executability

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
- **Report it** in the SDD report, under the `## Contract executability`
  heading, as a line of the form:

  ```text
  - Executability: DB-NNNN — applied to scratch DB; every declared write path driven twice; <command> / <result>
  ```

  The evidence is local, so no validator reads the line. The completion
  reviewer checks it during the work. Neither a syntax-level parse nor a
  structural comparison would have caught the observed defects, so a cheap
  record of "this was actually driven" is what the omission needs.

  One thing about a `db/` contract _is_ checked without a database.
  `QFAI-CONTRACT-036` reads the DDL: a `REFERENCES` clause names a table, and
  the contract that creates that table must appear in this file's
  `-- Depends on:` line. A foreign key's target has to exist when the statement
  runs, so an undeclared one means the stated apply order does not work — and
  the three rules that read the dependency line do not read the SQL under it,
  so nothing else says so.

  The check is narrow on purpose. Only a `REFERENCES` clause counts, a table no
  contract in the set creates is left alone, and a table two contracts both
  create is not attributed to either.

- **Compare the contracts with the migrations.** `npx qfai db-drift` applies
  both to separate in-process databases and reports the columns they disagree
  about: present on one side only, or declared with a different type,
  nullability or default. Set `paths.migrationsDir` to the project's migration
  directory; a project with no value there is out of scope and the command says
  so.

  This is the one question the rules above cannot answer. Contracts are frozen
  early and implementation moves, so the two schemas drift by default, and a
  suite that passes against the migration schema proves nothing about the
  contracts. It is a separate command because it needs a database, and
  `npx qfai validate` starts no processes.

## Obligation realizability

For each affected AC, EX, and BR, name the contract that realizes it. Resolve every persisted attribute to a concrete field, column, or enum member. If a value lives in another relation, state the join that reaches it. A contract can be syntactically valid yet unable to represent an obligation; resolve that mismatch in the story or contract before the SDD gate.

A `--contract` rerun reads all existing flows that reference the changed contract or its paired contracts. After each
contract repair, recompute the affected set and recheck every obligation in it until a pass writes nothing and adds no
flow. Read scope can expand; write scope stays within the approved change-request row. If a repair needs an unapproved
contract or story edit, stop and append a new decision row covering that change. A confirm-only review is read-only and
cannot close a mismatch.

## Review checklist

- Every changed contract has one exact index row; IDs, dependencies, and reconciled pairings agree.
- Every BR cites a written EX, and every EX has an enforcing BR. Shared rules have one definition.
- Each affected obligation is realizable by named contract fields, directly or through a stated join.
- Paired contracts represent the same success and failure vocabulary, including derived values.
- Each changed DB contract has scratch apply, two traversals of each write path, and recorded evidence.
