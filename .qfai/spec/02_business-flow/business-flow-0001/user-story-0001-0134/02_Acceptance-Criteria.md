# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0134-01
# Parent: US-0001-0134
Scenario: `iterate --capture` opt-in flag (default OFF; preserves DR-0012-0029)
  Given `qfai prototyping iterate` invoked WITHOUT `--capture`,
  When the loop runs,
  Then no PNG / HTML artifacts MUST be written (the existing DR-0012-0029 no-capture posture is preserved; amendment pinned by `DR-0012-0031`).
  And when invoked WITH `--capture`, iterate MUST drive Playwright per the Capture contract in `iterate-plan.json` and write `iter-NN/<screen-id>.{png,html}` for every `screens[]` entry, copying source HTML from `.qfai/prototypes/iter-NN/<screen-id>.html` (`.qfai/prototype/iter-NN/<screen-id>.html` with the `rule/ skill/ agent/ prompt/` assistant tree) when `htmlSourceCopy: true`.
  And async capture errors MUST be surfaced with explicit per-screen error context (no silent skip).
```
