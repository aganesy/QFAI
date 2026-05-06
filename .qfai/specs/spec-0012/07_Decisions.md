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
