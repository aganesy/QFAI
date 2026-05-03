# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0011 (Spec Diff Protocol), spec-0038 (Auto-Discovery)
- Old spec-0011 defined Preflight Diff Protocol and SKILL.md incremental mode
- Old spec-0038 defined 4-source unified diff detection TypeScript implementation

## Adopted

- AD-0013-0001: Unified SDD workflow -- single `/qfai-sdd` entrypoint for full SDD flow
- AD-0013-0002: Spec Auto-Discovery integration -- 4-source diff detection from spec-0038
- AD-0013-0003: Contract-first phase -- contracts created before spec slices
- AD-0013-0004: Phase order enforcement -- strict Contracts -> Outline -> Slice -> Plan -> Delta
- AD-0013-0005: Triage cell escape ↔ parse symmetry -- `escapeTableCell` only escapes `|` → `\|` and normalizes line breaks (no `\` → `\\` step), matching the parser's `\|` → `|` un-escape rule exactly. Literal `\` is part of the allowed cell character set (Windows paths, regex literals) and round-trips as-is.

## Rejected

- RJ-0013-0001: Split SDD entrypoints
  - DO NOT reintroduce separate outline/slice/plan commands
  - Temptation: splitting for "modularity" or "flexibility"
  - Reason: unified flow prevents phase-skipping and ensures consistency

- RJ-0013-0002: Business Flow as Gherkin
  - DO NOT author Business Flow as Gherkin (\*.feature files)
  - Temptation: using Gherkin for "executable specs"
  - Reason: Business Flow is Markdown + Mermaid; Gherkin is deprecated for this purpose

## ID Renumbering

| Old ID          | New ID                      | Notes              |
| --------------- | --------------------------- | ------------------ |
| spec-0011 US/TC | US-0013-YYYY / TC-0013-YYYY | Spec Diff Protocol |
| spec-0038 US/TC | US-0013-YYYY / TC-0013-YYYY | Auto-Discovery     |

## Post-Migration Changes

| Date       | Change Type | IDs Added                                                            | Summary                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-01 | adopted     | AC-0013-0010, BR-0013-0008, EX-0013-0008, TC-0013-0013               | 06_Test-Cases テンプレートに Type 列（normal/error/boundary/edge）を追加、各 AC に最低1つの非正常系 TC を義務化                                                                                                                                                                                                                                              |
| 2026-04-23 | updated     | REQ-0021, AC-0013-0011                                               | `/qfai-sdd` 完了時点で selected-direction/design-system も UI-bearing validate readiness の必須 design contract として扱うよう runtime gate に同期                                                                                                                                                                                                           |
| 2026-05-04 | adopted     | AC-0013-0012, BR-0013-0009, EX-0013-0009, TC-0013-0014, AD-0013-0005 | PR #206 commit 465b9869 — Triage cell escape ↔ parse symmetry を BR として明文化。`escapeTableCell` から `\` → `\\` 段を削除し、parser 側 (`splitMarkdownRow`) と対称化 (Option 1)。allowed cell character set に literal `\` を含めることを spec レベルで宣言し、trace chain (REQ → Spec → Code → Test) を round-trip identity property test に対して閉じる |

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0014~0015 (prototyping.yaml preflight gate, recommendation schema gate) 追加
- adopted: US-0013-0008, AC-0013-0008~0009 追加
- adopted: US range 更新 US-0013-0001..US-0013-0008
- rationale: v1.7.13 sddPreflight.ts に prototyping.yaml 存在チェックと recommendation schema validation が追加された実装の仕様反映

## v1.8.1 (2026-04-22) — Preflight Side Artifact Neutrality

- updated: REQ-0014~0015 / US-0013-0008 / AC-0013-0008~0010 を current implementation に再同期
- removed: prototyping.yaml 必須 preflight blocker 前提
- rationale: `packages/qfai/src/core/discussionPack.ts` が side artifact requiredness を廃止し、`packages/qfai/src/core/preflight/sddPreflight.ts` は markdown readiness を主 blocker として扱うため
