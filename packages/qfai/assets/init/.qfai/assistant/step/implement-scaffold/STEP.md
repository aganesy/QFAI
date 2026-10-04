---
name: implement-scaffold
owner: qfai-implement
purpose: "Write, with `npx qfai atdd scaffold`, the E2E test of each business flow and the integration test of each acceptance criterion the flow lacks, each with an empty body."
requires: [common-gate-run]
roles: [test-design-analyst]
routing-profile: default
---

# implement-scaffold

Lays out the acceptance tests of one business flow before its examples are
implemented. Each test carries its annotation, is not skipped, and has an
empty body that passes. `implement-acceptance` writes the bodies later, once
the system's shape has settled.

## Reads

- The active flow, one `BF-NNNN`. Inside a workflow run the work order's
  `target` names it. A flow that cannot be resolved stops this step: report
  the missing source.
- The flow's stories and acceptance criteria under `paths.specsDir`. The
  default tree is `.qfai/spec/`.
- `.qfai/assistant/rule/test-layers.md` for the layer each ID maps to.
- `qfai.config.yaml`: `paths.testsDir`,
  `validation.traceability.testFileGlobs` and its exclusions.

## Writes

- The empty acceptance tests `npx qfai atdd scaffold` writes.

## Procedure

1. Run `npx qfai validate --profile atdd --flow BF-NNNN --fail-on never` as
   `common-gate-run` says, and read the BF and AC items no test annotates.
2. For the flow, when it has no E2E test, run
   `npx qfai atdd scaffold --flow BF-NNNN`. It writes
   `<testsDir>/e2e/<BF-ID>.test.<ext>`.
3. For each story with an acceptance criterion no test annotates, run
   `npx qfai atdd scaffold --story US-NNNN-NNNN`. It writes one test per
   criterion under `<testsDir>/integration/<US-ID>/`.
4. Record which tests need an authenticated actor. Any such test makes
   `implement-credentials` run before `implement-acceptance`.

The command never overwrites an existing test. A destination the configured
globs would not collect is a refusal: fix the globs or the layout, not the
command's output.

Unit and component tests are not scaffolded. `implement-tdd` writes them test
first, one example at a time.

## Passes when

Read first: the BF and AC items of the flow that no `Test exception:` row
at DONE names, and the tests that annotate them. The step passes when every one
already has an annotating test at its layer. The pass names the test for each item.

## Gate

PASS when every BF and AC of the flow that no `Test exception:` row at DONE
names has an annotating test at its layer, and
`npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
error owned by this flow.
