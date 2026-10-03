---
name: implement-checkpoint
owner: qfai-implement
purpose: "Close one business flow: run the relevant suite, the project gates and the scoped validation on the integrated tree, and report the flow complete only when all of them hold."
requires: [common-gate-run]
roles:
  - devops-ci-engineer
  - qa-strategist
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
---

# implement-checkpoint

The flow checkpoint for one `BF-NNNN` flow, run after the last owed example
or at once when none was owed.

## Reads

- `.qfai/assistant/skill/qfai-implement/references/checkpoint-verification.md`
  and
  `.qfai/assistant/skill/qfai-implement/references/relevant-test-suite.md`.
- The Test, Lint, Typecheck and Build commands, through `common-gate-run`.

## Procedure

1. Run the relevant suite for every example worked, and the dependent flows of
   a changed shared module, on the integrated tree.
2. Re-run the walking-skeleton command of each entrypoint an implementation
   change reached, as
   `.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md`
   states.
3. Run the applicable project gates with `common-gate-run`.
4. Run `npx qfai validate --profile tdd --fail-on error --flow BF-NNNN` and
   read its fresh JSON result with the freshness checks `implement-tdd` uses
   for selection.
5. Report each command, exit code and output in the stage report.

The stage review runs after this step, once, over every example the stage
implemented. The code review checks the integrated BF and its evidence
there, and the gate below is read after that review.

## Completion gate

Report the flow complete only when:

1. A fresh validate result has no test-obligation EX finding for this BF,
   and every other in-scope error is resolved or assigned to its governing
   stage with an explicit incomplete result.
2. Every implemented EX has an observed RED, GREEN and Refactor result,
   current evidence and the required independent PASS reviews.
3. The affected tests and the Test, Lint, Typecheck and Build commands from
   `tech.md` have been run on the integrated tree, or a command's documented
   applicability makes it unnecessary.
4. `npx qfai validate --profile tdd --fail-on error --flow BF-NNNN` succeeds
   on the final tree.

When no EX work remains at entry, still run the current flow checkpoint;
report "nothing to do" only after the scoped gate and applicable commands
have passed. Record unresolved risks and upstream findings without calling
them complete. Give the user the changed EX IDs, test paths, command results,
and review verdicts.
`/qfai-verify` owns the repository-wide gate.
