# 07 Decisions

## DR-0012-0001: Skill-Only Public Interface

- Decision: prototyping の public interface は `/qfai-prototyping` のみとする (`iterate` / `certify` / `show-spec` を含む CLI sub-command 群はその下流)。
- Rationale: orchestration を skill に集約し、CLI/runtime surface の複雑性を除去する。

## DR-0012-0002: Mechanical Gate Moves To Validate / Verify

- Decision: 機械的評価は `qfai validate` と `/qfai-verify` が担う。
- Rationale: schema/evidence gate を deterministic に保ちつつ、実評価は skill/sub-agent に委譲するため。

## DR-0012-0003: Mandatory Screenshot + HTML Evidence

- Decision: declared screen ごとに screenshot と HTML snapshot の両方を mandatory evidence とする。
- Rationale: 見た目評価のブレを許容しても、入力 evidence の揃い方だけは機械的に担保するため。

## DR-0012-0005: Historical Runtime Narrative Superseded

- Decision: 過去の runtime-heavy wording は historical context としてのみ保持し、active execution contract には使わない。
- Rationale: 旧議論の追跡は残しつつ、現行 SSOT を skill-first posture に一本化するため。

## DR-0012-0012: 4 UX 軸固定

- Decision: 評価軸は `informationArchitecture / navigationFlow / usability / functionality` の 4 軸に固定する。旧 designQuality / originality / craft / functionality の 4 軸は廃止。
- Rationale: 主観的な visual-aesthetic 評価ではなく、UX 構造評価が AI の自発的 creative leap を誘発する。

## DR-0012-0013: Ordinal Scale 4 段階

- Decision: 各 UX 軸のスコアは `{weak, acceptable, strong, exceptional}` の 4 段階 ordinal とする。0..100 の連続スコアは廃止。
- Rationale: 数値スコアは false precision を生み reviewer 間で安定しない。ordinal は明確で AI が読みやすい。

## DR-0012-0014: MAX_ITERATIONS = 15

- Status: superseded by DR-0012-0028 (MAX_ITERATIONS = 10). See `09_delta.md` CHG-002 OP-PURGE-081.
- Decision: `MAX_ITERATIONS = 15` を code constant として `iteration.ts` で固定する。設定可能にしない。
- Rationale: 仕様の決定論性を担保し、ユーザ環境差で stop 条件が揺れるのを防ぐ。

## DR-0012-0015: Best-Of-History 廃止

- Decision: best-of-history を持たず、最新 iter が常に accepted となる。`acceptedIterationIndex === iterations.length - 1`。
- Rationale: AI が radical reinvention 試行で罰されない採用ロジックが creative leap を誘発する。

## DR-0012-0016: 完了は決定論 CLI Exit Code

- Decision: 完了判定は `qfai prototyping iterate --cycle <n>` の exit code (0/64/65/2) と `qfai prototyping certify --check` (exit 0) のみで行う。LLM 主観 DONE は禁止。
- Rationale: AI が「完成した気がする」で完了宣言する shallow success narrative を防ぐ。

## DR-0012-0017: Generator と Evaluator は別 Sub-Agent

- Decision: generator (product-experience-architect) と evaluator (product-surface-reviewer) は別 sub-agent identity とする。同一 Claude による両方担当は禁止。
- Rationale: 自己評価バイアス (self-preference bias) を排除する。

## DR-0012-0018: Per-Iter Evidence は最小構成

- Status: superseded by DR-0012-0029 (`iter-NN/spec-NNNN/<screen>.review.json` only; PNG / HTML / interaction.json は廃止). See `09_delta.md` CHG-002 OP-PURGE-082.
- Decision: per-iter evidence は `<screen>.png` + `<screen>.html` + `review.json` の 3 種のみ。`screenshots/` / `html/` 等の subdir / `breakthrough.json` / `concept.json` 等の sidecar は禁止。
- Rationale: iter cost を低く保ち、scrap-and-redo が安価になる。

## DR-0012-0019: SKILL.md ≤ 130 行

