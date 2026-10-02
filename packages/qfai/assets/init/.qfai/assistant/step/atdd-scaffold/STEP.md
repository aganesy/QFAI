---
name: atdd-scaffold
owner: qfai-atdd
purpose: "Resolve one business flow's acceptance obligations, check that their tests will be collected, and scaffold the placeholders."
requires: [common-evidence-record, common-grilling-record, common-gate-run]
roles: [orchestrator, test-design-analyst, qa-strategist]
---

# atdd-scaffold

The preflight of acceptance-test work for one business flow. It settles what
the tests must cover and where they live, and writes placeholders. It observes
no behaviour; `atdd-author` does.

## Reads

- The active flow, one `BF-NNNN`. Inside a workflow run the work order's
  `target` names it, and no question asks which flow. Invoked directly, the
  invocation names it. A flow that cannot be resolved stops this step: report
  the missing source.
- The flow's stories, acceptance criteria, examples and owning contracts under
  `paths.specsDir`. The default tree is `.qfai/spec/`.
- `.qfai/assistant/rule/test-layers.md` for the layer vocabulary.
- `qfai.config.yaml`: `paths.testsDir`,
  `validation.traceability.testFileGlobs` and its exclusions.

## Writes

- Placeholder tests from `npx qfai atdd scaffold`.
- `.qfai/evidence/atdd-BF-NNNN.md`, opened as `common-evidence-record` says,
  with the invocation's `## Grilling Session` block and the volume signals.

## Procedure

1. Confirm the BF exists and its US, AC, EX and contract references resolve.
   Stop for upstream repair when a required link is missing or contradictory;
   follow `.qfai/assistant/rule/drift-protocol.md`.
2. Run `npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` to
   obtain the current obligations and findings. Inside a run, the tests to
   write are the BF and AC items of the work order's `obligations` that no test
   annotates. An EX belongs to `/qfai-implement`.
3. Decide the layer each obligation needs from the current story tree, at
   every stage start. A shared Stage 0 snapshot is reused only for the inputs
   it covers, never for this decision.
4. Read the Test, Lint, Typecheck and Build commands as `common-gate-run`
   says.
5. Inspect the test roots, `validation.traceability.testFileGlobs` and the
   exclusions. Confirm each proposed path is collected by the runner and by
   validation.
6. Design the tests. Cover the normal behavior, a boundary and a failure path
   where the contract makes them meaningful. Give each assertion an
   observable oracle. Record the volume signals as
   `.qfai/assistant/skill/qfai-atdd/references/volume-signals.md` defines.
   The test-design analyst checks the obligation mapping and oracle depth.
7. Hold the preflight grilling session (below).
8. Scaffold the placeholders (below).

Record which tests need an authenticated actor. Any such test makes
`atdd-credentials` run before `atdd-author`; inside a run whose work order does
not list it, return the replan outcome.

## Grilling (MANDATORY)

Article IX of `.qfai/assistant/rule/constitution.md` owns the two sessions
this stage may run; `.agents/rules/grilling.md` owns the method.
Neither is restated here. Both sessions are delegated. Critical decisions go
to the user; other decisions follow the recorded griller recommendation.

- **At the preflight.** Open a session for unresolved test design choices.
  Record `confidence high` when there was no session to open.
- **On detection.** Stop and open a session when a contradiction, missing
  acceptance case, or technical obstacle appears during authoring
  (`atdd-author`).
- **Neither session changes settled input.** Route a needed story or contract
  change through `.qfai/assistant/rule/drift-protocol.md`; the run solves
  local obstacles.

Record the sessions with `common-grilling-record` in
`.qfai/evidence/atdd-BF-NNNN.md`.

## Scaffold

`npx qfai atdd scaffold --flow BF-NNNN` creates one E2E placeholder under
`<testsDir>/e2e/`. `npx qfai atdd scaffold --story US-NNNN-NNNN` creates one
integration placeholder per AC under the story's integration home. The options
are exclusive. A generated path must match the configured globs and
exclusions; an unsupported pattern is a refusal. Existing edited files are
preserved. A placeholder receives `D-SCAFFOLD-PLACEHOLDER` until a real
assertion replaces it. See
`.qfai/assistant/skill/qfai-atdd/references/scaffolding.md`.

## Gate

The step is done when every BF and AC obligation in scope has a layer, a
collected test path and a placeholder or an existing test, and the grilling
block for this invocation is written. A placeholder discharges nothing:
`atdd-author` replaces it.
