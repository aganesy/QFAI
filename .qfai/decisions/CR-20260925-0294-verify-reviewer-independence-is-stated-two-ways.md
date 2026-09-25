# Change Request

- ID: `CR-20260925-0294`
- Title: `The verify stage's reviewer independence is stated two ways`
- Raised by: `qfai-implement`
- Raised at: `2026-09-26T00:30:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`TDD-0042` covers `TC-0014-0037`: the verify stage's result names this run's
`verify.json` and a qa-gatekeeper verdict from an independent reviewer. The
completion review of the row found that the chain behind the test case defines
"independent" in two ways.

- The acceptance criterion, the test case, the shipped reference and the
  contract's `reviewer-not-independent` condition use one reading: the reviewer
  did not author or recommend **what it reviews**.
- The example says the reviewer **authored nothing in the run**.

A reviewer that wrote another stage's artifact in the same run meets the first
reading and fails the second. The test pins the first reading. Which one holds
is a spec decision, so the row stops here and this request is raised.

## Reproduction

- `.qfai/specs/spec-0014/03_Acceptance-Criteria.md:50`: "the qa-gatekeeper
  verdict is a review result from a reviewer independent of the authors".
- `.qfai/specs/spec-0014/05_Examples.md:49` (`EX-0014-0030`): "from a reviewer
  instance that authored nothing in the run".
- `.qfai/specs/spec-0014/06_Test-Cases.md:23` (`TC-0014-0037`): "from a
  reviewer independent of the authors".
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/orchestrated-mode.md:33-34`:
  "independent of the authors of what it reviews".
- `.qfai/contracts/cli/qfai-workflow.md:432` (`reviewer-not-independent`): "the
  author or recommender of what it reviewed". The same contract's
  `## Completion` (lines 844-848) says "a reviewer instance the actor history
  does not show as an author or recommender", without saying of what.
- `.qfai/evidence/coverage-depth-spec-0014.md`, finding 7, records the same gap.

## Proposed change

Option 1: align `EX-0014-0030` to "a reviewer independent of the authors of
what it reviews", and qualify the contract's `## Completion` sentence the same
way. `AC-0014-0023`, `TC-0014-0037`, the shipped reference and the test stay
as they are.

## Options (at least 3) and recommendation

| #   | Option                                                                                              | Cost                                                                    | Risk                                                                                    | Recommended |
| --- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| 1   | Align `EX-0014-0030` and the contract's `## Completion` sentence to "of what it reviews"            | Two sentences in upstream artifacts                                     | None found. It matches the `reviewer-not-independent` condition and the shared baseline | ✅          |
| 2   | Adopt "authored nothing in the run" in the criterion, the test case, the contract and the reference | Four upstream edits, a shipped-text change and a new falsifiability run | Stricter than the condition the workflow core checks, so the two would disagree         |             |
| 3   | Leave both readings in place                                                                        | None                                                                    | `TDD-0042` cannot close over a chain that contradicts itself                            |             |

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                   |
| -------------------- | ------------ | ---------------------------------------------------------------- |
| `spec-0014/TDD-0042` | `ledger-row` | Its test case is the only one whose chain reaches `EX-0014-0030` |

- Not blocked by this request: `TDD-0043` to `TDD-0048` and `TDD-0050`, whose
  chains do not reach `EX-0014-0030`.

## Impact scope

- Specs: `spec-0014` `05_Examples.md` (option 1)
- Plans: none
- Tests: none under option 1
- Contracts: `.qfai/contracts/cli/qfai-workflow.md` `## Completion` (option 1)
- Schema: none
- Upstream paths edited under this request: none yet

## Decision needed from user

Choose which reading of reviewer independence the verify stage holds.

## Approved actions (owner skill rerun plan)

1. On approval, run `/qfai-sdd spec-0014` to apply the chosen option and record
   it in `09_delta.md`.
2. Under option 1 the obligation of `TDD-0042` does not move: release it
   `blocked -> todo` and take its review again. Under option 2, reset the row
   and hand the test back to `/qfai-atdd`.

## Resolution

Open.
