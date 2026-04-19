<!-- markdownlint-disable-file MD024 -->

# 08 Open Questions

3 resolved, 2 deferred. (rev8 adds 4 resolved; cumulative: 13 resolved, 2 deferred; v1.7.16 adds 3 deferred-to-TDD)

## OQ-0004: Parameterized Route Matching Strategy (resolved)

- Status: Resolved at SDD
- Resolution: DR-0012-0027 — パターンベースマッチング（Option B）を採用
- Source: discussion-20260414195449523

## OQ-0006: L2 Heuristic Complete Deprecation (deferred)

- Status: Deferred to v1.8
- Rationale: 構造化パース優先は v1.7.15 rev4 で実施。ヒューリスティック完全廃止は v1.8 で対応
- Source: discussion-20260414195449523

## OQ-0002: prototyping.yaml Surface Field Validation (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0033 — validator reject のみ採用（schema 変更なし）
- Source: discussion-20260415014056471

## OQ-0004-rev5: Parameterized Route Mapping in Browser QA (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0034 — パターンベースマッチング（Option B）採用
- Source: discussion-20260415014056471

## OQ-0006-rev5: packResolver.ts Error Type Design (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0035 — PrototypingError 派生型（Option A）採用
- Source: discussion-20260415014056471

## OQ-0005: L2 Full Redesign Scope (deferred to v1.8)

- Status: Deferred to v1.8
- Rationale: rev5 では structured parse 優先 + fallback 格下げで最小整合。L2 完全刷新は v1.8 planning phase で対応
- Source: discussion-20260415014056471

## OQ-0001-rev7: packHash in calibrationRef (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0041 — defer packHash; packPath+packVersion+configPath sufficient
- Source: discussion-20260415203030886

## OQ-0002-rev7: Error Class Location (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0042 — prototyping/errors.ts (SRP; independently testable)
- Source: discussion-20260415203030886

## OQ-0003-rev7: configPath Mandatory vs Optional (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0043 — optional (configPath?: string); validator skips when absent
- Source: discussion-20260415203030886

## OQ-0004-rev7: Obsolete Field Detection Timing (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0044 — normalize-time; consistent with existing config.ts patterns
- Source: discussion-20260415203030886

## OQ-0005-rev7: surfacePolicy Rejection Message Generation (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0045 — generate from PROTOTYPING_SUPPORTED_SURFACES constant; DRY
- Source: discussion-20260415203030886

## OQ-0001-rev8: pathUtils.ts as New File vs Inline Helpers (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0046 — standalone leaf module pathUtils.ts (Option A); no import from execution.ts or its importers (circular import prevention)
- Source: discussion-20260416023323603

## OQ-0002-rev8: measurement.ts Scope (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0047 — include measurement.ts conditionally; update to shared helpers only if confirmed to use absolute paths (conservative scope)
- Source: discussion-20260416023323603

## OQ-0003-rev8: runtimeGate.evidenceRefs Empty Array Policy (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0048 — fail-closed: empty array runtimeGate.evidenceRefs is always a validator error; no valid case for empty array in full-harness UI-only output
- Source: discussion-20260416023323603

## OQ-0004-rev8: README.md Update Scope (resolved at discussion)

- Status: Resolved at discussion
- Resolution: Update README.md only if existing description is absent or obsolete. No new DR required; conditional update confirmed in discussion-20260416023323603 OQ-0004 resolution.
- Source: discussion-20260416023323603

## OQ-0001-rev9: ui[] Row Validation Location (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0049 — inline in prototypingEvidence.ts (Option A); design doc §6-1-2 confirms prototypingEvidence.ts as the changed file
- Source: discussion-20260416092414328

## OQ-0002-rev9: browserQaEvidenceRefs[] Empty Array Policy (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0050 — always error (Option A); fail-closed §3-2 + rev8 OQ-0003 precedent
- Source: discussion-20260416092414328

## OQ-0003-rev9: Axis-Level Validation Granularity (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0051 — per-axis validation (Option A); design doc §6-1-3 per-element requirement
- Source: discussion-20260416092414328

## OQ-0004-rev9: README Update Scope (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0052 — full enumeration (Option A); DoD §5-6 requires full docs/validator mismatch elimination; design doc §9 prohibits minimal-note workaround
- Source: discussion-20260416092414328

