# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                                                                                                       |
| ------------ | ----------- | ------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| TC-0006-0001 | integration | AC-0006-0001 | EX-0006-0001 | config found - text 出力                                                                                    |
| TC-0006-0002 | integration | AC-0006-0002 | EX-0006-0007 | config missing 検出                                                                                         |
| TC-0006-0003 | integration | AC-0006-0003 | EX-0006-0008 | ディレクトリ構造診断                                                                                        |
| TC-0006-0004 | integration | AC-0006-0004 |              | パス解決診断                                                                                                |
| TC-0006-0005 | integration | AC-0006-0005 |              | レガシー警告                                                                                                |
| TC-0006-0006 | integration | AC-0006-0006 | EX-0006-0002 | JSON 出力フォーマット                                                                                       |
| TC-0006-0007 | unit        | AC-0006-0007 | EX-0006-0004 | --fail-on error pass                                                                                        |
| TC-0006-0008 | unit        | AC-0006-0008 | EX-0006-0005 | --fail-on warning fail                                                                                      |
| TC-0006-0009 | integration | AC-0006-0009 | EX-0006-0006 | --out ファイル出力                                                                                          |
| TC-0006-0010 | integration | AC-0006-0001 | EX-0006-0003 | Coverage Placeholder for EX-0006-0003                                                                       |
| TC-0006-0011 | integration | AC-0006-0001 | EX-0006-0009 | Coverage Placeholder for EX-0006-0009                                                                       |
| TC-0006-0012 | integration | AC-0006-0010 | EX-0006-0010 | playwright primary probe detects node_modules/.bin/playwright                                               |
| TC-0006-0013 | integration | AC-0006-0010 | EX-0006-0010 | playwright probe order (primary → npx fallback) is documented and observable                                |
| TC-0006-0014 | integration | AC-0006-0011 | EX-0006-0011 | playwright-cli triggers D-DEPRECATED-PROBE with sunset `1.10.0` named in body                               |
| TC-0006-0015 | integration | AC-0006-0011 | EX-0006-0012 | full failure error text contains `npm i -D playwright` install hint                                         |
| TC-0006-0016 | integration | AC-0006-0012 | EX-0006-0010 | fresh `qfai init` + `npm i -D playwright` → zero `[error]` lines (NFR-0112 acceptance)                      |
| TC-0006-0017 | unit        | AC-0006-0013 | EX-0006-0013 | skills.integrity defaults to severity warning; `--fail-on error` exit 0 holds                               |
| TC-0006-0018 | integration | AC-0006-0014 | EX-0006-0014 | doctor summary splits into 2 groups; skills.integrity lands in advisory group regardless of message wording |
| TC-0006-0019 | integration | AC-0006-0015 | EX-0006-0015 | --clean archives a TTL-expired review pack (Type: normal)                                                   |
| TC-0006-0020 | integration | AC-0006-0016 | EX-0006-0016 | --clean never deletes; validate review excludes _archive (Type: boundary)                                   |
| TC-0006-0021 | integration | AC-0006-0017 | EX-0006-0017 | --autoremediate --yes fixes install + clean + config (Type: normal)                                         |
| TC-0006-0022 | integration | AC-0006-0018 | EX-0006-0018 | autoremediate off in CI; --dry-run yields no side effects (Type: error)                                     |
| TC-0006-0023 | unit        | AC-0006-0015 | EX-0006-0015 | review.staleTtlDays config override changes TTL boundary (Type: boundary)                                   |
| TC-0006-0024 | integration | AC-0006-0019 | EX-0006-0019 | --profile <skill> probes manifest runtimeDependencies; missing reported (Type: normal)                      |
| TC-0006-0025 | unit        | AC-0006-0020 | EX-0006-0020 | empty runtimeDependencies emits no probe finding (Type: boundary)                                           |
| TC-0006-0026 | integration | AC-0006-0020 | EX-0006-0020 | manifest↔probe drift emits R-SKILL-MANIFEST-DRIFT (Type: error)                                              |

## TC-0006-0012: playwright primary probe detects node_modules/.bin/playwright

**Level:** integration
**AC Refs:** AC-0006-0010

Setup: prototyping profile プロジェクトを用意し、`node_modules/.bin/playwright` (Windows では `.cmd`) を seed する。
Action: `qfai doctor --profile prototyping` を実行する。
Verify:

- probe 結果に primary launcher として playwright が記録される
- fallback (`npx --no-install playwright --version`) は実行されない (primary 成功で短絡)

## TC-0006-0014: playwright-cli triggers D-DEPRECATED-PROBE

**Level:** integration
**AC Refs:** AC-0006-0011

Setup: node_modules に `.bin/playwright-cli` のみを置く (playwright 本体不在)。
Action: `qfai doctor --profile prototyping` を実行する。
Verify:

- playwright-cli が accepted として記録される (probe 失敗ではない)
- `D-DEPRECATED-PROBE` finding が severity warning で fire
- finding message body に文字列リテラル `1.10.0` が含まれる

## TC-0006-0016: fresh init + playwright install yields zero error lines

**Level:** integration
**AC Refs:** AC-0006-0012

Setup: 空ディレクトリで `qfai init` → `npm i -D playwright` を実行 (CI fixture)。
Action: `qfai doctor --profile prototyping` を実行する。
Verify:

- stdout / stderr の全行を走査し、`[error]` 接頭辞付きの行が 1 件も存在しない
- NFR-0112 の acceptance signal が成立 (fresh project が clean run)

## TC-0006-0017: skills.integrity defaults to warning severity

**Level:** unit
**AC Refs:** AC-0006-0013

Setup: skills.integrity check が drift を返すフィクスチャ。
Action: `runDoctor({ root, format: 'text', failOn: 'error' })` を呼ぶ。
Verify:

