# 03 Story Workshop

## User Stories

### US-001: <Story Title>

- As a: <role>
- I want: <action>
- So that: <benefit>

#### Acceptance Criteria

- AC-001-01:
- AC-001-02:

#### Example Seeds

| Perspective          | Example                  | Status |
| -------------------- | ------------------------ | ------ |
| Happy path           | <example>                | seed   |
| Negative path        | <example>                | seed   |
| Edge / boundary      | <example>                | seed   |
| Permission / role    | <example>                | seed   |
| State transition     | <example or N/A>         | seed   |
| Idempotency / retry  | <example or N/A>         | seed   |

## User Flows

```mermaid
flowchart TD
    A["Start"] --> B["Action 1"]
    B --> C{"Decision"}
    C -->|Yes| D["Action 2"]
    C -->|No| E["Action 3"]
    D --> F["End"]
    E --> F
```

## Flow Descriptions

- Flow 1:
  - Entry point:
  - Steps:
  - Exit point:
