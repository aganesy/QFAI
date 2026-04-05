# contracts/ui (UI Contract YAML)

## Purpose

Define UI surface contracts for prototyping and E2E selection.
The contract must describe both screen structure and minimum mockable behavior.

> **Note:** UI contracts are **supporting input** that supplements the discussion sidecar artifacts (`discussion-*/uiux/*`), which remain the primary truth for UI/UX definitions. Screen contract YAML files are read **only when present**; after `qfai init`, this directory may contain only this README — that is the normal initial state.

## File rules

- File name: `ui-XXXX-<slug>.yaml`
- Header: `# QFAI-CONTRACT-ID: CON-UI-XXXX`
- Keep contracts focused on user-observable behavior and stable identifiers.

### `elements[].id` naming policy (stable IDs)

- Use stable IDs that survive copy changes. Recommended format:
  - `<screen>_<semantic>_<type>` (example: `order_create_submit_button`)
- Do not use positional IDs (`button1`, `row2`, ...).
- Keep IDs in lowercase snake_case to avoid drift across tools.
- Change policy:
  - Text-only change: keep existing `id`, update `label`.
  - Semantic change (different role): create a new `id` and update specs/evidence references.
  - Removed element: delete from contract and update affected `uiFidelity`/test evidence in the same PR.

### `elements[].label` is inspection-target text

- `label` is treated as runtime inspection target text for L2 reviews.
- If UI text changes, update all three in one chain:
  1. `contracts/ui/*.yaml` (`elements[].label`)
  2. UI rendering (actual visible label or marker mapping)
  3. `.qfai/evidence/prototyping.json` (`uiFidelity` snapshot)
- If label text is intentionally hidden (icon-only, aria-only), add stable `data-qfai` markers and document mapping in the contract comments.

### `data-qfai` marker convention

- Recommended marker value: `CONTRACT_ID:ELEMENT_ID` (example: `data-qfai="CON-UI-0001:search_input"`).
- Use `elements[].id` (stable ID) for the marker suffix, not `elements[].label`.
- Even when label text is not visible in the UI, markers ensure fidelity coverage.
- autogen generates expected markers from `elements[].id` automatically.
- Legacy format (`CONTRACT_ID:ELEMENT_LABEL`) is accepted for backward compatibility but new implementations should use the id-based format.

## Mockable prototype minimum (L2)

Add `prototype` at the top level.

- `mode`: `skeleton | interactive` (`interactive` is the recommended default)
- `mockPaths`: minimum happy-path checks to validate mock behavior
- `markers`: selector/marker convention for runtime inspection and future automation

### `prototype.mode` and `mockPaths[]` examples

```yaml
prototype:
  mode: interactive
  mockPaths:
    - id: mp_create_to_list
      flow: create -> list reflects
```

```yaml
prototype:
  mode: skeleton
  mockPaths: []
```

## Screen contract rules

- `screens[].elements[]` are display SSOT fields and should include:
  - `id` (stable key)
  - `label`
  - `type` (`input`, `table`, `button`, ...)
  - `required` (boolean)
  - `validations` (simple rule strings)
- `screens[].actions[]` are minimum interactions and should include:
  - `id`
  - `label`
  - `kind` (`submit`, `navigate`, `toggle`, ...)
  - `effect` (expected UI state change)

### L2 `actions[]` minimum set

- For each interactive primary route, define at least one action that changes UI state (`navigate`, `submit`, `toggle`, ...).
- Tie at least one action to a `prototype.mockPaths[]` flow so reviewers can trace mockable behavior.
- Keep `effect` concrete and testable (`navigates to /orders`, `shows success toast`, ...).

## Template (YAML)

```yaml
# QFAI-CONTRACT-ID: CON-UI-0001
prototype:
  mode: interactive
  mockPaths:
    - id: mp_create_to_list
      flow: create -> list reflects
  markers:
    - id: mk_order_form
      selector: "[data-qfai='order-form']"
      purpose: order create form root
screens:
  - id: order_create
    title: Create Order
    route: /orders/new
    elements:
      - id: customer_id_input
        label: Customer ID
        type: input
        required: true
        validations:
          - must be non-empty
      - id: submit_button
        label: Submit
        type: button
        required: true
        validations: []
    actions:
      - id: submit_order
        label: Submit order
        kind: submit
        effect: navigates to /orders and shows the created row
```

## Example

- Copy-ready repository sample:
  `docs/examples/ui-contract.good.yaml`
- Also available from prototyping skill template:
  `../../assistant/skills/qfai-prototyping/templates/contracts/ui-0001-order-mockable.yaml`

## FAQ (Typical failures)

### Q1. "The page is just a static string." Which rule fails?

- Typical fail: `QFAI-PROT-238` (`prototypingEvidence.uiFidelityContractCoverage`).
- Reason: Contract expects `elements/actions`, but runtime evidence does not satisfy expected placement/wiring.
- Fix:
  - Add concrete UI elements for contract labels, or
  - Add stable `data-qfai` markers and wire minimum actions for the route.

### Q2. "A label does not match." What must be updated?

- Update in this order:
  1. Contract label (`contracts/ui/*.yaml`)
  2. UI rendered text (or marker mapping)
  3. Prototyping evidence (`.qfai/evidence/prototyping.json`)
- If only one side is updated, `QFAI-PROT-238` can remain unresolved in review.

### Q3. "Can I treat this as a static screen?"

- Use static/skeleton handling only when the screen has no meaningful interactive behavior yet.
- Configuration options:
  - Temporary L1: `uiFidelity.mode: skeleton` with `screens: []`
  - L2 target: keep `mode: interactive`, but define actionable routes with minimum `actions[]` and `mockPaths[]`
- Move back to `interactive` before ATDD to avoid hidden behavior drift.

## Checklist

- [ ] Screen IDs are stable and referenced by specs/scenarios.
- [ ] `elements[].id` follows stable naming policy and change policy is respected.
- [ ] `elements[].label` matches runtime-visible inspection text or documented marker mapping.
- [ ] `elements` and `actions` include the minimum fields above.
- [ ] `prototype.mode/mockPaths/markers` are defined for L2 mockable flow.
