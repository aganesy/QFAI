# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                  | Expected                                                                                                                                                                              |
| --------------- | --------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0006-01 | AC-0002-0006-01 | pnpm / yarn Berry / yarn Classic / npm の各 lockfile fixture と lockfile なし fixture  | 5 ケースすべてで install 分岐が解決し、`cache:` 式が左から短絡評価される。単一 package manager 形式への置換は起きていない。新規配布ファイルにも同形の install 分岐が存在する          |
| EX-0002-0006-02 | AC-0002-0006-02 | Node version ファイルを持たない adopter fixture で配布 setup step を実行               | documented literal が使われ warning annotation が出て step は成功する（exit 0）。version ファイルがある fixture では当該ファイルの値が優先される                                      |
| EX-0002-0006-03 | AC-0002-0006-02 | pnpm lockfile はあるが `packageManager` field が無い adopter fixture で install を実行 | step は fail closed し、`packageManager` field を修正箇所として名指しする annotation を出す。不透明な resolution error では終わらず、後続 lane は computed していない結果を報告しない |
