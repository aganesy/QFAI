# Drift Protocol

This file defines mandatory change control for all downstream execution phases.

## Core rule

- Do not edit upstream SSOT artifacts unless explicit user approval exists.

Upstream artifacts include, at minimum:

- `01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `07_Decisions.md`, `08_Open-questions.md`, `09_delta.md`
- `_policies/*` layered artifacts and `11_Contracts.md` (or project-equivalent contract index)
- `10_Plan.md` and other owner-phase planning outputs
- Legacy spec-pack SSOT files when present: `spec.md`, `delta.md`, `plan.md`, `traceability-matrix.md`, `scenario.feature`, `case-catalogue.md`, and numbered pack files (for example `01_Spec.md`..`18_delta.md`)
- contracts and schema decisions owned by earlier phases
- outputs of the sdd and review stages. A **discussion pack is NOT upstream
  SSOT** — it is non-normative discovery material, and `.qfai/specs/**` is the
  behaviour and design SSOT it feeds. A defect found in one downstream is fixed
  in the SDD-owned artifact, the discrepancy recorded in delta/evidence. This
  reclassifies ONLY the pack: genuine upstream is still repaired upstream-first.

- **test or production artifacts another spec's completed implement run
  certifies** — a file named in another `tdd/test-list.md`'s `Test file` column
  on a `done` row. Changing one is not forbidden (the codebase is not
  partitioned and duplication removal is mandated), but it must be recorded and
  re-reviewed per
  `skills/qfai-implement/references/cross-spec-ownership.md`. It becomes drift
  in the full sense — STOP, Change Request, owner rerun — when the other spec's
  obligation no longer holds rather than merely moving.

One file inside `.qfai/specs/**` is carved out of that last line:
`<spec-id>/tdd/test-list.md`, and only its `Status` / `DR-ID` / `Evidence`
cells unconditionally, plus its `Test file` and `Selector` cells under the two
machine-checkable conditions in `#allowed-exceptions-minimal-whitelist`. Its
**rows** — which obligations exist and what each covers — remain upstream.

**Every artifact in this list requires an owner rerun by definition.** There is
no downstream test for "is an owner rerun required here?" — being on this list
is the answer, and the rerun is a _consequence_ of the artifact being upstream
SSOT, never a precondition for the prohibition. A downstream phase that finds
itself weighing whether the owner needs to be involved has already left its
lane: it cannot see who owns the artifact, and working that out in the observed
case required reading the agent roster and reasoning backwards from it.

## Allowed exceptions (minimal whitelist)

- `.qfai/evidence/**` append/update
- `.qfai/specs/<spec-id>/tdd/test-list.md` — the `Status`, `DR-ID` and
  `Evidence` cells unconditionally, append/update by `/qfai-implement`, plus two
  cells that are writable **only** while a stated condition holds:
  - the `Test file` cell, only while the seeded value is empty or a dash
    placeholder;
  - the `Selector` cell, only while the seeded value does not resolve against
    the row's named test file — the validator's own `selectorResolves`
    predicate is false.

  Both conditions are machine-checkable, so a reviewer verifies the precondition
  instead of taking the writing stage's word for it, and both are one-way: once
  the condition that authorised the write has ceased to hold — a `Test file` that
  names a path, a `Selector` that resolves — rewriting it is no longer covered.
  Every other
  column of that file — `TC-Refs`, `Layer`, `US-Refs`, `CON-API-Refs` — and
  every other file under `.qfai/specs/**`, stays upstream SSOT: adding, removing
  or re-scoping a row is an upstream change and takes the
  `#when-drift-is-detected` path.

- **creating** a governance record under `.qfai/decisions/` — a Change Request
  (`CR-YYYYMMDD-NNNN-<slug>.md`, per `#when-drift-is-detected` step 2) or an
  anomaly Decision Record (`DR-<id>-<slug>.md`, where `<id>` follows the
  Decision Record ID scheme in the spec's `07_Decisions.md`)

Any exception beyond this list requires explicit user approval.

### Why the execution ledger is named here

`/qfai-implement` must write `tdd/test-list.md` after every phase transition,
and the file lives inside `.qfai/specs/**`. The protocol never classified it in
either direction, but `#core-rule`'s list is explicitly open-ended ("at minimum")
and sweeps in "outputs of the sdd and review stages" — and the ledger's schema
is documented in `skills/qfai-sdd/references/spec-traceability-rules.md`, an
SDD-stage reference. On the natural reading the ledger _is_ an sdd-stage output,
so "Downstream skills must not patch upstream SSOT directly" applied to it.

The bullet that used to sit here — "progress status updates only when the project
workflow explicitly allows downstream updates" — could not rescue that, for two
reasons:

- **The condition had no referent.** `progress status`, `project workflow` and
  `downstream update` each occurred exactly once in the whole shipped tree: that
  line itself. Nothing defined what the project workflow is, where such a
  permission is recorded, or what the default is, so in a freshly initialized project the
  condition could never be satisfied.
- **It was too narrow even if it had.** It covered "progress status", while
  `qfai-implement`'s completion gate item 10 additionally requires the `Evidence`
  column, and the skill's own hard rules forbid the substitute
  ("status-only evidence … MUST be rejected"). The content declared mandatory and
  non-substitutable was precisely the content no rule authorised anyone to
  persist.

So an agent obeying the protocol could not satisfy gate item 10, and an agent
satisfying it was in drift. The entry above names the file and the three cells
unconditionally, which is what removes the choice.

### Why `Test file` and `Selector` are conditional

The deadlock that put the ledger on this list recurs one and two columns over,
and two shipped validator rules are what create it:

- `TDDLIST_TEST_FILE_MISSING` fires at **error** severity for a row whose
  `Test file` cell is empty or a dash placeholder, once its `Status` is `green`,
  `refactor`, `review-fix` or `done`.
- `TDDLIST_SELECTOR_UNRESOLVED` fires when the `Selector` cell's text is not
  found in the named test file, and its own remediation text says to update the
  selector. The per-row checkpoint command is `<runner> <Test file> -t
'<Selector>'`, so an unresolved selector also produces a run that selects
  nothing while exiting 0.

A row is seeded with a descriptive selector and, commonly, no test file: the
path is a downstream decision, and the test's title does not exist until the
micro-cycle authors it. So the writing stage cannot hold the status the first
three cells **do** authorise without also writing a cell they do **not** — and
the earlier status it would otherwise have to keep is false, because the row has
already passed that phase. Seeding both cells upstream does not resolve it
either: it would require inventing titles that implementers then match exactly,
inverting the direction of authority between the spec and the test.

The conditions are what keep this narrow. They authorise **filling a placeholder
and repairing an unresolvable selector**, never rewriting a cell that already
resolves, and never touching the columns that carry the row's obligation
identity. Decomposing an existing obligation across rows stays in remit for the
executing stage; minting a new obligation id does not, and that line is
unchanged.

One limit is worth stating, because the `Selector` condition is narrower than it
reads. `selectorResolves` is deliberately lenient: it accepts verbatim
containment, then containment of the selector's last identifier-shaped token. So
a `Selector` that is materially wrong — one that misdescribes which obligations
its row covers — but happens to share a trailing token with its test file still
**resolves**, the condition is false, and this carve-out does **not** authorise
repairing it. That is the conservative direction and it is intended: only a
selector the runner's own file could not match is repairable here, and a merely
misdescribing one stays an upstream change.

### Why the Decision Record is on this list

A downstream stage cannot always avoid needing one. `qfai-implement` Phase Red
orders an anomalous row to `exception` as an inline step, and that status is
invalid without a `DR-*` in the `DR-ID` column — enforced at `error` by
`TDDLIST_EXCEPTION_MISSING_DR`. Every upstream home for a Decision Record
(`07_Decisions.md`, `09_delta.md`) is on the `#core-rule` list above, and neither
of the first two whitelist entries covers minting one: a Decision Record is not
an `.qfai/evidence/**` write and not a ledger-cell update.

Without this entry the only compliant route to executing an inline Phase Red
step was STOP -> Change Request -> user approval -> owner-skill rerun. That made
the framework's single escape hatch for a blocked item reachable only through
the approval loop the block is waiting on, so the first anomaly in any project
either halted the stage or produced a rule-violating ledger row.

The carve-out is exactly as narrow as that need:

- **create only.** `.qfai/decisions/` is not upstream SSOT and no owner phase
  writes it, so creating a file there patches nothing. Editing an already-
  approved record is not covered.
- **the record only, never the reference.** The `07_Decisions.md` /
  `09_delta.md` entry that cites the DR stays an owner-skill write, exactly as
  step 2 already says for a Change Request. A compliant `exception` row needs
  the record and the `DR-ID` cell, not the upstream cross-reference.
- **not an approval.** Creating the record does not decide the anomaly. A parked
  row still carries `TDDLIST_EXCEPTION_PARKED` until the risk is accepted
  through the `TDDLIST-001` waiver, which is a separate, user-owned artifact.

## Drift classes

Drift is one of two things, and the class decides what the Change Request must
carry. It does **not** decide whether a Change Request is needed: both classes
STOP, both raise a CR, both wait for approval, both are applied by the owner
skill. The ownership boundary in `#core-rule` is identical for both.

- **Intent drift** — the upstream artifact states something downstream
  disagrees with. There is a real decision to make, the upstream artifact is
  internally consistent, and reasonable alternatives exist.
- **Defect drift** — the upstream artifact is internally inconsistent,
  unreachable, or contradicts its own declared behaviour, **demonstrated by a
  reproduction**. A `.sql` contract that raises `AmbiguousColumnError` on its
  own declared code path conflicts with nothing: it contradicts only itself.

Defect drift is claimed by evidence, not by assertion. A CR that declares
`Class: defect` without a reproduction — a command plus its verbatim output, or
the two artifact excerpts that contradict each other — is an intent-drift CR
that skipped its options, and must be treated as incomplete. "This is obviously
wrong" is not a reproduction; neither is "the fix is trivial". Cost is not a
classifier: a large intent change stays intent drift, and a one-token defect
stays defect drift.

Where exactly one correct fix exists, inventing a second and a third option to
satisfy a template produces a worse record, not a safer one — the operator then
ratifies a comparison the author knew was fabricated.

## When drift is detected

1. STOP downstream editing **of the affected upstream artifact and of every
   downstream item that depends on it**. Unaffected items continue. A dependent
   item is one whose `TC-Refs` / `US-Refs` / `CON-API-Refs` names an obligation
   the CR would change, or whose implementation reads the artifact under
   dispute; when the dependency is arguable, it is dependent. The halt is not
   repository-wide: one defective contract does not stop specs that never
   reference it. What it does stop is `done` — a dependent item may not be
   completed against an obligation known to be under revision.
2. Create a Change Request as a file at
   `.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md`, from
   `.qfai/assistant/skills/qfai-sdd/templates/change-request.md`. The ID
   pattern is `CR-\d{8}-\d{4}` and the file carries `ID`, `Status`
   (`open` / `approved` / `rejected` / `superseded`), `Approved by`,
   `Approved at` and `Approved option` so the approval is a record, not a
   memory. Creating this file is the only write this step makes: `09_delta.md`
   and `07_Decisions.md` are upstream SSOT, so the reference to this CR is
   written there by the owner skill in step 4, never before approval.
   Contents:
   - class (`intent` / `defect`) — see `#drift-classes`
   - context — for intent drift, what conflicts; for defect drift, what the
     artifact declares and how it breaks that declaration
   - reproduction (command + verbatim output, or the two contradicting
     excerpts) — **required for defect drift**, omit for intent drift
   - proposed change
   - options (at least 3) and recommendation — **intent drift only**; for
     defect drift record the single correct fix instead. Do not manufacture
     alternatives for a change that has one correct answer
   - blocked downstream items — the enumerated set the halt in step 1 covers
     (spec IDs, `TDD-ID` ledger rows, contract paths). This is what makes the
     halt checkable: a reviewer can ask whether an item that kept moving is on
     the list, and an item not on the list is not blocked by this CR
   - impact scope (spec/plan/tests/contracts/schema)
   - decision needed from user
   - approved actions (owner skill rerun plan)
3. Wait for explicit user approval, then set `Status` and the approval fields.
   A defect-drift CR has no option set, so `Approved option` stays `-`; what is
   approved is the single correct fix under `## Proposed change`. The wait
   itself is not waived — the operator is ratifying the classification as much
   as the fix.
4. Rerun the owner skill for the upstream artifact, **naming the invocation and
   the mode** the CR approved. That rerun is what records the CR reference in
   `09_delta.md` / `07_Decisions.md`.

   Invocation by artifact class:

   | Upstream artifact    | Invocation                      |
   | -------------------- | ------------------------------- |
   | `spec-*/**` files    | `/qfai-sdd <spec-id>`           |
   | `_policies/**`       | `/qfai-sdd` (no argument)       |
   | `.qfai/contracts/**` | `/qfai-sdd --contract <CON-ID>` |

   Mode — the CR's "approved actions" field MUST name one:
   - **`confirm-only`** — re-read the artifact and confirm it already satisfies
     the approved change. Writes nothing but the CR reference. Use when the
     change was already applied by hand under approval, or when the CR only
     re-scopes something the artifact already says.
   - **`re-derive`** — regenerate the artifact from its inputs. May rewrite any
     part of it, and sweeps the downstream ledgers in step 5.

   Without a named mode neither the author nor the approver can state what the
   rerun executes or what it costs, and "rerun the owner skill" is the whole
   plan.

5. **Sweep the downstream ledgers.** Identify every `tdd/test-list.md` row the
   rerun invalidated — its `TC-Refs` / `US-Refs` / `CON-API-Refs` obligation
   changed or disappeared — and apply the upstream reset transition
   (any status -> `todo`), recording the approved CR/DR ID in `DR-ID` — that
   column carries both `DR-*` and `CR-*` references. The
   sweep covers in-flight rows too: a `red` row whose obligation changed, and
   an `exception` row whose anomaly the rerun resolved or superseded, reset the
   same way. A row whose obligation was deleted outright is removed, not reset.
6. Resume the **blocked set of this CR** only after upstream artifacts are
   updated **and** the sweep has run. Resuming with a stale `done` row is
   resuming on a ledger that asserts something known to be false. Resume is
   per-CR: an item on two blocked sets resumes when both release, and an item
   on neither never stopped.
7. Record the outcome in the CR: fill `Resolution` and set `Applied at`.
   Approval alone does not release the downstream gate — `qfai-implement`
   treats an `approved` CR without `Applied at` as unresolved.

### Multiple open Change Requests

More than one Change Request may be open at once. They are **independent**
unless they name the same upstream artifact.

- A defect found while a CR is open is raised as **its own CR**, not folded
  into the open one. Folding it in would silently widen an approval the
  operator already gave, and the blocked set the operator approved would no
  longer be the blocked set in force.
- Two CRs naming the same upstream artifact are **ordered**: the second states
  which one it assumes has landed, because the owner-skill rerun for the first
  changes the text the second is written against. If the first is rejected, the
  second is restated or superseded, never applied as written.
- The effective halt is the **union** of the open CRs' blocked sets. Nothing
  else is halted, however many CRs are open.
- Open CRs accumulating is itself a project risk: report the count and their
  ages alongside the blockers, rather than letting a queue of unanswered
  decisions read as normal.

## Reviewer-originated obligations

The rules above govern a downstream phase **editing** upstream SSOT. This section governs the
mirror case: a downstream reviewer **originating** a requirement that upstream SSOT does not
contain. Both are drift.

### Defect or new scope: decide this first

Reviewer-originated scope means a **new obligation on the product** — behaviour, policy, or a
quality bar that upstream never asked for. It does **not** mean "a problem with no `AC-*` beside
it".

A finding is a **defect in the deliverable under review** — not new scope — when it is
demonstrable from the changed artifacts themselves: the reviewer can point at the code or evidence
and show it is wrong on its own terms. Typical shapes:

- **correctness** — the code does not do what the artifact it implements says it does: an
  unhandled rejection, an unreachable or inverted branch, a contract the code itself declares and
  then breaks;
- **security / data integrity** — missing validation on an input the code already treats as
  trusted, credential or personal-data exposure, an injection or traversal path opened by the
  change;
- **code quality** — a regression against a gate the repository already runs (lint, types, tests)
  or against a named constitution / catalog rule.

These findings are **blocking**. Their provenance is the deliverable plus the defect class, never
an `AC-*`: requiring an acceptance criterion for them would oblige a reviewer who has just
demonstrated a bug to pass it.

A finding is **reviewer-originated scope** only when satisfying it would add product behaviour or
a quality bar that upstream SSOT does not contain and the changed artifacts do not already imply.
"It would be better if the feature also did X" is scope. "The feature does not do what it says"
is a defect.

### Provenance and routing

- Every reviewer finding declares a `Traces to:` value. See
  `shared-skill-delegation-baseline.md#finding-provenance-must` for the response schema. Legal
  values:
  - an upstream obligation (`AC-*`, `BR-*`, `TC-*`, `CON-*`) or a named constitution/catalog rule
    **that governs the product's behaviour**;
  - `defect:correctness`, `defect:security`, or `defect:code-quality` — the deliverable-defect
    classes above, each of which MUST carry the concrete evidence in the changed artifacts that
    demonstrates it;
  - `record:<CODE>` — a defect in the run's own record rather than in the product;
  - `none` — reviewer-originated scope.
- The first two are **blocking** and gate `done`. `record:*` and `none` are not.
- `Traces to: record:<CODE>` is a record defect: the ledger, a round block, an evidence anchor or
  the provenance prose is wrong while the product is not. It MUST be recorded as `advisory`, MUST
  NOT be `blocking`, and settles in the spec's record-defect queue (`#the-record-defect-queue`)
  rather than by re-running the row. `record:unchecked` is a bug report against `validateTddList`,
  not against the item — a record rule worth a round is worth a validator code.
- **A record that misrepresents the run is not a record defect.** Evidence copied from a previous
  round or a sibling row, an evidence anchor resolving to a run other than the one it names, and a
  false `Authored/edited under review` attestation do not merely mis-state the work — they claim
  work that was not done, or independence the reviewer did not have. `agents/qa-gatekeeper.md`
  rejects the first two outright and
  `shared-skill-delegation-baseline.md#reviewer-response-template` forbids a `PASS` on the third,
  so classifying them `record:*` would let an advisory-only review return `PASS` and release
  `done` over the very evidence the gate exists to reject. They stay **blocking** as
  `defect:code-quality` and MUST NOT be filed as `record:*`. `record:*` covers a record that is
  honestly produced and merely wrong — a tier missing from an Evidence cell, a `Satisfied-by`
  naming the wrong sibling row, an unlabelled round block.
- `Traces to: none` is reviewer-originated scope. It is **drift**, and it is **not satisfiable
  downstream**: encoding it as production code plus a hard test assertion is the same violation as
  patching upstream SSOT, inverted. It MUST be recorded as `advisory`, MUST NOT be `blocking`, and
  is routed to the Change Request / Open Question path — never to the implementer.
- Routing a `none` advisory (a `record:*` advisory takes `#the-record-defect-queue` instead — the
  Change Request path adjudicates product obligations and cannot repair a record):
  1. The reviewer records it in its response under `Advisory / Change Request proposals`, with
     enough context for the owner phase to adjudicate. The reviewer does **not** write it into
     `08_Open-questions.md`: that file is upstream SSOT (see `#core-rule`) and is owned by
     `/qfai-sdd`.
  2. If it changes an already-approved obligation, raise a Change Request per
     `#when-drift-is-detected`.
  3. The owner phase (`/qfai-sdd`) adjudicates and is the phase that records the question in
     `08_Open-questions.md`: **promoted** into `AC-*`/`BR-*`/`TC-*`, **deferred**, or
     **rejected-with-rationale**.
  4. Only after promotion and an owner rerun may the obligation become a blocking gate — at which
     point it has an upstream ID and is no longer reviewer-originated.
- A **new** advisory — one that adds a question without changing an already-approved obligation —
  does not block downstream work: the item may reach `done` against its existing upstream
  obligations, with the advisory recorded.
- An advisory that **changes an already-approved obligation** takes the Change Request path
  instead, and `#when-drift-is-detected` governs from step 1: STOP, no `done` for items that
  depend on the obligation under dispute, resume only after approval and the owner rerun.
  Completing against an obligation that is known to be under revision would ship a knowingly
  inconsistent SSOT.

### The record-defect queue

Making `record:*` advisory removes the round it used to force. It does not remove the defect, so
the class is only honest if the defect lands somewhere with an owner and is consumed. That place is
one queue per spec, and it is defined by a destination, an owner, an entry shape and a drain.

- **Where.** A `## Record defects` section in the evidence file the reviewing stage's **own
  completion contract** names. For a `/qfai-implement` review that is
  `.qfai/evidence/implement-<spec-id>.md` when that file exists, otherwise
  `.qfai/evidence/atdd-<spec-id>.md` — the same file rule the spec-level checkpoint boundary uses,
  so a spec never has this queue in two places. **Do not derive the path from a
  `<stage>-<spec-id>.md` pattern.** Each stage names its own evidence file and not every one of
  them is spec-scoped — `/qfai-configure` writes `.qfai/evidence/configure-<run-id>.md`, one per
  run, and has no `configure-<spec-id>.md` at all — so the pattern named files no stage creates.
  Never `08_Open-questions.md`: that file is upstream SSOT owned by `/qfai-sdd` (see
  `#core-rule`), and a record defect is not a product obligation.
- **The class needs a drain, so a stage whose completion contract has none does not use it.** Every
  stage sharing `shared-skill-delegation-baseline.md` reads the provenance rules, but an entry is
  only worth filing where something consumes it, and the queue above is defined as much by the
  drain as by the destination. The test is textual and local: **that stage's own completion
  conditions must require this queue drained before it declares completion.** `/qfai-implement`
  states it (`skills/qfai-implement/SKILL.md#spec-completion-conditions`), and no other stage's
  completion conditions mention the queue at all — so `/qfai-sdd`, `/qfai-atdd`, `/qfai-configure`,
  `/qfai-verify`, `/qfai-discussion` and `/web-research` reviewers MUST NOT classify a finding
  `record:*`; it keeps the class it would have had, blocking under the rule it names. A stage gains
  the class by adding the drain to its completion conditions, never by being named here. A class
  whose entries are written where nothing drains them is the round-dropped-and-defect-dropped
  outcome this queue exists to prevent, and it is worse in the stages that never gained the queue
  than the round ever was.
- **Who.** The reviewer records the finding in its response as an advisory, as for any advisory.
  The **orchestrator** that dispatched the review appends it to the queue when the round closes —
  the same role that owns the ledger. A finding that stays in the reviewer response and never
  reaches the queue is an unrouted advisory, which the review gate already forbids.
- **Entry.** One line per defect: the `<CODE>`, the row or artifact it is against, what the record
  says against what the run actually did, and the round it came from. That is what makes it
  repairable later by someone who did not watch the round.
- **Drain, at the spec boundary.** Before spec-level completion is declared, every open entry is
  **repaired in place**: the record is corrected to what the run did, with no row re-run and no
  status change. Repair is the only close. When the rule the entry names is one no validator
  checks, the entry **also** produces a validator bug report per the `record:unchecked` ratchet
  above — that report tracks the missing check and does not stand in for the repair. Closing an
  entry on the report alone leaves the wrong record exactly as wrong as it was, with the round
  that found it already spent: a missing tier stays missing, and the item stays complete. The two
  are different obligations against different backlogs. Completion is not declared while an entry
  is open. This gates the **spec** boundary only: a `record:*` finding still never holds an
  individual row out of `done`, which is the whole point of the class.
- **When the record cannot be repaired honestly.** Repair means writing what the run actually did,
  which needs the round's artifacts to still say what that was. Where they do not — nothing
  reconciles the entry with any run — the finding was never a record defect: what is missing is
  not a correct record of the work but any evidence the work happened, which is the integrity case
  above. Reclassify it as `defect:code-quality`, blocking, and take the ordinary REVISE path.
  There is no third exit: an entry closes on a corrected record or on a blocking finding.
- **Re-attest a repair in a pack of its own; never re-run it, and never edit a sealed one.** A
  defect inside a `Satisfied-by`, a round block or any other phase-authored field sits inside the
  exact bytes a reviewer's `Audited evidence hash` covers, and the completion gate recomputes that
  hash — so repairing in place makes a correct PASS read as stale, and skipping the recomputation
  would accept evidence nobody read. Repair the record, then have a reviewer **of the role that
  issued the verdict** re-read the repaired entry and emit a **record re-attestation**: the
  `TDD-ID`, the same `Reviewed revision`, the same `Result`, a recomputed `Audited evidence hash`,
  and the queue entry's `<CODE>`.
- **The re-attestation is a new review pack, and the pack it supersedes is left untouched.** A
  verdict lives in a `review-<timestamp>/` pack fixed by a `Review pack seal` the completion gate
  recomputes, so replacing that verdict's `Audited evidence hash` line where it is stored breaks
  the seal by construction, and replacing only the evidence file's copy leaves the sealed reviewer
  response carrying a hash nothing agrees with. Write the re-attestation as its own
  `review-<timestamp>/` pack, sealed by the same procedure. The superseded verdict keeps the hash
  it recorded — it was correct over the bytes it read — and its pack keeps recomputing. The
  evidence entry records `Record re-attestation` beside the verdict it supersedes, with its own
  `Record re-attestation pack` and `Record re-attestation pack seal`; the completion gate
  recomputes the superseding hash and both seals, which is what makes the re-attestation an
  artifact a validator can see rather than an untraceable edit. No code runs, no row changes
  status, and it spends no round — it opens none, so it is not a `Round N:` pack. The revision a
  verdict names excludes `.qfai/evidence/**`, so by construction nothing outside the record moved.
  **A repair that would move the revision is not a record repair**: it is a change to the
  deliverable and takes the ordinary path. A repaired entry whose verdict carries no
  re-attestation is still an open entry.

An unconsumed queue would make the class worse than what it replaced: the round is gone and the
defect is gone with it. The drain is what pays for dropping the round.

### Which evidence is committed

- **Durable per-item TDD evidence** — `.qfai/evidence/implement-<spec-id>.md`
  and `.qfai/evidence/atdd-<spec-id>.md`. Ledger `Evidence` cells point to
  anchors in these files, and validation resolves those anchors on a fresh
  clone, so the managed `.gitignore` block re-includes and commits them.
- **Regenerable** — other stage logs, run logs, and reports. Reproducible by
  rerunning the owner skill; not committed.
- **Governance record** — Change Requests (`.qfai/decisions/CR-*.md`) and
  durable decision records (`.qfai/evidence/decisions/*.json`). They carry
  user approval and cannot be regenerated, so they are committed. The managed
  `.gitignore` block written by `npx qfai init` negates them after the ignore
  lines for exactly this reason.

## Non-negotiable constraints

- Downstream skills must not patch upstream SSOT directly. **This is detected.**
  `npx qfai validate --profile tdd` — the completion gate `qfai-implement` names
  — diffs the branch against `baseBranch` and emits `QFAI-DRIFT-001` (`error`)
  for every changed file under `paths.contractsDir`, under `_policies/`, or
  matching a protected spec-pack filename. A Change Request at `Status:
approved` that **names the changed path** silences it; an `open` CR does not,
  because an open CR authorises nothing. The check does not run in the `sdd`
  profile: `/qfai-sdd` owns these files.
- Downstream reviewers must not originate binding obligations that upstream SSOT does not contain.
- If approval is not available, stay in STOP state **for that CR's blocked set**
  and report blockers. Work outside every open CR's blocked set proceeds; an
  unanswered decision is not a reason to stop what it does not touch. Report
  each open CR with its age and its blocked set, so an unanswered CR surfaces as
  a standing blocker rather than aging out of view.
