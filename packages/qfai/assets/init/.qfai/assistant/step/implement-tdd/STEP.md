---
name: implement-tdd
owner: qfai-implement
purpose: "Select each owed example of one business flow from a fresh validator result, take it through an observed Red, Green and Refactor cycle, and align every surface that does not own the truth."
requires:
  - common-gate-run
  - common-grilling-record
roles:
  - delivery-planner
  - test-design-analyst
  - qa-strategist
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
routing-profile: default
---

# implement-tdd

Work within one `BF-NNNN` flow. An EX is the unit of implementation review;
the BF is the unit of scoped completion. Inside a workflow run, a work order
whose `target` binds a flow supplies the flow, and no question asks which flow.
Otherwise the invocation's BF argument names it.

## Passes when

Read first: a fresh validate result for the flow. The step passes when it
reports no owed example, so no example needs a Red, Green and Refactor cycle.
The pass names the validate run.

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
the one scope gap that raises no change request and adds no EX here: an EX that
states the case is worked as an EX no test annotates, and where none does,
`/qfai-sdd` adds it.

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
   states. Obtain Test, Lint, Typecheck, and Build commands only from that
   section, and run each gate with `common-gate-run`. Read its
   `## Architecture` table too: place each new module in one layer, and
   import only from the layers that layer's row lists.
3. Find the flow's acceptance tests by their `QFAI:BF-NNNN` and
   `QFAI:AC-NNNN-NNNN-NN` annotations. `implement-scaffold` wrote them with
   empty bodies; an empty body proves no behaviour, and its body is
   `implement-acceptance`'s to write.
4. Check test roots, `validation.traceability.testFileGlobs`, and
   exclusions. An EX test must be collected by the runner and by validation.
   A test with only an annotation or placeholder is not behavioral proof.
5. Prove each runnable entrypoint the flow depends on before its first
   example, under
   `.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md`.

## Grilling (MANDATORY)

Article IX of `.qfai/assistant/rule/constitution.md` owns the two sessions
this stage may run; `.agents/rules/grilling.md` owns the method.
Neither is restated here. Both sessions are delegated. Critical decisions go
to the user; other decisions follow the recorded griller recommendation.

- **At the preflight.** Open a session for unresolved implementation choices.
  Record `confidence high` when there was no session to open.
- **On detection.** Stop and open a session when a contradiction, missing
  behavior case, or technical obstacle appears during implementation.
- **Neither session changes settled input.** Route a needed story or contract
  change through `.qfai/assistant/rule/drift-protocol.md`; the run solves
  local obstacles.

Record the sessions with `common-grilling-record`. Do not reopen settled requirements as
implementation preferences.

## Select the next example

Start each selection by running
`npx qfai validate --profile tdd --flow BF-NNNN`. Record the run start time.
Read its `validate.flow-<ids>.json` result even when the command exits
nonzero. The result is usable only when the file exists, `profile` is
`tdd`, and `generatedAt` is no earlier than this run start. If any check
fails, stop and report the command, exit result, and missing or stale field;
never infer that the flow has no remaining work. `common-gate-run` states how
the JSON result is read.

Take the lowest EX ID among that result's **test-obligation EX findings**.
The validator owns the obligation predicate, including decision exceptions;
do not reconstruct it in this step. A caller that names several EX IDs works
each named ID serially after confirming each is in the current flow and is
owed. Re-run validation before selecting the next unassigned EX. When there
is no such finding, this step ends and `implement-checkpoint` runs. Report any
other finding with its owner; a clean EX selection alone is not a PASS.

Inside a workflow run, the stage runs that validation itself at every stage
start and selects from its result, never from an earlier stage's result. A
stage that resumes starts at the example its work order's `checkpointRef`
names, and the procedure order is unchanged on resume. The result names EX IDs and records no progress state of its own: a
test annotating an example is what says the example is done.

See `.qfai/assistant/skill/qfai-implement/references/cross-spec-ownership.md`
for changes that touch another flow and
`.qfai/assistant/skill/qfai-implement/references/parallelization-policy.md`
for independently owned
slices. Work one EX at a time by default. Parallel work requires disjoint
writes, a passing technical gate, and the required user consent. Review the
integrated result after slices join.

## Red, Green, Refactor

For the selected EX, create or strengthen a test in a non-acceptance layer and
annotate it `QFAI:EX-NNNN-NNNN-NN`. Preserve the BF E2E and AC integration
or API tests `implement-scaffold` wrote. Put the test where the observable
behavior belongs. Use
`.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md` and
`.qfai/assistant/skill/qfai-implement/references/oracle-strength.md` to choose
the smallest useful seam and a falsifiable assertion.

1. **Red:** Run the smallest applicable Test command from `tech.md`.
   Observe the assertion fail for the intended behavior before changing
   production code. A load error, missing dependency, or broken fixture is
   not an admissible RED. Record command, selector, failure, test hash, and
   revision. Follow
   `.qfai/assistant/skill/qfai-implement/references/red-admissibility.md` and
   `.qfai/assistant/skill/qfai-implement/references/red-not-observable.md`
   when existing behavior prevents an ordinary RED.
2. **Green:** Write the minimum production code that makes this test pass.
   Do not generalize to an untested case. Minimal is measured against the
   example's obligation, not the test's inputs: a value hard-coded to match
   the test meets neither
   (`.qfai/assistant/rule/test-layers.md#a-passing-test-is-not-the-solution`).
   Run the same selector and record
   command, outcome, and revision. Failures outside the selected EX receive
   an owner and a repair path.
3. **Refactor:** Improve the tested code without changing its behavior.
   Re-run the selector and affected tests, then applicable Lint, Typecheck,
   and Build commands from `tech.md`. Record each command and result.
   A failing or unrun gate cannot be reported as PASS.

The qa-gatekeeper checks the observed RED and GREEN evidence of each example
as it is taken: RED before any production code for the example exists, GREEN
before Refactor. It is blocking there, because neither observation can be made
later. The implementation-reviewer checks code and tests. Route UI-affecting work to
the product-surface-reviewer under
`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md`, and review
rendered HTML or screenshots at desktop and mobile sizes against `DESIGN.md`
and the UI contracts; source code alone does not prove the user-visible
result. They review once, at the end of the stage, as
[Stage review](#stage-review) states. Use
`.qfai/assistant/skill/qfai-implement/references/relevant-test-suite.md` for
affected suite selection. A reviewer
REVISE follows `.qfai/assistant/rule/review-convergence.md`: fix or answer each
finding and record the disposition, with no re-review. The author does not certify their own result.

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
RED, GREEN, and Refactor commands and observed results, revisions,
reviewer verdicts, and open findings.
Evidence without a command and result pair does not prove a gate.

## Stage review

The stage is reviewed once, after its last step, through `common-review-cycle`,
over every example the stage implemented: the code review, by the
implementation-reviewer, with the qa-gatekeeper for the recorded RED and GREEN
evidence and the product-surface-reviewer where an example is UI-affecting.

The review request identifies the BF, every EX the stage implemented, the
revision and the requested reviewers.
Each reviewer reads the same final revision.
Classify findings as
`.qfai/assistant/skill/qfai-implement/references/finding-classification.md`
says. A blocking REVISE is fixed or answered for the examples it names, with no re-review.
A record correction follows `.qfai/assistant/rule/drift-protocol.md`.
Record explicit PASS or REVISE for the current revision.

## Gate

The step is done for an example when its RED, GREEN and Refactor results are
observed and recorded, and the qa-gatekeeper passed its RED and GREEN. It is
done for the flow when a fresh selection finds no owed example;
`implement-checkpoint` then closes the flow, and the stage review follows.
