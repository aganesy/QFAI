# US-0001-0217: Refuse a step tree that a run or a stage skill cannot use

## User Story

- Goal: As a QFAI maintainer or adopter, I want `qfai validate` to refuse a
  step tree in which a step is misplaced, misnamed, unowned, unreachable or
  requires more than one hop, and `npx qfai workflow start` to refuse a plan
  that names a step the project lacks, so that a broken step is found before a
  run or a stage skill needs it.
- Non-goals: checking what a step's body says; checking a step's review
  profile against the routing defaults, which the agent-routing checks do
  (`.qfai/spec/03_contract/cli/assistant-routing.md`).
- Notes: decided by the user on 2026-09-27 (`decisions.md#DEC-0938`). The step
  tree and the refusals are `.qfai/spec/03_contract/cli/assistant-steps.md`.

## Source Provenance

- Change request: `decisions.md#DEC-0939`
