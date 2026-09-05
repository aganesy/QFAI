# 03 Acceptance Criteria

## AC Gherkin (required)

```gherkin
# AC-0006-0001
Scenario: 設定ファイル存在チェック
  Given qfai.config.yaml が存在する
  When `qfai doctor` を実行する
  Then config.found = true として報告される
  And 設定ファイルパスが表示される
```

```gherkin
# AC-0006-0002
Scenario: 設定ファイル不在チェック
  Given qfai.config.yaml が存在しない
  When `qfai doctor` を実行する
  Then config.found = false として報告される
  And 警告メッセージが表示される
```

```gherkin
# AC-0006-0003
Scenario: ディレクトリ構造診断
  Given .qfai/ 配下に specs/ が欠落している
  When `qfai doctor` を実行する
  Then specs/ の欠落が warning として報告される
```

```gherkin
# AC-0006-0004
Scenario: パス解決診断
  Given qfai.config.yaml の testsDir が存在しないパスを指している
  When `qfai doctor` を実行する
  Then パス解決失敗が warning として報告される
```

```gherkin
# AC-0006-0005
Scenario: レガシー警告
  Given レガシーファイルレイアウトが検出される
  When `qfai doctor` を実行する
  Then レガシー警告が表示される
```

```gherkin
# AC-0006-0006
Scenario: JSON 出力
  Given qfai.config.yaml が存在する
  When `qfai doctor --format json` を実行する
  Then JSON 形式で root, config, checks, summary が出力される
```

```gherkin
# AC-0006-0007
Scenario: --fail-on error で warning は pass
  Given doctor チェックで warning のみ検出される
  When `qfai doctor --fail-on error` を実行する
  Then 終了コード 0 で終了する
```

```gherkin
# AC-0006-0008
Scenario: --fail-on warning で warning は fail
  Given doctor チェックで warning が検出される
  When `qfai doctor --fail-on warning` を実行する
  Then 終了コード 1 で終了する
```

```gherkin
# AC-0006-0009
Scenario: --out ファイル出力
  Given doctor チェックが完了する
  When `qfai doctor --format json --out /tmp/doctor.json` を実行する
  Then /tmp/doctor.json に診断結果が出力される
```

## AC Catalog (optional)

| AC-ID        | Title                                                   | Notes              | Priority |
| ------------ | ------------------------------------------------------- | ------------------ | -------- |
| AC-0006-0001 | config found                                            | REQ-0030           | P1       |
| AC-0006-0002 | config missing                                          | REQ-0030           | P1       |
| AC-0006-0003 | ディレクトリ構造                                        | REQ-0030           | P1       |
| AC-0006-0004 | パス解決                                                | REQ-0030           | P1       |
| AC-0006-0005 | レガシー警告                                            | REQ-0030           | P2       |
| AC-0006-0006 | JSON 出力                                               | REQ-0031           | P1       |
| AC-0006-0007 | --fail-on error                                         | REQ-0032           | P1       |
| AC-0006-0008 | --fail-on warning                                       | REQ-0032           | P1       |
| AC-0006-0009 | --out ファイル出力                                      | REQ-0033           | P2       |
| AC-0006-0010 | playwright primary probe                                | REQ-0107           | P1       |
| AC-0006-0011 | playwright-cli deprecation surface                      | REQ-0107           | P1       |
| AC-0006-0012 | fresh init + playwright install yields zero error lines | REQ-0107, NFR-0112 | P1       |
| AC-0006-0013 | skills.integrity defaults to warning severity           | REQ-0122           | P1       |
| AC-0006-0014 | doctor summary groups errors vs warnings                | REQ-0122           | P1       |
| AC-0006-0015 | --clean archives stale review packs at TTL              | REQ-0153           | P1       |
| AC-0006-0016 | --clean never deletes; validate review out-of-scope     | REQ-0153           | P1       |
| AC-0006-0017 | --autoremediate fixes install/clean/config with --yes   | REQ-0156           | P1       |
| AC-0006-0018 | --autoremediate off in CI; --dry-run no side effects    | REQ-0156           | P1       |
| AC-0006-0019 | --profile <skill> probes manifest runtimeDependencies   | REQ-0159           | P1       |
| AC-0006-0020 | empty manifest no probe; manifest↔probe drift error     | REQ-0159           | P1       |
| AC-0006-0021 | shipped workflow drift advisory names the stale file    | REQ-0022           | P1       |
| AC-0006-0022 | drift finding is advisory; exit code unchanged          | REQ-0022           | P1       |
| AC-0006-0023 | repair text manual-only; absent file / unresolved copy  | REQ-0022           | P1       |
| AC-0006-0024 | adopter-authored name collision stays silent            | REQ-0022           | P1       |
| AC-0006-0025 | drift 単独なら `--fail-on warning` でも exit 0          | REQ-0022           | P1       |
| AC-0006-0026 | details が declined を透過的に列挙する                  | REQ-0022           | P1       |

