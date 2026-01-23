# contracts/ui

## Purpose

Define minimal UI contracts that specs and scenarios may reference.

## File rules

- YAML files named `ui-XXXX-<slug>.yaml`
- Each file declares `QFAI-CONTRACT-ID` at the top
- Define only screens and elements used by specs

## Template (YAML)

```yaml
# QFAI-CONTRACT-ID: UI-0001
screens:
  - id: <screen-id>
    title: <screen-title>
    elements:
      - id: <element-id>
        type: <element-type>
        required: true
```

## Checklist

- [ ] QFAI-CONTRACT-ID is present at the top
- [ ] YAML is valid and minimal
- [ ] No markdown content is embedded in YAML
- [ ] Specs only reference IDs that exist here
