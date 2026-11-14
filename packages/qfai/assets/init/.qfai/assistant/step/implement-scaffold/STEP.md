---
name: implement-scaffold
owner: qfai-implement
purpose: "Write, with `npx qfai atdd scaffold` or, in a project with purpose-named test files, by hand, the E2E test of each business flow and the integration test of each acceptance criterion the flow lacks, each with an empty body."
requires: [common-gate-run]
---

# implement-scaffold

Lays out the acceptance tests of one business flow before its examples are
implemented. Each test carries its annotation, is not skipped, and has an
empty body that passes. `implement-acceptance` writes the bodies later, once
the system's shape has settled.

## Reads

- The active flow, one `BF-NNNN`, which the invocation's BF argument or the
  request names. A flow that cannot be resolved stops this step: report the
  missing source.
- The flow's stories and acceptance criteria under `paths.specsDir`. The
  default tree is `.qfai/spec/`.
- `.qfai/assistant/rule/test-layers.md` for the layer each ID maps to.
- `qfai.config.yaml`: `paths.testsDir`,
  `validation.traceability.testFileGlobs` and its exclusions, and
  `uiux.registries`.
- The `Component catalogue` row of `<paths.contractsDir>/tech.md#stack`, for
  § Component catalogue.

## Writes

- The empty acceptance tests `npx qfai atdd scaffold` writes.
- In a project that names its test files by purpose, the empty tests and
  annotation lines this step adds to those files instead.
- The catalogue setup § Component catalogue writes: the files the catalogue's
  own setup command writes, and its entry in `uiux.registries`.

## Procedure

1. Run `npx qfai validate --profile atdd --flow BF-NNNN --fail-on never` as
   `common-gate-run` says, and list the BF and AC items no test annotates.
   Drop from that list each item a `Test exception:` row names: it is owed no
   test.
2. Unless § Purpose-named test files applies, when the flow is still on that
   list, run `npx qfai atdd scaffold --flow BF-NNNN`. It writes
   `<testsDir>/e2e/<BF-ID>.test.<ext>`.
3. Under the same condition, for each story with an acceptance criterion still on that list, run
   `npx qfai atdd scaffold --story US-NNNN-NNNN`. It writes one test per
   criterion under `<testsDir>/integration/<US-ID>/`, so delete each test it
   reports as created for a criterion the list dropped.
4. Record which tests need an authenticated actor. Any such test makes
   `implement-credentials` run before `implement-acceptance`.
5. Set up the component catalogue as § Component catalogue says.

The command never overwrites an existing test. A destination the configured
globs would not collect is a refusal: fix the globs or the layout, not the
command's output. So is a JS/TS project where no `package.json` above the
tests names vitest or a `node --test` script: declare the runner there.

Unit and component tests are not scaffolded. `implement-tdd` writes them test
first, one example at a time.

## Purpose-named test files

Where the flow's existing acceptance tests are purpose-named files, each
carrying its `QFAI:` annotations, run no `npx qfai atdd scaffold` for the
flow. Write each listed item's test, with an empty body, into an existing or a
new purpose-named file instead. Where they are not, run the scaffold as
§ Procedure items 2 and 3 say.

- A `QFAI:AC-NNNN-NNNN-NN` test goes in a file under `<testsDir>/integration/`
  or `<testsDir>/api/`, and a `QFAI:BF-NNNN` test in one under
  `<testsDir>/e2e/`, as `.qfai/assistant/rule/test-layers.md` routes them. The file must be one
  the configured globs select.
- An AC or BF annotation counts anywhere in such a file. Put it on the comment
  line directly before the test it marks, so the pass can name that test.
- Change no existing test in the file: add no assertion, and move or remove no
  annotation already there.

The step then passes as Passes when states. Procedure items 1, 4 and 5
still apply.

## Component catalogue

A screen built before its catalogue is installed hand-writes every control,
which is the case `.qfai/assistant/rule/ui-procurement.md` exists to prevent.
So the catalogue is in place before any example is implemented.

Skip this section when the `Component catalogue` row is missing, reads
`none`, or still holds its template placeholder.

Otherwise, when the catalogue the row names is not installed in the project:

1. Install it with the setup command its own documentation gives, for
   example the init command that writes a shadcn/ui `components.json`.
2. Add its registry to `uiux.registries` in `qfai.config.yaml`: the
   catalogue's name pointing at the URL template, with `{name}`, that its
   components resolve from. A catalogue config that already carries a
   `registries` map is restated there as it stands.
3. Where the catalogue cannot be installed, for example a paid licence the
   project does not hold, install nothing and report the row and the reason,
   so whoever owns tech.md can change the row. Do not author the controls the
   catalogue would have supplied in its place.

## Passes when

Read first: the BF and AC items of the flow that no `Test exception:` row
names, and the tests that annotate them. The step passes when every one
already has an annotating test at its layer and § Component catalogue needs no
setup. The pass names the test for each item.

## Gate

PASS when every BF and AC of the flow that no `Test exception:` row names
has an annotating test at its layer, and
`npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
error owned by this flow.
