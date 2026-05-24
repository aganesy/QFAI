# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012
- Status: active
- Absorbed: former spec-0017 (CAP-0017 v2.0 single-thread evolution loop / UX-loop redesign) and former spec-0018 (round-based candidate funnel) — both subjects fully decomposed into this pack as of 2026-05-06.

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Public interface: `/qfai-prototyping`
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-prototyping` skill orchestration that resolves **every UI-bearing spec in one invocation** via `resolveAllUiBearingSpecs()` (`core/prototyping/specResolution.ts`); zero UI-bearing specs is a deterministic no-op exit 0
  - autonomous serial cycle execution `0..9` (max 10) with no per-cycle stdin prompt; `MAX_ITERATIONS = 10` / `MAX_ITERATION_INDEX = 9` is the sole SSOT in `core/prototyping/iteration.ts`
  - per spec × screen evaluation by a Reviewer sub-agent that **itself launches Playwright** and performs human-like operation (click / type / navigate / scroll) on the live prototype
  - qualitative review payload at `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` carrying short-prose `operability` / `transitionFeel` / `crossScreenContinuity` / `userStoryFeel` / `acceptanceCriteriaFeel` / `menuReachabilityFeel` impressions plus the 4 UX ordinal axes (`informationArchitecture` / `navigationFlow` / `usability` / `functionality`) on the `{weak, acceptable, strong, exceptional}` scale
  - layout-anti-pattern catalog (`lap-001-orphan-page`..`lap-008-no-back-affordance`); detection caps `informationArchitecture` at `acceptable`
  - global convergence judged **per cycle by AND across all spec × screen pairs**: all 4 axes `exceptional` AND `layoutAntiPatternsDetected` empty AND `designMdViolations` empty; quantitative AC-pass% / transition-pass% thresholds are not used
  - root `DESIGN.md` as brand SSOT, sha256 frozen at the SDD Phase 0 step in `.qfai/contracts/design/DESIGN.md.lock.yaml`
  - cycle 0 records `prototyping.json#designMdSha256` AND freezes (a) resolved `specsCovered[]` and (b) stock-photo `frozenLicenseCatalog` (allowed sources + license tiers); cycle ≥1 fail-closed on hash drift (exit 2)
  - `findDesignMdViolations(html, designMd)` pure deterministic function for color / font / radius / shadow token compliance; non-empty list blocks convergence
  - `pivotDirective: continue | refine | pivot` rules unchanged (`pivot` ⇔ 3 consecutive low-IA + latest has `lap-*`; `continue` ⇔ ≥2 of 4 axes strictly improved by `ordinalIndex`; `refine` otherwise)
  - latest iter always accepted (`acceptedIterationIndex === iterations.length - 1`); no best-of-history
  - per-iter evidence layout is **per-spec namespaced**: `iter-NN/spec-NNNN/<screen>.review.json` only (no `.png`, no `.html`, no `.interaction.json`); path helpers `iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs` descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics
  - stock-photo fill from allowlisted free sources (Unsplash, Pexels, CC0); every filled slot recorded in `prototype-handoff.yaml#imageSources[]` as `{url, license, attribution, source}`; license-verify failure (unknown license / non-allowlisted) hard-stops with exit 66
  - `qfai prototyping certify` aggregates review-payload presence **per spec** by walking the cycle-0 frozen `specsCovered[]` (`readFrozenSpecsCovered()`); any spec lacking any declared screen's `<screen>.review.json` at the accepted iter is rejected
  - deterministic hard-stop classes (no interactive recovery): (a) DESIGN.md / license-catalog lock drift → exit 2, (b) Reviewer Playwright-session failure across all reviewers for a spec × screen → exit 64, (c) license-verify failure → exit 66, (d) mid-run spec-set change → exit 2 (`specsCovered` shallow-equal check reads the frozen set; new UI-bearing specs deferred to next invocation)
  - completion is deterministic via `qfai prototyping iterate --cycle <0..9>` exit code (0 / 2 / 64 / 65 / 66)
  - `qfai prototyping certify --check` (exit 0) is the sole DONE signal
  - `design-system.yaml` is generated post-loop as a deterministic byte-equivalent mirror of `DESIGN.md` token tables (NOT extracted from final iter HTML)
  - `prototype-handoff.yaml` carries `{finalIterIndex, finalArtifact, extractedDesignSystem, implementationNotes, imageSources[]}`
  - `qfai validate --fail-on error` is the machine gate before completion
  - `/qfai-verify` PASS / REVISE is the final review gate
  - SKILL.md size budget: `qfai-prototyping/SKILL.md ≤ 130` lines; `references/iteration-loop.md ≤ 80`, `generator-prompt.md ≤ 60`, `reviewer-prompt.md ≤ 100`, `handoff.md ≤ 50`, `design-md-spec.md ≤ 120`
  - generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be different sub-agents (self-preference bias prevention)
