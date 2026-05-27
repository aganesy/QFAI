# 10 Plan

- Spec: spec-0006
- Parent: CAP-0006

## 1. Implementation Strategy

### Primary Source Files

| File                                       | Responsibility                                          |
| ------------------------------------------ | ------------------------------------------------------- |
| `packages/qfai/src/cli/commands/doctor.ts` | CLI entry point. runDoctor() with format/failOn routing |
| `packages/qfai/src/core/doctor.ts`         | createDoctorData() - all diagnostic logic               |

### Key Functions (implemented)

| Function             | Responsibility                                                |
| -------------------- | ------------------------------------------------------------- |
| `runDoctor()`        | CLI orchestrator: call createDoctorData, format, write output |
| `createDoctorData()` | Execute all diagnostic checks, return structured result       |
| `formatDoctorText()` | Format doctor data as text                                    |
| `formatDoctorJson()` | Format doctor data as JSON                                    |
| `shouldFailDoctor()` | Determine exit code based on failOn and summary counts        |

## 2. Dependencies

| Dependency       | Content                                     |
| ---------------- | ------------------------------------------- |
| spec-0003 (init) | init creates the structure doctor diagnoses |

## 3. Implementation Order

All functionality is already implemented. This spec documents existing behavior.

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0006-0010..0011 per AC-0006-0010..0014:
  1. Playwright probe rebuild: `node_modules/.bin/playwright` primary, Windows shims (`playwright.cmd`/`.bat`/`.ps1`), then `npx --no-install playwright --version`, then `playwright-cli` family during the deprecation window, then install hint `npm i -D playwright`.
  2. `D-DEPRECATED-PROBE` finding lifecycle (warning during 1.9.x; error at sunset 1.10.0).
  3. `skills.integrity` default severity downgrade to `warning`; 2-group summary output ("errors blocking active profile" vs "warnings advisory of drift").
- NFR-0112: fresh `qfai init` + `npm i -D playwright` MUST yield zero `[error]` lines from `qfai doctor --profile prototyping`.

## CHG-006 (2026-05-27) — v1.9.2 Second-Wave (doctor)

- How (REQ-0153 / US-0006-0008): `--clean` path で `.qfai/review/<ts>/` を走査し、`Date.now() - stat.mtimeMs > staleTtlDays*86_400_000` の pack を `fs.rename` で `.qfai/review/_archive/<ts>/` へ移す。`staleTtlDays` は `qfai.config.yaml#review.staleTtlDays`、未設定時 14 (DR-0264)。delete API は呼ばない。validate review profile の pack 列挙は `_archive/` を glob から除外する。
- How (REQ-0156 / US-0006-0009): `--autoremediate` は (a) manifest dep の `npm install` 呼び出し、(b) `--clean` archival 関数の再利用、(c) config の default-keyed merge (欠落キーのみ追記、既存値保持) を順に実行。CI 検出は標準 env var (`CI` 等) で gate し off + log line。`--yes` で confirm prompt を skip、`--dry-run` は各 fix を計画ログに出すのみで side-effect を抑止。
- How (REQ-0159 / US-0006-0010): `--profile <skill>` で `assets/init/.qfai/assistant/skills/<skill>/manifest.json` を読み、各 `runtimeDependencies` entry を `node_modules/.bin/<name>` / `node_modules/<name>/` の existence で probe。empty 配列は probe ループを skip。drift 検査は SSOT-sync Pair III として `R-SKILL-MANIFEST-DRIFT` を emit。manifest schema 著作 / 配布 lint は spec-0015 が owns。
