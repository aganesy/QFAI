# contracts/ui (UI Contract YAML)

## Purpose

Define UI surface contracts for prototyping and E2E selection.

## File rules

- File name: `ui-XXXX-<slug>.yaml`
- Header: `# QFAI-CONTRACT-ID: UI-XXXX`
- Define screens, elements, and user actions referenced by scenarios.

## Template (YAML)

```yaml
# QFAI-CONTRACT-ID: UI-0001
screens:
  - id: product_list
    title: Product List
    route: /products
    elements:
      - id: search_input
        type: input
      - id: product_table
        type: table
    actions:
      - id: go_to_create
        type: navigate
        target: /products/new
```

## Checklist

- [ ] Screen IDs are stable and referenced by specs/scenarios.
- [ ] Elements/actions represent user-observable behavior.
- [ ] Minimal but sufficient for prototyping/E2E.