- Out:
  - `mode` concept (`low-cost` / `standard` / `full-harness`) — purged
  - `maxCycles` / `maxIterationsByMode` configuration — purged
  - 15-cycle budget (`MAX_ITERATIONS = 15`) — purged; replaced by 10-cycle (`MAX_ITERATIONS = 10`)
  - single-prototype / primary-spec selection (`resolvePrimaryPrototypingSpec()` and the per-invocation primary-spec prompt) — purged; replaced by `resolveAllUiBearingSpecs()` over all UI-bearing specs in one invocation
  - scripted interaction generator and per-action interaction transcript (`<screen>.interaction.json`) — purged; Reviewer drives Playwright itself
  - acceptance-criteria selector/assertion synthesis from screen contracts — purged; AC-fulfilment is judged qualitatively in `acceptanceCriteriaFeel`
  - PNG screenshot evidence (`<screen>.png`) — purged
  - HTML snapshot evidence (`<screen>.html`) — purged
  - capture pipeline (separate capture role / capture sub-agent) — purged
  - quantitative AC-pass% and transition-pass% thresholds as convergence gates — purged
  - per-cycle stdin prompts / interactive recovery — purged (run is fully autonomous from cycle 0 through cycle 9)
  - mid-run cycle-0 restart on new UI-bearing spec detection — purged (additions are deferred to the next `/qfai-prototyping` invocation)
  - round-based candidate funnel (`r5 → r3 → r2 → r1`) — purged
  - polish/branch cycles, concept-anchor pre-declaration, plateau detector — purged
  - best-of-history winner retention — purged
  - `allReviewerAxesPerfect100` / weighted-total scoring — purged
  - hard-floor evaluation-rubric enforcement (`evaluation-rubric.yaml hard_floors[]`) — purged
  - active surface for `evaluation-rubric.yaml` / `evaluator-calibration.yaml` / `absorption-policy.yaml` / `selected-direction.yaml` / `brand-design.yaml` / `exploration-brief.yaml` / `reference-pool.yaml` — purged (history-only)
  - `qfai prototyping` as a public orchestration command surface — only `iterate` / `certify` / `show-spec` are public sub-commands
  - visual-aesthetic anti-slop tokens (`slop-001-shadcn-zinc`, `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`, `slop-010-rounded-2xl-shadow-lg`) as active anti-pattern set — purged

## Applicable NFR

- NFR-0001: routing policy remains centralized (orchestrator owns delegation)
- NFR-0002: specialist responsibilities stay explicit (generator ≠ evaluator)
- NFR-0003: first delegation failure hard-stops the stage
- NFR-0004 (this delta): per-cycle wall-time per spec ≤ 5 min target with soft-warning on overrun
- NFR-0005 (this delta): bounded Playwright retries (N=3, exponential backoff) before recording FAIL
- NFR-0006 (this delta): all artifacts under per-spec evidence root `.qfai/evidence/prototyping/iter-NN/spec-NNNN/`
- NFR-0007 (this delta): single SSOT for `MAX_ITERATIONS` in `core/prototyping/iteration.ts`; CI lint rejects literal `10` / `15` cycle constants outside SSOT
- NFR-0008 (this delta): autonomous run with zero stdin prompts (CI fixture asserts no-prompt completion)
- NFR-0009 (this delta): single-command operator UX produces runnable per-spec artifacts + handoff yaml without follow-up prompts
- NFR-0010 (this delta): 100% of `imageSources[]` rows carry non-empty `{url(https), license, attribution, source}` drawn from the frozen cycle-0 catalog (validator-enforced)

## Applicable Policy

- Completion is judged exclusively by `qfai prototyping certify --check` exit code; LLM subjective DONE is forbidden.
- Latest iter is always accepted; one-step regression is permitted (leap regression is the canonical creative-breakthrough path).
- root `DESIGN.md` is brand SSOT; sha256 frozen at the SDD Phase 0 step; cycle ≥1 hash mismatch halts at exit 2.
- Non-empty `designMdViolations` blocks convergence (DESIGN.md compliance gate).
- Cycle-0 freezes both (a) the resolved UI-bearing spec set and (b) the stock-photo license-class catalog; both are the SSOT for all subsequent cycles, and mid-run drift in either is treated as lock drift (exit 2).
- Mid-run additions of new UI-bearing specs are deferred to the next `/qfai-prototyping` invocation (no cycle-0 restart).
- Stock-photo compliance is machine-verifiable: license-verify failure exits 66 and is non-recoverable within the run.
- Determinism for operability / design evaluation is explicitly NOT pursued; only ordinal-axis verdicts and structural artifact presence are stable contract surfaces (freeform `*Feel` fields are not asserted for exact prose equality).
- No secrets MAY be written to any artifact under `.qfai/evidence/prototyping/`; validator scans `<screen>.review.json` and handoff yaml for common secret patterns.
- Cross-skill changes must be deletion-only or in-place schema simplification (no new sidecar / no new contract).

## Evidence Summary

