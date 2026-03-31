# 01 Spec

- Spec: spec-0036
- Parent: CAP-0036

## Consumer View

- Primary SSOT for execution: `spec-0036/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: render evidence CLI wiring (placeholder removal, capture path connection, structured result reporting), browser QA smoke phase real findings, browser QA visual phase real findings
- Out: browser QA interaction phase, browser QA accessibility phase, full 4-phase QA pipeline, render evidence screenshot tooling implementation

## Applicable NFR

- NFR-0003: Validator determinism (同一入力 → 同一出力)
- NFR-0005: SSOT convergence (全 module が同一 canonical model を参照)
- NFR-0007: CLI/skill body alignment (CLI behavior と skill body 記述が矛盾しない)

## Applicable Policy

- (none)

## Evidence Summary

- REQ: REQ-0020 to REQ-0023

## Relevant Requirements

- REQ-0020: Render evidence CLI wiring (placeholder 置換)
- REQ-0021: Render evidence honest reporting (capture/skipped/failed structured reporting)
- REQ-0022: Browser QA smoke findings (real findings, non-empty)
- REQ-0023: Browser QA visual findings (real findings, should priority)

## Entry points

- US range in this spec: US-0036-0001..US-0036-0002
- Primary actors: prototyping evidence consumer, QA workflow consumer
- Notes: Render evidence wiring is blocking for smoke phase; visual phase is should priority

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: capture environment detection heuristics
- Conflict: NFR-0007 (CLI/skill alignment) vs runtime-dependent capture availability
- Missing: browser QA finding severity classification scheme
- Trade-off: smoke finding granularity vs implementation complexity

### Escalation Targets (Read-only, decision basis)

- \_policies/08_Decisions.md (DR-0081, DR-0084)

## Source

- discussion-20260330035428071
