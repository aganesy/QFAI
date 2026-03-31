# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0006 初回作成
- Tags: prototyping, ui-fidelity, dom-crawling, jsdom
- Summary: qfai prototyping コマンドのスペック一式を新規作成

## Rationale

- UI コントラクトとプロトタイプ実装の整合性を自動検証する機能が必要
- フロントエンドの UI フィデリティ証跡を CI/CD パイプラインで継続的に検証可能にする

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）
3. jsdom による DOM クローリング方式
4. Puppeteer/Playwright 等のブラウザ自動化ツール

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: 各 spec が独立したディレクトリとして管理され、prototyping 固有の UI コントラクト連携を明確にスコープ化できる
- Evidence: specs/\_policies/ + specs/spec-0006/ ディレクトリ構造

---

- Adopted: jsdom による DOM クローリング方式
- Why: Node.js ネイティブで動作し、ブラウザバイナリのインストールが不要。CI 環境での依存最小化とパフォーマンス確保が可能
- Evidence: REQ-0050 で jsdom 使用が明示的に要件定義されている

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: UI コントラクト連携やエビデンス出力の複雑な構造が単一ファイル内で管理困難になる
- DO NOT: spec-pack 形式に戻さないこと。prototyping の成果物を単一バンドルファイルにまとめてはならない
- Temptation: 単一ファイルの方がシンプルに見えるが、複数 CAP のスケーラビリティが損なわれ、UI コントラクトとの連携定義が埋没する

---

- Candidate: Puppeteer/Playwright 等のブラウザ自動化ツール
- Reason: ブラウザバイナリ（Chromium 等）のダウンロードが必要で、CI 環境での依存サイズが数百 MB 増大する。起動時間もかかりパフォーマンスが低下する
- DO NOT: ブラウザ自動化ツールへの依存を導入しないこと。Puppeteer, Playwright, Selenium 等を dependencies/devDependencies に追加してはならない
- Temptation: 実ブラウザの方が SPA/CSR コンテンツの解析精度が高く正確だが、CI 環境での依存増大（Chromium ~400MB）とパフォーマンス低下（ブラウザ起動 2-5 秒）が課題。初期スコープは SSR/静的 HTML に限定することで jsdom で十分対応可能

## Impact

- Affects: `.qfai/specs/spec-0006/` 配下の全ファイル、`package.json`（jsdom 依存追加）
- Validation: 全テストケース（TC-0006-0001..TC-0006-0008）が pass すること

## Follow-ups

- Phase 5 実装開始
- Owner: Implementer
- Due: TBD

---

### DELTA-0004 (2026-03-30)

- **Change ID**: DELTA-0004
- **Date**: 2026-03-30
- **Primary**: Mode switch UX — discussion recommendation, precedence resolution, mode logging, non-visual surface behavior; default override from low-cost to standard
- **Tags**: v1.7.7, mode-switch-ux, precedence, logging, non-visual, DR-0084
- **Source**: qfai_prototyping_mode_switch_ux_proposal.md

#### Summary

Added US-0006-0010 through US-0006-0013, AC-0006-0016 through AC-0006-0021, BR-0006-0017 through BR-0006-0022, EX-0006-0024 through EX-0006-0040, TC-0006-0025 through TC-0006-0041.
Modified AC-0006-0009 (scoped to low-cost mode, not default), AC-0006-0015 (precedence chain default), BR-0006-0010 (precedence chain), BR-0006-0016 (system default=standard).
Added DR-0084 to 07_Decisions.md. Updated 01_Spec.md scope and US range.

#### Adopted

- System default mode changed from low-cost to standard (DR-0084 overriding DR-0080)
- Discussion artifact `prototyping.recommended_mode` field as secondary mode source
- Precedence chain: CLI --mode > discussion recommendation > system default (standard)
- Effective mode logging with structured fields (mode_source, recommended_mode, effective_mode, rationale, evidence_expectations)
- Non-visual surface handling: visual-review evidence = n/a, no browser hard dependency
- **Rationale**: qfai_prototyping_mode_switch_ux_proposal.md proposal, user approved 2026-03-30

#### Rejected

- Keep low-cost as default (DR-0080 unchanged): standard better serves majority use cases
  - DO NOT: system default を low-cost に戻さない。Temptation: static-first の方がセットアップ不要で安全
- Ignore discussion artifact recommendation (CLI-only precedence): loses artifact-driven intelligence
  - DO NOT: discussion artifact recommendation を mode 解決から除外しない。Temptation: シンプルにしたい

#### Impact

