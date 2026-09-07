# 10 Plan

- Spec: spec-0006
- Parent: CAP-0006

## Implementation approach

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

## Test approach

| Layer       | Where                                                                           | What it proves                                                                 |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| unit        | `packages/qfai/tests/core/doctor*.test.ts`                                      | Per-check construction and the text / JSON renderers                           |
| integration | `packages/qfai/tests/integration/doctorSpec0006.test.ts`                        | `createDoctorData` over a real tree, check by check                            |
| integration | `packages/qfai/tests/integration/cli/commands/doctorAutoremediate.*.test.ts`    | `--autoremediate` fixes, and that `--dry-run` plans without side effects       |
| integration | `packages/qfai/tests/integration/cli/commands/doctorClean.*.test.ts`            | `--clean` archives rather than deletes, and leaves tracked files alone         |
| integration | `packages/qfai/tests/integration/cli/commands/doctorSkillProfile.probe.test.ts` | `--profile <skill>` runtime-dependency probing, including the empty-array skip |

The boundary that must have its own pair of cases rather than one shared case is
the `workflows.integrity` severity, and BR-0006-0021 says why: the
`--fail-on error` leg reads `error > 0` only, so it cannot tell `info` from
`warning`. Drift alone must exit 0 (TC-0006-0032) **and** drift beside an
unrelated warning must exit 1 (TC-0006-0033). With only the first, an
implementation that detects nothing at all is green.

## Dependencies

| Dependency       | Content                                     |
| ---------------- | ------------------------------------------- |
| spec-0003 (init) | init creates the structure doctor diagnoses |

## Implementation Order

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

## CHG-007 (2026-08-05) — adopter drift-detection channel (detection half)

- How (REQ-0022 / US-0006-0011): `core/skillsIntegrity.ts` の diff 形 (`missing` / `extra` / `changed` + 改行正規化比較) を再利用する shape で、adopter tree の `.github/workflows/` 配下の shipped workflow 群を install 済み package の同梱 copy と比較する reader を追加し、`core/doctor.ts` の `createDoctorData` から `workflows.integrity` check として `addCheck` する。既存 `skills.integrity` 分岐と同じ 4 状態 (`skipped_missing_*` / `ok` / drift / 同梱 copy 解決不能) の分岐形を写す。ただし **severity mapping は写さない** — `skills.integrity` の drift は `warning` だが、本 check の drift は `info` である (次項)。
- Severity / grouping: drift 状態の severity は `info` 固定 (契約 SSOT: `.qfai/contracts/cli/qfai-doctor.md`、spec 側の決定記録は DR-0006-0004)。`shouldFailDoctor` (`packages/qfai/src/cli/commands/doctor.ts:229`) は `--fail-on warning` のとき `warning + error > 0` を返すため、`warning` を選ぶと「1 version 遅れた adopter」= 本 finding が知らせたい母集団の exit code を変えてしまう。`info` はすべての `--fail-on` 値で exit code 不変となる唯一の severity。`formatDoctorText` の 2-group renderer (BR-0006-0011) は本 check を "warnings advisory of drift" group に routing する。
- Falsifiability of that choice (BR-0006-0021): `--fail-on error` leg は `error > 0` しか見ないので `info` と `warning` を区別しない。実装時は `--fail-on warning` で「drift 単独 → exit 0」(TC-0006-0032) と「無関係な warning 併存 → exit 1」(TC-0006-0033) の 2 本を必ず対で置く。前者だけでは何も検出しない実装でも緑になる。
- `details` payload (BR-0006-0022): finding の `details` は `{ workflowsDir, modified, declined, packagedDir }`。`declined` は severity / exit code に寄与しないが列挙する。`modified` が空なら finding 自体を emit しないので、`declined` だけで finding が生まれる経路を作らない。
- Repair text: message body は stale file path + 手動 repair 文のみ。command / CLI verb / flag 文字列は入れない。refresh を ship する release で初めて command 名を入れる。
- Skip states: adopter tree に当該 file 不在 → drift として扱わない (declined / missing の分類は REQ-0020 / spec-0003 側)。package 同梱 copy を解決できない (`getInitAssetsDir` 相当が resolve できない / tree 不在) → `info` skip。
- Out of scope: 上書き / prune / provenance record の**書き込み・schema 所有** (spec-0003 / REQ-0020)。`qfai validate` への finding 追加も行わない。
- In scope (読み取りのみ): `.qfai/install-provenance.json` の**読み取り**。これは drift 判定の前提条件であり省略できない — entry を持たない name は `adopter-owned` として無視する必要があるため (`CLI-WFSET` §1 / §8)。読み取り専用なので所有権は spec-0003 に残る。

## Risk mitigation

| Risk                                                                                                                                                                | Likelihood / impact | Mitigation                                                                                                                                                   | Trigger to act                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `workflows.integrity` drift is given `warning`, which changes the exit code of every adopter one version behind — the exact population the finding exists to inform | med / high          | Severity is pinned to `info`, the only value whose exit code is unchanged under every `--fail-on`. The contract SSOT is `.qfai/contracts/cli/qfai-doctor.md` | A severity other than `info` is proposed for this check        |
| The check is copied from `skills.integrity` including its severity mapping, which is the one part that must NOT be copied                                           | med / high          | The 4-state shape is reused; the mapping is stated separately and its falsifiability is pinned by the TC pair above                                          | A diff reuses the `skills.integrity` branch wholesale          |
| `--autoremediate` deletes or rewrites adopter content while claiming to repair it                                                                                   | low / high          | `--clean` renames into `_archive/` and calls no delete API; config merge is default-keyed, adding only absent keys; `--dry-run` plans without side effects   | Any delete API appears on the autoremediate path               |
| The repair message names a CLI verb that does not exist yet, so the finding tells an adopter to run nothing                                                         | med / low           | The message body carries the stale path and manual repair text only; a command name is added in the release that ships the command                           | A refresh command lands and the message is not updated with it |
