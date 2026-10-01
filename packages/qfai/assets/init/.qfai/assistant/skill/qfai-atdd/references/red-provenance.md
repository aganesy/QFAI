# Acceptance-test RED provenance

Each BF or AC test needs evidence that its assertion can reject the wrong
behavior. Keep the record under `### <BF-ID>` or `### <AC-ID>` in
`.qfai/evidence/atdd-BF-NNNN.md`. Name the test file and selector, the exact
command, the selected-test output, the tested revision, and the fixtures or
snapshots the test reads. The revision is the git commit of a clean tree, so
it pins the test and every file it reads; commit before observing.

## Observed RED

Run the selected test before code satisfying its predicate exists, or against
an existing surface that currently violates it. Preserve the assertion
message and location. A module-load error, missing dependency, broken fixture
or zero selected tests is not a RED observation. Have qa-gatekeeper confirm
that the failure is the specified assertion before implementation makes it
pass. Then hand the test to `/qfai-implement` and make the tree green before
opening another deliberate RED that a full-suite gate would encounter.

## Already implemented behavior

When the test passes before authoring the change, make the smallest controlled
mutation that violates the claimed rule. Run the selected test, capture its
assertion failure, restore the mutation, and rerun it on the restored tree.
Record the mutation and both results. If no safe mutation or equivalent
falsifiability argument exists, keep the obligation unresolved and route it
through a `decisions.md` row under `<paths.specsDir>`; only a DONE
`Test exception:` row can discharge it. Do not call a passing test alone a RED
proof.

## Freshness

A test or fixture edit after RED changes the proof subject. Commit it and
retake the proof before a reviewer certifies it.
A later flow that changes a shared fixture follows
`references/shared-test-artifacts.md`. Do not overwrite the old record;
append the new attempt and identify the current one. The review pack and the rounds a
blocking finding opens are `.qfai/assistant/step/common-review-cycle/STEP.md`.
