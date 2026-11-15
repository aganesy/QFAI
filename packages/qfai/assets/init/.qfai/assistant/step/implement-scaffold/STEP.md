---
name: implement-scaffold
owner: qfai-implement
purpose: "Write, with `npx qfai atdd scaffold` or, in a project with purpose-named test files, by hand, the E2E test of each business flow and the integration test of each acceptance criterion the flow lacks, each with an empty body, add the per-role navigation journey's missing tests, set up the component catalogue `tech.md` names, and in a UI project write the accessibility check."
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
  missing source. One case is not such a stop: a delegated release's
  hand-made edit, which `implement-settled-edit` made. The step passes on it,
  as § Passes when states.
- The flow's stories and acceptance criteria under `paths.specsDir`. The
  default tree is `.qfai/spec/`.
- `.qfai/assistant/rule/test-layers.md` for the layer each ID maps to.
- `qfai.config.yaml`: `paths.testsDir`,
  `validation.traceability.testFileGlobs` and its exclusions, and
  `uiux.registries`.
- The `Component catalogue` row of `<paths.contractsDir>/tech.md#stack`, for
  § Component catalogue, and the catalogue's own config file or package
  manifest entry, which tells whether it is installed.
- The UI contracts under `paths.contractsDir`, for § Per-role navigation
  journey: each screen's `navigation` and the roles the flow's stories name.
- The UI contracts under `<paths.contractsDir>/ui/` and the project's package
  manifest, for § Accessibility check.

## Writes

- The empty acceptance tests `npx qfai atdd scaffold` writes.
- In a project that names its test files by purpose, the empty tests and
  annotation lines this step adds to those files instead.
- The catalogue setup § Component catalogue writes: the files the catalogue's
  own setup command writes, and its entry in `uiux.registries`.
- The empty per-role navigation journey § Per-role navigation journey adds.
- The accessibility setup § Accessibility check writes: the
  `@axe-core/playwright` dev dependency and the accessibility spec under
  `<testsDir>/e2e/`.

## Procedure

1. Run `npx qfai validate --profile atdd --flow BF-NNNN --fail-on never` as
   `common-gate-run` says, and list the BF and AC items no test annotates.
   Drop from that list each item a `Test exception:` row names: it is owed no
   test.
2. Unless § Purpose-named test files applies, when the flow is still on that
   list, run `npx qfai atdd scaffold --flow BF-NNNN`. It writes
   `<testsDir>/e2e/<BF-ID>.test.<ext>`. The body `implement-acceptance`
   writes there waits for readiness after each page load: the app shell sets
   `data-qfai-ready` on `<html>` once it is interactive. After a client-side
   route change it waits for that route's own content instead, as
   `.qfai/assistant/rule/test-layers.md` § L5 E2E says. A test that drives a
   browser locates elements and injects failures as
   `.qfai/assistant/rule/test-layers.md` § Browser test locators and fault
   injection says.
3. Under the same condition, for each story with an acceptance criterion still on that list, run
   `npx qfai atdd scaffold --story US-NNNN-NNNN`. It writes one test per
   criterion under `<testsDir>/integration/<US-ID>/`, so delete each test it
   reports as created for a criterion the list dropped.
4. Record which tests need an authenticated actor. Any such test makes
   `implement-credentials` run before `implement-acceptance`.
5. Set up the component catalogue as § Component catalogue says.
6. Add the per-role navigation journey as § Per-role navigation journey says.
7. Set up the accessibility check as § Accessibility check says.

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

The step then passes as Passes when states. Procedure items 1, 4, 5, 6
and 7 still apply.

## Component catalogue

A screen built before its catalogue is installed hand-writes every control,
which is the case `.qfai/assistant/rule/ui-procurement.md` exists to prevent.
So the catalogue is in place before any example is implemented.

Skip this section when the `Component catalogue` row is missing, reads
`none`, or still holds its template placeholder.

Otherwise:

1. When the catalogue the row names is not installed in the project, install
   it with the setup command its own documentation gives, for example the
   init command that writes a shadcn/ui `components.json`.
2. When `uiux.registries` has no entry for it, installed before or just now,
   add its registry there: the catalogue's name pointing at the URL template,
   with `{name}`, that its components resolve from. A catalogue config that
   already carries a `registries` map is restated there as it stands.
3. Where the catalogue cannot be installed, for example a paid licence the
   project does not hold, install nothing and report the row and the reason,
   so whoever owns tech.md can change the row. This step authors no control
   in its place; later screens follow `ui-procurement.md`.

