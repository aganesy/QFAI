---
name: implement-tdd
owner: qfai-implement
purpose: "Take each example of one business flow that no test annotates through an observed Red, Green and Refactor cycle, appending the one example a diagnosed missing test needs, and align every surface that does not own the truth."
requires:
  - common-gate-run
roles:
  - delivery-planner
  - test-design-analyst
  - qa-strategist
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
  - implementation-reviewer
  - qa-gatekeeper
  - product-surface-reviewer
routing-profile: implementation-heavy
---

# implement-tdd

Work within one `BF-NNNN` flow. An EX is the unit of implementation review;
the BF is the unit of scoped completion. Inside a workflow run, a work order
whose `target` binds a flow supplies the flow, and no question asks which flow.
Otherwise the invocation's BF argument names it.

## Passes when

Read first: the flow's examples and the tests that annotate them. The step
passes when every example has an annotating test, so no example needs a Red,
Green and Refactor cycle. The pass names the examples and their tests.

## Reads

- The flow's stories, acceptance criteria, examples and owning contracts,
  from the configured `paths.specsDir` and `paths.contractsDir`. The default
  spec tree is `.qfai/spec/`. Resolve contract paths from configuration; do
  not assume a directory name.
- `.agents/rules/minimal-implementation.md`,
  `.qfai/assistant/rule/test-layers.md` and the current agent cards, before
  assigning work.
- For UI work, root `DESIGN.md` and the linked UI contracts under
  `<paths.contractsDir>/ui/`, before changing the surface.
- The references this step cites, under
  `.qfai/assistant/skill/qfai-implement/references/`.

## Scope

