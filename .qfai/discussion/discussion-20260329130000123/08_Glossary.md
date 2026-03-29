# 08 Glossary

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329130000123 |
| Date          | 2026-03-29                   |

## Terms

| Term                   | Definition                                                                                   | Source Refs |
| ---------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| static-first           | runtime-heavy checks を default completion から外し、軽量 obligations を優先する方針         | SRC-0001    |
| runtime-heavy checks   | API non-404、DB existence、UI route reachability など環境依存の強い確認                      | SRC-0001    |
| render evidence        | screenshots、viewport metadata、DOM/HTML snapshot refs からなる視覚・描画系証跡              | SRC-0001    |
| capability declaration | optional backend/evidence 機能の利用可否を明示する宣言                                       | SRC-0001    |
| provider abstraction   | backend 実装差異を吸収する登録インターフェース                                               | SRC-0001    |
| fail-open              | optional capability 不在時に全体を block せず継続する振る舞い                                | SRC-0001    |
| skipped semantics      | capability や環境不足により未実行であることを明示的に表す状態                                | SRC-0001    |
| browser QA             | smoke、interaction、visual、accessibility を扱う browser-based quality check                 | SRC-0001    |
| structured finding     | phase、repair suggestion 等を持つ機械可読な QA 出力（status は phase result 側に保持される） | SRC-0001    |