```gherkin
# AC-0006-0010
Scenario: playwright primary probe
  Given node_modules/.bin/playwright が存在する prototyping profile プロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then primary probe で playwright が検出される
  And probe order は (1) node_modules/.bin/playwright (Windows では .cmd / .bat / .ps1 を含む) → (2) `npx --no-install playwright --version` fallback の順番でドキュメント化されている
  And playwright-cli は deprecation window 中 accepted だが `D-DEPRECATED-PROBE` (severity warning) を fire する
```

```gherkin
# AC-0006-0011
Scenario: playwright probe 全失敗時の error text
  Given playwright も playwright-cli も node_modules / npx で見つからない
  When `qfai doctor --profile prototyping` を実行する
  Then error text に install hint `npm i -D playwright` が含まれる
  And severity は error
  And sunset version (`1.10.0`) 到達時 `D-DEPRECATED-PROBE` は error にエスカレートされている (本 AC は window 中の挙動を主張)
```

```gherkin
# AC-0006-0012
Scenario: fresh init で error なし
  Given `qfai init` 直後に `npm i -D playwright` を実行したプロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then 出力に `[error]` 接頭辞付きの行が 1 つも含まれない (NFR-0112)
```

```gherkin
# AC-0006-0013
Scenario: skills.integrity defaults to warning
  Given skills.integrity check が drift を検出する状態
  When `qfai doctor` を実行する
  Then finding severity は `warning` (既定値)
  And `--fail-on error` でも exit 0 が維持される (skills.integrity 単独では active profile を block しない)
```

```gherkin
# AC-0006-0014
Scenario: doctor summary は 2 group に分割表示
  Given doctor が errors と warnings を混在で出力する状態
  When `qfai doctor --format text` を実行する
  Then summary に "errors blocking the active profile" group と "warnings advisory of drift" group が個別に出力される
  And skills.integrity finding は wording にかかわらず "warnings advisory of drift" group に表示される
```

```gherkin
# AC-0006-0015
Scenario: --clean が TTL 超過 review pack を archive する
  Given `.qfai/review/<old-ts>/` の mtime が TTL (既定 14 日 / DR-0264) より古い
  And `review.staleTtlDays` は未設定 (既定 14 を採用)
  When `qfai doctor --clean` を実行する
  Then 当該 pack が `.qfai/review/_archive/<old-ts>/` へ move される
  And TTL 内の pack は `.qfai/review/<ts>/` に残置される
```

```gherkin
# AC-0006-0016
Scenario: --clean は削除せず、validate review は _archive を除外する (boundary)
  Given stale pack を archive 済みの状態
  When `qfai doctor --clean` を再実行し、続けて `qfai validate --profile review` を実行する
  Then archival 操作で pack が delete されることは一度もない (move のみ)
  And `qfai validate --profile review` の scan 対象は top-level `.qfai/review/<ts>/` のみで `_archive/` 配下は out-of-scope
  And in-scope pack の `QFAI-REVIEW-003/004/005` 挙動は不変
```

```gherkin
# AC-0006-0017
Scenario: --autoremediate が install / clean / config を --yes 確認付きで修復する
  Given active skill manifest が未 install の runtimeDependencies を宣言し、stale review pack が存在し、qfai.config.yaml に default-keyed フィールドが欠落している
  When `qfai doctor --autoremediate --yes` を実行する
  Then 宣言 dep に対し `npm install` が実行される
  And stale review pack が `_archive/` へ TTL-archive される (`--clean` 相当)
  And 欠落 default-keyed フィールドが qfai.config.yaml に書き込まれる (user-authored 値は上書きしない)
```

```gherkin
# AC-0006-0018
Scenario: CI では autoremediate off、--dry-run は副作用なし (error/boundary)
  Given 標準 CI env var (例: CI=true) が設定された環境
  When `qfai doctor --autoremediate` を実行する
  Then autoremediate は実行されず "autoremediate disabled in CI" line が出力される (既定 off)
  And 別途 `qfai doctor --autoremediate --dry-run` は予定された修復を preview するが、npm install / archive / config write のいずれの副作用も発生させない
```

```gherkin
# AC-0006-0019
Scenario: --profile <skill> が manifest の runtimeDependencies を probe する
  Given `assets/init/.qfai/assistant/skills/<skill>/manifest.json` が runtimeDependencies を宣言し、一部 dep が node_modules に未存在
  When `qfai doctor --profile <skill>` を実行する
  Then 各 entry について `node_modules/.bin/...` / `node_modules/<name>/` が probe される
  And missing dep は install command 付きで report される
```

