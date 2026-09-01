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

Both are declarations the project already owns, and no other declaration is consulted. The one
non-declared input is the row's **own production change**, which clause 1 falls back to when the
ledger left `Owning module` undeclared (`#when-owning-module-is-not-declared`).

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
   against the cell **only when the ledger declares one**: that column is optional
   (`execution-ledger.md#declared-seam-column-optional-required-for-parallel-dispatch`) and `-`
   means "not declared", so a rule keyed on it alone would be unevaluable on the ledgers that omit
   it. When it is `-`, the clause is **not skipped** — the production paths the row itself created
   or modified stand in for the cell and are matched the same way
   (`#when-owning-module-is-not-declared`). A row never answers `n/a` because a column it was never
   required to fill is empty.
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

Candidate 2 adds matches; it must not invent one. "A path put through it names no declared
directory" is false for a root-level file with a dotted name: `app.config.ts` becomes
`app/config/ts`, which a declared `app/**` matches — and the row is then sent for rendered evidence
and a parity review over a config file that renders nothing.

**Guessing the form from the string is not the way to stop that.** The shape of an extension — a
final `.` followed by a few letters or digits — is also the shape of a component name, so
`src.components.Card` and its `Form`, `Page`, `View` and `Modal` siblings all read as files with a
`Card` extension and lose candidate 2. Those are the rows this definition exists to catch, and a
length rule sends them back to answering `n/a` on exactly the technicality the translation was
added to remove. It costs `src.components.api` too.

So the cell is never classified. Candidate 2 is **formed** whenever the cell contains no `/`, and
kept only when it **names something that is in the tree** — an explicit test, decided by the
repository rather than by the shape of a name:

- **List the tree once** — `git ls-files --cached --others --exclude-standard`: tracked files plus
  the ones git does not track yet. The untracked half is not optional: a brand-new
  `src/components/Card.tsx` is untracked on the working tree a TDD row is evaluated on, and
  dropping it would lose the same rows again.
- **Keep candidate 2** when a listed path is the candidate itself, or begins with the candidate
  followed by `/` (it names a directory) or by `.` (it names that file with an extension). The
  delimiter is required, so `src.components.Car` cannot borrow the entry `src/components/Card.tsx`.
- **Otherwise discard it** and match the cell verbatim alone.

| Cell                  | Candidate 2           | In the tree?                    | Read as   |
| --------------------- | --------------------- | ------------------------------- | --------- |
| `src.components.Card` | `src/components/Card` | yes — `src/components/Card.tsx` | both      |
| `src.components.api`  | `src/components/api`  | yes — a directory               | both      |
| `app.config.ts`       | `app/config/ts`       | no                              | path only |
| `App.tsx`             | `App/tsx`             | no                              | path only |

Both root-level files translate to names no directory has, so the invented `app/**` match cannot
occur; `src.components.api`, which a shape rule dropped, is kept because the directory is there. A
cell naming production code the row has not written yet has no tree entry either and is read as a
path only — that is an early reading, and item 9 is decided at the gate on the tree the row landed
at (`#when-owning-module-is-not-declared`), where the file exists. Clause 2 is unaffected either
way: `Test file` is required and always a path.

### When `Owning module` is not declared

`Owning module` is optional, so the escape it opens is exact: a row whose unit test sits outside
every declared UI path (`tests/unit/Button.test.tsx`), whose obligation names no contract id, and
whose `Owning module` cell is `-` fails all three clauses even though its production code lands
under a declared UI path such as `src/components/`. Nothing in the ledger contradicts the `n/a`,
and the column it would have been caught by was one the row was never required to fill.

The fix is not to make the column mandatory — `execution-ledger.md` requires it only for parallel
dispatch, and requiring it on every row would put a declaration where the ledger deliberately has
none. Instead, when the cell is `-`, clause 1 reads the paths the row's **own change** touched:

