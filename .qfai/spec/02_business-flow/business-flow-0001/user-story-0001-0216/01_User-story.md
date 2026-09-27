# US-0001-0216: Run only the steps a change needs, reviewed once per stage

## User Story

- Goal: As an operator, I want each stage of a run to do only the steps its
  plan and the checked route proposal make active, and to be reviewed once, at
  its end, by the reviewers those steps need, so that a small change does not
  pay for the whole of a large skill and its reviews.
- Non-goals: a new route or predicate family beyond `proposed`; a review at the
  end of every step; the whole-change review at `finish`, which stays the
  independent `qa-gatekeeper` PASS; which steps exist and where they are
  installed (`.qfai/spec/03_contract/cli/assistant-steps.md`).
- Notes: decided by the user on 2026-09-27 (`decisions.md#DEC-0938`). The plan
  format and the work-order fields are
  `.qfai/spec/03_contract/cli/workflow-files.md` and
  `.qfai/spec/03_contract/cli/qfai-workflow.md`.

## Source Provenance

- Change request: `decisions.md#DEC-0939`
