# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                      | Expected                                                                                                                                                                                                                                     |
| --------------- | --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0004-01 | AC-0002-0004-01 | Run the shipped detection shell on a Markdown-only diff and a source diff  | The first outputs the minimal lane set and the second the full lane set. No third-party action appears in detection. Full history is requested only by the detection job, the document scope job and, on a pull request, the validation job. |
| EX-0002-0004-02 | AC-0002-0004-01 | shallow clone と base ref 到達不能の fixture で配布 detection シェルを実行 | いずれも warning annotation を出力し、full lane superset を選択する。verdict は green。認識セット外パスの diff も full superset を選択する                                                                                                   |
| EX-0002-0004-03 | AC-0002-0004-01 | 選択 lane 集合が空の状態で配布 verdict job を評価                          | verdict は always-run 条件で実行され exit 0。permission map は空。verdict は detection と同一ファイル内に定義されている                                                                                                                      |
