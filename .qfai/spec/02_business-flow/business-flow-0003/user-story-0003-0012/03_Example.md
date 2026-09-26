# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                           | Expected     |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| EX-0003-0012-01 | AC-0003-0012-01 | `qfai doctor --fail-on error`、warning のみ                                                     | 終了コード 0 |
| EX-0003-0012-02 | AC-0003-0012-02 | `qfai doctor --fail-on warning`、warning あり                                                   | 終了コード 1 |
| EX-0003-0012-03 | AC-0003-0012-03 | `qfai doctor --fail-on warning` on a tree whose summary has one `error` finding and `warning` 0 | Exit code 1  |
