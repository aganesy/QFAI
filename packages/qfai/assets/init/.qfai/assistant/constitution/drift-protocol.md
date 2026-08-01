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
- outputs of discussion/sdd/review stages

One file inside `.qfai/specs/**` is carved out of that last line:
`<spec-id>/tdd/test-list.md`, and only its `Status` / `DR-ID` / `Evidence`
cells. See `#allowed-exceptions`. Its **rows** — which obligations exist and
what each covers — remain upstream.

## Allowed exceptions (minimal whitelist)

- `.qfai/evidence/**` append/update
- `.qfai/specs/<spec-id>/tdd/test-list.md` — the `Status`, `DR-ID` and
  `Evidence` cells only, append/update by `/qfai-implement`. Every other column
  of that file, and every other file under `.qfai/specs/**`, stays upstream
  SSOT: adding, removing or re-scoping a row is an upstream change and takes the
  `#when-drift-is-detected` path.

Any exception beyond this list requires explicit user approval.

### Why the execution ledger is named here

`/qfai-implement` must write `tdd/test-list.md` after every phase transition,
and the file lives inside `.qfai/specs/**`. The protocol never classified it in
either direction, but `#core-rule`'s list is explicitly open-ended ("at minimum")
and sweeps in "outputs of discussion/sdd/review stages" — and the ledger's schema
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

## When drift is detected

1. STOP downstream editing immediately.
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
   - context (what conflicts)
   - proposed change
   - options (at least 3) and recommendation
   - impact scope (spec/plan/tests/contracts/schema)
   - decision needed from user
   - approved actions (owner skill rerun plan)
3. Wait for explicit user approval, then set `Status` and the approval fields.
4. Rerun the owner skill for the upstream artifact. That rerun is what records
   the CR reference in `09_delta.md` / `07_Decisions.md`.
5. **Sweep the downstream ledgers.** Identify every `tdd/test-list.md` row the
   rerun invalidated — its `TC-Refs` / `US-Refs` / `CON-API-Refs` obligation
   changed or disappeared — and apply the upstream reset transition
   (any status -> `todo`), recording the approved CR/DR ID in `DR-ID` — that
   column carries both `DR-*` and `CR-*` references. The
   sweep covers in-flight rows too: a `red` row whose obligation changed, and
   an `exception` row whose anomaly the rerun resolved or superseded, reset the
   same way. A row whose obligation was deleted outright is removed, not reset.
6. Resume downstream work only after upstream artifacts are updated **and** the
   sweep has run. Resuming with a stale `done` row is resuming on a ledger that
   asserts something known to be false.
7. Record the outcome in the CR: fill `Resolution` and set `Applied at`.
   Approval alone does not release the downstream gate — `qfai-implement`
   treats an `approved` CR without `Applied at` as unresolved.

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
  - an upstream obligation (`AC-*`, `BR-*`, `TC-*`, `CON-*`) or a named constitution/catalog rule;
  - `defect:correctness`, `defect:security`, or `defect:code-quality` — the deliverable-defect
    classes above, each of which MUST carry the concrete evidence in the changed artifacts that
    demonstrates it;
  - `none` — reviewer-originated scope.
- The first two are **blocking** and gate `done`.
- `Traces to: none` is reviewer-originated scope. It is **drift**, and it is **not satisfiable
  downstream**: encoding it as production code plus a hard test assertion is the same violation as
  patching upstream SSOT, inverted. It MUST be recorded as `advisory`, MUST NOT be `blocking`, and
  is routed to the Change Request / Open Question path — never to the implementer.
- Routing an advisory finding:
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

### Which evidence is committed

- **Regenerable** — stage evidence (`.qfai/evidence/<stage>-<spec-id>.md`),
  run logs, reports. Reproducible by rerunning the owner skill; not committed.
- **Governance record** — Change Requests (`.qfai/decisions/CR-*.md`) and
  durable decision records (`.qfai/evidence/decisions/*.json`). They carry
  user approval and cannot be regenerated, so they are committed. The managed
  `.gitignore` block written by `npx qfai init` negates them after the ignore
  lines for exactly this reason.

## Non-negotiable constraints

- Downstream skills must not patch upstream SSOT directly.
- Downstream reviewers must not originate binding obligations that upstream SSOT does not contain.
- If approval is not available, stay in STOP state and report blockers.
