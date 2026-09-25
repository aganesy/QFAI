# 07 Decisions

## Decisions

8 items.

### DR-0006-0001: --fail-on 未指定時は常に exit 0

- --fail-on が指定されない場合、doctor は常に exit 0 で終了する
- Why: doctor は診断ツールであり、デフォルトでビルドを失敗させるべきではない

### DR-0006-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: doctor コマンドは tests/cli/doctor.test.ts で既に広範にカバー済み。one-shot GREEN で exception に確定する

### DR-0006-0003: review-pack TTL archival default — references DR-0264 (v1.9.2 Second-Wave)

- Decision: `qfai doctor --clean` の stale review-pack TTL は既定 14 日、`qfai.config.yaml#review.staleTtlDays` で設定可能。archival は `.qfai/review/_archive/<ts>/` への move のみ (never delete)。`qfai validate --profile review` は `_archive/` を out-of-scope とする。
- Basis: 上位 DR-0264 (`_policies/08_Decisions.md`)。本 spec slice は同 DR を copy-down して REQ-0153 / US-0006-0008 を実装する (OQ-0155 はこの DR で resolved)。
- Why: 14d は high-churn (4 packs/4 days) と low-churn (週単位) の中間で、config key が両 churn profile を調整可能にする。

### DR-0006-0004: `workflows.integrity` の drift severity は `info` (CHG-007)

- Decision: `workflows.integrity` の drift finding の既定 severity は `info` とする。`skills.integrity` (BR-0006-0010) が使う `warning` は採用しない
- Context: `shouldFailDoctor` (`packages/qfai/src/cli/commands/doctor.ts:229`) は `--fail-on warning` のとき `summary.warning + summary.error > 0`、`--fail-on error` のとき `summary.error > 0` を返す。つまり `--fail-on error` では `info` と `warning` は観測上区別できず、両者を識別するのは `--fail-on warning` の 1 leg だけである
- Rationale: 本 finding が要求する不変条件は「**すべての** `--fail-on` 値で exit code が変わらない」であり、それを満たす severity は `info` しかない。`warning` を選ぶと、`--fail-on warning` を CI に入れている「package より 1 version 遅れた adopter」— まさに本 finding が知らせたい当の母集団 — の build が、通知を受け取った瞬間に赤くなる。通知 channel が通知した相手を壊すのは channel の目的の反転である。text renderer は `warning` と `info` の双方を "warnings advisory of drift" group に routing するので、`info` にしても表示位置は失われない
- Rejected: severity を `warning` にする (`skills.integrity` と同じ既定)
  - DO NOT: 「既存の advisory check と揃える」ことを理由に本 finding を `warning` へ格上げしない。`skills.integrity` の advisory 契約は `--fail-on error` 前提であり、本 finding が要求する不変条件より弱い
  - Temptation: (1) 同じ doctor の同じ advisory bucket に既に `warning` の隣人 (`skills.integrity`) が居るので、揃える方が一貫して見える。(2) 唯一の既存 oracle (TC-0006-0029) が `--fail-on error` で走っており、`warning` に書き換えてもその test は緑のままなので「壊れていない」ように見える。この 2 点が重なると `warning` は安全な選択に見えるが、識別的 leg を走らせるまで誤りが露出しない
  - Guard: 識別的 leg を BR-0006-0021 / AC-0006-0025 / TC-0006-0032 (exit 0) + TC-0006-0033 (対照で exit 1) として常設する。`warning` へ戻した瞬間に TC-0006-0032 が落ちる
- Rejected: 同じ drift を `qfai validate` にも finding として追加する
  - DO NOT: validate 側に本 drift を足さない。validate の checks は error severity が recorded decision であり、advisory を混ぜると severity 例外を作るか、1 version 遅れた全 adopter の build を壊すかの二択になる
  - Temptation: 「gate に出さないと誰も見ない」という理由付けが、diagnostic surface と gate surface の区別より強く聞こえる
- Later tightening: `warning` への格上げは無料の後日強化ではなく、全 adopter の `doctor --fail-on warning` lane に対する挙動変更である。finding を解消できる refresh verb が ship する release で、message 文言 (BR-0006-0020) と同時にしか動かせない
- Source: 契約 SSOT `.qfai/contracts/cli/qfai-doctor.md` § "Severity is `info`, not `warning`"; CHG-007 review round 2 finding R1 / R7

### DR-0006-0005: 比較対象は provenance entry を持つ name に限る (CHG-007)