- **The list** — the production files **this row** created or modified. Attribution is the whole
  difficulty, and a pair of whole-tree readings does not give it: diffing the working tree against
  the revision the row started from also reports every file that was already dirty when the row
  started, and `git ls-files --others --exclude-standard` is repo-wide with no revision anchor at
  all. Concatenated they describe the tree, not the row — one pre-existing edit under a declared UI
  path, or one stray untracked file anywhere, fires clause 1 on an unrelated `Owning module = -`
  row and demands rendered evidence for a screen it never touched.

  So the list is the difference between **two snapshots of the row's own window**. Each covers the
  whole working tree, untracked files included, and is written through a **scratch index**, so
  neither the real index nor the working tree is disturbed:
  - **At the start of the row** —
    `idx=$(mktemp) && GIT_INDEX_FILE=$idx sh -c 'git add -A && git write-tree'; rm -f "$idx"`.
    Record the tree sha it prints beside the row's start revision. `mktemp`, not `mktemp -u`:
    the latter prints a name without creating anything, so another process can take that path
    between the print and the write. `git` is content with an empty file as a starting index.
  - **At the completion gate** — the same command again, for the second sha.
  - **The row's change** is then `git diff --name-only <start-tree> <gate-tree>`.

  `git add -A` into a scratch index takes in **the files git does not track yet** — a brand-new
  `src/components/Button.tsx` is untracked, `git diff` alone lists nothing for it, and the row that
  most needs this clause is that one — while still honouring `.gitignore`. Comparing the two trees
  then carries no dirt from before the row: a file already modified at the start is identical in
  both snapshots and drops out, while a file already modified **and then edited again by the row**
  differs between them and stays. Subtracting path lists gets that second case wrong; the snapshots
  compare content, which is what makes the list attributable to the row.

  Restrict the result to production paths and exclude test files with the same patterns (clause 2
  already reads those). Each path is matched against the declared UI paths verbatim — a diff path is
  always a path, so the dotted-module candidate does not apply. Seam reconciliation
  (`parallelization-policy.md#seam-reconciliation-after-a-parallel-run`) answers a neighbouring
  question — which slice touched what — between two **commits**, so its form is not substitutable
  here: on the uncommitted tree a TDD row is evaluated on it lists nothing.

- **When it is evaluated** — at the completion gate, where item 9 is checked and the change exists.
  Before that the row has no diff, so a trigger answered early (the Visual Review Guard reads the
  contracts _before_ implementation) is answered from the cell, the `Test file` and the obligation
  alone, and **re-evaluated here**. An early `n/a` is a working assumption, never the recorded
  answer: `Prototype parity` is written from the gate-time evaluation, so a row that turned out to
  edit a UI path is routed to `product-surface-reviewer` before it may reach `done`, and the review
  round that adds is the cost of having implemented a UI surface without declaring one.
- **When the row has no production change** — the _RED not observable_ path waives item 4, so the
  diff is empty and the clause simply does not fire. An empty list is not a match.

This keeps the definition mechanical: the list comes from `git`, the globs come from
`structure.md`, and neither is the implementer's reading of an adjective.

### What "linked" means

The link must be **written down**. It is never inferred from wording, from similarity of intent, or
from the implementer's reading of the obligation — those are what made the same row answerable two
ways by two agents. It holds when either literal occurrence exists, and otherwise it does not:

- **a.** the obligation id (`TC-…`, `US-…`, `CON-API-…`) occurs verbatim inside a declared UI
  contract file — in a screen's `primary_tasks` acceptance text, an element's `validations`, an
  `obligations:` list the project adds, or any other field; or
- **b.** a `screens[].id`, `screens[].primary_tasks[].id`, `elements[].id` or `actions[].id` from a
  declared UI contract occurs verbatim in the obligation's own source entry — `06_Test-Cases.md`
  for a `TC-*`, `02_User-stories.md` for a `US-*`, the API contract entry that declares a
  `CON-API-*`.

**Where the API contract entry is**, since "the entry that declares a `CON-API-*`" is not a
location: every `.yaml`, `.yml` **and** `.json` under `<contractsDir>/api/**`, walked recursively,
with `<contractsDir>` resolved from `paths.contractsDir` exactly as for the UI set above. That is
the set the canonical tooling reads. Searching the default directory for YAML alone would miss a
project that repointed `contractsDir` or that writes its API contracts as JSON, and the miss is
one-directional: the id is not found, the clause does not fire, and an API change the UI renders
records `n/a`. The entry that declares the obligation is the one carrying the `CON-API-*` id; when
several files carry it, all of them are the source entry.

`primary_tasks[].id` is in that list because the structured `primary_tasks` shape
(`../qfai-sdd/references/ui-contract-guide.md#screensprimary_tasks-shape`) is a closed
`{id, label, acceptance}` mapping whose `id` is defined there as the stable handle ATDD scaffolds
cite — so a test case that references a screen's task references it by that id and by nothing
else. Collecting only screen / element / action ids missed that link, and a row whose `Test file`
sits in another directory with `Owning module` undeclared then answered `n/a` on a contract it was
written against. The legacy string-only `primary_tasks` shape has no id and contributes none;
such an entry can still fire clause 3 through direction **a.**

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

| Outcome         | `Prototype parity` value                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A clause fired  | the product-surface-reviewer verdict with the clause that routed the row — `PASS (clause N)` or `REVISE (clause N)` — plus `Reviewed revision` and `Audited evidence hash` |
| No clause fired | `n/a (not UI-affecting)` plus the `Reviewed revision` the clauses were evaluated against                                                                                   |

