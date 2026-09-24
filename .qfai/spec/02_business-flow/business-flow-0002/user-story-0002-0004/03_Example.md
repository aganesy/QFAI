# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                      | Expected                                                                                                                                     |
| --------------- | --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0004-01 | AC-0002-0004-01 | Markdown のみの diff と source の diff で配布 detection シェルを実行       | 前者は minimal lane 集合、後者は full lane 集合を出力する。third-party action は経路に現れず、full history 要求は detection job にのみ現れる |
| EX-0002-0004-02 | AC-0002-0004-01 | shallow clone と base ref 到達不能の fixture で配布 detection シェルを実行 | いずれも warning annotation を出力し、full lane superset を選択する。verdict は green。認識セット外パスの diff も full superset を選択する   |
| EX-0002-0004-03 | AC-0002-0004-01 | 選択 lane 集合が空の状態で配布 verdict job を評価                          | verdict は always-run 条件で実行され exit 0。permission map は空。verdict は detection と同一ファイル内に定義されている                      |
