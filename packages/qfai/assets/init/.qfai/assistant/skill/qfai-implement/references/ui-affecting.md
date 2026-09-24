# UI Affecting Examples

## Inputs

Resolve paths.contractsDir from qfai.config.yaml. Read the optional UI surface paths section of its structure.md, every UI contract under its ui/ directory, the root DESIGN.md if present, and the design files under its design/ directory. Read the flow, story, acceptance criterion, and example that the implementation changes.

## Routing

An example is UI affecting when its observed behavior includes a rendered surface, it changes a UI contract, its
production or test change implements behavior described by a UI contract, or a changed path matches a declared UI
surface path. Follow imports, component use, and contract references to check a changed path. A change to a shared
component is UI affecting when a rendered surface consumes it.

Match declared paths after normalizing separators to forward slashes. A pattern with two stars spans zero or more path
segments; one star stays in one segment; a question mark matches one character. Matching is case-sensitive, including
dot-prefixed segments. If the optional path section is absent or the path relationship is uncertain, use the observed
behavior and UI contracts; route an unresolved case as UI affecting and record the uncertainty for
product-surface-reviewer. Do not infer that a change has no UI effect from its directory name alone.

## Evidence

For a UI affecting example, record the screen state, action, expected and observed result, and a capture or rendered artifact under .qfai/evidence/. The artifact must identify the source revision. Request product-surface-reviewer on the same example, its UI contracts, and its captured state. The review verdict and audited evidence hash refer to that revision.

If the implementation or capture changes after the verdict, refresh the capture and review. A passing code test cannot substitute for the visual and interaction evidence that the acceptance criterion requires.
