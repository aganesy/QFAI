# 01 Spec

- Spec: spec-0006
- Parent: CAP-0006
- Status: active
- Consolidates: old spec-0004

## Consumer View

- Primary SSOT for execution: `spec-0006/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0041: 日本語サポート - doctor コマンドの日本語メッセージ対応
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: doctor コマンド実行結果の診断出力スナップショット（テキスト / JSON）

## Relevant Requirements

- REQ-0030: 診断ツール - `qfai doctor` で設定ファイル、ディレクトリ構造、パス解決の診断を実行する
- REQ-0031: 診断 JSON 出力 - `qfai doctor --format json` で機械可読な診断結果を出力する
- REQ-0032: --fail-on 制御 - `--fail-on warning|error` で終了コードを制御する
- REQ-0033: --out ファイル出力 - `--out <path>` で診断結果をファイルに出力する
- REQ-0034: root 自動探索 - --root 未指定時は startDir から qfai.config.yaml を自動探索する
- REQ-0107: playwright probe primary - `qfai doctor --profile prototyping` は `node_modules/.bin/playwright` (Windows では `.cmd`/`.bat`/`.ps1` variants) を primary 候補として probe する。`npx --no-install playwright --version` は fallback。`playwright-cli` (`.cmd`/`.bat` variants 含む) は deprecation window 中 accepted で `D-DEPRECATED-PROBE` (severity: warning during window, error at sunset `1.10.0`) を surface する。失敗時 error text は install hint `npm i -D playwright` を含むこと。
- REQ-0122: `skills.integrity` severity downgrade - `qfai doctor` は `skills.integrity` 既定 severity を `warning` にする (`error` ではない)。doctor summary は findings を "errors blocking the active profile" と "warnings advisory of drift" の 2 group に分けて表示し、`skills.integrity` は message 文言にかかわらず後者に属する。
- REQ-0123: doctor probe function-size refactor — `packages/qfai/src/core/prototyping/playwrightLauncher.ts` の `collectCandidates` (~92 LOC) / `probeCandidate` (~100 LOC) と `packages/qfai/src/core/doctor.ts` の `buildPlaywrightLauncherChecks` (~89 LOC) が CLAUDE.md の ~50 行 function-size guidance を超えている。per-stage candidate collectors (`collectPrimaryCandidates` / `collectNpxCandidate` / `collectDeprecatedCandidates`)、spawn / timeout state machine、per-branch check builders を抽出し各関数を ~50 LOC 以下に保つ。behavior-preserving refactor (既存 test がそのまま pass する)。Acceptance signal: refactor 後 `playwrightLauncher.ts` / `doctor.ts` 内のいずれの関数も 50 LOC を超えず、既存 doctor 統合 / 単体テストが green。
- REQ-0153: stale review-pack TTL archival — `qfai doctor --clean` は `.qfai/review/<ts>/` で TTL (既定 14 日、`qfai.config.yaml#review.staleTtlDays` で設定可能 / DR-0264) を超過した pack を `.qfai/review/_archive/<ts>/` へ **move** する。NEVER delete; restore は `mv` 戻し。`qfai validate --profile review` は `_archive/` 配下を out-of-scope として扱い、top-level `.qfai/review/<ts>/` のみ scan する。in-scope pack の `QFAI-REVIEW-003/004/005` 挙動は不変。
- REQ-0156: `qfai doctor --autoremediate` — safe な範囲で detect AND fix する: (a) active skill manifest (CLI-MANIFEST / REQ-0159) の `runtimeDependencies` に対する `npm install`、(b) `--clean` TTL-archive (REQ-0153)、(c) `qfai.config.yaml` に欠落している default-keyed フィールドの書き込み。既定で interactive `--yes` 確認が必須、`--yes` flag で確認 skip、`--dry-run` は副作用なしで preview。CI 環境 (標準 CI env vars で検出) では `--autoremediate=off` を既定とし、"autoremediate disabled in CI" line を明示出力する。
- REQ-0159: per-skill `runtimeDependencies` manifest probe — `qfai doctor --profile <skill>` は `assets/init/.qfai/assistant/skills/<skill>/manifest.json` (CLI-MANIFEST) を読み、各 entry に対し `node_modules/.bin/...` / `node_modules/<name>/` を probe する。missing→install command を report。empty list→probe しない (false positive なし)。manifest↔probe drift は `R-SKILL-MANIFEST-DRIFT` (SSOT-sync Pair III)。NOTE: manifest-schema 著作側 (lint / 配布) は spec-0015 owned; 本 slice は doctor probe 挙動のみ — REQ-0159 を shared Source として参照。

## Entry points

- US range in this spec: US-0006-0001..US-0006-0010
- Primary actors: 開発者
- Notes: `qfai doctor` で設定・構造の診断を実行し、バリデーション前に問題を特定・修正する
- v1.9.2 Second-Wave (copy-down for execution): `--clean` は stale review pack を 14d (DR-0264, `review.staleTtlDays` 可変) TTL で `_archive/<ts>/` に move (never delete); `--autoremediate` は npm install / `--clean` / config-default-fill を `--yes` 確認付きで実行し CI では既定 off; `--profile <skill>` は `manifest.json` の `runtimeDependencies` を probe し drift で `R-SKILL-MANIFEST-DRIFT`。

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
