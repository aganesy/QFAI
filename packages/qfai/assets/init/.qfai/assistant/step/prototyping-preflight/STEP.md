---
name: prototyping-preflight
owner: qfai-prototyping
purpose: "Confirm the UI contracts, the root DESIGN.md and the Playwright environment the loop needs."
requires: [common-design-md]
roles: [orchestrator, devops-ci-engineer, product-experience-architect]
routing-profile: default
---

# prototyping-preflight

Checks every precondition of the loop before the first iteration. It changes
no file.

## Reads

- The UI contracts under `<contractsDir>/ui/` that `prototyping-grill` put in
  scope.
- Root `DESIGN.md`, through `common-design-md`.

## Writes

Nothing. The CLI checks are read-only.

## Required Process

### Step 2-A — Verify contract preconditions

- The loop resolves **every UI-bearing UI contract in one invocation**, as
  `prototyping-grill` § Scope defines it. Run
  `npx qfai doctor --profile prototyping` to surface the resolved set. With
  zero UI-bearing contracts the run ends here, writes nothing, and says that no
  UI-bearing UI contract was resolved.
- Confirm `<contractsDir>/ui/` holds a `*.yaml` or `*.yml` contract.
- Run `common-design-md` § Check before building
  (`.qfai/assistant/step/common-design-md/STEP.md#check-before-building`). It
  stops on a missing, unparseable or sample `DESIGN.md`. Run only that section:
  this step does not author `DESIGN.md`.

### Step 2-B — Verify environment preconditions

- Confirm a dev server or a static file server can serve
  `.qfai/prototype/` at the URL passed to
  `npx qfai doctor --profile prototyping --target-url <url>`.
- Confirm every declared screen ID matches `[A-Za-z0-9._-]+` and does not
  contain `..`. The loop builds file names from it, so an ID that fails either
  test stops the run, naming the contract and the ID.
- Canonical launcher: `npx --no-install playwright`, or
  `node_modules/.bin/playwright` when PATH reachability is uncertain. A bare
  `npx playwright` can install a package mid-run.
- Install `playwright` with `npm i -D playwright`.

Follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`
for a failing doctor check.

## Gate

The step passes when `npx qfai doctor --profile prototyping --target-url <url>`
reports no error, with at least one UI-bearing contract resolved and a launcher
that does not install anything.

When the request names the primary contract, that ID replaces the configured
one. The step checks it against the resolved UI-bearing contracts and stops,
naming the ID, when it is not among them. Doctor checks only the configured
value, so its error about `prototyping.primaryUiContract` is reported and does
not stop the step.

Two doctor errors do not stop it, and each is reported:

- an error about `prototyping.primaryUiContract`, refused or unresolved, when
  the request names the primary contract;
- inside a workflow run, a finding about a UI contract that does not serve the
  bound flow. With zero UI-bearing contracts the run ends
  here, and the later steps do not run.