- Code: `packages/qfai/src/core/prototyping/{iteration, evaluatorReview, certificate, designMdViolations, specResolution, specsCovered, licenseVerify}.ts`, `packages/qfai/src/cli/commands/prototypingIterate.ts`, `packages/qfai/src/cli/commands/prototypingCertify.ts`
- New / renamed entry points: `resolveAllUiBearingSpecs()` (replaces `resolvePrimaryPrototypingSpec()`); `licenseVerify()` (new, exit-66 gate); path helpers `iterationDirPerSpec` / `iterationReviewPathPerSpec` / `findIterationReviewFiles` / `findStaleIterDirs` / `deleteStaleIterDirs` descend into `spec-NNNN`
- Validators: `packages/qfai/src/core/validators/{prototypingEvidence, designContractReadiness}.ts`, `packages/qfai/src/core/validators/prototyping/{refIntegrity, specIdLinkage, stateGate, completionCertificate, licenseSources}.ts`; `QFAI-PROT-005` / `QFAI-PROT-006` updated to 10-cycle / `index === 9`
- Skill: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/{SKILL.md, references/{iteration-loop, generator-prompt, reviewer-prompt, handoff, design-md-spec}.md, templates/{DESIGN.md.sample, prototype-handoff.sample.yaml, design-md-lock.sample.yaml, license-catalog.sample.yaml}}`
- Contracts: `.qfai/contracts/cli/qfai-prototyping.md` (new CLI contract for `iterate` / `certify` / `show-spec`)
- Cert: `.qfai/evidence/prototyping/completion-certificate.json` aggregated per spec from cycle-0 frozen `specsCovered[]`
- CI: no-prompt CI fixture asserting `stdin`-closed completion (NFR-0008)

## Relevant Requirements

- REQ-0012-0001..0010 (legacy carry-over, retained as historical traceability identifier space)
- REQ-0012-0030: AI が iter-N で前 iter を全捨てして再構築できる pivot directive プロンプトを generator が受け取る
- REQ-0012-0031: 4 UX 軸 ordinal score と短散文 critique を reviewer が出力する
- REQ-0012-0032: 完了は (4 軸全 exceptional かつ lap = 0 かつ designMdViolations = 0) または (iter index === 9) の決定論判定
- REQ-0012-0033: best-of-history を持たず最新 iter が常に accepted
- REQ-0012-0034: lap-\* 検出時 informationArchitecture は acceptable cap
- REQ-0012-0035: per-iter evidence は per-spec namespace `iter-NN/spec-NNNN/<screen>.review.json` のみ（PNG / HTML / interaction transcript は不在）
- REQ-0012-0036: 旧 mode/funnel/polish-branch/concept-anchor/100-perfect/15-cycle/capture-pipeline の概念が QFAI 全 codebase から物理削除されている
- REQ-0012-0037: SKILL.md ≤ 130 行、references 5 ファイル合計 ≤ 410 行
- REQ-0012-0038: root `DESIGN.md` を brand SSOT として SDD Phase 0 で sha256 凍結し、`/qfai-prototyping` cycle ≥1 で hash 不一致を exit 2 で検出
- REQ-0012-0039: 評価軸を informationArchitecture / navigationFlow / usability / functionality に固定
- REQ-0012-0040: pure-fn `findDesignMdViolations` で color / font / radius / shadow token 逸脱を検出
- REQ-0012-0041: handoff `design-system.yaml` は `DESIGN.md` token の deterministic mirror
- REQ-0012-0042: `/qfai-prototyping` は `resolveAllUiBearingSpecs()` により 1 invocation で全 UI-bearing spec を解決する（primary-spec selection prompt 廃止）
- REQ-0012-0043: 反復予算は 10 cycle（`MAX_ITERATIONS = 10` / `MAX_ITERATION_INDEX = 9`、SSOT は `core/prototyping/iteration.ts`、validator `QFAI-PROT-005`/`006` 同期更新）
- REQ-0012-0044: Reviewer サブエージェントが自身で Playwright を起動し、spec × screen 毎に人手相当の操作を行う（scripted interaction generator は不在）
- REQ-0012-0045: `<screen>.review.json` に `operability` / `transitionFeel` / `crossScreenContinuity` / `userStoryFeel` / `acceptanceCriteriaFeel` / `menuReachabilityFeel` の短散文を 4 UX 軸 ordinal と併記する
- REQ-0012-0046: 収束判定は 全 spec × screen ペアの (4 軸 = exceptional AND lap = 0 AND designMdViolations = 0) の AND（quantitative AC-pass% / transition-pass% は不使用）
- REQ-0012-0047: 画像スロットは allowlist された無料 stock-photo から充填し、`prototype-handoff.yaml#imageSources[]` に `{url, license, attribution, source}` を記録する。license-verify 失敗は exit 66 hard-stop
- REQ-0012-0048: cycle 0..9 を fully autonomous で実行し、hard-stop class を (a) lock drift / (b) Reviewer Playwright failure / (c) license-verify failure / (d) mid-run spec-set change の 4 種に固定する
- REQ-0012-0049: iter-dir layout を `iter-NN/spec-NNNN/<screen>.review.json` のみとし、path helpers (`iterationDirPerSpec` / `iterationReviewPathPerSpec` / `findIterationReviewFiles` / `findStaleIterDirs` / `deleteStaleIterDirs`) を `spec-NNNN` まで descend させる
- REQ-0012-0050: `qfai prototyping certify` は frozen `specsCovered[]` を読み、各 spec の宣言 screen に対する `<screen>.review.json` 存在をループ検証する（欠落で reject）
- REQ-0012-0051: Reviewer は run 内で各 primary menu entry point を 1 度以上操作し、結果を `menuReachabilityFeel` に反映する（到達不能は qualitative critique として表面化し hard-fail しない）
- REQ-0012-0052: cycle 0 で (a) resolved spec set と (b) stock-photo license-class catalog の両方を凍結し、cycle ≥1 はこれを SSOT として参照する。mid-run の新 UI-bearing spec 追加は次 invocation に deferred
- REQ-0012-0053: 5 min/spec の per-spec time-budget cap を soft-warning として運用する（`<screen>.review.json#softWarnings.timeBudget` 出力。run 単位 hard-fail には昇格しない）
- REQ-0012-0054: Reviewer Playwright action は N=3 retries（指数 backoff）で transient failure を吸収し、retry count と最終結果を `<screen>.review.json` に記録する

## v1.9.1 Defect Remediation (REQ-0012-NNNN)

Absorbed from `.qfai/discussion/discussion-20260523221141355/06_REQ.md` (CHG-005, 2026-05-24). All entries are UPDATE:APPEND under pinned-branch authorization. The 9 deferred OQ decisions cited below are pinned by the orchestrator; AC / BR / EX / TC rows below MUST reflect them.