`clause N` is the number of the first clause that held. It is the auditable half: it names which
declaration the decision came from — a UI path, or a written-down obligation link — so a later
reader can re-run the same clause against the same artifact instead of taking the verdict on trust.
A blank cell satisfies neither branch and blocks `done` like any other missing gate field. Without
this record the failure mode is silent by construction: a skipped item 9 leaves nothing behind, so
a row that had a UI surface and declined to say so is indistinguishable afterwards from a row that
legitimately had none.

### Staleness: `Reviewed revision` and `Audited evidence hash`

`PASS (clause N)` alone dates from nothing. `Spec review` and `Code quality review` each carry a
`Reviewed revision` and an `Audited evidence hash` for exactly this reason
(`references/evidence-revision.md`), and without them a parity PASS taken against one surface can
be carried forward onto a row whose production UI, UI contract or rendered evidence moved after the
reviewer returned. So item 9's entry carries both:

- **`Reviewed revision`** — the revision the verdict was taken against, recorded the same way items
  7 and 8 record theirs. On an `n/a` row it is the revision the **clauses** were evaluated at,
  which is what makes the gate-time re-evaluation above checkable rather than assertable.
- **`Audited evidence hash`** — taken over the inputs the decision actually used: the declared UI
  contract files a clause fired on, and the rendered evidence the reviewer judged
  (`.qfai/evidence/prototyping/**` / the screenshots or HTML named in the entry). On an `n/a` row
  there is no reviewer and no rendered evidence, so the hash is omitted and the revision alone
  carries it.

Gate item 10 re-checks both against the current tree, alongside items 3, 5, 7 and 8: item 9's
`Reviewed revision` must agree with the `Revision` items 5, 7 and 8 share, and the hash is
recomputed over the same inputs. A mismatch means the surface moved under the verdict — the row
re-runs the clauses and, if one still fires, takes a fresh parity review before `done`.

### Rows completed before this field existed

The field is required of every row **this skill takes through the gate**. A row already at `done`
from a run that predates it is skipped on re-execution (`SKILL.md`, Required Process) and is not
retroactively blocked: a blank `Prototype parity` on such a row is a pre-field row, not a gate
failure, and no repair path is owed for it. It acquires a value only if an approved Change Request
resets it, at which point it runs the clauses like any other row. Do not backfill a guess onto a
`done` row — an unevaluated value is worse than a blank one, because it can no longer be told apart
from one that was evaluated.

Under coordinated parallel mode the worker returns this field in its evidence block like every
other contract field, and the orchestrator writes it — but it does **not** take the worker's value
on trust. The worker is the implementer, and the implementer's self-report is the thing this
definition exists to remove: the orchestrator re-derives the clauses itself on the merged trunk and
rejects a mismatch before routing or writing
(`parallelization-policy.md#coordinated-parallel-mode-ledger-ownership`).

## A project whose manifest predates this definition

`npx qfai init --force` regenerates `assistant/skills/**` and `assistant/agents/**` but leaves
`assistant/manifest/**` alone — those are the declarative files `/qfai-configure` owns, and
overwriting a project's adjusted agent taxonomy is the worse failure (`init.ts`). So an existing
project takes this definition without taking the manifest half of it: its
`agent-catalog.yml#developer_instructions` for `product-surface-reviewer` still names the fixed
`.qfai/contracts/ui/` input, and its `agent-routing.yml` still lists the reviewer under
`conditional_agents` with no predicate named. A reviewer routed from that catalog reads a
narrower contract set than the clause that routed it — it misses `.yml` contracts, the per-spec
subdirectory layout and every repointed `contractsDir` — so it can PASS without ever opening the
contract the decision came from.

The definition still applies. The remedy is the same one
`../qfai-atdd/references/stale-manifest.md` prescribes for the same distribution shape:

1. **Diff both manifests against the installed package** —
   `node_modules/qfai/assets/init/.qfai/assistant/manifest/agent-catalog.yml` and
   `agent-routing.yml` — and merge the shipped roles' contracts in, keeping the project's own
   routing choices and any roles it added. That is the step that actually moves the files;
   `/qfai-configure` edits what the project has rather than reconciling it against the package, so
   there is no migration command to wait for.
2. **Until that merge has run**, resolve the reviewer's contract inputs from this file rather than
   from the catalog — `#the-two-inputs` is the SSOT for the set either way — and record in the
   evidence entry that the catalog predates this definition, so a PASS taken on a narrower read is
   visible as the stale input it is rather than mistaken for a clean one.
