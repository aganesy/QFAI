# Initiative

## Initiative

Keep one coherent path from a product need to an observed completion claim. The discussion pack records the source, SDD writes policy, business flows, stories, examples, and enforcing contracts, ATDD and implementation provide executable coverage, and validation plus independent review check the result.

## Initiative overview

| Key                     | Value                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Product                 | QFAI, a package installed through `qfai init`                                            |
| Audience                | AI coding agents, developers, QA engineers, and repository maintainers                   |
| Delivery                | npm package with CLI, shipped assistant assets, and CI workflow templates                |
| Current authoring model | Story tree rooted at `.qfai/spec/`; contracts under `.qfai/spec/03_contract/` by default |

## Assumptions

- The adopter stores its active stories, contracts, and tests in the repository so QFAI can inspect them.
- The adopter can run Node.js and a package manager. A compatible agent host is needed only for the shipped assistant workflow.
- GitHub Actions is the executor for the bundled CI workflow templates; QFAI is not a CI runner.

## Dependencies

- Runtime and build requirements are defined in `packages/qfai/package.json` and `.qfai/spec/03_contract/tech.md`.
- Story and contract authoring follows `.qfai/assistant/skill/qfai-sdd/SKILL.md` and the paired templates.
- Test-layer obligations follow `.qfai/assistant/rule/test-layers.md`.

## Priorities

| Priority | Concern      | Decision rule                                                              |
| -------- | ------------ | -------------------------------------------------------------------------- |
| 1        | Correctness  | A false PASS is more costly than a visible incomplete gate.                |
| 2        | Traceability | Keep each obligation linked to its authoritative source and test evidence. |
| 3        | Usability    | Make CLI findings actionable and keep operator inputs explicit.            |
| 4        | Runtime cost | Reduce repeated work only after preserving the first three priorities.     |
