# specs/

A **spec pack** lives under `specs/spec-XXXX/` and contains:

- `spec.md` : SDD spec (source of truth for behavior)
- `delta.md` : impact / migration / verification plan
- `scenario.feature` : Gherkin scenarios (ATDD skeleton)

Create/update spec packs with `/qfai-spec`.

Decision Guardrails can be stored under `delta.md` as `## Decision Guardrails`. See `.qfai/samples/guardrails/delta_with_guardrails.md` for an opt-in example.

Before writing a spec pack, read `.qfai/assistant/steering/manifest.md` to align on product-level decisions.

Manifest is maintained under `.qfai/assistant/steering/manifest.md` (product-level decision spine). Do not duplicate a manifest under specs.

Note: After `qfai init`, this folder contains only this README. Spec packs (`spec-XXXX/`) are created by running `/qfai-spec`.
