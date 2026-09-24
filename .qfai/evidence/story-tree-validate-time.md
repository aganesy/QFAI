# Story-tree validate timing

## Method

The baseline CLI was built from the clean P1 head whose tree SHA-1
`d50f63a0fe6c87369c5f75f92b31cbf9c7b7670e` equals integration commit
`2ef635a957afe75e5a5213cacb8f53d2be7e80d9`. The build command was
`.\node_modules\.bin\tsup.cmd` in `packages/qfai/`. The resulting
`dist/cli/index.mjs` has SHA-256
`4A0FD878E415C76678B2336C7DDB4908CE90D4212ECC1D443045EA45AA3D8D0C`.

A single empty project was initialized with that CLI. Its pristine output was
copied to five separate run directories with symbolic links preserved. Before
each run, the sorted relative-path, file byte hash, size, and link-target
inventory matched the seed tree. The timed command was
`node <built-cli> validate --root <run-directory> --fail-on error --format github`.
Initialization, copying, and hashing were outside the timed interval. Each
`validate.json` was saved outside its run directory.

A fresh init retains project placeholders and has no discussion pack.
Consequently `--fail-on error` returns 1 after full validation. A run was
accepted only when `validate.json` reported `profile: full` and
`profileValidatorsRan: true`, with no `QFAI-SCAN-002`. The benchmark measures
full validation time; it does not assert that a new project has completed its
project-specific setup.

## P1 baseline

| Field | Value |
| --- | --- |
| Integration commit | `2ef635a957afe75e5a5213cacb8f53d2be7e80d9` |
| CLI package version | `1.12.3` |
| Computer | `YUSUKE001` |
| OS | Windows NT 10.0.26200.0 (Windows 11 Pro) |
| CPU | Intel Core i5-9500, 3.00 GHz |
| Node | v24.18.0 |
| Pristine tree SHA-256 | `6DE2DC34DE60AC7394EBA6C788F4E6CF06FFF27D064372B23DB5D3A788AF26AF` |
| Pristine paths / symbolic links / file bytes | 389 / 78 / 2,581,698 |
| Median | **2,792.323 ms** |
| 120% final ceiling | **3,350.7876 ms** |

All five runs had that pristine tree hash, exit code 1, and the same finding
totals: 5 errors, 3 warnings, and 7 informational findings.

| Run | Time (ms) | Saved `validate.json` SHA-256 |
| --- | ---: | --- |
| 1 | 2,742.831 | `DB0EDC77EE46FD9A323228CF606E6323F2670BCC7D386EBAF2AA088F09F88BD4` |
| 2 | 2,888.791 | `04A2CC095992A07C0B94195926A485506773EE8BB0D511D62FC2F1AC12BB6871` |
| 3 | 3,667.701 | `F53A0F66FAD0BAC686FBDDDD43342ABB8731739AF4F669B9CA75C72C3DDE7DA5` |
| 4 | 2,792.323 | `BEF73A42F3630789A040EE1E6E3BFEE6C348D4008EA1046E02887666FF1F5FB8` |
| 5 | 2,507.900 | `C587EB3E59A703AC3FF20DA35E3DE3536119C5B7C5485FE41CB45A44DA0808F7` |

Each run reported the same code counts:

| Code | Count |
| --- | ---: |
| `QFAI-ASSETS-003` | 4 |
| `QFAI-CFG-LINK-002` | 2 |
| `QFAI-CONTRACT-000` | 3 |
| `QFAI-DPACK-001` | 1 |
| `QFAI-PROFILE-001` | 1 |
| `QFAI-REVIEW-002` | 1 |
| `QFAI-SPACK-000` | 1 |
| `QFAI-TEST-002` | 1 |
| `QFAI-TRACE-003` | 1 |

The saved reports and summary are under
`tmp/story-tree-benchmark-p1-2ef635a9-v2/`. The summary SHA-256 is
`7FB0EB34D85BF609134F5D22F8FEF592C7F74859119AEEBEBEBE826D29C9565B`.

## Integrated diagnostic and P8 final gate

The initial integrated story-tree commit `df55ba0c2` supplies a retrospective
diagnostic. A separate P3 checkpoint measurement was not captured before that
commit. Its JavaScript CLI bundle completed; the declaration build failed
because this older revision's `baseUrl` setting is deprecated by the locally
installed TypeScript 6.0.3. The benchmark uses the completed CLI bundle and
does not count the declaration build as a passing build gate.

| Field | Integrated diagnostic | P8 final |
| --- | ---: | ---: |
| Commit | `df55ba0c2` | `d77a084a0` |
| CLI SHA-256 | `B13EFC266E1D2104C2C1B36411977B93B3EF87C479F9FFCF17F8B548D6207FAC` | `FE883764499620FAFFB7DCF8812456CC5502B4C2BBAF68F880F623DB1430B7B9` |
| Pristine paths / symbolic links / file bytes | 397 / 82 / 1,106,446 | 407 / 82 / 1,207,460 |
| Median | **1,798.340 ms** | **1,947.900 ms** |
| P1 ceiling | 3,350.7876 ms | 3,350.7876 ms |

| Run | Integrated diagnostic (ms) | P8 final (ms) |
| --- | ---: | ---: |
| 1 | 2,115.633 | 3,024.736 |
| 2 | 1,671.420 | 1,692.262 |
| 3 | 1,798.340 | 1,543.275 |
| 4 | 2,175.424 | 1,947.900 |
| 5 | 1,625.937 | 1,981.722 |

Each run used a byte-identical clone of its own CLI's fresh-init output.
Every run exited 1 after full validation with `profileValidatorsRan: true`
and no `QFAI-SCAN-002`. The exit is expected for an unconfigured fresh
project. The P8 median is 69.8% of the P1 baseline and is below the
120% ceiling. The diagnostic and final summaries are under
`tmp/story-tree-benchmark-diag-df55ba0c2/` and
`tmp/story-tree-benchmark-p8-d77a084a0-pwsh/`. Their summary SHA-256
values are `D6E5BD713E861EE59FCF7327C329C5004144FCF9A37975FB0336FE7CEB0444D0`
and `91BDA07519EE9D7F62A1004DD0F57B17E73974EC58A022BF2C7EB9B334BAAE10`.
