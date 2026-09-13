# Change Request

- ID: `CR-20260913-0007`
- Title: `Bound optional pattern review to concrete artifacts`
- Raised by: `qfai-sdd / requirements-analyst`
- Raised at: `2026-09-13T14:29:46Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (current session's delegated implementation scope)`
- Approved at: `2026-09-13T14:29:46Z`
- Approved option: `1`
- Applied at: `-`
- Superseded by: `-`

## Context

This CR bounds optional pattern review in `spec-0015/04_Business-Rules.md`,
BR-0015-0005, and DR-0012-002 in `_policies/08_Decisions.md`. Numeric growth
targets and requests for additional abstract rules do not establish concrete
coverage. The manifest remains the mode registry; the shipped catalog bounds
its settings, including targets in preserved manifests.

The requested behavior keeps optional advisory review, but limits requests
for more work to concrete flows, US, AC, EX and TC. Abstract rules and
decisions do not grow to meet a target. Existing mandatory traceability
pairings remain required.

The session user asks for every related issue to be addressed and delegates
implementation judgment without further questions or permission requests.
Option 1 is selected under that direction. The approval fields record this
delegated scope, not a separate user answer to these options. `Approved at`
is the time that authorization was recorded.

## Proposed change

- Keep `pattern-doubler` optional and advisory across skills.
- Remove the numeric default and any demand to double abstract items.
- Require a rationale for each proposed concrete addition.
- Return N/A when no relevant concrete artifact is available, even if an
  abstract artifact carries IDs.
- Let the shipped catalog's bound override targets in preserved manifests.
  Keep adopter routing and manifest content protected on init and upgrade.
- Preserve required pairings and independently required blocking gates.
- Retain existing IDs. Correct BR-0015-0005's AC pairing to its own
  pattern-review criteria rather than the devils-advocate criterion.

## Options (at least 3) and recommendation

| #   | Option                                                | Cost                                                                       | Risk                                                                 | Recommended |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------- |
| 1   | Keep optional concrete-pattern review without targets | Update the existing spec, decision, profile, catalog and regression oracle | Preserved legacy targets need an explicit authority bound            | Yes         |
| 2   | Remove the optional mode                              | Remove its existing references and dependent obligations                   | Removes useful concrete coverage review and requires item retirement | No          |
| 3   | Keep the current specification                        | No change                                                                  | Numeric targets continue to demand additional abstract rules         | No          |

Option 1 preserves the useful review and introduces no validator, role or
artifact format. The other options either remove that review or retain the
demand this change is meant to eliminate.

## Blocked downstream items

| Item               | Kind       | Why it depends on the artifact                                                 |
| ------------------ | ---------- | ------------------------------------------------------------------------------ |
| spec-0015/TDD-0006 | ledger-row | Its rationale oracle must apply to concrete proposals without a numeric target |
| spec-0015/TDD-0007 | ledger-row | Its N/A oracle must cover abstract ID-bearing artifacts                        |

