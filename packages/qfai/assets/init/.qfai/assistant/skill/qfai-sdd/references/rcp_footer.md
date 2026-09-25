# SDD Review Cycle Footer

## Review target

- Scope: `sdd`, one affected `BF-NNNN` at a time.
- Read the flow's policy, stories, examples, enforcing contracts, `contracts.md`, decisions and open questions, and `.qfai/evidence/sdd-BF-NNNN.md`.
- Include every sibling flow affected by a shared contract change. Reviewers inspect the same snapshot that passed validation.

## Routing

Select reviewers from the resolved routing manifest and review profile. `completion-reviewer` is the terminal blocking reviewer; route `architecture-reviewer`, `product-surface-reviewer`, and `qa-gatekeeper` when their conditions apply. An author does not review its own artifact. Each reviewer returns PASS or REVISE using `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

A REVISE returns to the owning author. After repair, rerun validation and each reviewer whose input changed. The review pack maps REVISE to FAIL in `summary.json`; do not introduce a third verdict. Follow `.qfai/assistant/rule/review-convergence.md` for the bounded cycle and unresolved finding handling.

## Validation gate

Run `npx qfai validate --profile sdd --fail-on error --flow BF-NNNN` for each affected flow after its artifacts are stable. Require exit 0 and zero errors. Record the command, result, `<paths.outDir>/validate.log`, and the run log in that flow's evidence. The CLI writes the log; shell redirection is unnecessary. A run with no BF says in its report what the stage waits on, records an `open-questions.md` row for it, and does not claim DONE.

## Review artifacts

Each cycle records its request, individual reviewer verdicts, and `summary.json` under `.qfai/review/review-<timestamp>/`. The flow evidence cites the review pack. Reviewers check the BF → US → AC → EX ← BR edges, negative and boundary outcomes, contract realization, DB execution proof, decision and OQ state, and validation freshness.
