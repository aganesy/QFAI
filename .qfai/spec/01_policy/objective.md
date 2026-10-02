# Objective

## Objective

- Outcome: A change made with AI coding agents is claimed complete only when its
  written behaviour, enforcing contracts, executable tests and observed
  validation evidence agree.
- Evidence: the business flows under `.qfai/spec/02_business-flow/`, each
  written from a request that `.qfai/spec/decisions.md` records.

## Users

- AI coding agent: produces and reviews work with the shipped skills and agent
  cards.
- Developer or QA engineer: judges coverage and completion from the CLI's
  findings and evidence.
- Repository maintainer: keeps the shipped package consistent through CI and
  contract gates.

## Success criteria

| Observable result                                          | Measurement                                                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Structural or traceability drift is visible.               | `qfai validate --fail-on error` emits an actionable finding and fails on an error-class violation.                   |
| Active behavior is traceable to tests.                     | BF, AC, and EX obligations resolve to their required test layers or an explicit permitted decision.                  |
| The shipped workflow is runnable in an adopter repository. | `qfai init` seeds the supported assistant and CI surfaces, and the package's integrity gates verify them.            |
| Completion claims cite current evidence.                   | Stage reports name the command, result, scope, revision, and independent review outcome required by their contracts. |

## Non-goals

- Deciding the semantic truth of natural-language product requirements.
- Hosting an IDE or graphical development environment.
- Running CI jobs as a service; the shipped workflows run on the adopter's CI.
- Treating an annotation or generated test scaffold as proof of behavior.