- Not blocked by this CR: every other existing ledger row. Reviewer routing,
  mandatory reviewer membership and unrelated obligations retain their meaning.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0015`, plus the existing common decision `DR-0012-002`.
- Plans: `.qfai/specs/spec-0015/10_Plan.md`.
- Tests: `spec-0015/TDD-0006`, `spec-0015/TDD-0007`, and
  `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`.
- Contracts: none.
- Schema: no API, database or contract-schema change.
- Upstream paths edited under this CR:
  - `.qfai/specs/spec-0015/01_Spec.md`
  - `.qfai/specs/spec-0015/02_User-stories.md`
  - `.qfai/specs/spec-0015/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0015/04_Business-Rules.md`
  - `.qfai/specs/spec-0015/05_Examples.md`
  - `.qfai/specs/spec-0015/06_Test-Cases.md`
  - `.qfai/specs/spec-0015/09_delta.md`
  - `.qfai/specs/spec-0015/10_Plan.md`
  - `.qfai/specs/spec-0015/tdd/test-list.md`
  - `.qfai/specs/_policies/08_Decisions.md`
  - `.qfai/specs/_policies/10_delta.md`
  - `.qfai/assistant/manifest/review-profiles.yml`
  - `.qfai/assistant/catalog/review-gate.rules.yml`
- Package sources for the shipped authority and its oracle:
  - `packages/qfai/assets/init/.qfai/assistant/manifest/review-profiles.yml`
  - `packages/qfai/assets/init/.qfai/assistant/catalog/review-gate.rules.yml`
  - `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`

## Decision needed from user

None within the delegated scope. The selected behavior is option 1. No
individual option response, new authority or approval-required Triage
operation is claimed.

## Approved actions (owner skill rerun plan)

1. Rerun `/qfai-sdd` for the common decision and `/qfai-sdd spec-0015` for
   the spec pack, both in `re-derive` mode. Follow the fixed phase order,
   persisted Triage gates and independent review gates. Leave unrelated
   spec meanings unchanged.
2. Sweep the downstream ledger after the changed TC obligations exist:
   - Reset `spec-0015/TDD-0006` and `spec-0015/TDD-0007` to `todo`, with
     this CR in `DR-ID`. Retain their old evidence as history, not as proof
     of the changed obligations. No row is retired or renumbered.
   - Migrate missing ledger columns to the canonical template. Keep
     unaffected row identities, statuses and recorded evidence unchanged.
   - Seed missing already-active US or API obligations at `todo` only
     after resolving the catalog's active-obligation and ownership rules.
     Their `Test file` and `Selector` remain `-` until the executing owner
     supplies real test identities.
   - A required reset outside the two named rows returns to this CR before
     it is executed. No unrelated verdict is rewritten as a side effect.
3. Update package source profiles and catalog authority. Generate their
   operating mirrors through the existing SSOT synchronization. Do not
   weaken init's adopter-manifest preservation.
4. Strengthen the existing integration oracle for rationale, concrete scope,
   N/A behavior, absence of numeric targets and legacy-target precedence.
   Record real Red/Green results and repository gates.
5. Record the completed reruns in both deltas' canonical Change Requests
   tables. Add this CR to the modified common decision's `Related` field.
   Set `Applied at` and Resolution only after the owner reruns complete.

## Resolution

Scoped physical changes are applied; the owner workflow is not complete.
Status remains approved and Applied at remains unset. No gate waiver or
individual option answer is claimed.

- Action 1: the independent delivery-planner passed persisted Stage 1 Triage.
  Sequential authors completed Phases 0/1, requirement and test-design Phase 2,
  canonical seeding, obligation reconciliation and Phase 3 plan. Existing
  spec 01..06 and 10 plus DR-0012-002 carry the concrete scope. Phase 4 records
  the CR in both deltas. Final required validation and independent reviews
  remain pending.
- Action 2: the ledger has 53 rows in one canonical table. Its 37 existing
  rows remain; only the approved TDD-0007 selector narrows to the original
  abstract-only boundary. The executing owner reset only TDD-0006/0007 to
  todo, set this CR in DR-ID and cleared Blocked-By, preserving prior Evidence
  verbatim. No other existing status, selector or evidence is reset.
  The normal Action 1 producer re-derive adds 16 todo seeds: TDD-0038 for
  already-active TC-0015-0034, TDD-0039 for TC-0015-0007's compatibility
  boundary and TDD-0040..0053 for fourteen missing active US obligations.
  No row or TC is retired or renumbered. New E2E test identities remain unset.
- Actions 3/4: source profile/catalog and synchronized operating mirrors
  contain no numeric default and expressly override legacy numeric targets.
  Existing real-init preservation is unchanged. The regression author observed
  RED with 3 failing assertions and 14 passing controls; subsequent integration
  runs pass all 17 tests, including normal and force reinit. Related checks
  pass 44 tests; ledger/structural checks pass 174. The narrowed selector runs
  exactly one passing test and intentionally skips 16.
- Action 5: both canonical Change Requests tables reference this approved
  re-derive; DR-0012-002's Related includes the CR. Applied at remains `-`
  until required owner gates complete. The global SDD baseline fails with
  96 errors and scoped full baseline with 61; these are observations, not
  waived gates. The repository operating-memory refresh remains unapplied
  under the source/mirror boundary.

Factual phase and command evidence is in `.qfai/evidence/sdd-spec-0015.md`.