## OQ-0001-rev9: ui[] Row Validation Location (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0049 — inline implementation in `prototypingEvidence.ts`; no separate utility file. Option A adopted per design doc §6-1-2.
- Source: discussion-20260416092414328

## OQ-0002-rev9: browserQaEvidenceRefs[] Non-Empty Policy (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0050 — always required non-empty (fail-closed). Option A adopted per design doc §3-2, §3-3, and rev8 OQ-0003 precedent.
- Source: discussion-20260416092414328

## OQ-0003-rev9: Axis-Level Validation Granularity (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0051 — per-axis validation; any axis with empty evidenceRefs is an error. Option A adopted per design doc §6-1-3.
- Source: discussion-20260416092414328

## OQ-0004-rev9: README Update Scope (resolved at discussion)

- Status: Resolved at discussion
- Resolution: DR-0012-0052 — full enumeration of all concrete-ref leaf fields. Option A adopted per DoD §5-6 and design doc §9 prohibition.
- Source: discussion-20260416092414328

## OQ-0002-rev10: refSemantics.ts new file vs pathUtils.ts extension (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0054 — extend pathUtils.ts with assertConcreteArtifactRefs() (array helper). No new refSemantics.ts. Trigger for extraction: reuse across 3+ files.
- Source: discussion-20260416195444737 OQ-0002 (deferred from discussion to SDD)
- Resolved by: SDD phase for discussion-20260416195444737

## OQ-0001-rev11: PerSpecCoverage Dead Fields (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0057 — Delete `apiEndpoints` and `dbObjects` dead fields from `PerSpecCoverage` type; retain only `uiRoutes`. No backward-compatible stub; fail-closed.
- Source: discussion-20260417072340789 OQ-0001 (deferred from discussion to SDD)
- Resolved by: SDD phase for discussion-20260417072340789

## OQ-0004-rev11: specCoverage/refSemantics Test File New vs Extend (resolved at SDD)

- Status: Resolved at SDD
- Resolution: DR-0012-0058 — Policy: "new if absent, extend if present". Create new test file when none exists; extend existing test file when it already covers the module.
- Source: discussion-20260417072340789 OQ-0004 (deferred from discussion to SDD)
- Resolved by: SDD phase for discussion-20260417072340789

## OQ-0003-v1716: T1 日本語フォント対応検証 (deferred to TDD)

- Status: Deferred to TDD
- Rationale: awesome-design-md-jp（CJK 版）の品質・網羅性は H3 仮説検証タスクで明らかになる。現時点では方針のみ決定可能（SKILL.md で Noto Sans JP をフォールバックとして明記する）。
- Severity: medium — 日本語プロジェクトでの DESIGN.md 品質に影響。英語プロジェクトには影響なし。
- Mitigation: Noto Sans JP を default fallback として SKILL.md に明記。
- Source: discussion-20260418093755100 OQ-0003（SRC-0001 Section 8.1 T1）

## OQ-0005-v1716: T4 CSS 値自動抽出精度（Tailwind CSS v4） (deferred to TDD)

- Status: Deferred to TDD
- Rationale: Tailwind CSS v4 は CSS-first 設計で従来の tailwind.config.js とは異なるトークン管理方式を採用するため、抽出精度は TDD フェーズでの実証が必要。
- Severity: medium — CSS 値抽出失敗時は `designSystemCompliance` スコアが算出不能となり、関連バリデータ（`PROT-DS01` 相当）が機能しない。
- Mitigation: CSS 変数（`--color-*` 等）の正規表現抽出を主手法とし、tailwind.config.js をフォールバックとする設計を TDD で検証。
- Source: discussion-20260418093755100 OQ-0005（SRC-0001 Section 8.1 T4）

## OQ-0006-v1716: T7 カラー変換アルゴリズム精度 (deferred to TDD)

- Status: Deferred to TDD
- Rationale: oklch 変換ルール（例: Lightness+15%, Chroma-20%）の美的妥当性は H3 仮説段階。実装後の実証が必要。
- Severity: low — 変換アルゴリズムが不適切な場合、生成カラーパレットが意図ビジュアルトーンと乖離する可能性。
- Mitigation: SKILL.md に「変換値は参考値。カラー値の最終チェックは Evaluate ステップで実施」と明記。
- Source: discussion-20260418093755100 OQ-0006（SRC-0001 Section 8.1 T7）
