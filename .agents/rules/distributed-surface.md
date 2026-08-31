# Distributed Surface Discipline

QFAI npm パッケージとして配布されるファイル群を「配布サーフェス」と呼ぶ。
配布サーフェスに QFAI 内部の識別子・版番号を書いてはいけない。

## Distributed Surface (SSOT)

配布サーフェス = `packages/qfai/package.json` の `"files"` フィールドに列挙
されたパス。現状: `dist/`, `assets/`, `README.md`, `LICENSE`。

`files` を変更したら、ガード (`packages/qfai/scripts/check-no-internal-version-leakage.sh`)
は自動追従する (パスを動的に展開する)。追加作業は不要。

## Forbidden in Distributed Surface

| カテゴリ                      | パターン                            | 例                               |
| ----------------------------- | ----------------------------------- | -------------------------------- |
| QFAI 内部 spec ID             | `spec-0010` 以降                    | `spec-0011`, `spec-0042`         |
| QFAI 内部 capability ID       | `CAP-0010` 以降                     | `CAP-0013`                       |
| QFAI 内部 decision ID         | `DEC-NNNN-NNNN`                     | `DEC-0001-0042`                  |
| QFAI 内部 design rationale    | `DR-NNNN`                           | `DR-0007`                        |
| QFAI 内部 open-question ID    | `OQ-NNNN-NNNN`                      | `OQ-0012-0006`                   |
| QFAI 内部 change ID           | `CHG-NNN` (`_policies/10_delta.md`) | `CHG-003`, `CHG-006`             |
| QFAI 内部 trace prefix        | `QFAI-PROT2-NNN` 等の廃止 prefix    | (廃止済み)                       |
| 内部バージョンマーカー        | `vN.M`, `vN.M.P`, `v1.x`            | `v2.0`, `v3.0`                   |
| 内部 schemaVersion フィールド | `"schemaVersion"`, `schemaVersion:` | (永続アーティファクトに置かない) |

例外:

- `spec-0001..0009` はサンプル / Category B として配布物に登場してよい
  (`qfai init` で生成される spec の例示)。
- `package.json` の `"version"` フィールドは正規版番なので除外。
- `.qfai/assistant/process/migrations/v<MAJOR>.<MINOR>.<PATCH>[-*].md` の
  **ファイル名** に含まれる版番は意図的な刻印なので、ファイル名 scan の
  version クラスから除外する。memo は ADR 的な引用先であり公開後に名前を
  変えられず、`src/core/paths/assistantPaths.ts` の
  `migrationMemoRelativePath()` が `--upgrade-assistant-tree` のたびに
  1 件生成する。除外は version クラスかつファイル名のみ — memo 本文と、
  spec ID / trace ID は従来どおり検出する。
  除外は「この形の basename だけを無害化する」書き換えとして実装する
  (パスを丸ごと skip しない)。したがって同ディレクトリの
  `notes-v2.0-draft.md`、下位ディレクトリ `drafts-v2.0/`、`.qfai/` 配下
  でない別ツリーの同名パスは引き続き検出される。

## Canonical Version Source

配布物に登場する版番号は `packages/qfai/package.json#version` のみ。
独自の `schemaVersion` / 内部 `vN.M` を新設しない。互換破壊は npm 版番の
minor / major 上げで表現する。

## Defenses (4 layers)

1. **pre-build lint** — `packages/qfai/scripts/lint-shipping.ts`
   (`src-comment` ターゲット) と CI の `pnpm ci:lint` レーン。
   `src/*.ts` の JSDoc / コメント行を `INTERNAL_SPEC_RE` 等と同じ
   regex セットで scan し、tsup が `dist/*.d.ts` に retain する
   経路を pre-build で塞ぐ。`spec-NNNN` / `.qfai/specs/spec-NNNN/` /
   `vN.M[.P]` / `CAP-0010+` / `DEC-NNNN-NNNN` / `DR-NNNN` /
   `OQ-NNNN-NNNN` / `QFAI-PROT2-NNN` / `CHG-NNN` / `schemaVersion` を全て catch。行頭が
   comment marker の行のみ検出 — 末尾 `//` や行内 `/* */` は
   layer 2 (post-build) で catch する known limitation。
   PR #206 review Ntbp / NwM- で導入。
2. **post-build 静的ガード** — `packages/qfai/scripts/check-no-internal-version-leakage.sh`。
   `package.json#files` を読んで配布物パスを動的決定し、上の正規表現で grep。
   CI lint job + build job (post-build) で実行。layer 1 を補完する
   最終バックストップ — comment 行検出粒度に依存しない。
   scan は 2 次元: ファイル **内容** と **ファイル名** の両方に同じ正規表現を
   当てる。名前側の hit は `FAIL: ... leaked in a FILE NAME` として
   内容側と区別して報告する。
3. **smoke test** — `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts`。
   `qfai init` を temp dir に走らせ、出力ツリーを同じ正規表現で grep
   (layer 2 と同じく内容 + ファイル名の 2 次元)。
   `copyTemplateTree` のロジック / asset 取り込みフィルタの抜けを catch。
   拡張子 allowlist に加えて `.gitkeep` 等の拡張子なしテキストファイルも
   basename allowlist で走査する (`path.extname(".gitkeep") === ""` のため
   拡張子だけでは読まれない)。
4. **規約文書** — このファイル。寄稿者の認識合わせ用。

**SSOT-sync invariant**: layer 1 / 2 / 3 は同じ forbidden class 集合を
3 つの言語で書いた等価表現。1 箇所更新時は他 2 箇所も同時更新する。
規約文書 (layer 4) も追従する。

## Where Internal IDs Are OK

開発時の design / spec トレーサビリティでは内部 ID を使ってよいが、
以下の場所のみ:

- `.qfai/specs/`, `.qfai/discussion/`, `.qfai/contracts/` (配布物外)
- `CHANGELOG.md` (リポジトリ root、配布物外)
- `packages/qfai/docs/` (配布物外)
- git commit message / PR description (履歴のみ)
- `packages/qfai/src/**` の **コメントでない** 識別子 (テストフィクスチャ内の
  spec 名など)。JSDoc には書かない: tsup が `dist/*.d.ts` に残す。

迷ったら: 「これはユーザの環境にコピーされうるか?」で判断する。
コピーされうるなら書かない。
