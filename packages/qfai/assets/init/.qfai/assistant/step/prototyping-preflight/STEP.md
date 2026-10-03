---
name: prototyping-preflight
owner: qfai-prototyping
purpose: "Confirm the UI contracts, the root DESIGN.md and the Playwright environment the loop needs."
requires: [common-design-md]
roles: [orchestrator, devops-ci-engineer, product-experience-architect]
routing-profile: default
---

# prototyping-preflight

Checks every precondition of the loop before cycle 0 spends anything. It
changes no file.

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
  `npx qfai doctor --profile prototyping` to surface the resolved set. Zero
  UI-bearing contracts at cycle 0 is a deterministic no-op exit `0`, which ends
  the run.
- Confirm `<contractsDir>/ui/*.yaml` exists.
- Run `common-design-md` § Check before building
  (`.qfai/assistant/step/common-design-md/STEP.md#check-before-building`). It
  runs `npx qfai prototyping preflight --target-url <url>` and stops on a
  missing, unparseable or sample `DESIGN.md`. Run only that section: this step
  does not author `DESIGN.md`.

### Step 2-B — Verify environment preconditions

- Confirm a capture route exists for each declared screen, at the URL passed as
  `--target-url`, or plan `--auto-serve` where no dev server runs
  (`.qfai/assistant/skill/qfai-prototyping/references/iterate-flags.md`).
- Canonical launcher: `npx --no-install playwright`, or
  `node_modules/.bin/playwright` when PATH reachability is uncertain. A bare
  `npx playwright` can install a package mid-run.
- `browserTool: "playwright-cli"` is rejected by config load, and
  `D-DEPRECATED-PROBE` reports `error`. Install `playwright`
  (`npm i -D playwright`) instead.

Follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`
for a failing doctor or preflight check.

## Gate

The step passes when `npx qfai prototyping preflight --target-url <url>` exits
`0` with at least one UI-bearing contract resolved and a launcher that does not
install anything. With zero UI-bearing contracts the run ends here with exit
`0`, and the later steps do not run.