- Decision: `qfai-prototyping/SKILL.md` は 130 行以内、references 5 ファイル合計 ≤ 410 行とする。
- Rationale: AI agent が skill を一読で理解できるサイズに収め、読み飛ばしを防ぐ。

## DR-0012-0020: Root DESIGN.md を Brand SSOT に採用

- Decision: root `DESIGN.md` を brand vision / visual identity の SSOT とし、SDD Phase 0 で sha256 を `.qfai/contracts/design/DESIGN.md.lock.yaml` に凍結する。
- Rationale: 旧 brand-design.yaml / exploration-brief.yaml の散在を解消し、AI が読む参照源を 1 箇所に集約する。

## DR-0012-0021: Layout-Anti-Pattern (lap-\*) を採用

- Decision: visual slop pattern (slop-001..010) の代わりに layout anti-pattern (`lap-001..008`) を catalog として採用する。
- Rationale: visual aesthetic は主観的すぎる。layout structure 失敗 (orphan page / dead-end / broken back) は客観評価可能。

## DR-0012-0022: findDesignMdViolations は Pure Deterministic 関数

- Decision: `findDesignMdViolations(html, designMd)` は pure (no I/O, no clock) かつ deterministic (same input → same output) とする。実装は `packages/qfai/src/core/prototyping/designMdViolations.ts`。
- Rationale: validator として再現可能な振る舞いを担保し、テストが flaky にならない。

## DR-0012-0023: Handoff design-system.yaml は DESIGN.md Mirror

- Decision: `prototype-handoff.yaml#extractedDesignSystem` が指す `design-system.yaml` は root `DESIGN.md` token tables の deterministic byte-equivalent mirror とする。final iter HTML から抽出しない。
- Rationale: brand SSOT (DESIGN.md) と実装入力 (design-system.yaml) のズレを構造的に防ぐ。

## DR-0012-0024: Cycle ≥ 1 Hash Mismatch は Exit 2 で Halt

- Decision: cycle ≥ 1 で `sha256(DESIGN.md) !== prototyping.json#designMdSha256` を検出した場合、exit 2 で halt し再実行を強要する。
- Rationale: brand SSOT が途中変更されたら過去 iter の評価が無意味になるため、cycle 0 から再実行を強制する。

## DR-0012-0025: 互換 Layer は作らない (破壊的変更)

- Decision: 旧 v1.x (mode / fullHarness / scoringTrace / round funnel / allReviewerAxesPerfect100) との後方互換 layer は構築しない。
- Rationale: 破壊的変更前提で進める方が AI 実装にも人間理解にも明確。互換 layer は隠れた技術的負債を生む。

## DR-0012-0026: Multi-spec per invocation (resolveAllUiBearingSpecs)

- Decision: `/qfai-prototyping` の 1 回の実行で、consumer project の全 UI-bearing spec を `resolveAllUiBearingSpecs()` で resolve し、一括で prototyping 駆動する。旧 `resolvePrimaryPrototypingSpec` (per-invocation primary-spec selection prompt) は廃止。
- Rationale: User direction 2026-05-18 / SRC-0001. Discussion-pack OQ-0009 Option A (mid-run additions deferred) と整合。ユーザ要望「全 UI 仕様を一度で試したい」を満たす。
- Options considered:
  - A) Multi-spec resolver per invocation (selected).
  - B) Keep primary-spec selection per invocation (rejected — fails the directive).
  - C) Multi-tenant (multiple consumer projects per invocation; rejected — out of scope, discussion-pack 05_Scope.md item 5).
- References: REQ-0001, US-0012-0109, AC-0012-0037, BR-0012-0028, discussion-pack OQ-0001 / OQ-0009 resolutions.

## DR-0012-0027: Reviewer-driven Playwright session (no scripted interaction)

- Decision: Reviewer sub-agent は評価時に自分で Playwright (or equivalent harness) を起動し、人間的な操作 (click / type / navigate / scroll) を行ったうえで qualitative impression を `<screen>.review.json` に記す。事前生成された scripted interaction transcript も AC selector / assertion も生成しない。
- Rationale: User direction 2026-05-16 follow-up / SRC-0007. 目的は「reviewer が実際に操作した感覚」を取り込むこと。reproducibility は qualitative-only 評価の対価として deprioritize する (Constraints TC-6)。
- Options considered:
  - A) Reviewer-driven Playwright session (selected).
  - B) Scripted interaction generator + capture + post-hoc reviewer score (rejected — user requested live operation feel).
  - C) Capture-only with no Playwright operate (rejected — fails REQ-0003 operability sensing).
