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

## TC-0006-0010: Coverage Placeholder for EX-0006-0003

- EX-Ref: EX-0006-0003
- AC-Refs: AC-0006-0001
- Verify that migrated traceability includes EX-0006-0003.

## TC-0006-0011: Coverage Placeholder for EX-0006-0009

- EX-Ref: EX-0006-0009
- AC-Refs: AC-0006-0001
- Verify that migrated example EX-0006-0009 is covered by at least one test case.
