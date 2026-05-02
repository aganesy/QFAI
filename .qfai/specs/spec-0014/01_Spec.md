# 01 Spec

- Spec: spec-0014
- Parent: CAP-0014
- Status: active
- Superseded-by: -
- Deprecated-at: -

## Consumer View

- Primary SSOT for execution: `spec-0014/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-verify` quality gates
  - `qfai validate --fail-on error`
  - review artifact presence and PASS/REVISE semantics
  - contract-first design/UI validators
  - prototyping design-system and evidence-related validators that still exist in code
  - direct discussion-pack validation path の coexistence
- Out:
  - diff-only verification
  - resurrecting a removed prototyping runtime

## Applicable NFR

- NFR-0001: verify always performs full-scan gates
- NFR-0002: validate/verify outputs are deterministic for the same input
- NFR-0003: non-UI packs do not produce stray UI validator errors

## Applicable Policy

- Verify is the final quality gate before completion.
- Reviewer PASS/REVISE is part of the gate, not an optional note.

## Evidence Summary

- Evidence: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md`
- Evidence: `packages/qfai/src/core/validate.ts`

## Relevant Requirements

- REQ-0001: `/qfai-verify` runs repo gates plus `qfai validate --fail-on error`
- REQ-0002: verify loops until PASS or explicit stop
- REQ-0003: verify produces copy-pasteable evidence summaries
- REQ-0013: contract-first validators remain in the verify path through validate
- REQ-0015: trend/axis traceability validators remain part of the downstream validate gate when expressed as contracts
- REQ-0016: design-system validators remain part of the downstream validate gate when expressed as contracts
- REQ-0017: review artifacts are inspected as part of verify completion
- REQ-0018: verify does not require repo-root validate to import `runCanonicalUixValidators` as its primary path
- REQ-0019: removed compatibility surface stays removed
- REQ-0028: `PROT-DS01` remains a validator for design-system compliance artifacts when that slice exists
- REQ-0029: legacy full-harness wording in validators is treated as artifact compatibility language, not as a public entrypoint
- REQ-0030: direct discussion-pack canonical validation may still exist, but is not the primary downstream completion gate

## Entry points

- US range in this spec: US-0014-0001..US-0014-0019
- Primary actors: QFAI user, CI/CD pipeline, qa-gatekeeper