The catalogue needs no setup when it is installed and `uiux.registries` has
its entry, or when a run already reported it as one that cannot be installed
and the row has not changed since.

## Per-role navigation journey

A flow's journey can open each screen by its URL, so the flow tests alone do
not show that a user can reach the screens. `.qfai/assistant/rule/test-layers.md`
§ L5 E2E recommends one navigation journey per role for that.

The app has navigation of its own when at least one UI contract screen with
`surface: application`, or no `surface` key, has `navigation.entry_points`
that name another screen, a menu or a control of the app, not only a direct
URL. A `shell` that states no frame does not count. Skip this section when no
screen meets that.

Until UI contracts name the roles of each screen, a role's screens are the
screens of the flows whose stories name that role as their actor. The pass
names the mapping it used: each role and the screens it counted.

Otherwise:

1. List the roles this flow adds a screen to: each role a story of this flow
   names as its actor, where the flow has a UI contract screen.
2. When the project has no navigation journey, add one under
   `<testsDir>/e2e/`, in a file the configured globs select, for example
   `<testsDir>/e2e/navigation.test.<ext>`: one test per role, each with an
   empty body that passes.
3. When the journey exists but has no test for a listed role, add that role's
   test, with an empty body, to the same file. Change no existing test there.
4. Record the listed roles for `implement-acceptance`: a role whose test
   already has a body gains this flow's screens there, not here.
5. Record each listed role that signs in as an authenticated actor, so
   `implement-credentials` serves one signed-in session per role. A visitor
   role that does not sign in is not an actor: its test starts signed out.
6. The journey proves reachability rather than one flow, so it carries no BF,
   AC or EX annotation. `npx qfai validate` therefore does not report it
   missing; the pass names its file instead.

The journey needs nothing when the app has no navigation of its own, or when
its file already has a test for every listed role and the roles are recorded.

## Accessibility check

A built screen nobody checks for accessibility ships whatever violations its
hand-written parts hold. So the check is in place before any example is
implemented, as `.qfai/assistant/rule/test-layers.md#l6-accessibility` defines
it.

Skip this section when no UI contract declares a screen whose `route` starts
with `/`.

Otherwise:

1. Where the E2E layer does not run Playwright for JavaScript or TypeScript,
   install and write nothing, and report it, so whoever owns tech.md can
   choose how the layer runs.
2. When `@axe-core/playwright` is not a dev dependency in the project's
   package manifest, install it as one with the project's package manager.
3. When no selected test file calls axe, write the spec
   `.qfai/assistant/skill/qfai-implement/references/accessibility-check.md`
   gives under `<testsDir>/e2e/`. Fill its route map from the role-to-screen
   mapping § Per-role navigation journey uses: each role with the route of
   every screen it counts that starts with `/`.
4. When the spec already exists, add to its route map each route starting
   with `/` that the current flow's UI contracts declare and the map lacks,
   under every role that mapping gives the screen.
5. The spec signs in through the E2E layer's sign-in for each role it names.
   Record each such role that signs in as an authenticated actor, as
   § Procedure item 4 says. A visitor role that does not sign in is not an
   actor: it runs signed out.

The check needs no setup when the dependency is installed, a selected test
file calls axe, and its route map holds every route starting with `/` that
the current flow's UI contracts declare, or when a run already reported that
the E2E layer does not run Playwright for JavaScript or TypeScript and the
layer has not changed since.

## Passes when

Read first: the BF and AC items of the flow that no `Test exception:` row
names, and the tests that annotate them. The step passes when every one
already has an annotating test at its layer, § Component catalogue needs no
setup, § Per-role navigation journey needs nothing and § Accessibility check
needs no setup. The pass names the test for each item, and the navigation
journey's file or the reason the app has none, and the role-to-screen mapping
it used.

The step also passes when the work order names no flow because it carries
only a delegated release's hand-made edit: the extraction names the `release`
artifact and the `release-delegated` qualifier, and `implement-settled-edit`
made the edit in files the release documents name. That edit has no business
flow and owes no test. The pass names the edit. Any other work order that
names no flow still stops this step.

## Gate

PASS when every BF and AC of the flow that no `Test exception:` row names
has an annotating test at its layer, § Component catalogue needs no setup,
§ Per-role navigation journey needs nothing, § Accessibility check needs no
setup, and `npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
error owned by this flow.
