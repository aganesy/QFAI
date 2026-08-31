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
| TC-0006-0020 | integration | AC-0006-0016 | EX-0006-0016 | --clean never deletes; validate review excludes \_archive (Type: boundary)                                  |
| TC-0006-0021 | integration | AC-0006-0017 | EX-0006-0017 | --autoremediate --yes fixes install + clean + config (Type: normal)                                         |
| TC-0006-0022 | integration | AC-0006-0018 | EX-0006-0018 | autoremediate off in CI; --dry-run yields no side effects (Type: error)                                     |
| TC-0006-0023 | unit        | AC-0006-0015 | EX-0006-0015 | review.staleTtlDays config override changes TTL boundary (Type: boundary)                                   |
| TC-0006-0024 | integration | AC-0006-0019 | EX-0006-0019 | --profile <skill> probes manifest runtimeDependencies; missing reported (Type: normal)                      |
| TC-0006-0025 | unit        | AC-0006-0020 | EX-0006-0020 | empty runtimeDependencies emits no probe finding (Type: boundary)                                           |
| TC-0006-0026 | integration | AC-0006-0020 | EX-0006-0020 | manifest↔probe drift emits R-SKILL-MANIFEST-DRIFT (Type: error)                                             |
| TC-0006-0027 | integration | AC-0006-0021 | EX-0006-0021 | edited installed shipped workflow → workflows.integrity advisory names the stale path (Type: normal)        |
| TC-0006-0028 | integration | AC-0006-0021 | EX-0006-0021 | content-identical installed tree → severity ok, zero drift findings (Type: boundary)                        |
| TC-0006-0029 | unit        | AC-0006-0022 | EX-0006-0022 | drift finding severity/group and --fail-on error exit-code invariance (Type: boundary)                      |
| TC-0006-0030 | integration | AC-0006-0023 | EX-0006-0023 | repair text names no command; absent file and unresolved package copy are not drift (Type: error)           |
| TC-0006-0031 | integration | AC-0006-0024 | EX-0006-0024 | adopter-authored name collision is never reported (Type: error)                                             |
| TC-0006-0032 | unit        | AC-0006-0025 | EX-0006-0025 | drift-only tree exits 0 under `--fail-on warning` (Type: normal)                                            |
| TC-0006-0033 | unit        | AC-0006-0025 | EX-0006-0026 | unrelated warning still exits 1 under `--fail-on warning` — control (Type: boundary)                        |
| TC-0006-0034 | integration | AC-0006-0026 | EX-0006-0027 | details lists declined alongside modified without changing severity (Type: normal)                          |
| TC-0006-0035 | integration | AC-0006-0026 | EX-0006-0028 | declined-only tree emits no finding at all (Type: boundary)                                                 |
| TC-0006-0036 | integration | AC-0006-0022 | EX-0006-0029 | error severity の finding は `--fail-on error` で exit 非 0 になる (Type: normal)                           |

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

## TC-0006-0020: --clean never deletes; validate review excludes \_archive

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

## TC-0006-0027: edited installed shipped workflow yields a drift advisory

**Level:** integration
**Type:** normal
**AC Refs:** AC-0006-0021

Setup: temp dir に adopter tree を init し、`.github/workflows/` 配下の shipped workflow 1 ファイルに 1 行の手編集を加える。
Action: `qfai doctor` を実行する。
Verify:

- `workflows.integrity` check が severity `info` で 1 件 fire する
- finding の details / message に当該 stale file の adopter-tree 相対 path が含まれる

## TC-0006-0028: content-identical installed tree reports no drift

**Level:** integration
**Type:** boundary
**AC Refs:** AC-0006-0021

Setup: TC-0006-0027 の手編集を戻し、install 済み shipped workflow を package 同梱 copy と内容一致 (改行正規化後) の状態にする。
Action: `qfai doctor` を実行する。
Verify:

- `workflows.integrity` の severity が `ok` になる
- drift finding が 1 件も emit されない (control case; false positive なし)

## TC-0006-0029: drift advisory keeps the exit code unchanged

