# Initiative

## Initiative

Keep one path from a product need to an observed completion claim. The
discussion pack records the source. SDD writes the policy, business flows,
stories, examples and enforcing contracts. ATDD and implementation provide
executable coverage, and validation and independent review check the result.

## Assumptions

- The adopter stores its active stories, contracts, and tests in the repository so QFAI can inspect them.
- The adopter can run Node.js and a package manager. A compatible agent host is needed only for the shipped assistant workflow.
- GitHub Actions is the executor for the bundled CI workflow templates; QFAI is not a CI runner.

## Dependencies

- Runtime and build requirements are defined in `packages/qfai/package.json` and `.qfai/spec/03_contract/tech.md`.
- Story and contract authoring follows `.qfai/assistant/skill/qfai-sdd/SKILL.md` and the paired templates.
- Test-layer obligations follow `.qfai/assistant/rule/test-layers.md`.
