# UI Definition Consumption Protocol

How a downstream skill reads a UI definition, and what it may not read.

## Boundary

`/qfai-sdd` alone reads the discussion sidecar artifacts (`discussion-*/uiux/`) and normalizes them into the specs and contracts that downstream execution runs against.

`/qfai-prototyping`, `/qfai-atdd`, `/qfai-implement` and `/qfai-verify` do not read a discussion pack. They read the UI and UX definition from specs, contracts and evidence.

## Reading Order

A downstream skill reads the UI definition in this order.

1. **Specs** (`.qfai/specs/spec-*/`)
   - `01_Spec.md`
   - `03_Acceptance-Criteria.md`
   - `05_Examples.md`
   - `06_Test-Cases.md`

2. **UI Contracts** (`.qfai/contracts/ui/*.yaml`)
   - screen ID
   - route
   - primary tasks
   - states
   - actions

3. **Brand SSOT**
   - root `DESIGN.md` (front-matter + `# Brand Philosophy` body)
   - `.qfai/contracts/design/DESIGN.md.lock.yaml` (frozen sha256 + token schema)
   - `.qfai/contracts/design/design-system.yaml` (post-loop token mirror)
   - `.qfai/contracts/design/prototype-handoff.yaml` (post-loop handoff facts)

4. **Evidence** (`.qfai/evidence/**`)
   - prototyping screenshots / HTML / snapshots / command logs
   - evaluator reviews
   - implementation and verification evidence

## Failure Rules

| Missing Definition               | Behavior                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| UI contract                      | Stop UI-bearing downstream execution                       |
| Pre-prototyping design contract  | Return to `/qfai-sdd` and normalize contracts              |
| Post-prototyping design contract | Return to `/qfai-prototyping` and extract winner artifacts |
| Discussion sidecar in downstream | Do not read it; normalize through `/qfai-sdd`              |

## Forbidden Fallbacks

- Do not infer downstream UI behavior from discussion-pack sidecars.
- Do not use retired design contract files.
- Do not use HTML mock sections as downstream source of truth.
- Do not treat a competitor reference as a selected design direction.
