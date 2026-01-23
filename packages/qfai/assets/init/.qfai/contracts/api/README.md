# contracts/api

## Purpose

Define minimal API contracts that specs and scenarios may reference.

## File rules

- YAML files named `api-XXXX-<slug>.yaml`
- Each file declares `QFAI-CONTRACT-ID` at the top
- Define only endpoints and fields that specs actually use

## Template (YAML)

```yaml
# QFAI-CONTRACT-ID: API-0001
openapi: "<openapi-version>"
info:
  title: <short name>
  version: "<contract-version>"
paths: {}
```

## Checklist

- [ ] QFAI-CONTRACT-ID is present at the top
- [ ] YAML is valid and minimal
- [ ] No markdown content is embedded in YAML
- [ ] Specs only reference IDs that exist here
