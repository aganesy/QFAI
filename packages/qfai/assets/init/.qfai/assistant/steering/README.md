# steering/

Project context for the AI. Keep these files up to date.

These are intentionally short and practical:

- `product.md` : what we are building and why
- `tech.md` : stack, versions, constraints
- `structure.md` : repo structure, key directories, how to run gates
- `manifest.md` : product-level decision spine and governance rubric

QFAI prompts are expected to read these before producing deliverables.

Rule:

- Keep steering flat (no subdirectories).
- Markdown only.

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

### Default AI-managed flow (recommended)

1. Run a QFAI command (e.g., `/qfai-require`, `/qfai-spec`, `/qfai-implement`).
2. The agent loads `steering/*` and fills missing placeholders from **repo evidence**.
3. If evidence is missing, write `TBD` and add an Open Question (what evidence is required).
4. Optionally, review changes via PR if your team requires human approval.
