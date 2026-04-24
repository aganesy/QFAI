# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0017-0001: Mode invariant — obligations are identical except maxCycles
Scenario: Mode obligations differ only by maxCycles
  Given a prototyping surface declared in a UI-bearing spec
  When derivePrototypingObligations is called for mode "low-cost", "standard", and "full-harness"
  Then all returned obligation flags are identical across the three modes
  And only the "maxCycles" field differs: low-cost=1, standard=3, full-harness=20
  And browserTool is "playwright-cli" for all modes

# AC-0017-0002: Playwright CLI command plan is deterministic
Scenario: Command plan generated from screen contract
  Given a canonical screen contract with screenId, route, and primaryTasks
  And a target URL "http://localhost:5173"
  And cycle number 1
  When buildPlaywrightCliCommandPlan is invoked
  Then the plan contains commands in order: goto, snapshot, interaction*, screenshot, html
  And every output-producing command has an outputPath under ".qfai/evidence/prototyping/iterations/1/<screen-id>.*"
  And the result is deterministic for the same input

# AC-0017-0003: Evaluator review is tied to concrete evidence refs
Scenario: Evaluator review stores concrete artifact refs
  Given an AI evaluator sub-agent has reviewed cycle 1
  When the evaluator writes evaluator-review.json
  Then every score entry has a non-empty evidenceRefs array
  And each evidenceRef points to an existing screenshot, HTML, or snapshot file
  And QFAI validate rejects evidenceRefs containing placeholders like "tbd", "TBD", or empty strings

# AC-0017-0004: Review cycle completeness is verifiable
Scenario: prototyping.json fully describes a completed cycle
  Given a completed prototyping run with N cycles
  When a reviewer reads .qfai/evidence/prototyping.json
  Then the reviewer sees N cycles[] entries
  And each cycle has commandPlanRef, reviewBundleRef, evaluatorReviewRef, screenEvidence[], reviewerScores[]
  And bestOfHistory, breakthrough, and reviewerGate sections exist at the top level
  And allReviewerAxesPerfect100 is true for the cycle that claims completion

# AC-0017-0005: qfai prototyping prepare generates deterministic artifacts
Scenario: Prepare command creates review bundle and command plan
  Given a project with screens declared in .qfai/contracts/ui/*.yaml
  When the developer runs "qfai prototyping prepare --target-url http://localhost:5173 --mode standard --cycle 1"
  Then .qfai/evidence/prototyping/iterations/1/review-bundle.json is created
  And .qfai/evidence/prototyping/iterations/1/playwright-commands.json is created
  And the command does not invoke an AI evaluator
  And the command does not produce screenshots (evaluator does that)
  And the command exits with status 0

# AC-0017-0006: Legacy config keys cause load error
Scenario: Legacy browserProvider key is rejected
  Given a qfai.config.yaml with "prototyping.execution.browserProvider: playwright"
  When any QFAI command loads the config
  Then config load fails with a clear error message
  And the error message names the new key "browserTool: playwright-cli"
  And no silent aliasing occurs

# AC-0017-0007: Unified strictest gate — missing screenshot fails all modes
Scenario: Missing screenshot in low-cost mode is still an error
  Given a prototyping run in mode "low-cost"
  When one declared screen has no screenshot at the expected iteration path
  Then "qfai validate --profile prototyping --fail-on error" exits non-zero
  And the error is "QFAI-UIE-*" screenshot-missing
  And the severity is error (not warning)

# AC-0017-0008: Unified strictest gate — missing reviewer gate fails all modes
Scenario: Completion claim without reviewer PASS fails all modes
  Given a prototyping run in mode "standard" with completionClaimed=true
  And reviewerGate.result is not "PASS"
  When validate runs
  Then validate exits non-zero with a reviewerGate error
  And the same scenario in mode "low-cost" produces the same error

# AC-0017-0009: Mode invariant violation — maxCycles mismatch
Scenario: prototyping.json maxCycles does not match mode
  Given prototyping.json with mode.effective="standard" and maxCycles=20
  When validate runs
  Then validate emits QFAI-PROT-MODE-001
  And the message states "Expected maxCycles=3 for mode=standard, got 20"

# AC-0017-0010: No full-harness-only branches in validators
Scenario: executionPlan validator applies to all modes
  Given a prototyping run without execution plan in mode "low-cost"
  When validate runs
  Then validate emits QFAI-PROT-EXEC-PLAN-* (not QFAI-PROT-EXEC-PLAN-SKIPPED)
  And the severity is error

# AC-0017-0011: Playwright MCP remnants are absent
Scenario: No Playwright MCP templates in repo
  Given the repository at the current version
  When a scan is performed for "mcp-templates/playwright" or "playwright-mcp"
  Then zero references are found in packages/qfai and .qfai (except historical spec text)

# AC-0017-0012: Node Playwright direct invocation is removed
Scenario: No Node Playwright imports in production code
  Given the production source tree under packages/qfai/src
  When a scan for 'from "playwright"' or 'require("playwright")' is performed
  Then zero matches exist outside of test fixtures

# AC-0017-0013: Skill files are byte-identical across .qfai and packages/qfai/assets/init
Scenario: Skill is synced between runtime and asset tree
  Given .qfai/assistant/skills/qfai-prototyping/ and
    packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/
  When diff -r is run between the two directories
  Then zero differences are reported

# AC-0017-0014: Review bundle contains all 5 evaluator inputs
Scenario: review-bundle.json has required fields
  Given a cycle 1 prepare run
  When .qfai/evidence/prototyping/iterations/1/review-bundle.json is read
  Then the bundle contains screens[], axisDefs, designSystemChecklist, previousScore, commandPlanRef
  And missing any single field causes validate to emit QFAI-PROT-REVIEW-*

# AC-0017-0015: Completion requires best-of-history, breakthrough, and reviewer PASS in all modes
Scenario: Low-cost completion path is identical to full-harness
  Given a low-cost run where AI evaluator scored every axis 100
  When bestOfHistory is missing from prototyping.json
  Then validate emits an error tagged "bestOfHistory missing"
  And the same behavior holds for standard and full-harness modes
```
