# 11_OQ-Register

## OQ Table

| OQ-ID   | Title                                  | Gate       | Disposition | Owner | Rationale                                                                                                  | Options                                                                                                                                                                  | Recommendation                          | Next-Decision-Point | Due        | Evidence                         |
| ------- | -------------------------------------- | ---------- | ----------- | ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------- | ---------- | -------------------------------- |
| OQ-0001 | GitHub agent 命名規約の不一致          | discussion | resolved    | agent | symlink 名は任意の名前にでき、ターゲット名と一致する必要はない                                             | A) symlink 名をターゲット名と揃える（canonical を `.agent.md` に改名） / B) symlink 名とターゲット名を異なるまま許容（recommended: B）                                   | B: symlink 名とターゲット名は不一致許容 | N/A                 | 2026-03-12 | Git symlink 仕様、OS 仕様        |
| OQ-0002 | copilot-instructions.md の参照先更新   | discussion | resolved    | agent | `.github/prompts/` 削除に伴い `.github/copilot-instructions.md` の参照先を更新する必要がある               | A) `.github/skills/` に参照先を更新（recommended: A） / B) copilot-instructions.md も削除                                                                                | A: `.github/skills/` に更新             | N/A                 | 2026-03-12 | SRC-0009                         |
| OQ-0003 | 非 QFAI skill（pr-fix/pr-merge）の扱い | discussion | resolved    | agent | pr-fix/pr-merge は `.qfai/assistant/skills/` に存在しないため symlink 化の対象外                           | A) 対象外のまま維持（recommended: A） / B) `.qfai/assistant/skills/` に移動して symlink 化                                                                               | A: 対象外のまま維持                     | N/A                 | 2026-03-12 | SRC-0002                         |
| OQ-0004 | Windows symlink 失敗時の挙動           | discussion | resolved    | user  | Windows で Developer Mode OFF の場合 symlink 作成に失敗する。ユーザー確認で「エラー + fallback」方針に決定 | A) エラーメッセージ表示のみで中断 / B) junction（ディレクトリ用）+ テキストファイル（ファイル用）にフォールバック / C) エラーメッセージ + 処理続行せず（recommended: C） | C: エラー表示 + 処理続行せず            | N/A                 | 2026-03-12 | ユーザー確認（conversation log） |
| OQ-0005 | README.md ファイルの扱い               | discussion | resolved    | agent | 各ツールディレクトリの README.md は symlink 化せず通常ファイルとして維持する                               | A) 通常ファイル維持（recommended: A） / B) README.md も symlink 化                                                                                                       | A: 通常ファイル維持                     | N/A                 | 2026-03-12 | SRC-0002                         |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- `Options` must include at least two alternatives and one recommended option.
- `Recommendation` must explicitly state the recommended option.
- All 11 columns are mandatory for every row.
