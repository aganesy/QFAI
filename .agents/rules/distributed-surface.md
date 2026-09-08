# Distributed Surface Discipline

QFAI の npm パッケージとして配布されるファイル群を「配布サーフェス」と呼ぶ。
配布サーフェスに QFAI 内部の識別子と版番号を書かない。

迷ったら「このファイルはユーザの環境にコピーされるか」で判断する。
コピーされるなら書かない。

## 配布サーフェスの範囲

`packages/qfai/package.json` の `files` に列挙されたパス。
現在は `dist/`, `assets/`, `README.md`, `LICENSE`。

ガードは `files` を読んで対象パスを決める。`files` を変えても追加作業はない。

## 書いてはいけないもの

| 種類                     | パターン                            | 例                       |
| ------------------------ | ----------------------------------- | ------------------------ |
| 内部 spec ID             | `spec-0010` 以降                    | `spec-0011`, `spec-0042` |
| 内部 capability ID       | `CAP-0010` 以降                     | `CAP-0013`               |
| 内部 decision ID         | `DEC-NNNN-NNNN`                     | `DEC-0001-0042`          |
| 内部 design rationale ID | `DR-NNNN`                           | `DR-0007`                |
| 内部 open-question ID    | `OQ-NNNN-NNNN`                      | `OQ-0012-0006`           |
| 内部 change ID           | `CHG-NNN`                           | `CHG-003`                |
| 廃止済み trace prefix    | `QFAI-PROT2-NNN`                    |                          |
| 内部バージョンマーカー   | `vN.M`, `vN.M.P`, `v1.x`            | `v2.0`, `v3.0`           |
| 内部 schemaVersion       | `"schemaVersion"`, `schemaVersion:` |                          |

### 例外

- `spec-0001` から `spec-0009` は `qfai init` が生成するサンプル spec の ID なので書いてよい。
- `package.json` の `version` は正規の版番号なので対象外。
- `.qfai/assistant/process/migrations/v<MAJOR>.<MINOR>.<PATCH>[-*].md` の**ファイル名**にある版番号は対象外。
  この memo は `qfai init --upgrade-assistant-tree` が 1 回ごとに生成し、他の文書から引用されるため改名できない。
  ガードはこの形の basename だけを無害化してから走査する。
  memo の本文、spec ID / trace ID、`notes-v2.0-draft.md` や `drafts-v2.0/` のような他の名前は検出対象のまま。

## 版番号の出どころ

配布物に書く版番号は `packages/qfai/package.json` の `version` だけ。
独自の `schemaVersion` や内部 `vN.M` を新設しない。
互換性を壊す変更は npm の minor / major を上げて表す。

## 4 層のガード

| 層               | 実装                                                                | 何を見るか                                                                    |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| pre-build lint   | `packages/qfai/scripts/lint-shipping.ts` (`src-comment`)            | `src/**/*.ts` のコメント行。tsup が `dist/*.d.ts` に残す経路を build 前に塞ぐ |
| post-build guard | `packages/qfai/scripts/check-no-internal-version-leakage.sh`        | `package.json` の `files` が指すパスの内容とファイル名                        |
| smoke test       | `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts` | `qfai init` を一時ディレクトリに実行し、出力ツリーの内容とファイル名          |
| 規約             | このファイル                                                        | 寄稿者の認識合わせ                                                            |

- pre-build lint は行頭がコメント記号の行だけを見る。行末の `//` や行内の `/* */` は post-build guard が拾う。
- post-build guard と smoke test はファイル名の hit を `leaked in a FILE NAME` として内容の hit と区別して報告する。
- smoke test は拡張子のないテキストファイル (`.gitkeep` など) も basename の allowlist で走査する。
- 3 つの実装は同じ禁止パターン集合を持つ。1 つを変えたら残り 2 つとこのファイルも同時に変える。

CI での実行箇所は次のとおり。

| 層               | 実行するジョブとステップ                                      |
| ---------------- | ------------------------------------------------------------- |
| pre-build lint   | lint job の `pnpm ci:lint` (`lint:shipping` として)           |
| post-build guard | lint job と build job の専用ステップ。build job では build 後 |
| smoke test       | test job                                                      |

post-build guard は `pnpm ci:lint` には入っていない。`ci:lint` から呼べば build 前の `dist/` を見ることになり、それは pre-build lint が別の粒度で見ている対象である。

## 内部 ID を書いてよい場所

- `.qfai/specs/`, `.qfai/discussion/`, `.qfai/contracts/`
- `CHANGELOG.md`
- `packages/qfai/docs/`
- commit message と PR の説明
- `packages/qfai/src/**` のコメント以外の識別子 (テストフィクスチャの spec 名など)。JSDoc には書かない。tsup が `dist/*.d.ts` に残す。
