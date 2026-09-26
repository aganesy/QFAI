# Objective

## Objective

QFAI provides a command-line quality toolkit for AI-assisted software development. It connects discussion, a story tree, enforcing contracts, executable tests, and observed validation evidence.

The need and scope are recorded in `.qfai/spec/01_policy/initiative.md` and the current business flows under `.qfai/spec/02_business-flow/`.

## Users

- AI coding agents use the shipped skills and agent cards to produce and review work.
- Developers and QA engineers use the CLI findings and evidence to assess coverage and completion.
- Repository maintainers use CI and contract gates to keep the shipped package consistent.

## Success criteria

| ID     | Observable result                                          | Measurement                                                                                                          |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| OBJ-01 | Structural or traceability drift is visible.               | `qfai validate --fail-on error` emits an actionable finding and fails on an error-class violation.                   |
| OBJ-02 | Active behavior is traceable to tests.                     | BF, AC, and EX obligations resolve to their required test layers or an explicit permitted decision.                  |
| OBJ-03 | The shipped workflow is runnable in an adopter repository. | `qfai init` seeds the supported assistant and CI surfaces, and the package's integrity gates verify them.            |
| OBJ-04 | Completion claims cite current evidence.                   | Stage reports name the command, result, scope, revision, and independent review outcome required by their contracts. |

## Non-goals

- Deciding the semantic truth of natural-language product requirements.
- Hosting an IDE or graphical development environment.
- Running CI jobs as a service; the shipped workflows run on the adopter's CI.
- Treating an annotation or generated test scaffold as proof of behavior.
