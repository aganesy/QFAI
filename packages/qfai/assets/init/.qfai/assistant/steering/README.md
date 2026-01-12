
# steering/
Project context for the AI. Keep these files up to date.

These are intentionally short and practical:
- `product.md`   : what we are building and why
- `tech.md`      : stack, versions, constraints
- `structure.md` : repo structure, key directories, how to run gates

QFAI prompts are expected to read these before producing deliverables.
## AI-managed policy (recommended)
These steering files are intended to be **filled and refreshed by the AI** (via QFAI custom prompts).
Humans may edit them, but the default workflow is:
- run a QFAI command (e.g., /qfai-require, /qfai-spec, /qfai-implement)
- the agent analyzes the repository and updates steering if placeholders exist

Guideline:
- do not invent facts; if unknown, write `TBD` with missing evidence

## Evidence-first writing (recommended)
Steering MUST be grounded in repo evidence. When possible, include:
- file paths (e.g., `package.json`, `.github/workflows/ci.yml`)
- commands (e.g., `pnpm -C packages/qfai test`)
- directory anchors (e.g., `packages/qfai/src/cli`)

If a fact cannot be verified, mark it as `TBD` and record what evidence is missing.
