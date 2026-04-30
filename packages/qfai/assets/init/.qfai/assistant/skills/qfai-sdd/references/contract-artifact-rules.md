# Contract Artifact Rules

Use this file when `/qfai-sdd` creates or updates `.qfai/contracts/**`.

## Purpose

Contracts are version-managed downstream execution inputs:

- `api/`: OpenAPI YAML
- `db/`: SQL schema contracts
- `ui/`: UI contract YAML
- `design/`: exploration brief, reference pool, brand design, rubric, calibration, absorption policy, selected direction, design system, and handoff YAML

Discussion UI/UX files are upstream discovery artifacts. `/qfai-sdd` normalizes approved decisions into `.qfai/contracts/**`; downstream skills read contracts, not discussion UI/UX files.

## Rules

- Keep contract files minimal: only what specs and tests actually reference.
- `api/`, `db/`, and `ui/` contracts must declare `QFAI-CONTRACT-ID` at the top.
- Use prefixes `CON-API-*`, `CON-DB-*`, and `CON-UI-*`.
- `design/` files do not require `QFAI-CONTRACT-ID`, but they are execution-time SSOT for UI-bearing work.
- Breaking changes require delta notes.
- `_policies/05_Contracts.md` is the contract index; it must align with `.qfai/contracts/**` and must not become behavior SSOT.

## Checklist

- Contract IDs exist and are unique.
- Specs reference only existing contract IDs.
- Design contracts are sufficient for prototyping, ATDD, and implementation without discussion-pack fallback.