**Level:** unit
**Type:** boundary
**AC Refs:** AC-0006-0022

Setup: `workflows.integrity` が drift を返すフィクスチャ。
Action: `runDoctor({ root, format: 'text', failOn: 'error' })` 相当を呼び、finding severity と `shouldFailDoctor` の判定を観測する。
Verify:

- finding が `severity: 'info'` で含まれる
- `shouldFailDoctor` が false を返す (exit 0 — advisory は exit code を変えない)
- text renderer が当該 finding を "warnings advisory of drift" group に配置する

注: `--fail-on error` では `shouldFailDoctor` が `summary.error > 0` のみを見るため、`info` と
`warning` は本 TC では区別できない。`info` 選択を識別的に falsify するのは TC-0006-0032 /
TC-0006-0033 (`--fail-on warning` leg) である。

## TC-0006-0030: repair text names no command; absent file and unresolved copy are not drift

**Level:** integration
**Type:** error
**AC Refs:** AC-0006-0023

Setup: (a) provenance entry を持つ shipped workflow を 1 つ手編集した drift 検出状態の tree、
(b) shipped name の 1 つが `absent` state — provenance record に当該 name の entry が無く、adopter の
workflows directory にも file が無い — であり、対照として provenance entry を持つ stale file を 1 つ
併置した tree、(c) install 済み package 側の shipped copy を解決できない tree の 3 フィクスチャ。
state 名は `CLI-WFSET` §3 の closed enum に従う (`absent` と `declined` は別 state であり、報告の
され方も別である)。
Action: 各フィクスチャで `qfai doctor` を実行する。
Verify:

- (a) message body に「install 済み package 内の copy で置き換える」手動 repair が含まれ、refresh
  command / CLI verb / flag を示す token は 1 つも含まれない
- (b) `absent` の name は `workflows.integrity` finding の title / message / `details` のいずれにも
  現れない (不在は drift ではない)。同じ tree の対照 stale file は `details.modified` に報告され、
  check は severity `info` で 1 度だけ registered される
- (c) check が severity `info` で skip し、drift として報告しない

注: leg (b) が主張するのは「check が 1 件も出ない」ことではなく「`absent` の name が drift として
数えられない」ことである。`workflows.integrity` check 自体が 1 件も registered されないのは provenance
record が空で比較対象が 0 件の tree であり、それは本 TC の 3 フィクスチャのいずれでもない
(TC-0006-0028 の fixture 系列)。

境界 (declined との分界): provenance entry が残ったまま file だけが削除された `declined` は `absent`
とは別 state であり、本 TC の対象外である。owner は AC-0006-0026 / BR-0006-0022 配下の TC-0006-0034
(drift finding が出る tree では `details.declined` が当該 name を列挙する) と TC-0006-0035 (`modified`
が 0 件で declined だけの tree) である。

## TC-0006-0010: Coverage Placeholder for EX-0006-0003

- EX-Ref: EX-0006-0003
- AC-Refs: AC-0006-0001
- Verify that migrated traceability includes EX-0006-0003.

## TC-0006-0011: Coverage Placeholder for EX-0006-0009

- EX-Ref: EX-0006-0009
- AC-Refs: AC-0006-0001
- Verify that migrated example EX-0006-0009 is covered by at least one test case.

## TC-0006-0031: adopter-authored name collision is never reported

- **Type:** error
- **Level:** integration
- **AC-Refs:** AC-0006-0024
- **EX-Ref:** EX-0006-0024
- Setup: temp dir に `qfai init` した adopter tree を作り、`.github/workflows/` に shipped name 空間と
  衝突する名前のファイルを adopter 自作として置く。`.qfai/install-provenance.json` には当該 name の
  entry を作らない。対照として、provenance entry を持つ stale file を 1 つ併置する。
- Assert: `workflows.integrity` の finding 集合に adopter 自作ファイルの名前が 1 度も現れないこと。
  対照の stale file は報告されること (silence が「常に無報告」ではなく provenance 由来であることを
  falsify 可能にする)。exit code は不変。
