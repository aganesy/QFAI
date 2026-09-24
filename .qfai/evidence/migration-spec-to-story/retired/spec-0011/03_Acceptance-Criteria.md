# 03 Acceptance Criteria

## AC-0011-0001: TDD Cycle Completeness

```gherkin
Scenario: TDD Cycle Completeness
  Given an EX that no test annotates on the story tree
  When `/qfai-implement` takes that EX
  Then it runs Red, Green and Refactor with evidence at each phase
  And the test it writes carries `QFAI:EX-NNNN-NNNN-NN`
  And no ledger status is written
```

## AC-0011-0003: QA Gatekeeper Sole Authority

```gherkin
Scenario: QA Gatekeeper Sole Authority
  Given a RED observation by an implementation worker
  When confirmation is needed
  Then only qa-gatekeeper may confirm the observation; self-certification is rejected.
```

## AC-0011-0005: Parallel Dispatch Authorization

```gherkin
Scenario: Parallel Dispatch Authorization
  Given a request for parallel execution
  When delivery-planner evaluates
  Then it authorizes only when all allow conditions are met and no deny conditions exist.
```

## AC-0011-0006: Completion Gate Enforcement

```gherkin
Scenario: Completion Gate Enforcement
  Given an implemented EX with test-first, RED, GREEN and refactor evidence
  When checking completion
  Then qa-gatekeeper has confirmed RED and GREEN
  And completion-reviewer and implementation-reviewer have each returned PASS
  And checkpoint verification has passed without writing a ledger status.
```

## AC-0011-0007: Fresh Evidence Required

```gherkin
Scenario: Fresh Evidence Required
  Given a TDD item
  When evidence is checked
  Then both RED and GREEN evidence include exact command + result; status-only evidence is rejected.
```

## AC-0011-0008: Completed Items Skipped

```gherkin
Scenario: Completed Items Skipped
  Given every EX in scope is annotated by a test or exempted by a `Test exception:` row in force
  And the scoped `tdd` validate result is current
  When `/qfai-implement` runs
  Then it reports "nothing to do" and exits

Scenario: Stale or missing validation blocks completion
  Given every EX in scope is annotated or exempted
  And the scoped validate result is missing, stale, or from a profile other than `tdd`
  When `/qfai-implement` checks completion
  Then it stops and reports the validate command, exit code and output
  And it does not report "nothing to do"
```

## AC-0011-0010: Design System As Deterministic DESIGN.md Mirror

```gherkin
Scenario: Design System As Deterministic DESIGN.md Mirror
  Given `extractedDesignSystem` resolves to `<paths.contractsDir>/design/design-system.yaml`
  When `/qfai-implement` reads token tables
  Then those tables are byte-equivalent to the parsed token tables of root `DESIGN.md` (color / typography / radius / shadow). The mirror invariant is enforced at validate time by the design contract validators owned by spec-0004.
```

## AC-0011-0011: Minimal Code In Phase Green

```gherkin
Scenario: Minimal Code In Phase Green
  Given a failing test
  When Phase Green writes production code for it
  Then the code written is the least that makes that test pass, and behaviour no test yet demands is not generalized ahead of its own RED.
```

## AC-0011-0012: Gate Commands From the Contract Directory

```gherkin
Scenario: Gate Commands From the Contract Directory
  Given a project on the story tree
  When `/qfai-implement` needs a Test, Lint, Typecheck or Build command
  Then it takes the command from the Standard commands section of `<paths.contractsDir>/tech.md` and from no other file.
```

## AC-0011-0013: Exempted Examples Are Not Selected

```gherkin
Scenario: Exempted Examples Are Not Selected
  Given a project on the story tree and an EX that no test annotates, named by a `decisions.md` row whose Content opens `Test exception:`
  When `/qfai-implement` selects its next test
  Then the EX is skipped while that row's Status is DONE, and is selected like any other unannotated EX while the row is TODO or WIP.
```

## AC-0011-0014: Shipped Minimal-Implementation Rule Drops TC and the Ledger

```gherkin
Scenario: Shipped Minimal-Implementation Rule Drops TC and the Ledger
  Given a project on the story tree
  When § 2 of the shipped rule `minimal-implementation.md` is read
  Then it restates the traceability chain of the constitution's Article V with no TC hop and names no execution ledger, and it defines an observation as an EX row in a story's `03_Example.md` under `<paths.specsDir>`.
```

## AC-0011-0015: Scoped Validate Gate Runs Per Business Flow

```gherkin
Scenario: Scoped Validate Gate Runs Per Business Flow
  Given a project on the story tree
  When `/qfai-implement` runs a checkpoint verification or its completion gate
  Then the scoped validate run is `qfai validate --profile tdd --fail-on error --flow BF-NNNN` for the flow the invocation owns, and it runs no `--spec` validation.
```

## AC-0011-0016: Consume the Current Prototype Handoff

- US-Refs: US-0011-0007

```gherkin
Scenario: Read implementation inputs from DCON-008
  Given a current DCON-008 `prototype-handoff.yaml` with `imageSources[]` provenance
  When `/qfai-implement` starts work from that handoff
  Then it reads `finalArtifact` as the final prototype artifact
  And it reads `extractedDesignSystem` as the deterministic design-system input
  And it does not require an exactly-four-field schema or the retired `mustPreserve`, `mayAdapt` and `mustNotCopy` fields
```
