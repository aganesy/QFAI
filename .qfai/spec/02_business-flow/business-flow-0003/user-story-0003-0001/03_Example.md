# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                     | Expected                                                  |
| --------------- | --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| EX-0003-0001-01 | AC-0003-0001-01 | `qfai doctor`（正常な設定）                                               | テキスト形式で root, config, checks, summary が出力される |
| EX-0003-0001-02 | AC-0003-0001-01 | `qfai doctor`（--root 未指定、cwd に config あり）                        | root が自動検出される                                     |
| EX-0003-0001-03 | AC-0003-0001-02 | `qfai doctor`（config 不在）                                              | config.found = false、warning チェック出力                |
| EX-0003-0001-04 | AC-0003-0001-01 | Given the consolidated rule BR-0006-0006 When layer coverage is evaluated | Then at least one example exists for BR-0006-0006         |
