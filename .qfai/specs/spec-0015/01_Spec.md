# 01 Spec

- Spec: spec-0015
- Parent: CAP-0015
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0015/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- SSOT for concrete agent definitions lives in `.qfai/assistant/agents/*.md`
- Cross-skill governance behavior (CHG-006, v1.9.2):
  - Every SKILL.md MUST carry a `## Default Autopilot Policy` section with three named buckets — auto-decide (formatting / ID-numbering / append-vs-create / equivalent-option pick), ask-user (approval-required governance operations / destructive / version-pin / scope-expansion), hard-required (companyName / brand intent / primarySpecId). The three enumerations are a **prototype**, not a verbatim copy: a SKILL.md MAY narrow any of the three buckets (drop an entry the skill cannot reach), and MAY instantiate the ask-user category `approval-required governance operations` with the operations its own run cannot authorize for itself — the triage ops in `/qfai-sdd`, the `TDDLIST-001` accepted-risk waiver, the Drift-Protocol Change-Request escalation and item-level parallelism consent in `/qfai-implement`. Instantiating a category is not widening; introducing an entry outside the prototype's categories is, and stays barred (DR-0269 Amendment 2). Reviewer Gate emits `R-AUTOPILOT-POLICY-MISSING` (error) when the section is absent OR is present but missing one or more required buckets (REQ-0160 / DR-0269).
  - When an `AskUserQuestion` names one of four envelope-deviation contexts (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion), the skill body writes `.qfai/evidence/decisions/<ISO8601-ts>.json` `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}` (tracked in version control — governance record, negated in the managed `.gitignore` block) (REQ-0158 / DR-0270).
  - All handoff writers use the canonical CLI-HANDOFF schema (`packages/qfai/src/core/schemas/handoff.ts`); `R-HANDOFF-SCHEMA-DRIFT` (error) guards SSOT-sync Pair IV; legacy files accepted with `D-HANDOFF-LEGACY-FORMAT` during the window (REQ-0161).
  - The eight-code Reviewer-Gate catalog (`R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`, `R-DESIGN-MD-PATCH-OUT-OF-ZONE`, `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`, `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT`) governs membership only and declares no per-code severity column — each code's severity belongs to the detector that emits it (`R-DESIGN-MD-PATCH-OUT-OF-ZONE` stays warning per REQ-0151) — while every catalog code carries a mandatory non-empty `justification:` whose empty / whitespace-only value is rejected by `qfai validate` ingestion at severity error for all eight; prompt-augmentation timing stays OQ-0119-deferred (REQ-0168).
  - `qfai audit log` (CLI-AUDIT, SHOULD) and `qfai handoff upgrade` (SHOULD) provide the audit-listing and legacy-adapter ergonomics (REQ-0171 / REQ-0172).
  - `references/*.md` + each SKILL.md are realigned to the OQ-0152..0157 outcomes in the same atomic PR; `qfai validate --report` enforces zero stale references at HEAD after sunset (REQ-0173).

## Scope

- In:
  - agent catalog and routing framework
  - orchestrator protocol
  - delegation hard-stop rules
  - review profiles and gate rules
  - skill integration
  - prototyping evaluator/reviewer routing
  - `/qfai-prototyping` v2.0 routing rebuild: orchestrator → product-experience-architect (generator) + product-surface-reviewer (evaluator) + devops-ci-engineer (capture); same-Claude generator/reviewer is forbidden (self-preference bias)
  - `review-profiles.yml` drops the `full-harness` profile; only the `default` profile remains active
- Out:
  - runtime execution engines
  - removed prototyping CLI behavior

## Applicable NFR

- NFR-0001: routing policy remains centralized
- NFR-0002: specialist responsibilities stay explicit
- NFR-0003: first delegation failure hard-stops the stage

## Applicable Policy

- Orchestrator delegates; it does not simulate missing roles.
- Blocking reviewer findings gate completion.

## Evidence Summary

- Evidence: agent catalog, routing files, review gate rules, shared delegation baseline

