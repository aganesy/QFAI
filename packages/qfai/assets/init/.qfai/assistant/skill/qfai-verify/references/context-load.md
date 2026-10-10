# Step 0 — Load context

`<paths.specsDir>` and `<paths.contractsDir>` are the directories `qfai.config.yaml` sets.

1. Read relevant **project policy** (if present):
   - `<paths.specsDir>/01_policy/objective.md`
   - `<paths.specsDir>/01_policy/initiative.md`
   - `<paths.specsDir>/01_policy/principle.md`
   - `<paths.contractsDir>/tech.md`
   - `.qfai/assistant/rule/agent-selection.md`. From
     `.qfai/assistant/rule/agent-selection.md` read the acting role's entry
     when a role needs one, not the whole file
     (`.qfai/assistant/rule/constitution.md` Article III)

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/rule/constitution.md`
   - `.qfai/assistant/rule/workflow.md` (or equivalent)

3. Read existing artifacts for the current work item (if present):
   - `<paths.specsDir>/02_business-flow/`
   - `<paths.contractsDir>/`
   - `<paths.specsDir>/decisions.md`

   Do not use discussion-pack artifacts as verification inputs. Verify reads normalized specs, contracts, tests and code only.

4. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing E2E, integration, API, and other test patterns; compare annotations to BF, AC, and EX obligations
