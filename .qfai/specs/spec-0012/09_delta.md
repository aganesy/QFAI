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

| Old ID | New ID | Notes |
| ------ | ------ | ----- |
| spec-0006 US/TC | US-0012-YYYY / TC-0012-YYYY | Prototyping CLI (CLI parts removed) |
| spec-0024 US/TC | US-0012-YYYY / TC-0012-YYYY | Render evidence |
| spec-0028-0033 US/TC | US-0012-YYYY / TC-0012-YYYY | Runtime/harness |
| spec-0035 US/TC | US-0012-YYYY / TC-0012-YYYY | Canonical |
| spec-0036 US/TC | US-0012-YYYY / TC-0012-YYYY | Foundation |