- skills.integrity finding が `severity: 'warning'` で含まれる
- `shouldFailDoctor` の判定で exit 0 が返される (warning のみ)

## TC-0006-0018: doctor summary splits into 2 groups

**Level:** integration
**AC Refs:** AC-0006-0014

Setup: doctor が config 不在 (error)、specs/ 欠落 (warning)、skills.integrity drift (warning) を同時に検出する。
Action: `qfai doctor --format text` を実行する。
Verify:

- summary 出力に "errors blocking the active profile" / "warnings advisory of drift" の 2 group ヘッダが個別に現れる
- skills.integrity finding は wording にかかわらず "warnings advisory of drift" group の下に列挙される

## TC-0006-0001: config found - text 出力

**Level:** integration
**AC Refs:** AC-0006-0001

Setup: qfai.config.yaml が存在するプロジェクトを用意。
Action: `runDoctor({ root, rootExplicit: true, format: 'text' })` を実行する。
Verify:

- 出力に `config=<path> (found)` が含まれる
- summary に ok/info/warning/error カウントが含まれる

## TC-0006-0007: --fail-on error pass

**Level:** unit
**AC Refs:** AC-0006-0007

Setup: warning のみ検出される状態。
Action: `shouldFailDoctor({ warning: 1, error: 0 }, 'error')` を呼び出す。
Verify:

- 戻り値が false（exit 0）

## TC-0006-0019: --clean archives a TTL-expired review pack

**Level:** integration
**Type:** normal
**AC Refs:** AC-0006-0015

Setup: `.qfai/review/<old-ts>/` を mtime 26 日前で seed (`review.staleTtlDays` 未設定 = 既定 14d / DR-0264); TTL 内 pack も 1 つ用意。
Action: `qfai doctor --clean` を実行する。
Verify:

- old pack が `.qfai/review/_archive/<old-ts>/` へ move される
- TTL 内 pack は `.qfai/review/<ts>/` に残置される

## TC-0006-0020: --clean never deletes; validate review excludes _archive

**Level:** integration
**Type:** boundary
**AC Refs:** AC-0006-0016

Setup: stale pack を archive 済みの状態。
Action: `qfai doctor --clean` を再実行し、続けて `qfai validate --profile review` を実行する。
Verify:

- pack が delete されることは一度もない (move のみ)
- `qfai validate --profile review` は top-level pack のみ scan し `_archive/` 配下は out-of-scope
- in-scope pack の `QFAI-REVIEW-003/004/005` は不変

## TC-0006-0021: --autoremediate --yes fixes install + clean + config

**Level:** integration
**Type:** normal
**AC Refs:** AC-0006-0017

Setup: 未 install の runtimeDependencies 宣言 manifest + stale review pack + default-keyed 欠落 config。
Action: `qfai doctor --autoremediate --yes` を実行する。
Verify:

- 宣言 dep に対し `npm install` が実行される
- stale pack が `_archive/` へ archive される
- 欠落 default-keyed フィールドが書き込まれ、user-authored 値は上書きされない

## TC-0006-0022: autoremediate off in CI; --dry-run no side effects

**Level:** integration
**Type:** error
**AC Refs:** AC-0006-0018

Setup: `CI=true` env、別ケースで `--dry-run` 用フィクスチャ。
Action: `qfai doctor --autoremediate` (CI) と `qfai doctor --autoremediate --dry-run` を実行する。
Verify:

- CI ケースは "autoremediate disabled in CI" line を出力し修復しない
- `--dry-run` は preview のみで install / archive / config write の副作用なし

## TC-0006-0023: review.staleTtlDays config override changes TTL boundary

**Level:** unit
**Type:** boundary
**AC Refs:** AC-0006-0015

Setup: `qfai.config.yaml#review.staleTtlDays: 7` を設定し、mtime 10 日前の pack を用意。
Action: TTL 判定ヘルパを呼ぶ (既定 14d なら残置、override 7d なら archive 対象)。
Verify:

- override 値 7 が採用され、10 日前 pack が archive 対象と判定される
- 設定なしのケースでは 14d が採用され同 pack は残置される (boundary 比較)

## TC-0006-0024: --profile <skill> probes manifest runtimeDependencies

**Level:** integration
**Type:** normal
**AC Refs:** AC-0006-0019

Setup: `manifest.json` が playwright 等 dep を宣言、node_modules に一部未存在。
Action: `qfai doctor --profile <skill>` を実行する。
Verify:

- 各 entry について `node_modules/.bin/...` / `node_modules/<name>/` が probe される
- missing dep が install command 付きで report される

## TC-0006-0025: empty runtimeDependencies emits no probe finding

**Level:** unit
**Type:** boundary
**AC Refs:** AC-0006-0020

Setup: `runtimeDependencies: []` の manifest。
Action: `qfai doctor --profile <skill>` を実行する。
Verify:

- probe finding が 1 件も emit されない (false positive なし)

## TC-0006-0026: manifest↔probe drift emits R-SKILL-MANIFEST-DRIFT

**Level:** integration
**Type:** error
**AC Refs:** AC-0006-0020

Setup: manifest 宣言と doctor probe 実装の間に drift を起こすフィクスチャ。
Action: drift 検査を実行する。
Verify:

- `R-SKILL-MANIFEST-DRIFT` (SSOT-sync Pair III) が emit される

## TC-0006-0010: Coverage Placeholder for EX-0006-0003

- EX-Ref: EX-0006-0003
- AC-Refs: AC-0006-0001
- Verify that migrated traceability includes EX-0006-0003.

## TC-0006-0011: Coverage Placeholder for EX-0006-0009

- EX-Ref: EX-0006-0009
- AC-Refs: AC-0006-0001
- Verify that migrated example EX-0006-0009 is covered by at least one test case.
