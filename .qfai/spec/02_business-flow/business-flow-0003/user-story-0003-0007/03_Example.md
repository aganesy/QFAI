# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                        | Expected                                                                                                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0003-0007-01 | AC-0003-0007-01 | `qfai doctor` (skills.integrity drift あり、`--fail-on error`)                                               | exit 0; skills.integrity finding が severity warning として出力される                                                                                         |
| EX-0003-0007-02 | AC-0003-0007-02 | `qfai doctor --format text` (skills.integrity warning + ディレクトリ欠落 warning + config 不在 error が混在) | summary に "errors blocking the active profile" group が config 不在 error を含み、"warnings advisory of drift" group が skills.integrity + specs/ 欠落を含む |
