# Reviewer Result

- reviewer_id: `Rxx`
- reviewer_role: `<reviewer-name>`
- Result: `PASS` <!-- PASS | REVISE -->
- reviewed_at: `YYYY-MM-DDThh:mm:ssZ`

## Checked

- [ ] Scope/layer alignment
- [ ] Traceability consistency
- [ ] Requirement and risk coverage
- [ ] Clarity and actionability
- [ ] Mermaid diagrams are sufficient for decisions (scope/AC/risk consistency)
- [ ] Mermaid diagrams use ` ```mermaid ` fences only
- [ ] Taste interview completeness (when UI-bearing)
- [ ] Trend freshness and evidence traceability (when UI-bearing)
- [ ] 3-layer evaluation quality and traceability (when UI-bearing)
- [ ] Option comparison integrity and selected anchor clarity (when UI-bearing)
- [ ] Strong screen contract completeness (when UI-bearing)
- [ ] OQ register exit condition (open count = 0)
- [ ] Deferred items have full metadata

## Feedback

- (none)

## Decision

- PASS / REVISE

> In-flight reviewer responses use `PASS` / `REVISE`, per
> `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`.
> A `REVISE` verdict maps to `status: "FAIL"` when the review pack's `summary.json` is written
> — see `#verdict-vocabulary` in the same file. Do not invent a third verdict.
