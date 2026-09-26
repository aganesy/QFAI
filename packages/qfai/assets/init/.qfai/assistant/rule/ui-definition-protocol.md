# UI Definition Consumption Protocol

How a downstream skill reads a UI definition, and what it may not read.

## Boundary

`/qfai-sdd` alone reads the discussion sidecar artifacts (`discussion-*/uiux/`) and normalizes them into the specs and contracts that downstream execution runs against.

`/qfai-prototyping`, `/qfai-atdd` and `/qfai-verify` do not read a discussion pack. They read the UI and UX definition from the story tree, contracts and evidence.

## Reading Order

A downstream skill reads the UI definition in this order.

1. **Story tree** (`<paths.specsDir>/02_business-flow/`)
   - `business-flows.md`
   - `business-flow-NNNN/business-flow.md`
   - `business-flow-NNNN/user-story-NNNN-NNNN/01_User-story.md`
   - `business-flow-NNNN/user-story-NNNN-NNNN/02_Acceptance-Criteria.md`
   - `business-flow-NNNN/user-story-NNNN-NNNN/03_Example.md`

2. **UI Contracts** (`<paths.contractsDir>/ui/*.yaml`, default `.qfai/spec/03_contract/ui/*.yaml`)
   - screen ID
   - route
   - primary tasks
   - states
   - actions

3. **Brand SSOT**
   - root `DESIGN.md` (front-matter + `# Brand Philosophy` body)
   - `<paths.contractsDir>/design/DESIGN.md.lock.yaml` (frozen sha256 + token schema)
   - `<paths.contractsDir>/design/design-system.yaml` (post-loop token mirror)
   - `<paths.contractsDir>/design/prototype-handoff.yaml` (post-loop handoff facts)

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
