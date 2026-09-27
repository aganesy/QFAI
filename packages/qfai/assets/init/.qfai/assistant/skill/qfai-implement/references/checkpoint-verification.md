# Checkpoint Verification

Test, Lint, Typecheck and Build commands come from
`.qfai/assistant/rule/shared-skill-operating-baseline.md#standard-commands-mandatory`.
Each gate is run, recorded and repaired as
`.qfai/assistant/step/common-gate-run/STEP.md` states.

## Per example

Run the selector that exercises the current EX ID after RED, after GREEN, and after refactor. Preserve the command, exit code, output, and source revision for each observation. A GREEN is the assertion passing at the intended boundary; a test process starting or a report file appearing is insufficient.

Run the relevant tests for modules and contracts the example changes. For a shared artifact, use cross-spec-ownership.md to find the dependent flows. Keep the previously passing examples green on the integrated tree.

## Flow checkpoint

Run qfai validate --profile tdd --fail-on error --flow BF-NNNN for the invocation's flow. A result from another flow or another profile does not close this checkpoint. Run every applicable project gate command named by tech.md in its declared environment. Record each command, exit code, and output in .qfai/evidence/implement-BF-NNNN.md.

The validate run may exit nonzero while other unimplemented examples remain; record the findings and continue the next lowest EX. Completion requires a fresh scoped result with no open EX obligation, plus the project gates and required reviewer verdicts on the final revision.

A measured change in test duration or count is recorded with before and after commands, not treated as a pass by assertion alone.
