# Checkpoint Verification

## Command source

Resolve paths.contractsDir from qfai.config.yaml. The Standard commands section of <paths.contractsDir>/tech.md is the only source for Test, Lint, Typecheck, and Build commands. Record an absent command as unavailable with its reason. Do not reconstruct it from package.json or a framework convention.

## Per example

Run the selector that exercises the current EX ID after RED, after GREEN, and after refactor. Preserve the command, exit code, output, and source revision for each observation. A GREEN is the assertion passing at the intended boundary; a test process starting or a report file appearing is insufficient.

Run the relevant tests for modules and contracts the example changes. For a shared artifact, use cross-spec-ownership.md to find the dependent flows. Keep the previously passing examples green on the integrated tree.

## Flow checkpoint

Run qfai validate --profile tdd --fail-on error --flow BF-NNNN for the invocation's flow. A result from another flow or another profile does not close this checkpoint. Run every applicable project gate command named by tech.md in its declared environment. Record each command, exit code, and output in .qfai/evidence/implement-BF-NNNN.md.

The validate run may exit nonzero while other unimplemented examples remain; record the findings and continue the next lowest EX. Completion requires a fresh scoped result with no open EX obligation, plus the project gates and required reviewer verdicts on the final revision.

## Failure handling

A failed command is repaired and rerun on the same integrated tree. If a gate cannot run, record the concrete missing input or environment and keep completion open. A measured change in test duration or count is recorded with before and after commands, not treated as a pass by assertion alone.
