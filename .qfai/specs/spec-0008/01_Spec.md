# 01 Spec

- Spec: spec-0008
- Parent: CAP-0008
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0008/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - ATDD skill (`/qfai-atdd`) workflow definition
  - E2E / API / Integration acceptance test orchestration aligned with US / TC / CON-API obligations
  - Test Volume Estimator (signal table with evidence)
  - Coverage obligations checklist (US -> E2E, TC -> Integration, CON-API -> API)
  - Annotation obligations (`QFAI:SPEC-XXXX:US-YYYY`, `QFAI:SPEC-XXXX:TC-YYYY`, `QFAI:CON-API-XXXX`)
  - Forbidden reference enforcement (TC annotations in E2E/API tests are forbidden)
  - Sub-agent delegation (test-design-analyst, acceptance-test-engineer, completion-reviewer, qa-gatekeeper, implementation-reviewer)
  - Evidence file production (`.qfai/evidence/atdd-<spec-id>.md`)
  - Stage gates (P0-P8) enforcement
  - Reviewer Gate with independent non-edit reviewer
  - Credential-reuse guidance for acceptance-test harnesses (worker-scoped session reuse; backend-agnostic prose, no validator and no new vocabulary)
- Out:
  - Unit / Component test implementation (belongs to `/qfai-implement`)
  - Product feature changes beyond ATDD execution needs
  - Spec artifact authoring (belongs to `/qfai-sdd`)

## Applicable NFR

- NFR-0001: Coverage completeness -- all required US covered by E2E, all required TC by Integration, all required CON-API by API tests
- NFR-0002: Annotation consistency -- every generated ATDD test includes correct QFAI annotations per layer
- NFR-0003: Forbidden reference enforcement -- zero TC annotations in E2E/API test files
- NFR-0004: Evidence completeness -- evidence file includes work orders, coverage checklist, execution logs, and reviewer notes

## Applicable Policy

- Policy: Drift Protocol mandatory, test-layer policy from `catalog/test-layers.md`
- Volume floors/ratios are planning signals, not gates

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/SKILL.md`
- Consolidates old spec-0013 (UI/UX review ATDD-relevant parts)

## Relevant Requirements

- REQ-0001: ATDD skill workflow -- orchestrate E2E/API/Integration acceptance tests aligned with spec obligations
- REQ-0002: Test Volume Estimator -- compute US/TC/CON signals with evidence table
- REQ-0003: Coverage obligations checklist -- E2E covers US, Integration covers TC, API covers CON-API
- REQ-0004: Annotation obligations -- layer-specific QFAI annotations in every generated test
- REQ-0005: Forbidden reference enforcement -- TC annotations forbidden in E2E/API, CON-API guarantee belongs to API tests
- REQ-0006: Stage gates (P0-P8) -- sequential gate enforcement from plan preparation through reviewer confirmation
- REQ-0007: Sub-agent delegation -- mandatory delegation to TestVolumeEstimator, layer implementers, Reviewer, RuntimeGatekeeper
- REQ-0008: Evidence production -- mandatory evidence file with coverage matrix, work orders, execution logs
- REQ-0157: `qfai atdd scaffold --spec spec-NNNN` -- spec test*cases を読み `tests/atdd/spec-NNNN/<TC-ID>.test.*`skeleton を emit する。各 skeleton は test-framework primitives を import し`// TODO: implement assertion for <TC-ID>` + 関連 US-* / CON-API-\_ への comment 参照を含む。`qfai validate`は TODO 残存中`D-SCAFFOLD-PLACEHOLDER`(severity warning) を emit し、3 validate cycle 後に error へエスカレート (既定;`qfai.config.yaml#atdd.scaffoldEscalateCycles` で設定可能 / DR-0272)。idempotent: 再実行で non-TODO content を上書きしない。

- REQ-0024: Worker-scoped credential-reuse rule as ATDD guidance -- record, as backend-agnostic ATDD-layer guidance, seven rules for an acceptance-test harness that reuses one authenticated session per parallel worker instead of authenticating per test. The transferable asset is the rule set, not a fixture.
  - The seven rules: (1) never sign in per test; (2) never share one account across parallel workers; (3) key the cached session by the pair of worker index and actor; (4) tear the cache down at worker exit; (5) re-authenticate and rewrite the cache when a restored session is rejected; (6) a test that mutates its own account creates a dedicated one; (7) test-level parallelism costs more workers, not more sign-ins.
  - Companion rule, recorded in the same place: when an environment identifier is injected by the caller, the harness MUST NOT provision or tear down that environment.
  - Also owns the credential-class script-naming rule -- a credential-free lane and a credentialed lane MUST be reachable by different script names -- as adopter guidance only; QFAI keeps its own script names.
  - Prose guidance only: no validator, no new finding code, no new test layer and no new annotation token, so the layer vocabulary does not grow.
  - Backend-agnostic: it names no browser backend, and any worked example is presented as one illustration among possible backends with nothing named, installed or pinned.
  - QFAI's own suite has zero credentials, so nothing here is dogfooded; the guidance states that rather than hiding it.

## Entry points

- US range in this spec: US-0008-0001..US-0008-0008
- Primary actors: QA Engineer, AI Agent (Orchestrator), CI/CD pipeline
- Notes: ATDD skill produces acceptance tests only; unit/component tests belong to `/qfai-implement`
- v1.9.2 Second-Wave (copy-down for execution): `qfai atdd scaffold --spec spec-NNNN` は spec の test*cases から `tests/atdd/spec-NNNN/<TC-ID>.test.*`skeleton (TODO marker + US-*/CON-API-\_ comment 参照) を idempotent に生成する。TODO 残存は`D-SCAFFOLD-PLACEHOLDER` (warning) で、3 validate cycle 後に error へエスカレート (`atdd.scaffoldEscalateCycles` 既定 3 / DR-0272)。
- CHG-007 (copy-down for execution): the credential-reuse guidance is a `/qfai-atdd` reference artifact, cross-linked from the skill entry point. It states the seven worker-scoped session-reuse rules, the companion injected-environment rule, and the credential-class script-naming rule as adopter guidance. It names no browser backend, installs nothing, pins nothing, and adds no validator, finding code, test layer or annotation token. Its scope is E2E / API / Integration only -- no unit or component obligation (RJ-0008-0001). It ships, so it carries no internal identifier and no version marker beyond the canonical package version.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: coverage depth vs execution time must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