Send a decision, a question for the user or an out-of-scope discovery to
`/qfai-sdd` as a change request. An out-of-scope discovery does not stop the
current flow. A diagnosed missing test on behaviour an existing AC states is
the one scope gap that raises no change request: an EX that states the case is
worked as an EX no test annotates, and where none does, this step appends it,
as [A diagnosed missing example](#a-diagnosed-missing-example) states.

## Preflight

1. Follow
   `.qfai/assistant/rule/shared-skill-operating-baseline.md` for format, and
   `.qfai/assistant/rule/shared-skill-delegation-baseline.md` for the first
   delegation, capability check, and failure handling. Confirm the flow and
   its links are internally consistent. A changed upstream obligation follows
   `.qfai/assistant/rule/drift-protocol.md` before dependent work resumes.
2. Read the **Standard commands** section of
   `<paths.contractsDir>/tech.md`, as
   `.qfai/assistant/rule/shared-skill-operating-baseline.md#standard-commands-mandatory`
   states. Obtain the Test command only from that section. Lint, Typecheck
   and Build run once, in the verify stage. Read its
   `## Architecture` table too: place each new module in one layer, and
   import only from the layers that layer's row lists.
3. Find the flow's acceptance tests by their `QFAI:BF-NNNN` and
   `QFAI:AC-NNNN-NNNN-NN` annotations. Where `implement-scaffold` wrote them,
   their bodies are empty; an empty body proves no behaviour, and its body is
   `implement-acceptance`'s to write.
4. Check test roots, `validation.traceability.testFileGlobs`, and
   exclusions. An EX test must be collected by the runner and by validation.
   A test with only an annotation or placeholder is not behavioral proof.
5. Prove each runnable entrypoint the flow depends on before its first
   example, under
   `.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md`.

## A contradiction

When the work would contradict an existing story, AC, EX, rule or contract,
stop and ask the user. A missing example is not a contradiction:
[A diagnosed missing example](#a-diagnosed-missing-example) appends it. Route a needed story or contract change
through `.qfai/assistant/rule/drift-protocol.md`; the run solves local
obstacles. Do not reopen settled requirements as implementation preferences.

## A diagnosed missing example

On every route of the `fix` family, `improve-performance` included, and on
`revert-culprit`, a case no EX states has this step append one EX before it
makes the failing test pass: the case a `missing-test` diagnosis found, or the
behaviour a reverted change broke. The EX states what an existing AC already
requires, so the step asks the user nothing:

- Append exactly one EX to the `03_Example.md` of the story that owns the AC
  the diagnosis matched. Its ID is the next free EX ID of that story, its
  `AC-Ref` is that AC, and the diagnosis is its reason.
- Add the new EX ID to the Examples cell of the contract rule that already
  cites an example of that AC. The rule's Statement is unchanged.
- Change no story, AC, rule statement or existing EX.
- Append the one `Change request:` row the drift gate needs: it names the
  files changed and records that the session appended the EX under an existing
  AC and that nobody was asked.
- List the EX in the run's final report.
- No concrete-abstract cycle runs.

An EX that would contradict a story, an AC, another EX or a rule is put to the
user before anything is written. Where the diagnosis matched an EX that already
states the case, append nothing and annotate the failing test with that EX.

## Select the examples

Work the EX IDs the caller names, each after confirming it is in the current
flow. Otherwise take the flow's EX IDs that no test annotates, in EX ID order:
a test annotating an example is what says the example is done.

See `.qfai/assistant/skill/qfai-implement/references/cross-spec-ownership.md`
for changes that touch another flow and
`.qfai/assistant/skill/qfai-implement/references/parallelization-policy.md`
for independently owned
slices. Work one EX at a time by default. Parallel work requires disjoint
writes, a passing technical gate, and the required user consent.

## Red, Green, Refactor

For the selected EX, create or strengthen a test in a non-acceptance layer and
annotate it `QFAI:EX-NNNN-NNNN-NN`. Preserve the BF E2E and AC integration
or API tests `implement-scaffold` wrote. Put the test where the observable
behavior belongs. Use
`.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md` and
`.qfai/assistant/skill/qfai-implement/references/oracle-strength.md` to choose
the smallest useful seam and a falsifiable assertion.

Where `implement-diagnose` already wrote the failing test for the example, do
not write another: annotate that test with the EX ID and run it to confirm it
still fails.

While implementing, run only the selected test. The full suite, Lint,
Typecheck, Build and `npx qfai validate` run once, in the verify stage.

1. **Red:** Run the Test command from `tech.md` for the selected test alone.
   Observe the assertion fail for the intended behavior before changing
   production code. A load error, missing dependency, or broken fixture is
   not an admissible RED. Record command, selector and failure. Follow
   `.qfai/assistant/skill/qfai-implement/references/red-admissibility.md` and
   `.qfai/assistant/skill/qfai-implement/references/red-not-observable.md`
   when existing behavior prevents an ordinary RED.
2. **Green:** Write the minimum production code that makes this test pass.
   Do not generalize to an untested case. Minimal is measured against the
   example's obligation, not the test's inputs: a value hard-coded to match
   the test meets neither
   (`.qfai/assistant/rule/test-layers.md#a-passing-test-is-not-the-solution`).
   Run the same selector and record
   command and outcome.
3. **Refactor:** Improve the tested code without changing its behavior.
   Re-run the selector and record the result.

For UI-affecting work, follow
`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md`; source code
alone does not prove the user-visible result. The route's code review reads
the recorded Red and Green results. Classify its findings as
`.qfai/assistant/skill/qfai-implement/references/finding-classification.md`
says. A record correction follows `.qfai/assistant/rule/drift-protocol.md`.

## Align the other surfaces

Where the run recorded which of two disagreeing surfaces owns the truth, the
other surfaces follow it once the examples are done:

1. Change each surface that does not own the truth to match: documents, help
   text, comments, configuration defaults, and assistant text the project
   ships to others.
2. Move each test that pins the old wording or value to the new one. A test
   whose assertion would then check different behaviour is not moved here; it
   goes to its owner as a finding.
3. Run the project's generation or synchronisation command, where it has one,
   so generated copies match their source. Do not edit a generated file by
   hand.

Change nothing on the surface that owns the truth.

## Report

The stage report gives each example its own `### EX-NNNN-NNNN-NN` section with
the obligation, test path and selector,
RED, GREEN, and Refactor commands and observed results, and open findings.
Evidence without a command and result pair does not prove a gate.
A failing or unrun gate cannot be reported as PASS.

## Gate

The step is done for an example when its RED, GREEN and Refactor results are
observed and recorded. It is done for the flow when every example the
selection listed is done.
