# UI Definition Consumption Protocol

How a downstream skill reads a UI definition, and what it may not read.

## Boundary

`/qfai-sdd` alone reads the screens, the brand direction and the design inputs from the deliberation record it consumes, and writes them into the specs, the UI contracts and root `DESIGN.md` that downstream execution runs against.

`/qfai-prototyping`, `/qfai-implement` and `/qfai-verify` do not read a deliberation record for the UI definition. They read the UI and UX definition from the story tree, contracts and evidence.

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
   - supplements and structure, when written: a description of the copy and the
     groups the screen is read in

3. **Brand SSOT**
   - root `DESIGN.md` (front-matter + `# Brand Philosophy` body), the only
     source of brand tokens

4. **Prototype handoff** (`.qfai/prototype/final/handoff.json`, when a
   prototyping loop ran): the final prototype, procurement and implementation
   notes, or, for a `restyle` handoff, its `liveRoutes` (compare in the running
   app) and `entryPoints`

The supplements and structure describe copy; `npx qfai validate` does not check them.
What it checks is the UI source: every plain text there carries a `qfai-text`
reason comment (`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md`).

The paths that render a user-visible surface are declared by `uiux.surfacePaths`
in `qfai.config.yaml`, and nowhere else.

## Failure Rules

| Missing Definition                             | Behavior                                                  |
| ---------------------------------------------- | --------------------------------------------------------- |
| UI contract                                    | Stop UI-bearing downstream execution                      |
| Root `DESIGN.md`                               | Return to `/qfai-sdd`, whose `common-design-md` writes it |
| Prototype handoff, when a prototyping loop ran | Return to `/qfai-prototyping` and record the handoff      |
| Deliberation record in downstream              | Do not read it; normalize through `/qfai-sdd`             |

## Forbidden Fallbacks

- Do not infer downstream UI behavior from a deliberation record.
- Do not use HTML mock sections as downstream source of truth.
- Do not treat a competitor reference as a selected design direction.
