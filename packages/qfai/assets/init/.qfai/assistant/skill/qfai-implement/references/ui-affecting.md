# UI Affecting Examples

## Inputs

Read the UI surface paths `uiux.surfacePaths` declares in qfai.config.yaml, and resolve paths.contractsDir from the same file. Read every UI contract under its ui/ directory, and the root DESIGN.md if present for the brand tokens.
When a prototyping loop ran in this checkout, read its handoff at .qfai/prototype/final/handoff.json: the final prototype, its procurement and the implementation notes.
Read the flow, story, acceptance criterion, and example that the implementation changes.

## Routing

An example is UI affecting when its observed behavior includes a rendered surface, it changes a UI contract, its
production or test change implements behavior described by a UI contract, or a changed path matches a declared UI
surface path. Follow imports, component use, and contract references to check a changed path. A change to a shared
component is UI affecting when a rendered surface consumes it.

If `uiux.surfacePaths` is absent or the path relationship is uncertain, use the observed
behavior and UI contracts; route an unresolved case as UI affecting and record the uncertainty for
product-surface-reviewer. Do not infer that a change has no UI effect from its directory name alone.

## Evidence

For a UI affecting example, report the screen state, action, expected and observed result, and a capture or rendered artifact. The artifact must identify the source revision. In the stage review, product-surface-reviewer judges each UI affecting example, its UI contracts, and its captured state. The review verdict refers to that revision.

If the implementation or capture changes after the verdict, refresh the capture and review. A passing code test cannot substitute for the visual and interaction evidence that the acceptance criterion requires.
