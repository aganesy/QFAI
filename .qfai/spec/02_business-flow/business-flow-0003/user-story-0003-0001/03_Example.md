# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                              | Expected                                                                                                           |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| EX-0003-0001-01 | AC-0003-0001-01 | `qfai doctor` with a valid `qfai.config.yaml`                                                      | Text output lists root, config, checks and summary, and names the config path as found                             |
| EX-0003-0001-02 | AC-0003-0001-01 | `qfai doctor`（--root 未指定、cwd に config あり）                                                 | root が自動検出される                                                                                              |
| EX-0003-0001-03 | AC-0003-0001-02 | `qfai doctor`（config 不在）                                                                       | config.found = false、warning チェック出力                                                                         |
| EX-0003-0001-04 | AC-0003-0001-01 | `qfai doctor --format json` with a present config and a missing configured directory               | `summary` contains `ok`, `info`, `warning`, and `error`; each count equals the number of checks with that severity |
| EX-0003-0001-05 | AC-0003-0001-01 | `qfai doctor --format json` with `qfai.config.yaml` present at the root                            | `config.found` is `true`, `config.configPath` is `qfai.config.yaml`, and the `config.search` check is `ok`         |
| EX-0003-0001-06 | AC-0003-0001-01 | `qfai doctor` run from `<root>/a/b` with no `--root`, and `qfai.config.yaml` only at `<root>`      | `root` resolves to `<root>`, and `config.found` is `true`                                                          |
| EX-0003-0001-07 | AC-0003-0001-03 | `qfai doctor --format json` with a `qfai.config.yaml` whose `paths` value is a list, not a mapping | The `config.load` check is `error`, and an entry of `details.issues` names `paths`                                 |