- REQ-0012-0055 (REQ-0101): Tailwind ↔ gate alignment at the source. `findDesignMdViolations` MUST satisfy the OQ-0103 compound remedy = **β (preflight literal allowlist) + γ (gate scope narrowed to `<body>` only)**. The shipped `generator-prompt.md` and scanner MUST be paired such that an iter authored to the new envelope contract produces zero `designMdViolations[]` for the explicit preflight literals enumerated in the source pack §B-4 / §3.
- REQ-0012-0056 (REQ-0103): `scanFonts`, `scanRadius`, `scanShadow` MUST import and apply `unwrapVarReference(declarationValue, rootDeclarations)` consistently with `scanColors`. `font-family: var(--font-sans)` MUST resolve to the underlying `:root` declaration before safety judgment.
- REQ-0012-0057 (REQ-0104): `SAFE_LITERALS` MUST include the CSS-wide keywords `inherit`, `initial`, `unset`, `revert`, `currentColor`. Each keyword × each scanner combination MUST produce zero `designMdViolations[]` entries.
- REQ-0012-0058 (REQ-0105): Per OQ-0104 = **Option B**, the input filter MUST strip the broader `--*-shadow*:` custom-property declaration pattern (covers `--shadow-*:`, `--card-shadow:`, `--btn-shadow-hover:`, etc.) when the value contains `rgba()` / `rgb()` literals, mirroring existing `box-shadow:` handling.
- REQ-0012-0059 (REQ-0106): Per OQ-0105 = **Intl.Segmenter + OR-fallback**, `countWords` MUST use `Intl.Segmenter('ja', { granularity: 'word' })` for primary CJK segmentation AND accept the OR-fallback `200..500 words OR 600..2500 characters` band for QFAI-PROT-002. Japanese fixture (800–1500 chars) passes; English fixture (200–500 words) continues to pass with no regression; error text on out-of-band MUST name both the count form measured and the band used.
- REQ-0012-0060 (REQ-0108): `prototyping.execution.browserTool` MUST accept both `"playwright"` and `"playwright-cli"` during the deprecation window. `assets/init/qfai.config.example.yaml` documented default MUST be `"playwright"`. At sunset only `"playwright"` is accepted.
- REQ-0012-0061 (REQ-0109): `qfai prototyping iterate` MUST accept the opt-in `--capture` flag (default OFF). When passed, iterate drives Playwright per the Capture contract in `iterate-plan.json` (per-screen `viewport: { width, height }`, `deviceScaleFactor`, `waitUntil`, `htmlSourceCopy: boolean`) and writes `iter-NN/<screen-id>.{png,html}` for every `screens[]` entry. When `htmlSourceCopy: true`, iterate MUST copy source HTML from `.qfai/prototypes/iter-NN/<screen-id>.html` (NOT `page.content()`) to avoid runtime style-block injection. Default-OFF posture preserves `DR-0012-0029` (no PNG / HTML / interaction capture); amendment is pinned by `DR-0012-0031` (parallel agent assignment).
- REQ-0012-0062 (REQ-0110): `qfai prototyping iterate` MUST accept the opt-in `--auto-serve` flag (default OFF). When passed, iterate MUST spawn a local HTTP server on the configured / `targetUrl`-derived port, MUST manage child processes via `tree-kill` (Linux/macOS) or `taskkill /F /T` (Windows), MUST tear down on SIGINT, and MUST recover from a stale port-bound prior iterate by force-killing the prior owner. When the prior owner is NOT a previous iterate (foreign process), iterate MUST refuse to kill it and MUST report the PID + owning command to the operator. Default-OFF posture preserves `DR-0012-0029`; amendment is pinned by `DR-0012-0031`.
- REQ-0012-0063 (REQ-0111): On iteration completion, `iterate` MUST write `iterations[i]` with non-null `commitSha` (sentinel `"uncommitted"` accepted when no HEAD commit applies), non-empty `proseCritique`, `scores`, `layoutAntiPatternsDetected`, `designMdViolations`, `pivotDirective`, `reviewerId`, and `evidenceRefs[]` (entries shaped `{ kind: "screenshot" | "html", path: "iter-NN/<screen-id>.<ext>" }` for every declared `screens[].id`). On convergence (exit 64), `iterate` MUST set top-level `acceptedIterationIndex` and `stopReason ∈ {"axes-exceptional", "max-iterations", "license-verify-fail", "input-error"}`. `qfai validate --profile prototyping --fail-on error` MUST PASS on a converged iterate output without orchestrator post-processing.
- REQ-0012-0064 (REQ-0112): Per OQ-0107 = **Option B**, `verify.json` MUST gain a `scope: "prototyping" | "atdd" | "full"` field. `qfai prototyping certify --check` MUST return exit 0 when `scope: "prototyping"` is satisfied, WITHOUT requiring `/qfai-atdd` or `/qfai-implement` artifacts. The resulting `completion-certificate.json` MUST explicitly record `scope: "prototyping"` and MUST NOT claim full DONE; full DONE retains the original full `/qfai-verify` PASS gate.
- REQ-0012-0065 (REQ-0114): Per OQ-0108 = **Option A**, the public skill surface MUST be realigned to single-spec language: `SKILL.md` MUST remove all multi-spec narratives and `resolveSurfaceUnion()` MUST be removed from the public skill surface (kept internal-only for cycle ≥ 1 drift gate). The surface MUST be self-consistent at HEAD (doc-vs-impl drift closed).
- REQ-0012-0066 (REQ-0116): On convergence (exit 64), `iterate` MUST mirror accepted-iter content into `.qfai/evidence/prototyping/screenshots/<screen-id>.png` and `.qfai/evidence/prototyping/html/<screen-id>.html` for every `screens[]` entry. Per OQ-0110 = **Option A**, the screen-id casing MUST be **normalized to underscore** end-to-end (iterate emit → validator expectation → contract `screens[].id` → aggregate-dir filename).
- REQ-0012-0067 (REQ-0117): `qfai prototyping iterate --cycle 0` MUST refuse to run when `.qfai/evidence/prototyping/iter-00/` is non-empty unless `--force` is passed. On refusal the error MUST name the existing evidence path and the recovery snippet `cp -r iter-00 iter-00.backup-<ISO> && qfai prototyping iterate --cycle 0 --force`. When `--force` is passed, iterate MUST move existing `iter-00/` to `iter-00.backup-<ISO>/` BEFORE invoking `clearEvidenceIterDirs`, so evidence is recoverable. Backup integrity (byte-equivalence of `iter-00/` ↔ `iter-00.backup-<ISO>/` pre-clear) is contract-level guaranteed.
- REQ-0012-0068 (REQ-0118): On every non-converged cycle, `iterate` MUST print a one-screen summary naming the top-3 categories blocking exit-64 with concrete offenders: `designMdViolations` (count + first offender `kind=color,…,path,line`), `layoutAntiPatternsDetected` (count + first lap code), `axes-below-exceptional` (axis name + current ordinal). The summary follows the canonical form `[BLOCKED] exit-64 prevented by: N designMdViolations (top: …), M anti-patterns (top: lap-NNN), K axes below exceptional (axis: ordinal)`.
- REQ-0012-0069 (REQ-0119): When `primarySpecId` validation rejects an input, the error text MUST read literally `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received <input>`. Per OQ-0112 = **SHOULD normalize**, `iterate` SHOULD also accept `1` / `"1"` / `"01"` / `"0001"` on input and normalize internally to `spec-0001`; when the SHOULD is shipped, the error appears only when the value is wholly unparseable as a positive integer ≤ 9999.
- REQ-0012-0070 (REQ-0121): After capture, `iterate` MUST compute md5 of each PNG; ≥ 2 identical md5s among distinct declared `screens[].id` entries MUST surface a layout anti-pattern `lap-009: duplicate-capture`. Additionally, iterate MUST verify that for every `screens[].id`, the generated HTML SPA contains a hashchange route or path-based route reachable by `targetUrl#/<route>` or `targetUrl/<route>`; missing routes MUST surface `lap-010: missing-route`. Per OQ-0109 = **advisory-failing**, both `lap-009` / `lap-010` are severity `error` with mandatory Reviewer `justification:` text required for any override.
- REQ-0012-0071 (REQ-0123, SHOULD): `qfai prototyping iterate --license-patch <file>` SHOULD accept an add-only diff to the frozen license catalog and write the result back as the new frozen catalog, with an audit row in `prototyping.json#licensePatchAudit[]`. Deletions and modifications MUST be rejected with the hint to use the cycle-0-restart path. Full unfreeze automation remains deferred.
- REQ-0012-0072 (REQ-0128, SHOULD): `iterate` SHOULD write `iter-NN/iterate-context.json` summarizing the prior cycle's decisions for the next subagent invocation, schema `{ priorCycle: N, priorScores: {...}, openBlockers: [...], priorTailwindContract: "..." }`. The hint is advisory and orthogonal to `prototyping.json` (REQ-0012-0063).
- REQ-0012-0073 (REQ-0129, SHOULD): When `iterate --cycle N` is invoked with N outside `0..9`, the error text MUST read literally `--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.` and SHOULD recommend `--cycle 9 --check-convergence` or the equivalent peek mode.

