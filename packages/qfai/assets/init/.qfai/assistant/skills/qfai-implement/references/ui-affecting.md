# UI-affecting items (definition)

This file is the **only** definition of `UI-affecting` in `/qfai-implement`. Every site that uses
the term — the Visual Review Guard, the sub-agent roster, Handoff Contract 5, gate item 9, the
per-item evidence contract, the T1 / T3 tier rows in `references/volume-policy.md` and
`references/parallelization-policy.md` — points here instead of restating the qualifying condition
in its own words.

It exists because the term was previously stated four non-identical ways and defined nowhere. Gate
item 9 blocks `done` on it, the actor who decides whether it applies is the actor the gate exists
to check, and "not UI-affecting" was both always defensible from the text and the cheapest answer:
it removes a reviewer round from the row.

## The two inputs

Both are declarations the project already owns. The test reads them and nothing else.

- **Declared UI paths** — the bullets under
  `.qfai/assistant/catalog/structure.md#ui-surface-paths-ssot`. That section is the only place a
  project says which paths render a user-visible surface; its bullet syntax, its matching rule and
  its `none` form are defined there. Until it is filled the clauses below that read it are
  unevaluable, which is a steering gap for
  `constitution/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`
  to close, not a licence to guess.
- **Declared UI contracts** — every `*.yaml` **and** `*.yml` file found by walking
  `<contractsDir>/ui/**` **recursively**, where `<contractsDir>` is `paths.contractsDir` from
  `qfai.config.yaml` (default `.qfai/contracts`). That is the same set the CLI's UI-contract reader
  and the screen-id validator walk, so this definition can never see fewer contracts than the
  tooling does. Reading only `.qfai/contracts/ui/*.yaml` would silently drop three supported
  layouts: contracts authored as `.yml`, the per-spec subdirectory layout
  (`<contractsDir>/ui/<spec-id>/home.yaml`), and every project that repoints `contractsDir`.

## The test

Evaluate the clauses against the row **as the ledger declares it**, in order, and stop at the first
that holds. An item is **UI-affecting** when any of the following holds:

1. Its `Owning module` matches a declared UI path, matched as **two candidates** (below) so that
   both the repo-relative and the dotted-module form the ledger allows are covered. Evaluated
   **only when the ledger declares one**: that column is optional
   (`execution-ledger.md#declared-seam-column-optional-required-for-parallel-dispatch`) and `-`
   means "not declared", so a rule keyed on it alone would be unevaluable on the ledgers that omit
   it.
2. Its `Test file` matches a declared UI path. `Test file` is the only path-valued **required**
   column, so this clause is evaluable on every ledger — it is what keeps the definition total.
3. An obligation the row carries — `TC-Refs`, `US-Refs` or `CON-API-Refs` — is **linked** (below)
   to a screen, element or action of a declared UI contract. `CON-API-Refs` is in that list
   because an `API` row carries `-` in `TC-Refs` by contract
   (`execution-ledger.md#obligation-columns-optional-required-by-layer`) and stores its obligation
   there instead: a response body a screen renders is reachable through no other clause.

### Normalising `Owning module`

`Owning module` is declared **either** as a repo-relative path **or** as a dotted module path
(`execution-ledger.md#declared-seam-column-optional-required-for-parallel-dispatch`), while declared
UI paths are POSIX globs — so an untranslated `src.components.Button` misses a declared
`src/components/**` and the row answers `n/a` on a technicality.

Deciding **which of the two forms the cell is** is what goes wrong: nothing short of an extension
list separates the root-level path `App.tsx` from the dotted module `src.components.Button`, and a
dot-to-slash rule applied to the first produces `App/tsx`, which matches nothing. So clause 1 does
not classify the cell. It matches **two candidate strings**, in this order, and holds as soon as one
of them matches a declared UI path:

1. the cell **verbatim** — the repo-relative reading, and the only one that can match a glob ending
   in a file extension (`App.tsx` against a declared `*.tsx`);
2. the cell with every `.` replaced by `/` — the dotted-module reading
   (`src.components.Button` → `src/components/Button`). Skipped when the cell contains `/`, which
   only a path does.

