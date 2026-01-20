# specs/

A **spec pack** lives under `specs/spec-XXXX/` and contains:

- `spec.md` : SDD spec (source of truth for behavior)
- `delta.md` : change log / impact / migration / verification plan (and decision records)
- `scenario.feature` : Gherkin scenarios (ATDD skeleton)

Create/update spec packs with `/qfai-spec`.

## Decision records in `delta.md`

`delta.md` is not only "what changed", but also "what we decided".
This is critical for AI-assisted implementation: when `spec.md` is ambiguous, the implementer must avoid accidentally choosing a previously rejected option.

### Decision Table (recommended)

Record candidate options and outcomes in a compact table:

```md
## Decision Table

| ID | Topic | Candidates | Decision | Rationale | Implementation note |
|---|---|---|---|---|---|
| DT-0001 | Example topic | A / B / C | Adopt: B, Reject: A,C | Why B | Do NOT implement A,C |
```

### Decision Guardrails (DG)

Decision Guardrails can be stored under `delta.md` as `## Decision Guardrails`.
Keep each guardrail short and machine-extractable so `qfai guardrails extract` can pull the relevant constraints when needed.

```md
## Decision Guardrails

### DG-000001: Do not implement option A for <topic>
- Type: trade-off
- Scope: specs/spec-*/
- Guardrail: Option A MUST NOT be implemented; prefer option B.
- Reason: Option A breaks compatibility.
- Reconsider: only if compatibility policy changes.
- Related: DT-0001
- Keywords: option-a, compatibility
```

Before writing a spec pack, read `.qfai/assistant/steering/manifest.md` to align on product-level decisions.

Manifest is maintained under `.qfai/assistant/steering/manifest.md` (product-level decision spine). Do not duplicate a manifest under specs.

Note: After `qfai init`, this folder contains only this README. Spec packs (`spec-XXXX/`) are created by running `/qfai-spec`.
