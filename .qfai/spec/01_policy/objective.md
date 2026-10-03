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

| Observable result                                                         | Measurement                                                                                                                                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Structural or traceability drift is visible.                              | `qfai validate --fail-on error` emits an actionable finding and fails on an error-class violation.                                            |
| Active behavior is traceable to tests.                                    | BF, AC, and EX obligations resolve to their required test layers or an explicit permitted decision.                                           |
| The shipped workflow is runnable in an adopter repository.                | `qfai init` seeds the supported assistant and CI surfaces, and `qfai init --force` brings the regenerated assets back to the shipped version. |
| Completion claims cite current results.                                   | The final report names each gate's command and verdict and the outcome of the route's reviews.                                                |
| QFAI keeps no local evidence or review record.                            | Shipped assets and source name `.qfai/evidence/` or `.qfai/review/` only to list leftovers or in migration notices.                           |
| QFAI checks no hash for integrity beyond two data-protection comparisons. | Shipped source holds no hash or digest equality check other than the Claude hook-group identity.                                              |
| A change route reviews its deliverables only.                             | A change route has two required reviews when it changes the specification, and one otherwise.                                                 |
| A release passes every repository gate.                                   | `pnpm ci:gate` exits 0 on the release branch.                                                                                                 |

## Non-goals

- Deciding the semantic truth of natural-language product requirements.
- Hosting an IDE or graphical development environment.
- Running CI jobs as a service; the shipped workflows run on the adopter's CI.
- Treating an annotation or generated test scaffold as proof of behavior.
- Deleting an adopter's leftover files.
- Carrying an adopter's own edits to the shipped assistant assets across `qfai init --force`.
- Setting or measuring a speed target for a change.
