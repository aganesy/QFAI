# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0006 (prototyping CLI), spec-0024 (render evidence), spec-0028-0033 (runtime/harness), spec-0035 (canonical), spec-0036 (foundation)
- MAJOR CHANGE: CLI command `qfai prototyping` has been REMOVED from the codebase
- This spec covers the `/qfai-prototyping` SKILL workflow only

## Adopted

- AD-0012-0001: Skill-only prototyping -- CLI command removed, skill workflow retained
- AD-0012-0002: All-spec scope -- prototyping processes ALL specs, not single-spec
- AD-0012-0003: 3-mode system -- low-cost, standard (default), full-harness (opt-in)
- AD-0012-0004: Spec Auto-Discovery -- 4-source diff detection from spec-0038
- AD-0012-0005: L1/L2 fidelity DoD -- skeleton vs interactive fidelity levels
- AD-0012-0006: Full-harness loop -- Planner/Generator/Evaluator/Decision Gate from spec-0028-0033

## Rejected

- RJ-0012-0001: CLI command `qfai prototyping`
  - DO NOT reintroduce the CLI command
  - Temptation: adding CLI entrypoint for standalone prototyping runs
  - Reason: prototyping is an agent-orchestrated workflow, not a standalone CLI operation

- RJ-0012-0002: Runtime-heavy default mode
  - DO NOT make full-harness the default mode
  - Temptation: defaulting to full runtime verification for "safety"
  - Reason: static-first (standard) mode is sufficient for most cases; full-harness is opt-in only

## ID Renumbering

| Old ID               | New ID                      | Notes                               |
| -------------------- | --------------------------- | ----------------------------------- |
| spec-0006 US/TC      | US-0012-YYYY / TC-0012-YYYY | Prototyping CLI (CLI parts removed) |
| spec-0024 US/TC      | US-0012-YYYY / TC-0012-YYYY | Render evidence                     |
| spec-0028-0033 US/TC | US-0012-YYYY / TC-0012-YYYY | Runtime/harness                     |
| spec-0035 US/TC      | US-0012-YYYY / TC-0012-YYYY | Canonical                           |
| spec-0036 US/TC      | US-0012-YYYY / TC-0012-YYYY | Foundation                          |

## v1.7.12 Convergence Correction (DR-0108)

### Summary

Skill-centered truth unification. spec-0012 already stated the CLI command was removed, but policies and docs still referenced `qfai prototyping` command. v1.7.12 resolves this inconsistency so that spec, policies, docs, and code unanimously agree the skill is the only interface.

### Discussion Pack Reference

- D-003: Prototyping as skill-centered truth (no CLI command)

### Requirements Added

- REQ-0012: Resolve prototyping truth — all layers must agree skill is sole interface
- REQ-0013: Archive/label superseded content referencing CLI command
- REQ-0014: Eliminate responsibility leakage between skill and CLI
- REQ-0015: Normalize static-first/mode-aware prototyping contract

### Artifacts Added

| Layer | IDs Added                  | Description                                                               |
| ----- | -------------------------- | ------------------------------------------------------------------------- |
| US    | US-0012-0008..US-0012-0010 | Skill-centered truth, CLI ref elimination, mode-aware contract            |
| AC    | AC-0012-0010..AC-0012-0012 | No CLI refs in active docs, skill SSOT, static-first contract             |
| BR    | BR-0012-0008..BR-0012-0010 | Active doc prohibition, skill SSOT boundary, mode self-containment        |
| EX    | EX-0012-0010..EX-0012-0013 | Correct invocation, CLI not-found, doc violation, contract self-contained |
| TC    | TC-0012-0014..TC-0012-0016 | Doc scan for CLI refs, skill SSOT verification, mode contract check       |

### Traceability Chain (v1.7.12 additions)

```text
REQ-0012 → US-0012-0008 → AC-0012-0010, AC-0012-0011 → BR-0012-0008, BR-0012-0009 → EX-0012-0010..0012 → TC-0012-0014, TC-0012-0015
REQ-0013 → US-0012-0009 → AC-0012-0010 → BR-0012-0008 → EX-0012-0011, EX-0012-0012 → TC-0012-0014
REQ-0014 → US-0012-0008 → AC-0012-0011 → BR-0012-0009 → EX-0012-0010 → TC-0012-0015
REQ-0015 → US-0012-0010 → AC-0012-0012 → BR-0012-0010 → EX-0012-0013 → TC-0012-0016
```