### v1.9.1 NFR absorption (folded into BR-0012-0041..0059)

- NFR-0102: 3-cycle convergence p95 on the canonical fixture pack (Tailwind ↔ gate alignment + `var()` unwrap + SAFE_LITERALS shipped together).
- NFR-0103: Blocking-cause categories enumerated by REQ-0012-0068 are stable named identifiers; new categories are additive only.
- NFR-0104: Zero-script LOC in the shipped `references/handoff.md` aggregate path (operator does not hand-author capture / serve scripts).
- NFR-0106: `--auto-serve` MUST NOT kill foreign processes (BR-protected; verified by integration test).
- NFR-0107: `--capture` per-screen budget cap 30s (soft warning if exceeded; not a hard-fail).
- NFR-0110: Scanner unit-testability ≥ 30 unit tests across `scanFonts` / `scanRadius` / `scanShadow` / `scanColors` × `unwrapVarReference` / `SAFE_LITERALS` matrix; ≥ 90% statement coverage on the scanner module.
- NFR-0113: md5 duplicate detection is deterministic across re-runs (same screen set → same `lap-009` finding set).
- NFR-0114: `--cycle 0 --force` backup integrity verified by byte-equivalent pre/post comparison.

## Entry points

- US range: US-0012-0001..0108 retained as the legacy traceability identifier space; v2.0 / UX-loop active narratives occupy the upper end (US-0012-0098..0108). Legacy v1.x mid-range narratives were purged — see `09_delta.md` CHG-001 OP-PURGE-001..007.
- AC range: AC-0012-0001..0036; baseline AC retained, the v2.0 / UX-loop active block lives at AC-0012-0020..0036, and the intermediate legacy v1.x block was purged — see `09_delta.md` CHG-001 OP-PURGE-001..009.
- BR range: BR-0012-0001..0027; baseline BR retained, the v2.0 / UX-loop active block lives at BR-0012-0017..0027, and the intermediate legacy v1.x block was purged — see `09_delta.md` CHG-001 OP-PURGE-010..015.
- EX range: EX-0012-0001..0121; baseline EX retained, the v2.0 active block lives at EX-0012-0110..0121, and the intermediate legacy v1.x examples were purged — see `09_delta.md` CHG-001.
- TC range: TC-0012-0001..0353; baseline TC retained, the v2.0 active block lives at TC-0012-0319..0353, and legacy v1.x test cases (executionPlan / Lighthouse / designSystemCompliance / calibration overrides / fullHarness / scoringTrace / iterationBudget / perfect-100 / hard-floor) were purged — see `09_delta.md` CHG-001 OP-PURGE-040..042.
- TDD range: TDD-0001..0370; the v2.0 active block lives at TDD-0336..0370. Legacy ledger rows that referenced purged TCs were removed in the same 2026-05-06 cleanup.
- Primary actors: orchestrator, product-experience-architect (generator), product-surface-reviewer (evaluator with Reviewer-driven Playwright session). The former dedicated capture role (`devops-ci-engineer`) is no longer an active prototyping participant — capture pipeline is purged.
