# 04 Business Rules

## BR-0014-0001: Full-Scan Mandatory

- AC-Refs: AC-0014-0001

- `/qfai-verify` MUST always run full-scan verification.
- Do NOT use Preflight Diff or diff-only shortcuts (DR-0007 intent preserved).

## BR-0014-0002: Gate Execution Order

- AC-Refs: AC-0014-0002

- Repository gates run in stable order: format -> lint -> typecheck -> tests -> build/package.

## BR-0014-0003: Error Waiver Prohibition

- AC-Refs: AC-0014-0003

- Waivers are only for `warning` / `info` findings.
- Error-level waivers MUST be treated as failures and the root cause fixed.

## BR-0014-0004: CI Validation Mode

- AC-Refs: AC-0014-0004

- CI MUST run default/full validation: `qfai validate --fail-on error`.
- `--phase refinement` is local-only and MUST NOT be used in CI.

## BR-0014-0005: Completion Separation

- AC-Refs: AC-0014-0005

- Gate execution (devops-ci-engineer) and completion approval (completion-reviewer) MUST be separate.
- qa-gatekeeper MUST confirm gate coverage before approval.

## BR-0014-0006: UIX-VAL Async Pattern

- AC-Refs: AC-0014-0006

- All UIX-VAL validators follow `(root, config) => Promise<Issue[]>` pattern.
- Each issue includes: rule ID, severity, file path, description, fix suggestion.

## BR-0014-0007: Evidence States Must Be Truthful

- AC-Refs: AC-0014-0009

- Evidence state MUST be one of the canonical states: `captured`, `skipped`, `failed`, `missing`, `not-applicable`.
- Placeholder text (e.g., "TODO", "N/A placeholder", "TBD", "paste output here") in evidence bodies MUST be rejected as invalid.
- If evidence cannot be captured, the state MUST reflect the actual reason (skipped/failed/missing/not-applicable), not a fabricated "captured" with empty body.

## BR-0014-0008: Browser QA Findings Not Always Empty

- AC-Refs: AC-0014-0010, AC-0014-0011

- Browser QA runner MUST execute actual checks against the target — not a stub returning hard-coded empty findings.
- If no findings are detected, the result MUST include execution metadata (runner version, timestamp, target URL/surface) alongside "0 findings".
- A response with 0 findings AND no execution metadata triggers a warning for potential runner malfunction.

## BR-0014-0009: Canonical Validator Family

- AC-Refs: AC-0014-0011

- The verify workflow MUST enforce the 3-layer evaluation model (D-001) as the canonical validator family.
- Only validators registered in the canonical set are executed; unregistered validators MUST be rejected with an error.
- The canonical set is defined by the project configuration and MUST NOT be overridden at runtime without explicit waiver.

## BR-0014-0013: Removed Compatibility Surface

- AC-Refs: AC-0014-0013

- Package surface から `validators/legacy/` namespace を除去し、production path は canonical exports のみを利用する。
- IssueCategory は `"canonical" | "change"` のみとし、`"compatibility"` は再導入しない。
- 互換性判定は hidden shim ではなく canonical validators が返す migration errors で扱う。

## BR-0014-0014: Canonical Validator Set in Verify

- AC-Refs: AC-0014-0012

- verify が使用する runCanonicalUixValidators() は canonical.ts 経由で 12 validator functions を実行する（classification, foundation, taste, trend, threeLayerModel, forbiddenLegacyFiles, threeLayerFamilyCompleteness, scoringReady, strategy, screenContract, comparisonValidator, oqClosure）。
- verify 固有の制約: --phase refinement は local-only、CI は default/full のみ
- UIX-REV semantic reviewers は runCanonicalUixValidators() とは別に、verify skill 内で実行される

## BR-0014-0015: Stale Sidecar Migration Errors

- AC-Refs: AC-0014-0014

- Legacy `uiux/10_strategy.md` は `UIX-VAL-STRATEGY-LEGACY-FILENAME` で fail し、canonical filename への rename guidance を返す。
- Legacy 4-axis evaluation content や forbidden legacy files は `UIX-VAL-3LAYER-*` で fail し、3-layer canonical family への移行を要求する。
- warning-only compatibility window を前提にせず、stale artifacts は canonical validator family で明示的に拒否する。

## BR-0014-0016: UIX-VAL-T01 Trigger — evaluation_connection Field Present

- AC-Refs: AC-0014-0015

