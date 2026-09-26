# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                              | Expected                                               |
| --------------- | --------------- | -------------------------------------------------- | ------------------------------------------------------ |
| EX-0003-0005-01 | AC-0003-0005-01 | `qfai doctor --format json`                        | JSON 形式で同等の情報が出力される                      |
| EX-0003-0005-02 | AC-0003-0005-02 | `qfai doctor --out /tmp/doctor.json --format json` | /tmp/doctor.json に出力、stdout は info メッセージのみ |
