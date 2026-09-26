# Acceptance Criteria

## Criteria

```gherkin
Feature: shipped workflow drift detection (detection half)

# AC-0003-0011-01
# Parent: US-0003-0011
Scenario: install 済み shipped workflow の drift を advisory で検出する
  Given temp dir に init した adopter tree があり、`.github/workflows/` の shipped workflow 1 ファイルが手編集されている
  When `qfai doctor` を実行する
  Then `workflows.integrity` check が severity `info` の advisory finding を出す
  And finding は stale file の adopter-tree 相対 path を名指しする
  And 同じ tree を package 同梱 copy と内容一致に戻すと `workflows.integrity` は severity `ok` となり drift finding は 0 件になる

# AC-0003-0011-02
# Parent: US-0003-0011
Scenario: drift finding は advisory であり exit code を変えない (boundary)
  Given `workflows.integrity` が drift を検出した状態
  When `qfai doctor --fail-on error` を実行する
  Then exit code は 0 のまま変わらない (本 finding 単独では active profile を block しない)
  And finding は "warnings advisory of drift" group (AC-0003-0007-02) に表示される
  And `qfai validate` はこの drift について finding を 1 件も emit しない (diagnostic surface のみ)
  And as a control, a tree with one `error` finding under `qfai doctor --fail-on error` exits 1

# AC-0003-0011-03
# Parent: US-0003-0011
Scenario: repair text は手動手順のみを名指しし、absent / declined / 解決不能は drift ではない (error/boundary)
  Given `workflows.integrity` が drift を検出した状態
  When finding の message body を検査する
  Then body は「install 済み package 内の copy で当該ファイルを置き換える」手動 repair を名指しする
  And body は refresh command / CLI verb / flag を 1 つも名指ししない
  And provenance entry を持たず disk にも存在しない `absent` state の shipped name は、drift finding に
    1 度も現れない (never-installed は「削除された」ではない。同じ tree に entry を持つ stale file が
    併置されていれば、報告されるのはそちらだけである)
  And provenance entry を持ち install 後に削除された `declined` state は `absent` とは別 state であり、
    本 AC の対象外である。その報告のされ方は AC-0003-0011-06 が owner である
  And `absent` と `declined` を「不在」として同一視しない。どちらの name を missing / 意図的削除として
    ownership 上どう扱うかの分類は `.qfai/spec/03_contract/cli/shipped-workflows.md` の ownership contract 側の責務であり、本 AC の
    対象外である
  And install 済み package 側の shipped copy を解決できない場合、check は severity `info` で skip する

# AC-0003-0011-04
# Parent: US-0003-0011
Scenario: provenance entry を持たない同名ファイルは drift として報告しない
  Given temp dir の adopter tree の `.github/workflows/` に、shipped name 空間と衝突する名前の
    ファイルが存在し、`.qfai/install-provenance.json` に当該 name の entry が無い
  When `qfai doctor` を実行する
  Then `workflows.integrity` は当該ファイルについて drift finding を 1 件も出さない
  And finding message 全体に当該ファイル名が現れない
  And 同じ tree に provenance entry を持つ別の stale file を置くと、そちらだけが報告される

# AC-0003-0011-05
# Parent: US-0003-0011
Scenario: drift finding 単独では --fail-on warning でも exit code が変わらない (boundary)
  Given `workflows.integrity` が drift を検出しており、他に warning / error の finding が 1 件も無い tree
  When `qfai doctor --fail-on warning` を実行する
  Then exit code は 0 である
  And `summary.warning` は 0 のままである (drift finding は `info` として計上される)
  And 対照として、同じ tree に本 finding と無関係な warning を 1 件足して再実行すると exit code は 1 になる
  And この対照ケースが成立することで、exit 0 の主張が「何も検出しない実装」でも通る vacuous な
    主張ではないことが示される

# AC-0003-0011-06
# Parent: US-0003-0011
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
