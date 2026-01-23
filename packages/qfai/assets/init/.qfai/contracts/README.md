# contracts

## Purpose

Contracts define the API/DB/UI surface that specs and scenarios may reference. Contracts must be created before specs.

## What belongs here

- contracts/api (YAML)
- contracts/db (SQL)
- contracts/ui (YAML)

## What does not belong here

- categories beyond api/db/ui
- implementation code or tests
- markdown embedded inside YAML/SQL

## Structure

```text
contracts/
  README.md
  api/
    README.md
    <api contracts>
  db/
    README.md
    <db contracts>
  ui/
    README.md
    <ui contracts>
```

## Checklist

- [ ] Contracts exist before specs reference them
- [ ] Only api/db/ui categories are used
- [ ] Each contract file declares QFAI-CONTRACT-ID