- Decision: `workflows.integrity` の比較対象は `.qfai/install-provenance.json` に entry を持つ name だけとする。entry を持たない name は `adopter-owned` として無条件に silent。drift となるのは `changed` bucket のみで、`missing` (= `declined`) と `extra` は drift ではない
- Context: `qfai-` prefix は reservation notice であって selector ではない (`CLI-WFSET` §1 / §8)。adopter が先に同名ファイルを著しているケースが実在しうるため、名前だけで所有権を推定すると他人のファイルを stale 扱いする。provenance record の書き込み / schema 所有は spec-0003 / REQ-0020 側にあり、本 spec は読むだけ
- Rationale: 「読まない」と「所有しない」は別の話である。読まなければ adopter 自作ファイルと QFAI 由来の stale ファイルを区別できず、所有していないファイルを drift 報告してしまう。読み取り専用に留めることで、所有権は spec-0003 に残したまま誤報だけを構造的に排除できる
- Rejected: `qfai-` prefix を selector として比較対象を決める
  - DO NOT: prefix 一致で shipped 由来だと推定しない
  - Temptation: provenance record を読まずに済み、実装も 1 行で終わるので最も安く見える。実際には adopter が先に著した `qfai-` 名のファイルを stale として報告し、prefix の意味を reservation から selector へ静かにすり替える
- Rejected: `missing` を drift として報告する
  - DO NOT: install 後に削除されたファイルを stale として再報告しない
  - Temptation: diff helper が `missing` / `extra` / `changed` の 3 bucket を返すので、3 つとも報告するのが「網羅的」に見える。しかし `missing` は `declined` — adopter の意思表示であり、`CLI-WFSET` §3 は二度と報告しないことを要求する
- Note: `declined` は報告しないが、drift finding が出るときの `details.declined` には列挙する (BR-0006-0022 / AC-0006-0026)。無報告と不可視は別で、operator は「QFAI が不在を認識した上で放置している」ことを観測できる必要がある。これは severity にも exit code にも寄与しない
- Source: `.qfai/contracts/cli/shipped-workflows.md` §1 / §3 / §8; `.qfai/contracts/cli/qfai-doctor.md` §`workflows.integrity`; CHG-007 review round 2 finding R7 / R8

### DR-0006-0006: The two work-log pointers name targets that already exist

- Status: accepted
- Context: Two prose lines point into `.qfai/steering/` entries that the work-log removal deletes. The content they point at is already recorded elsewhere.
- Decision: The Tiers note in `tdd/test-list.md` names the ruling "`TDD-0039` escalates to T2" in `.qfai/evidence/implement-spec-0006.md`. The carry-over bullet in `09_delta.md` names `CR-20260818-0002`, which restates the carried-over finding. The Triage row's rationale is a dated record and stays as written.
- Consequences: Neither rewrite waits on content being moved first.
- Related: TDD-0039, CR-20260818-0002

### DR-0006-0007: /qfai-sdd rewrites both pointers, each in its own phase

- Status: accepted
- Context: The drift protocol lets a downstream stage edit only the ledger cells it names. Prose in the ledger and in the delta is upstream.
- Decision: `/qfai-sdd` rewrites the ledger note at Phase 2b and the delta bullet at Phase 4.
- Consequences: The `Evidence` cell of TDD-0037 is `/qfai-implement`'s and stays as written.
- Related: TDD-0037, TDD-0039

### DR-0006-0008: Only the changed line of the carry-over bullet is rewritten

- Status: accepted
- Context: The carry-over bullet's first line holds the pointer. Its continuation is unchanged and written in Japanese.
- Decision: Rewrite the first line in English and leave the continuation as written.
- Consequences: The bullet mixes two languages until the continuation is next changed for its own reason.
- Related: CR-20260818-0002

### DR-0006-0009: TDD-0037's `Evidence` cell keeps its work-log phrase

- Status: accepted
- Context: The `Evidence` cell of TDD-0037 cites "per steering 2026-08-17 §5", a `.qfai/steering/` entry the change deletes. The cell is `/qfai-implement`'s, and REQ-0014's list of pointers to rewrite does not include it.
- Decision: Confirm DR-0006-0007: the cell stays as written, and no rewrite is assigned to `/qfai-implement`. The same cell ends with `record at .qfai/evidence/implement-spec-0006.md#tdd-0037`, and the disposition table moves that entry's §5 into `implement-spec-0006.md`, so a reader following the cell's own anchor reaches the file that holds the content.
- Consequences: The phrase stays as a dated note. No ledger row or case changes.
- Related: TDD-0037, DR-0006-0007. `09_delta.md` DL-0004.
