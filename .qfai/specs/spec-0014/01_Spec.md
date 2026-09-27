# 01 Spec

- Spec: spec-0014
- Parent: CAP-0014
- Status: active

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
  - prototyping evidence path is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` per iter; legacy `screenshots/` / `html/` directory layout is no longer the active SSOT
  - `/qfai-verify` no longer references "full-harness profile" / "perfect-100 completion gate" / "weighted-total scoring"; review-profiles.yml drops the full-harness profile entirely
  - SaaS-package certify scope (REQ-0166 certify side): `qfai prototyping certify --scope saas-package` seals `completion-certificate.json` with `scope: "saas-package"` + a `notes:` field naming what was skipped; MUST NOT claim full DONE; `--upgrade-scope full` upgrades only after the skipped gates land
  - Orchestrated mode of `/qfai-verify` as the final stage of a workflow run: its entry check, its Operations table and its stage result, in `references/orchestrated-mode.md`
  - The verify stage's half of the run's receipts: naming this run's `verify.json` and the qa-gatekeeper review in the stage result, and never offering another run's report
  - Routing a verify finding to its owner instead of repairing it
- Out:
  - diff-only verification
  - resurrecting a removed prototyping runtime
  - The workflow core, the built-in plans, the shipped schemas and the entry skills (spec-0018), including the per-stage copy of `verify.json`, the trust level each receipt records, `finish` reading only this run's copy, and a run never completing on an error in its final verify
  - The rules every stage skill shares: descriptions as trigger conditions, one orchestrated-mode reference per skill, Stage 0 shared-snapshot reuse (spec-0001)
  - The repair of a finding verify routes to another owner (spec-0008, spec-0011, spec-0013)

## Applicable Contracts

| Contract   | File                                           | Governs here                                                                                         |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CLI-WF     | `.qfai/contracts/cli/qfai-workflow.md`         | `### Stage result`, `## Completion`, `## Fingerprints and receipts`, `### host:stage-skill-handover` |
| CLI-WFFILE | `.qfai/contracts/cli/workflow-files.schema.md` | `### Vocabulary` and `### The Operations table`                                                      |

The CLI contracts declare no `CON-*` ID. `04_Business-Rules.md` names the contract
section each rule is realized by in `## Contract Realization`. The shape of
`verify.json` stays in `qfai-verify/references/verify-output-contract.md`, which
this change leaves as it is.

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
- REQ-0166: `qfai prototyping certify --scope saas-package` seals a lightweight `completion-certificate.json` with `scope: "saas-package"` + a `notes:` field naming what was skipped; never claims full DONE; `--upgrade-scope full` upgrades only after missing gates land (validate side owned by spec-0004)

### discussion-20260923171450572 (2026-09-24)

The requirements of this spec's rows in `## Triage (2026-09-24 intent-driven entry)`
of `09_delta.md`. The IDs are the pack's, so they are written with the pack
half; the local list above keeps its own numbering, including a local `REQ-0013`
that is not the pack's.

| Requirement                             | Home                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `discussion-20260923171450572#REQ-0035` | CLI-WF `### Stage result`; BR-0014-0028, BR-0014-0029                     |
| `discussion-20260923171450572#REQ-0039` | CLI-WF `### Stage result`, `## State machine`; BR-0014-0030, BR-0014-0033 |
| `discussion-20260923171450572#REQ-0051` | CLI-WF `### host:stage-skill-handover`; BR-0014-0031                      |
| `discussion-20260923171450572#REQ-0052` | CLI-WFFILE `### The Operations table`; BR-0014-0032                       |
| `discussion-20260923171450572#REQ-0060` | CLI-WF `## Completion`, `## Fingerprints and receipts`; BR-0014-0026      |
| `discussion-20260923171450572#REQ-0063` | CLI-WF `## Fingerprints and receipts`; BR-0014-0027                       |

## Entry points

- US range in this spec: US-0014-0001..US-0014-0021
- Primary actors: QFAI user, CI/CD pipeline, qa-gatekeeper