- Affects: `packages/qfai/src/cli/commands/prototyping.ts` (precedence resolver, logging), `packages/qfai/src/core/prototyping/modeRouter.ts` (discussion artifact reader), skill SKILL.md (mode contract update)
- Validation: TC-0006-0025..TC-0006-0041 must pass; existing TC-0006-0011..TC-0006-0024 must not regress

---

### DELTA-0005 (2026-03-31)

- **Change ID**: DELTA-0005
- **Date**: 2026-03-31
- **Primary**: v1.7.11 Completion Release — prototyping wording alignment with actual behavior; routing condition consistency
- **Tags**: v1.7.11, wording-alignment, routing-consistency, REQ-0019, REQ-0020
- **Source**: v1.7.11 WS-I

#### Summary

Added US-0006-0014, AC-0006-0022 through AC-0006-0023, BR-0006-0023 through BR-0006-0025, EX-0006-0041 through EX-0006-0044, TC-0006-0042 through TC-0006-0045.
Addresses REQ-0019 (align prototyping/full-harness wording with actual behavior) and REQ-0020 (ensure standard to full-harness routing conditions are consistent).

#### Adopted

- SKILL.md wording alignment obligation: all capability claims must reflect implemented behavior
- No aspirational language rule: unimplemented features must not be described as current capabilities
- Routing condition consistency rule: documented routing conditions must match implementation exactly
- **Rationale**: REQ-0019 and REQ-0020 from v1.7.11 requirements; ensures documentation trustworthiness

#### Rejected

- Allow aspirational language with no qualifier: misleads users about current capabilities
  - DO NOT: SKILL.md に未実装機能を現在の機能として記述しない。Temptation: 将来実装予定の機能を先に文書化したくなるが、ユーザーの信頼を損なう
- Implicit routing conditions (evidence-score-based auto-routing): introduces non-determinism
  - DO NOT: evidence スコアに基づく暗黙的ルーティングを導入しない。Temptation: 自動化で UX 向上を図りたくなるが、予測不能な動作になる

#### Impact

- Affects: prototyping SKILL.md (wording audit), CLI help text, mode router documentation
- Validation: TC-0006-0042..TC-0006-0045 must pass; existing TC-0006-0001..TC-0006-0041 must not regress

---

### DELTA-0002 (2026-03-10)

- **Primary**: 10_Plan.md に依存関係詳細セクション追加
- **Tags**: dependencies, spec-integration, GAP-05

#### Adopted

- spec-0001（init）+ spec-0002（validate）+ UI contract YAML の3依存を明示
- **Rationale**: prototyping の evidence.json は validate と統合されるため、スキーマ互換性の明示が必要（OQ-0005 解決）

#### Impact

- spec-0006/10_Plan.md

---

### DELTA-0003 (2026-03-30)

- **Change ID**: DELTA-0003
- **Date**: 2026-03-30
- **Primary**: v1.7.7 Remediation pass — static-first default, mode definitions, CLI mode flags
- **Tags**: v1.7.7, remediation, static-first, mode-split, cli-flags, P0-01
- **Source**: discussion-20260329195516830

#### Summary

Remediation of P0-01 (qfai-prototyping uses a runtime-heavy default contract; should default to static-first) and P1-07 (prototyping mode split is not cleanly exposed to users).
Added US-0006-0006 through US-0006-0009, AC-0006-0009 through AC-0006-0015, BR-0006-0010 through BR-0006-0016, EX-0006-0010 through EX-0006-0023, TC-0006-0011 through TC-0006-0024.
Added DR-0080, DR-0081, DR-0082 to 07_Decisions.md. Updated 01_Spec.md scope and requirements. Updated 10_Plan.md with remediation implementation phases.

#### Adopted

- Static-first as default (low-cost) mode; `--mode` flag added to CLI surface
- Three-tier mode structure: low-cost, standard, full-harness
- Full-harness routing to /qfai-prototyping-full-harness (spec-0031) rather than implementation in this skill
- **Rationale**: Addresses P0-01 audit finding from discussion-20260329195516830; aligns with REQ-0001, REQ-0003, REQ-0010

#### Rejected

- Runtime-heavy default: blocked all users without full environment setup (P0-01 finding)
- Implementing full-harness loop in this skill: duplicates spec-0031 scope

#### Impact

- Affects: `packages/qfai/src/cli/commands/prototyping.ts` (add --mode flag), skill SKILL.md (mode contract)
- Validation: TC-0006-0011..TC-0006-0024 must pass; existing TC-0006-0001..TC-0006-0010 must not regress