- References: REQ-0003, REQ-0004, US-0012-0110, US-0012-0111, AC-0012-0040, BR-0012-0030, discussion-pack OQ-0005 resolution.

## DR-0012-0028: MAX_ITERATIONS = 10 (cycles 0..9)

- Decision: 反復 budget は 10 サイクル (cycle 0 + cycles 1..9)。`MAX_ITERATIONS = 10` / `MAX_ITERATION_INDEX = 9` を `core/prototyping/iteration.ts` の sole SSOT とし、validators `QFAI-PROT-005` / `QFAI-PROT-006` および fixtures / tests / skill docs を atomic に追従させる。DR-0012-0014 (15-cycle) は supersede。
- Rationale: User direction 2026-05-16 / SRC-0001 「10 サイクル」明示指示。multi-spec 化により総 reviewer LLM cost が増えるため、上限を縮める方向で整合。
- Options considered:
  - A) 10 cycles (selected).
  - B) 15 cycles (rejected — user direction).
  - C) Per-spec extension on lag (rejected — discussion-pack OQ-0001 Option A: hard-fail with lagging spec named).
- References: REQ-0002, US-0012-0118, AC-0012-0038, AC-0012-0039, BR-0012-0029, discussion-pack OQ-0001 resolution.

## DR-0012-0029: No PNG / HTML / interaction.json capture (review.json only)

- Decision: per-iter evidence は `iter-NN/spec-NNNN/<screen>.review.json` のみ。`.png` / `.html` / `.interaction.json` は書かない。Path helpers と stale cleanup は per-spec 階層に追従する。DR-0012-0018 (PNG + HTML + review.json) は supersede。
- Rationale: Reviewer-driven Playwright (DR-0012-0027) のもとでは「動作中の感覚」を reviewer が直接 review.json に書き取るため、reproducibility 目的の still capture は不要。iter cost / FS noise / stale cleanup 複雑度を同時に下げる。OQ-0006 Option A の path 設計を採用。
- Options considered:
  - A) `iter-NN/spec-NNNN/<screen>.review.json` only (selected).
  - B) Flat `iter-NN/<spec-NNNN>-<screen>.review.json` (rejected — path parsing が複雑化).
  - C) Per-spec subtree with cycle counter per spec (rejected — cycle-counter invariant が破れる).
- References: REQ-0008, US-0012-0114, AC-0012-0046, BR-0012-0030, BR-0012-0035, discussion-pack OQ-0006 resolution.

## DR-0012-0030: 量的 AC-pass / transition-pass 閾値は廃止 (qualitative-only)

- Decision: convergence 判定から quantitative AC-pass% / transition-pass% 閾値を完全に除去し、4 ordinal UX axes (all exceptional) AND `layoutAntiPatternsDetected[]` empty AND `designMdViolations[]` empty を、全 `(spec, screen)` ペアに対し AND 集約する qualitative-only 判定に統一する。lagging spec は cycle 9 hard-fail 時に aggregator record に必ず列挙される。
- Rationale: User direction 2026-05-18 / SRC-0007 「design や操作感は数値で追わない」明示指示。OQ-0005 Option A (prose AC のみで reviewer に十分; selector / assertion 拡張は不要)、OQ-0006 (Reviewer の qualitative impression が判断面) と整合。Constraints TC-6 (determinism は意図的に追わない) で対価が明示済み。
- Options considered:
  - A) Qualitative-only AND aggregator (selected).
  - B) Keep quantitative AC-pass threshold per spec (rejected — user direction).
  - C) Hybrid (qualitative gating + numeric tie-breaker; rejected — false precision を持ち込む).
- References: REQ-0005, AC-0012-0042, BR-0012-0032, Constraints TC-6, discussion-pack OQ-0005 / OQ-0006 resolutions.
