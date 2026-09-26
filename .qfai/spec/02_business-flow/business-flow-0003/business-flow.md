# BF-0003: Diagnose and repair a QFAI workspace

## Purpose

Give a project operator a repeatable way to identify configuration, layout,
contract and shipped-workflow drift, then verify a targeted repair.

## Flow

```mermaid
flowchart TD
  Symptom[Workspace symptom or scheduled check] --> Diagnose[Run doctor and scoped validation]
  Diagnose --> Classify{Finding owner}
  Classify -->|Configuration| Config[Repair configuration or paths]
  Classify -->|Story or contract| SDD[Repair through SDD]
  Classify -->|Shipped files| Upgrade[Review upgrade or regeneration path]
  Classify -->|Diagnostic rule| Rule[Inspect explicit policy or contract DG rule]
  Config --> Recheck[Run affected check again]
  SDD --> Recheck
  Upgrade --> Recheck
  Rule --> Recheck
  Recheck --> Result{All required checks pass?}
  Result -->|No| Diagnose
  Result -->|Yes| Record[Record repair evidence]
```

## Alternate and exception paths

- A malformed configuration or missing path produces an actionable finding;
  no diagnostic silently supplies an unverified value.
- `--fail-on error` passes when findings are warnings only;
  `--fail-on warning` fails when any warning is present.
- Guardrails output derives from explicit DG entries in policy or contract
  artifacts. An absent action or unreadable path returns its documented error
  rather than an empty successful result.
- Automatic remediation requires its documented safety boundary and a
  confirming second check. An unresolved source decision returns to SDD.
