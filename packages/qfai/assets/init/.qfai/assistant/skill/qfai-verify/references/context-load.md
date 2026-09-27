# Step 0 — Load context

1. Read relevant **project steering** (if present):
   - `.qfai/spec/01_policy/objective.md`
   - `.qfai/spec/01_policy/initiative.md`
   - `.qfai/spec/03_contract/tech.md`
   - `.qfai/spec/03_contract/structure.md`
   - `.qfai/assistant/rule/agent-selection.md`. From
     `.qfai/assistant/rule/agent-selection.md` read the acting role's entry
     when a role needs one, not the whole file
     (`.qfai/assistant/rule/constitution.md` Article III)

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/rule/constitution.md`
   - `.qfai/assistant/rule/workflow.md` (or equivalent)

3. Read existing artifacts for the current work item (if present):
   - `.qfai/spec/02_business-flow/`
   - `.qfai/spec/03_contract/`
   - `.qfai/spec/decisions.md`
   - `.qfai/evidence/`

   Do not use discussion-pack artifacts as verification inputs. Verify reads normalized specs, contracts, and evidence only.

4. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing E2E, integration, API, and other test patterns; compare annotations to BF, AC, and EX obligations
