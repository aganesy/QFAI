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

2. **UI contracts** (`<paths.contractsDir>/ui/`). Read the contracts whose
   business rules cite the flow's examples. A Markdown contract
   (`ui-NNNN-<slug>.md`) gives the responsibility, inputs, outcomes and business
   rules. Choose the route, regions and controls in the prototype or implementation.
   An existing YAML contract can also supply its declared screens, routes,
   actions and states, including the app frame where specified.

3. **Brand SSOT**
   - root `DESIGN.md` (front-matter + `# Brand Philosophy` body), the only
     source of brand tokens

4. **Prototype handoff** (`.qfai/prototype/final/handoff.json`, when a
   prototyping loop ran): the final prototype, procurement and implementation
   notes, or, for a `restyle` handoff, its `liveRoutes` (compare in the running
   app) and `entryPoints`

Legacy YAML supplements and structure describe copy; `npx qfai validate` does not check them.
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