- 負例の意味: provenance gate を外すと adopter 自作ファイルが `extra` / `changed` bucket に落ちて
  報告され、本 TC は fail する。これが `CLI-WFSET` §1 / §8 の「prefix は selector ではない」を
  spec 側で守るオラクル。

## TC-0006-0032: drift-only tree exits 0 under --fail-on warning

- **Type:** normal
- **Level:** unit
- **AC-Refs:** AC-0006-0025
- **EX-Ref:** EX-0006-0025
- Setup: `workflows.integrity` が drift を返し、他の check は 1 件も warning / error を返さない
  フィクスチャ (`summary.warning === 0` かつ `summary.error === 0` になる状態)。
- Action: `runDoctor({ root, format: 'text', failOn: 'warning' })` 相当を呼ぶ。
- Assert: exit code が 0 であること。`summary.warning` が 0 のままであること (drift finding は
  `info` として計上され warning バケットに入らない)。`summary.info` が 1 以上であること。
- 負例の意味: severity を `warning` に戻すと `shouldFailDoctor` の `warning + error > 0` が真になり
  exit 1 となって本 TC は fail する。`--fail-on error` leg (TC-0006-0029) では両 severity が
  区別できないため、`info` 選択 (DR-0006-0004) を falsify できる唯一の leg が本 TC である。

## TC-0006-0033: unrelated warning still exits 1 under --fail-on warning (control)

- **Type:** boundary
- **Level:** unit
- **AC-Refs:** AC-0006-0025
- **EX-Ref:** EX-0006-0026
- Setup: TC-0006-0032 と同じ drift フィクスチャに、`workflows.integrity` とは無関係な warning
  finding を 1 件だけ追加した状態。
- Action: `runDoctor({ root, format: 'text', failOn: 'warning' })` 相当を呼ぶ。
- Assert: exit code が 1 であること。exit 1 の原因が当該 warning であり、`workflows.integrity`
  finding は依然 `info` のままであること。
- 対照の意味: TC-0006-0032 単独では「`--fail-on warning` が何も捕まえない実装」でも green に
  なりうる。本 TC は同じ leg が実際に warning を捕まえることを示し、TC-0006-0032 の主張が
  vacuous でないことを保証する。

## TC-0006-0034: details lists declined alongside modified

- **Type:** normal
- **Level:** integration
- **AC-Refs:** AC-0006-0026
- **EX-Ref:** EX-0006-0027
- Setup: temp dir に init した adopter tree で、provenance entry を持つ shipped workflow の 1 つを
  手編集し (modified)、別の 1 つを install 後に削除する (declined)。
- Action: `qfai doctor --format json` を実行する。
- Assert: `workflows.integrity` finding の `details` が `workflowsDir` / `modified` / `declined` /
  `packagedDir` の 4 key を持つこと。`details.modified` が手編集 file を、`details.declined` が
  削除 file を名指しすること。finding severity は `info` のままで exit code は不変であること。
  message body は declined file を stale として名指ししないこと。
- 負例の意味: `declined` を details から落とすと、operator は「QFAI が不在を認識した上で放置して
  いる」ことを観測できず、`CLI-DOC` の transparency 条項が spec 側で無主のままになる。

## TC-0006-0035: declined-only tree emits no finding at all

- **Type:** boundary
- **Level:** integration
- **AC-Refs:** AC-0006-0026
- **EX-Ref:** EX-0006-0028
- Setup: provenance entry を持つ shipped workflow をすべて削除し、`changed` bucket が空
  (modified 0 件) になる adopter tree。
- Action: `qfai doctor --format json` を実行する。
- Assert: `workflows.integrity` の drift finding が 1 件も emit されないこと。したがって
  `details.declined` も出力に現れないこと。check severity は `ok` であること。
- 境界の意味: `declined` は「finding が出るときに details へ同梱される情報」であって、それ自体が
  finding を生む状態ではない (`CLI-WFSET` §3 の「declined は二度と報告しない」)。本 TC は
  TC-0006-0034 が declined を報告のトリガに格上げしていないことを固定する。
