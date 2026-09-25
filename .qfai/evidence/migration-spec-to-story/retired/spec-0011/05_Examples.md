# 05 Examples

## EX-0011-0001: Normal TDD Cycle

- BR-Ref: BR-0011-0003
- Given an EX that no test annotates on the story tree
- When implement writes a failing test, observes RED, writes minimal code, observes GREEN and refactors
- Then the test carries `QFAI:EX-NNNN-NNNN-NN`, each phase keeps its evidence, and no ledger status is written

## EX-0011-0017: QA Gatekeeper Confirms RED and GREEN

- BR-Ref: BR-0011-0015
- Given an implementation worker has observed RED and GREEN
- When those observations are submitted for confirmation
- Then qa-gatekeeper confirms them and the worker cannot self-certify

## EX-0011-0018: Reviewers Approve Completion

- BR-Ref: BR-0011-0006
- Given an implemented EX has phase evidence and checkpoint verification
- When completion is considered
- Then completion-reviewer and implementation-reviewer both return PASS before completion

## EX-0011-0019: Completed Scope Has Nothing To Do

- BR-Ref: BR-0011-0010
- Given every scoped EX is annotated by a test or has a DONE `Test exception:` decision
- When the current scoped TDD validation passes and implement runs
- Then it reports "nothing to do" without reading or writing a ledger status

## EX-0011-0002: Backward Transition Blocked

- BR-Ref: BR-0011-0002
- Given TDD-0002 with status `green`
- When transition to `red` is attempted
- Then error "Backward transition prohibited: green -> red" is produced

## EX-0011-0003: Exception Without DR-ID

- BR-Ref: BR-0011-0002
- Given TDD-0003 transitioning to `exception`
- When DR-ID column is empty
- Then error "exception status requires DR-ID in DR-ID column" is produced

## EX-0011-0004: Stale Evidence Rejected

- BR-Ref: BR-0011-0005
- Given TDD-0004 with evidence from a previous run
- When completion is checked
- Then stale evidence is rejected and fresh evidence is required

## EX-0011-0005: Parallel Dispatch Denied

- BR-Ref: BR-0011-0001
- Given two items that both write the same shared fixture/mock file, or that
  mutate the same fixture instance
- When delivery-planner evaluates
- Then parallel dispatch is denied (the concurrent write violates independence)
- And the mere existence of a shared read-only fixture module, which neither
  item writes and each consumes as-is, is not a deny on its own

## EX-0011-0006: Minimal Code For The One Failing Test

- BR-Ref: BR-0011-0004
- Given a failing test that asserts one field of a response
- When Phase Green writes production code for it
- Then that field is what the code adds, and a second case no test asks for is not generalized ahead of its own RED

## EX-0011-0007: Reviewer Separation Before `done`

- BR-Ref: BR-0011-0006
- Given the implementation worker that wrote the item
- When the item is put forward for `done`
- Then `completion-reviewer` and `implementation-reviewer` each return PASS first, and the worker's own approval is neither of them

## EX-0011-0009: Design System Mirror Read

- BR-Ref: BR-0011-0008
- Given `extractedDesignSystem` points to `<paths.contractsDir>/design/design-system.yaml` whose tables match root `DESIGN.md` byte-for-byte after parse normalization
- When `/qfai-implement` consumes the token tables
- Then the consumed tables equal the parsed root `DESIGN.md` tables; any drift is surfaced through the design contract validators

## EX-0011-0010: Gate Commands Come From tech.md

- BR-Ref: BR-0011-0009
- Given a project on the story tree whose `<paths.contractsDir>/tech.md` lists `pnpm test`, `pnpm lint` and `pnpm typecheck` in its Standard commands section and no Build command, and whose `package.json` also defines a `build` script
- When `/qfai-implement` needs its Test, Lint, Typecheck and Build commands
- Then it runs `pnpm test`, `pnpm lint` and `pnpm typecheck` as listed in that section, and it does not take a Build command from `package.json` or invent one

## EX-0011-0011: A Test Exception in Force Skips Its Example

- BR-Ref: BR-0011-0010
- Given a project on the story tree with two EXs that no test annotates, the first named by a `decisions.md` row whose Content opens `Test exception:` at Status DONE, and the second named by another such row at Status WIP
- When `/qfai-implement` selects its next test
- Then it skips the first EX and selects the second, as it would any unannotated EX

## EX-0011-0012: The Next Test Is the Lowest Unannotated Example

- BR-Ref: BR-0011-0001
- Given a project on the story tree and a story whose EXs have the tails `01`, `02` and `03`, where an existing test already carries the annotation for tail `01`
- When `/qfai-implement` selects its next test
- Then it selects the EX with tail `02`, writes one test for it carrying `QFAI:EX-NNNN-NNNN-NN`, and reaches tail `03` only after that; no ledger file is read or written to decide the order

## EX-0011-0013: The Shipped Rule Restates Article V Without TC or a Ledger

- BR-Ref: BR-0011-0011
- Given a project on the story tree and the shipped rule `minimal-implementation.md`
- When § 2 is read
- Then it restates the constitution's Article V chain instead of spelling a chain of its own, the chain has no TC hop, and no execution ledger appears among the obligations the rule keeps

## EX-0011-0014: An Observation Is an Example Row

- BR-Ref: BR-0011-0012
- Given a project on the story tree whose `qfai.config.yaml` sets `paths.specsDir: docs/specs`
- When § 2 of the shipped rule `minimal-implementation.md` is read for where an observation is recorded
- Then it names an EX row in a story's `03_Example.md`, found under `docs/specs` by resolving `paths.specsDir`, and not a test-case row in `06_Test-Cases.md`

## EX-0011-0015: The Scoped Validate Gate Runs Per Business Flow

- BR-Ref: BR-0011-0013
- Given a project on the story tree and a `/qfai-implement` invocation that owns the flow `BF-NNNN`
- When it runs a checkpoint verification and then its completion gate
- Then both run `qfai validate --profile tdd --fail-on error --flow BF-NNNN`, and neither passes `--spec <spec-id>`, which exits 2 on that tree

## EX-0011-0016: A Missing or Stale Validate Result Stops Selection

- BR-Ref: BR-0011-0014
- Given a story-tree flow with an unannotated EX and a scoped validate run whose result file is missing, predates that run or has a profile other than `tdd`
- When `/qfai-implement` selects its next test
- Then it stops and reports the validate command, exit code and output for each condition; it never reports "nothing to do"

## EX-0011-0020: Implementation Reads the Current Prototype Handoff

- BR-Ref: BR-0011-0016
- Given a current DCON-008 `prototype-handoff.yaml` with a final artifact, deterministic design-system input, and `imageSources[]` provenance
- When `/qfai-implement` consumes the handoff
- Then it reads `finalArtifact` and `extractedDesignSystem` without requiring an exactly-four-field schema or any `mustPreserve`, `mayAdapt` or `mustNotCopy` field
