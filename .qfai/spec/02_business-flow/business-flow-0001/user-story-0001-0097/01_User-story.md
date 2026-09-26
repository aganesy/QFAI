# US-0001-0097: Item Completion Gate

## User Story

As a QA engineer, I want a 10-point completion gate for each TDD item, so that no item is marked `done` without full TDD cycle evidence and reviewer approval. On the story tree, I want the scoped validate gate to run per business flow (`--flow BF-NNNN`), so that a run is judged on the flow it owns.

## Legacy Source Scope

- In:
  - `/qfai-implement` unified TDD micro-cycle skill
  - One-test-at-a-time serial execution from `test-list.md` ledger; on the story tree, from the EX IDs no test annotates, with no ledger file
  - Strict TDD lifecycle: `todo` -> `red` -> `green` -> `refactor` -> `done`
  - `exception` status with mandatory DR-ID
  - Backward transition prohibition
  - Routed sub-agent set (delivery-planner, frontend-engineer/backend-engineer, qa-gatekeeper, completion-reviewer, implementation-reviewer, product-surface-reviewer)
  - 8 handoff contracts between agents
  - 10-point item completion gate
  - Evidence contract with per-item fresh evidence (RED/GREEN command+result)
  - Parallelization policy (independent SUT slices only, with worktree separation)
  - Visual Review Guard for UI-affecting items
  - `prototype-handoff.yaml` follows the current DCON-008 contract, including `imageSources[]`; `/qfai-implement` reads its implementation inputs and ignores the removed mustPreserve / mayAdapt / mustNotCopy triplets
  - `design-system.yaml` consumed as input (deterministic mirror of DESIGN.md tokens; NOT a per-iter HTML extraction)
  - Contracts read from `<paths.contractsDir>`; on the story tree, the quality-gate commands read from the Standard commands section of `<paths.contractsDir>/tech.md`
  - The shipped rule `minimal-implementation.md`: on the story tree, its traceability chain and its observation clause name no TC and no execution ledger
  - Scoped completion gate: `qfai validate --profile tdd --fail-on error`, scoped by `--spec` in the spec-pack layout and by `--flow` on the story tree
- Out:
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Acceptance tests (belongs to `/qfai-atdd`)
  - Validation gates (belongs to `/qfai-verify`)
  - Parallel execution across multiple specs simultaneously

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0011/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0011/02_User-stories.md#us-0011-0006`
