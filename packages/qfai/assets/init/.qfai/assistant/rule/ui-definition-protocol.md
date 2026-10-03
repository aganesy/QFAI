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

2. **UI Contracts** (`<paths.contractsDir>/ui/*.yaml`, default `.qfai/spec/03_contract/ui/*.yaml`):
   the contracts whose rules cite the flow's examples
   - contract ID (`UI-NNNN`, in a file named `ui-NNNN-<slug>.yaml`)
   - screen ID
   - route
   - primary tasks
   - states
   - actions

3. **Brand SSOT**
   - root `DESIGN.md` (front-matter + `# Brand Philosophy` body), the only
     source of brand tokens

4. **Prototype handoff** (`.qfai/prototype/final/handoff.json`, when a
   prototyping loop ran): the final prototype, procurement and implementation
   notes

The paths that render a user-visible surface are declared by `uiux.surfacePaths`
in `qfai.config.yaml`, and nowhere else.

## Failure Rules

| Missing Definition               | Behavior                                                  |
| -------------------------------- | --------------------------------------------------------- |
| UI contract                      | Stop UI-bearing downstream execution                      |
| Root `DESIGN.md`                 | Return to `/qfai-sdd`, whose `common-design-md` writes it |
| Prototype handoff                | Return to `/qfai-prototyping` and record the handoff      |
| Discussion sidecar in downstream | Do not read it; normalize through `/qfai-sdd`             |

## Forbidden Fallbacks

- Do not infer downstream UI behavior from discussion-pack sidecars.
- Do not use retired design contract files.
- Do not use HTML mock sections as downstream source of truth.
- Do not treat a competitor reference as a selected design direction.
