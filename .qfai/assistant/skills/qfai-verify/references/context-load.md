# Step 0 — Load context

1. Read relevant **project steering** (if present):
   - `.qfai/assistant/catalog/structure.md`
   - `.qfai/assistant/catalog/tech.md`
   - `.qfai/assistant/catalog/product.md`
   - any additional file under `.qfai/assistant/catalog/`, and
     `manifest/agent-routing.yml` / `manifest/review-profiles.yml`. Not
     `manifest/agent-catalog.yml` whole — read the acting role's entry from it when a
     role needs one (`.qfai/assistant/constitution/constitution.md` Article III)

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/constitution/constitution.md`
   - `.qfai/assistant/constitution/workflow.md` (or equivalent)

3. Read existing artifacts for the current work item (if present):
   - `.qfai/specs/spec-*/`
   - `.qfai/contracts/`
   - `.qfai/evidence/`

Do not use discussion-pack artifacts as verification inputs. Verify reads normalized specs, contracts, and evidence only.

4. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing test patterns (unit/integration/e2e)
