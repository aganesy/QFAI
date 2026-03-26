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

| Perspective         | Example          | Status |
| ------------------- | ---------------- | ------ |
| Happy path          | <example>        | seed   |
| Negative path       | <example>        | seed   |
| Edge / boundary     | <example>        | seed   |
| Permission / role   | <example>        | seed   |
| State transition    | <example or N/A> | seed   |
| Idempotency / retry | <example or N/A> | seed   |

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

## Screen Mock (HTML+CSS)

- Use this section when UI requirements exist.
- Visual mock only; do not include JavaScript behavior.

```html
<section class="screen-mock">
  <h1>Screen Title</h1>
  <p>Primary information shown to the user.</p>
  <button type="button">Primary Action</button>
</section>
```

```css
.screen-mock {
  max-width: 560px;
  margin: 24px auto;
  padding: 20px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
}
```

## Design Direction Summary

<!-- Required for UI-bearing packs. Validated by QFAI-DDP-019..025. -->

### Option Comparison

<!-- List 2+ design options. Each must be a separate entry. (QFAI-DDP-020) -->

- **Option A**: [Name and description]
- **Option B**: [Name and description]

### Anchor Screen Selection

<!-- Select one of the compared options as the anchor. (QFAI-DDP-021) -->

Selected: [Option X] — [Reason for selection]

### Competitive References

<!-- Summarize competitive references from 04_Sources.md. (QFAI-DDP-022) -->

See 04_Sources.md for full competitive reference registry.

### CTA Hierarchy

<!-- Define CTA hierarchy with at least a primary CTA. (QFAI-DDP-023) -->

- Primary: [CTA label and placement]
- Secondary: [CTA label and placement]

### State Coverage

<!-- Define all 4 required states. (QFAI-DDP-024) -->

- empty: [Empty state display]
- loading: [Loading state display]
- error: [Error state display]
- populated: [Populated state display]

### Design Anti-goals

<!-- List 1+ design patterns to intentionally avoid. (QFAI-DDP-025) -->

- Anti-goal: [Pattern to avoid and reason]
