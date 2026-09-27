# US-0001-0216: Run only the steps a change needs, reviewed once per stage

## User Story

As an operator, I want each stage of a run to do only the steps its plan and the checked route proposal make active, and to be reviewed once, at its end, by the reviewers those steps need, so that a small change does not pay for the whole of a large skill and its reviews.

## Non-goals

- A new route or predicate family beyond `proposed`
- A review at the end of every step
- The whole-change review at `finish`, which stays the independent `qa-gatekeeper` PASS
- Which steps exist and where they are installed, which the assistant-steps contract states