## Relevant Requirements

- REQ-0001: agent catalog remains the role registry
- REQ-0002: standard contract structure stays consistent
- REQ-0003: orchestrator remains delegation-only
- REQ-0004: work order schema remains explicit
- REQ-0005: review modes remain centrally registered
- REQ-0006: routing policy remains centralized
- REQ-0012: all-reviewer FAIL obligations stay in force
- REQ-0013: prototyping review profile is defined in terms of current skill-led evaluation/reviewer routing, not a removed runtime entrypoint
- REQ-0014: prototyping evidence-phase routing may require `product-experience-architect` and related reviewers based on specs + contracts inputs
- REQ-0015: delegation failure hard-stop output remains mandatory
- REQ-0015-0013: Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` regression check — Reviewer Gate MUST emit finding `R-CERTIFY-VERIFY-CIRCULAR` (severity: info in `validate`; the enforcement is `qfai prototyping certify`'s exit-2 refusal of a non-prototyping scope) when a future PR reintroduces the cycle where certify reads validator output requiring `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase. The check is structural and asserts the option-B path (per upstream deferred-OQ decision): certify reads no validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts.
- REQ-0015-0014: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` finding emission — Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` (severity: error) with mandatory `justification:` text per the prior-pack contract from `.qfai/discussion/discussion-20260522081618995/` REQ-0006 (justification must name the modified file, the un-paired counterpart, and the unmatched contract clause; reuses the justification-text contract from NFR-0115 of the current pack).
- REQ-0160: SKILL.md `## Default Autopilot Policy` section (3-bucket template per DR-0269); `R-AUTOPILOT-POLICY-MISSING` (error) on absence
- REQ-0158: envelope-deviation `AskUserQuestion` audit-log to `.qfai/evidence/decisions/<ts>.json` (four-context taxonomy per DR-0270; tracked in version control)
- REQ-0161: cross-skill `handoff.yaml` canonical schema (CLI-HANDOFF, SSOT-sync Pair IV); `R-HANDOFF-SCHEMA-DRIFT` (error); legacy `D-HANDOFF-LEGACY-FORMAT` during window
- REQ-0168: new Reviewer-Gate finding-code catalog (8 codes, membership only — no per-code severity column; mandatory non-empty `justification:`, empty value rejected at severity error); prompt-augmentation timing inherits OQ-0119 carry-forward deferral
- REQ-0171: `qfai audit log` CLI surface (CLI-AUDIT, SHOULD) per DR-0271 (`--scope`/`--operator`/`--clause` + `--format table|json`)
- REQ-0172: `qfai handoff upgrade <legacy>` adapter helper (SHOULD); preserves originals under `legacy:`
- REQ-0173: cross-skill documentation realignment to the OQ-0152..0157 outcomes; `qfai validate --report` verifies zero stale references after sunset
- REQ-0015-0015: PROMPT_SCANNER_PAIRS manifest expansion — `packages/qfai/src/core/validators/promptScannerPairs.ts` は現状 proof-of-concept として単一 clause (`color-literal-ban`) のみを encode している。これを残りの DesignMd violation kinds (`font-family-ban` / `radius-literal-ban` / `shadow-rgba-ban`) まで拡張する。各 entry は scanner-source token 集合と対応する `generator-prompt.md` clause token を pair で持ち、drift 時に R-PROMPT-SCANNER-DRIFT emission で unmatched clause を triage 用に naming する。validator code は既に data-driven (`for (const pair of ...)` loop) であり、本 REQ は manifest の growth + 対応 fixture coverage を pin する。Acceptance signal: 4 entries (color / font / radius / shadow) が manifest に揃い、各 entry に対し scanner-only edit と prompt-only edit のいずれもが `R-PROMPT-SCANNER-DRIFT` を fire する unit/integration test が green。

## Entry points

- US range in this spec: US-0015-0001..US-0015-0016
- Primary actors: QFAI maintainer, orchestrator, reviewer agents