```gherkin
# AC-0006-0020
Scenario: 空 manifest は probe せず、manifest↔probe drift は error (error/boundary)
  Given `runtimeDependencies` が空配列の manifest
  When `qfai doctor --profile <skill>` を実行する
  Then probe finding は 1 件も emit されない (false positive なし)
  And 別ケースで manifest 宣言と probe 結果が drift した場合は `R-SKILL-MANIFEST-DRIFT` (SSOT-sync Pair III) が emit される
```

```gherkin
# AC-0006-0021
Scenario: install 済み shipped workflow の drift を advisory で検出する
  Given temp dir に init した adopter tree があり、`.github/workflows/` の shipped workflow 1 ファイルが手編集されている
  When `qfai doctor` を実行する
  Then `workflows.integrity` check が severity `info` の advisory finding を出す
  And finding は stale file の adopter-tree 相対 path を名指しする
  And 同じ tree を package 同梱 copy と内容一致に戻すと `workflows.integrity` は severity `ok` となり drift finding は 0 件になる
```

```gherkin
# AC-0006-0022
Scenario: drift finding は advisory であり exit code を変えない (boundary)
  Given `workflows.integrity` が drift を検出した状態
  When `qfai doctor --fail-on error` を実行する
  Then exit code は 0 のまま変わらない (本 finding 単独では active profile を block しない)
  And finding は "warnings advisory of drift" group (AC-0006-0014) に表示される
  And `qfai validate` はこの drift について finding を 1 件も emit しない (diagnostic surface のみ)
```

```gherkin
# AC-0006-0023
Scenario: repair text は手動手順のみを名指しし、absent / declined / 解決不能は drift ではない (error/boundary)
  Given `workflows.integrity` が drift を検出した状態
  When finding の message body を検査する
  Then body は「install 済み package 内の copy で当該ファイルを置き換える」手動 repair を名指しする
  And body は refresh command / CLI verb / flag を 1 つも名指ししない
  And provenance entry を持たず disk にも存在しない `absent` state の shipped name は、drift finding に
    1 度も現れない (never-installed は「削除された」ではない。同じ tree に entry を持つ stale file が
    併置されていれば、報告されるのはそちらだけである)
  And provenance entry を持ち install 後に削除された `declined` state は `absent` とは別 state であり、
    本 AC の対象外である。その報告のされ方は AC-0006-0026 が owner である
  And `absent` と `declined` を「不在」として同一視しない。どちらの name を missing / 意図的削除として
    ownership 上どう扱うかの分類は spec-0003 / REQ-0020 の ownership contract 側の責務であり、本 AC の
    対象外である
  And install 済み package 側の shipped copy を解決できない場合、check は severity `info` で skip する
```

```gherkin
# AC-0006-0024
# Parent: US-0006-0011
Scenario: provenance entry を持たない同名ファイルは drift として報告しない
  Given temp dir の adopter tree の `.github/workflows/` に、shipped name 空間と衝突する名前の
    ファイルが存在し、`.qfai/install-provenance.json` に当該 name の entry が無い
  When `qfai doctor` を実行する
  Then `workflows.integrity` は当該ファイルについて drift finding を 1 件も出さない
  And finding message 全体に当該ファイル名が現れない
  And 同じ tree に provenance entry を持つ別の stale file を置くと、そちらだけが報告される
```

```gherkin
# AC-0006-0025
# Parent: US-0006-0011
Scenario: drift finding 単独では --fail-on warning でも exit code が変わらない (boundary)
  Given `workflows.integrity` が drift を検出しており、他に warning / error の finding が 1 件も無い tree
  When `qfai doctor --fail-on warning` を実行する
  Then exit code は 0 である
  And `summary.warning` は 0 のままである (drift finding は `info` として計上される)
  And 対照として、同じ tree に本 finding と無関係な warning を 1 件足して再実行すると exit code は 1 になる
  And この対照ケースが成立することで、exit 0 の主張が「何も検出しない実装」でも通る vacuous な
    主張ではないことが示される
```

```gherkin
# AC-0006-0026
# Parent: US-0006-0011
Scenario: drift finding の details が declined を透過的に列挙する
  Given provenance entry を持つ shipped workflow の 1 つが手編集され、別の 1 つが install 後に
    削除されている adopter tree
  When `qfai doctor --format json` を実行する
  Then `workflows.integrity` finding の `details` は `workflowsDir` / `modified` / `declined` /
    `packagedDir` を含む
  And `details.modified` は手編集された file を、`details.declined` は削除された file を名指しする
  And `declined` の存在は severity を変えず (`info` のまま)、exit code にも寄与しない
  And message body は declined file を stale として名指ししない
  And modified が 0 件で declined だけが存在する tree では finding 自体が emit されず、
    したがって `details` も出力に現れない
```
