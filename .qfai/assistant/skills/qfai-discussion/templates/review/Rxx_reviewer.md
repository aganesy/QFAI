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
- [ ] Root `DESIGN.md` completeness and differentiation clarity — it parses, and its `# Brand Philosophy` body carries do/don't, brand signals, and exploration references framed as **deviate-from** inputs (when a visual-prototyping surface — `web`/`mobile`/`desktop`/`mixed` — is classified as primary or secondary; a cli-only pack authors no root `DESIGN.md`, so skip this line for it)
- [ ] Reference pool freshness and translation quality — into root `DESIGN.md` when a visual-prototyping surface is classified, otherwise into `uiux/40_screen_contracts.md` — and Trend Scan freshness and evidence traceability at `04_Sources.md#Trend Scan` (when UI-bearing)
- [ ] Canonical `uiux/` family complete — `00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md` — with no forbidden legacy sidecar (when UI-bearing)
- [ ] Evaluator scoring covers all four canonical UX axes — information architecture / navigation flow / usability / functionality, fixed by the review validation the QFAI CLI applies (restated in `.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`) (when UI-bearing)
- [ ] Evaluator critique skepticism and blandness rejection quality applied against the four axes (when UI-bearing)
- [ ] Planner-first discipline — exploration directions stay unranked, no single visual winner was selected (`qfai-discussion/SKILL.md`), and latest-iteration handling matches the one-lineage / no-best-of-history rule in `qfai-prototyping/SKILL.md` (when UI-bearing)
- [ ] Screen contract sufficiency and strong schema completeness (when UI-bearing)
- [ ] Generic fallback risk — ensure no unreviewed generic/placeholder UI remains (when UI-bearing)
- [ ] OQ register exit condition (open count = 0)
- [ ] Deferred items have full metadata

## Feedback

- (none)

## Decision

- PASS / REVISE

> In-flight reviewer responses use `PASS` / `REVISE`, per
> `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`.
> A `REVISE` verdict maps to `status: "FAIL"` when the review pack's `summary.json` is written
> — see `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`.
> Do not invent a third verdict.