- UIX-VAL-T01 MUST fire with severity `error` when any 04_Sources.md Trend Scan entry omits the `evaluation_connection` field or sets it to empty string (treat empty string as missing).
- The rule MUST identify the offending entry by its source id and state the missing field name in the message.

## BR-0014-0017: UIX-VAL-T02 Trigger — evaluation_connection Resolves to Real TRD

- AC-Refs: AC-0014-0016

- UIX-VAL-T02 MUST fire with severity `error` when the value of any `evaluation_connection` does not match a TRD-XX id declared in 21_design_eval_trend_derived.md.
- Resolution is case-sensitive and uses the canonical TRD-XX regex (`TRD-[0-9]{2,}`).

## BR-0014-0018: UIX-VAL-T03 Trigger — TRD source_refs Resolves

- AC-Refs: AC-0014-0017

- UIX-VAL-T03 MUST fire with severity `warning` when any `source_refs` entry on a TRD-XX axis does not match an id present in 04_Sources.md.
- A missing `source_refs` field on an axis MUST NOT trigger T03 (that is covered by design-system completeness guidance, not traceability).

## BR-0014-0019: UIX-VAL-T04 Trigger — Visual Trend Implies Visual Axis

- AC-Refs: AC-0014-0018

- UIX-VAL-T04 MUST fire with severity `warning` when 04_Sources.md has one or more Trend Scan entries classified in a visual category (color, typography, visual motif, spacing, shape, imagery) AND 21_design_eval_trend_derived.md has zero axes whose category is visual.
- The rule MUST reference at least one contributing visual Trend Scan entry in the message.

## BR-0014-0020: UIX-VAL-DS01 Trigger — design_system.md Presence

- AC-Refs: AC-0014-0019

- UIX-VAL-DS01 MUST fire with severity `error` when the pack is UI-bearing (surface != `non-ui`) AND `uiux/12_design_system.md` does not exist on disk.
- The rule MUST NOT fire on packs with `surface: non-ui`.

## BR-0014-0021: UIX-VAL-DS02 Trigger — Required Sections Non-Empty

- AC-Refs: AC-0014-0020

- UIX-VAL-DS02 MUST fire with severity `error` when `uiux/12_design_system.md` exists but any of the required sections (`Visual Theme`, `Color Palette`, `Do's and Don'ts`) is absent, empty, or contains only placeholder text (TODO, TBD, `<placeholder>`, whitespace).
- Section detection uses ATX heading match (`## <name>`); missing heading counts as absent.

## BR-0014-0022: PROT-DS01 Trigger — designSystemCompliance Recorded

- AC-Refs: AC-0014-0021

- PROT-DS01 MUST fire with severity `error` when ALL of the following hold: (a) pack is UI-bearing, (b) `uiux/12_design_system.md` exists, (c) mode is `full-harness`, (d) `prototyping.json.scoringTrace.designSystemCompliance` is absent or not a number in [0, 100].
- PROT-DS01 MUST fire with severity `warning` when the pack is UI-bearing, `uiux/12_design_system.md` may or may not exist, mode != `full-harness`, and `designSystemCompliance` is absent.
- PROT-DS01 MUST NOT fire on non-UI packs.

## BR-0014-0023: v1.7.16 Severity Map

- AC-Refs: AC-0014-0015, AC-0014-0016, AC-0014-0017, AC-0014-0018, AC-0014-0019, AC-0014-0020, AC-0014-0021

- Canonical severity for v1.7.16 validators:
  - ERROR: UIX-VAL-T01, UIX-VAL-T02, UIX-VAL-DS01, UIX-VAL-DS02
  - WARNING: UIX-VAL-T03, UIX-VAL-T04
  - Conditional: PROT-DS01 (ERROR or WARNING per BR-0014-0022)
- Severity mapping is owned by DR-0014-v1716-01 and MUST NOT be silently overridden at runtime; overrides require an explicit config entry and a recorded waiver.

## BR-0014-0024: Non-UI Safety for v1.7.16 Validators

- AC-Refs: AC-0014-0005, AC-0014-0015, AC-0014-0016, AC-0014-0017, AC-0014-0018, AC-0014-0019, AC-0014-0020, AC-0014-0021

- All v1.7.16 validators (UIX-VAL-T01..T04, UIX-VAL-DS01, UIX-VAL-DS02, PROT-DS01) MUST produce zero issues on packs with `surface: non-ui`.
- Surface detection MUST precede file I/O for these rules (gate before open) to satisfy NFR-0004 (validation speed).
