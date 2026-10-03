---
name: atdd-author
owner: qfai-atdd
purpose: "Write the business flow's E2E and acceptance-criterion tests, observe each fail at its assertion, and hand them to implementation."
requires: [common-grilling-record, common-evidence-record, common-gate-run]
roles:
  - delivery-planner
  - acceptance-test-engineer
  - devops-ci-engineer
  - qa-gatekeeper
  - completion-reviewer
  - implementation-reviewer
routing-profile: runtime-heavy
---

# atdd-author

Turns the placeholders and obligations `atdd-scaffold` settled into tests
that check behaviour, proves each one can fail, and hands the flow to
`/qfai-implement`.

## Reads

- The obligations, layers, test paths and grilling block `atdd-scaffold`
  recorded in `.qfai/evidence/atdd-BF-NNNN.md`.
- The flow's stories, acceptance criteria and owning contracts under
  `paths.specsDir`.
- The worker session setup `atdd-credentials` wrote, when a test needs an
  authenticated actor.

## Writes

- BF and AC tests at their required layers.
- RED or falsifiability records, the handoff entry and the gate result in
  `.qfai/evidence/atdd-BF-NNNN.md`, kept as `common-evidence-record` says.
  The annotated tests carry the coverage.

## Ownership and annotation

| Obligation           | Test home              | Required annotation    | Author            |
| -------------------- | ---------------------- | ---------------------- | ----------------- |
| Business flow        | E2E                    | `QFAI:BF-NNNN`         | `/qfai-atdd`      |
| Acceptance criterion | Integration or API     | `QFAI:AC-NNNN-NNNN-NN` | `/qfai-atdd`      |
| Example              | Every other test layer | `QFAI:EX-NNNN-NNNN-NN` | `/qfai-implement` |

An E2E test carries its flow annotation. An integration or API test carries
its AC annotation. A BF annotation outside E2E, or an AC or EX annotation in
E2E, is misplaced. Contract references and business rules define assertions,
but contract IDs are not coverage annotations. Unit and component tests belong
to `/qfai-implement`. Each test needs an observable assertion; an annotation
or a generated placeholder alone never proves behavior.

An exception is a DONE row in the applicable `decisions.md` table
naming the BF or AC. Never invent a waiver in the test or suppress a finding.

## Procedure

1. Replace each placeholder with a real assertion. Author a failing
   acceptance test before the behavior that makes it pass, where observable.
2. Run the selected test with the Test command `common-gate-run` names, and
   capture the command, assertion failure and revision in the evidence file.
   A load error or broken fixture is not a RED proof. For an already
   implemented surface, use a controlled falsifiability check and restore the
   mutation. The whole record is
   `.qfai/assistant/skill/qfai-atdd/references/red-provenance.md`. When a RED
   record is retaken after a test or fixture edit, read
   `.qfai/assistant/skill/qfai-implement/references/evidence-revision.md`; it
   holds the revision form for the new attempt. Not needed for a first record.
3. A shared fixture change needs the affected tests rerun and their
   provenance updated; see
   `.qfai/assistant/skill/qfai-atdd/references/shared-test-artifacts.md`.
4. Hand each test over once its proof is captured (below).
5. Run the validate gate below through `common-gate-run`.

### RED at the assertion

A stage result reports `expected_red` only for a failure at the intended
assertion. The failure kind goes in `red.failureKind`.

| Failure kind | Reported as          |
| ------------ | -------------------- |
| `assertion`  | `expected_red`       |
| `collection` | `unrun` or `blocked` |
| `import`     | `unrun` or `blocked` |
| `startup`    | `unrun` or `blocked` |
| `timeout`    | `unrun` or `blocked` |

A failure of any kind but `assertion` is never `expected_red`.

### The seam round trip

1. A test that cannot reach its assertion for want of a route, an export or a
   module is returned `needs_repair` with a seam request (`seamRequest`)
   naming that test.
2. After the seam-only result is accepted, the same acceptance stage instance
   runs as a new attempt and takes RED at the assertion.
3. Only then is the full implementation handed on.

No second run starts: the round trip stays inside the run.

## Passes when

Read first: the BF and AC obligations in scope, and the tests that annotate
them. The step passes when every BF of the bound flow already has an
annotating E2E test and every AC one at the integration or API layer, each with
an observable assertion, or a DONE exception row exempts the item. The pass
names the test that discharges each obligation. A pass while an obligation has
no annotating test at its layer is refused.

## Grilling on detection

A contradiction, missing acceptance case, or technical obstacle met while
authoring opens the on-detection session that
`.qfai/assistant/step/atdd-scaffold/STEP.md#grilling-mandatory` declares.
Record it in the invocation's block with `common-grilling-record`.

## Findings another flow owns

Report repo-wide findings attributed to another flow with their owner; do not
claim repository-wide PASS from one flow's result. See
`.qfai/assistant/skill/qfai-atdd/references/cross-spec-obligations.md`.

Inside a run, when the scoped gate passes and names findings another flow
owns, the stage returns outcome `accepted_with_debt`, with one `debts` entry
per finding naming its `owningFlow` and its `resolvingOwner`. A finding with no
named owner is not handed on as a debt: name the owner first, or report the
finding as this flow's own.

## Handoff

Write a handoff entry in `.qfai/evidence/atdd-BF-NNNN.md` naming BF and AC
IDs, test paths and selectors, commands and outcomes, evidence paths,
unresolved findings and implementation work. Follow
`.qfai/assistant/skill/qfai-atdd/references/stage-handover.md`.

## Review

- The acceptance test engineer authors the tests.
- The delivery planner rules on whether a selector covers enough of its
  obligation, before its RED is submitted.
- The qa-gatekeeper checks the observed RED or falsifiability proof.
- The completion reviewer checks flow coverage and evidence independently.

An author cannot certify their own tests.

The reviewers check the active BF's test layers, observable assertions,
RED/GREEN evidence, and handoff. The review pack, its seal and the rounds a
blocking finding opens are `common-review-cycle`'s; the round entries go in
the RED record for the BF or AC under
`.qfai/assistant/skill/qfai-atdd/references/red-provenance.md`.

## Gate

The step may report PASS only when:

1. Every BF and AC obligation in scope has an executed, behavior-checking test
   at its required layer, or a valid DONE decision exception.
2. The flow's ATDD evidence is current and names the test command, selected
   tests and observed result.
3. Routed reviewers and qa-gatekeeper passed the current work, with no
   blocking finding remaining.
4. `npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
   error owned by this flow. Residual findings elsewhere have named owners.

Report changed tests, BF and AC coverage, commands and outcomes, review
decisions, open risks and the implementation handoff. `/qfai-implement` owns
EX tests and production behavior; `/qfai-verify` runs the repository gate.