Candidate 2 can only add matches, never remove one, so evaluating both is free: a dotted module
carries no `/` and cannot match a path glob verbatim, and a path put through it yields a string
(`App/tsx`) that names no declared directory. Clause 2 is unaffected either way: `Test file` is
required and always a path.

### What "linked" means

The link must be **written down**. It is never inferred from wording, from similarity of intent, or
from the implementer's reading of the obligation — those are what made the same row answerable two
ways by two agents. It holds when either literal occurrence exists, and otherwise it does not:

- **a.** the obligation id (`TC-…`, `US-…`, `CON-API-…`) occurs verbatim inside a declared UI
  contract file — in a screen's `primary_tasks` acceptance text, an element's `validations`, an
  `obligations:` list the project adds, or any other field; or
- **b.** a `screens[].id`, `elements[].id` or `actions[].id` from a declared UI contract occurs
  verbatim in the obligation's own source entry — `06_Test-Cases.md` for a `TC-*`,
  `02_User-stories.md` for a `US-*`, the API contract entry that declares a `CON-API-*`.

Both directions are membership in a set of literal strings, so two agents evaluating the same row
read the same two sets and reach the same answer. The shipped UI contract schema carries no
obligation-reference field of its own; **a.** is what gives a project one, and it needs no schema
change, because the id is matched as text wherever it appears.

If neither occurrence exists, clause 3 does not fire. The way to make it fire is to write the
reference down in one of those two places — not to argue that the row "is really UI".

## What the test is not

- Nothing outside those three clauses makes an item UI-affecting, and no clause is waivable by
  judgement. "It does not feel like UI", "the change is only a token", "the screen renders it but
  the row is backend" are not clauses. The answer comes from the artifacts, not from the
  implementer's reading of an adjective.
- **`Layer` is `Component` is not a clause.** L2 is defined as collaboration with a port through a
  fake / in-memory adapter (`catalog/test-layers.md#l2-component`), which on most projects is a
  backend port test with no screen anywhere near it. Keying the trigger on the layer alone demanded
  rendered evidence and a `product-surface-reviewer` PASS for screens that do not exist, including
  on projects that ship no UI at all. A `Component` row is UI-affecting exactly when clause 1, 2 or
  3 selects it, like a row at any other layer.
- When `structure.md` declares `none`, clauses 1 and 2 do not fire. That is the project stating it
  has no UI surface, not an invitation to substitute a wider or narrower test.
- The clauses select the **reviewer**, not the verdict. `product-surface-reviewer` still decides
  PASS / REVISE once routed; `agents/product-surface-reviewer.md` governs what it reviews.

## Recording the answer

The answer is recorded either way, so that item 9 leaves an artifact even when it is satisfied
vacuously. In the row's per-item evidence entry, `Prototype parity` carries:

| Outcome         | `Prototype parity` value                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| A clause fired  | the product-surface-reviewer verdict with the clause that routed the row — `PASS (clause N)` or `REVISE (clause N)` |
| No clause fired | `n/a (not UI-affecting)`                                                                                            |

`clause N` is the number of the first clause that held. It is the auditable half: it names which
declaration the decision came from — a UI path, or a written-down obligation link — so a later
reader can re-run the same clause against the same artifact instead of taking the verdict on trust.
A blank cell satisfies neither branch and blocks `done` like any other missing gate field. Without
this record the failure mode is silent by construction: a skipped item 9 leaves nothing behind, so
a row that had a UI surface and declined to say so is indistinguishable afterwards from a row that
legitimately had none.

### Rows completed before this field existed

The field is required of every row **this skill takes through the gate**. A row already at `done`
from a run that predates it is skipped on re-execution (`SKILL.md`, Required Process) and is not
retroactively blocked: a blank `Prototype parity` on such a row is a pre-field row, not a gate
failure, and no repair path is owed for it. It acquires a value only if an approved Change Request
resets it, at which point it runs the clauses like any other row. Do not backfill a guess onto a
`done` row — an unevaluated value is worse than a blank one, because it can no longer be told apart
from one that was evaluated.

Under coordinated parallel mode the worker returns this field in its evidence block like every
other contract field, and the orchestrator writes it (`parallelization-policy.md`).
