# contracts/ui (UI Contract YAML)

## Purpose

Define UI surface contracts as SSOT for prototyping and E2E selection.
The contract must describe both screen structure and minimum mockable behavior.

## File rules

- File name: `ui-XXXX-<slug>.yaml`
- Header: `# QFAI-CONTRACT-ID: CON-UI-XXXX`
- Keep contracts focused on user-observable behavior and stable identifiers.

## Mockable prototype minimum (L2)

Add `prototype` at the top level.

- `mode`: `skeleton | interactive` (`interactive` is the recommended default)
- `mockPaths`: minimum happy-path checks to validate mock behavior
- `markers`: selector/marker convention for runtime inspection and future automation

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

- See `../../assistant/skills/qfai-prototyping/templates/contracts/ui-0001-order-mockable.yaml` for a copy-ready mockable contract.

## Checklist

- [ ] Screen IDs are stable and referenced by specs/scenarios.
- [ ] `elements` and `actions` include the minimum fields above.
- [ ] `prototype.mode/mockPaths/markers` are defined for L2 mockable flow.
