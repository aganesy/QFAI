# 03 Story Workshop

## User Stories

> Discussion-layer IDs use the `D` prefix (`DUS-`, `DAC-`) so they can never be read as
> spec-layer IDs (`US-0001`, `AC-0001`) or as a traceability scenario tag (`SC-NNNN-NNNN`).
> Carry these IDs into the spec layer as `<pack-id>#<discussion-id>`: the `- Source:` line of
> the matching `## US-NNNN` block in `qfai-sdd/templates/specs/spec/02_User-stories.md`, and
> the `# Source:` comment inside the AC's Gherkin block in `03_Acceptance-Criteria.md`. The
> AC Catalog table has no `Source` column — provenance lives in the required Gherkin block so
> a spec that omits the optional catalog still carries it.

### DUS-001: <Story Title>

- As a: <role>
- I want: <action>
- So that: <benefit>

#### Acceptance Criteria

- DAC-001-01:
- DAC-001-02:

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

## Behavior Obligations

<!-- Primary focus for UI-bearing packs. Capture behavioral discovery before screen-level contracts.
     Screen-level contract SSOT lives in uiux/40_screen_contracts.md. -->

### State Coverage

| State / Risk    | Discovery Notes                                   | Handoff to Contract                                                           |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| [state or risk] | [what might trigger confusion, delay, or failure] | Reflect the final `required_states` contract in `uiux/40_screen_contracts.md` |

### Interaction Contracts

| Primary Task     | Key Action         | Priority Hint            | Expected Result | Error Handling |
| ---------------- | ------------------ | ------------------------ | --------------- | -------------- |
| [main user goal] | [main interaction] | [primary/high/secondary] | [result]        | [error case]   |

Screen-level contract details are finalized in `uiux/40_screen_contracts.md`. Primary tasks, required states, transitions, and observable outcomes are finalized there; Story Workshop is for discovery and handoff, not final contract fixation.

### Error Handling

- Input validation: [approach]
- Network failure: [approach]
- Timeout: [approach]

---

## Appendix: Screen Mock — Optional Fallback (HTML+CSS)

<!-- Optional fallback only — do not use as the primary UI definition artifact.
     Include only when it materially clarifies a behavior obligation that prose cannot.
     Behavior Obligations and sidecar artifacts (uiux/) are the primary UI definitions.
     The required state SSOT is uiux/40_screen_contracts.md (`default/loading/empty/error`).
     Links MUST be anchor-form (`<a href="#name">`) — never same-origin absolute
     paths (`/orders/`), which a static mock cannot serve and which the validator rejects. -->

```html
<section class="screen-mock">
  <h1>Screen Title</h1>
  <p>Primary information shown to the user.</p>
  <a href="#orders">View Orders</a>
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
