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
| QFAI 内部 spec ID             | `spec-0010` 以降                    | `spec-0017`, `spec-0042`         |
| QFAI 内部 capability ID       | `CAP-0010` 以降                     | `CAP-0013`                       |
| QFAI 内部 decision ID         | `DEC-NNNN-NNNN`                     | `DEC-0001-0042`                  |
| QFAI 内部 design rationale    | `DR-NNNN`                           | `DR-0007`                        |
| QFAI 内部 trace prefix        | `QFAI-PROT2-NNN` 等の廃止 prefix    | (廃止済み)                       |
| 内部バージョンマーカー        | `vN.M`, `vN.M.P`, `v1.x`            | `v2.0`, `v3.0`                   |
| 内部 schemaVersion フィールド | `"schemaVersion"`, `schemaVersion:` | (永続アーティファクトに置かない) |

例外:

- `spec-0001..0009` はサンプル / Category B として配布物に登場してよい
  (`qfai init` で生成される spec の例示)。
- `package.json` の `"version"` フィールドは正規版番なので除外。

## Canonical Version Source

配布物に登場する版番号は `packages/qfai/package.json#version` のみ。
独自の `schemaVersion` / 内部 `vN.M` を新設しない。互換破壊は npm 版番の
minor / major 上げで表現する。

## Defenses (3 layers)

1. **静的ガード** — `packages/qfai/scripts/check-no-internal-version-leakage.sh`。
   `package.json#files` を読んで配布物パスを動的決定し、上の正規表現で grep。
   CI lint job + build job (post-build) で実行。
2. **smoke test** — `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts`。
   `qfai init` を temp dir に走らせ、出力ツリーを同じ正規表現で grep。
   `copyTemplateTree` のロジック / asset 取り込みフィルタの抜けを catch。
3. **規約文書** — このファイル。寄稿者の認識合わせ用。

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
