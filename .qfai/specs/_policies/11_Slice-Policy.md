# 11 Slice Policy

spec ディレクトリのスライスと、Stage 1 Triage における 8 種オペレーションの
判定基準を定義する。

## スライスカテゴリ

| Category   | Slice Rule                     | ID Range        |
| ---------- | ------------------------------ | --------------- |
| structural | 1 pack-type = 1 spec           | spec-0001..0002 |
| cli        | 1 command = 1 spec             | spec-0003..0007 |
| skill      | 1 skill = 1 spec               | spec-0008..0016 |
| agent      | all agents = 1 collective spec | spec-0017       |

### カテゴリ定義

- **structural**: QFAI フレームワーク自体の構造定義（spec-pack, discussion-pack）。
- **cli**: `packages/qfai/src/cli/commands/` に実装される CLI コマンド。1 コマンド = 1 spec。
- **skill**: `packages/qfai/assets/init/.qfai/assistant/skills/` に定義される SKILL.md。1 skill = 1 spec。
- **agent**: `packages/qfai/assets/init/.qfai/assistant/agents/` に定義されるサブエージェント。全エージェントで 1 spec。

## Triage オペレーション (8 種)

UPDATE は APPEND / MODIFY / REMOVE に細分化する。SPLIT / MERGE / SUPERSEDE
は構造変更の 1st-class オペレーション。

| Operation   | Sub-op  | トリガー                                                                | AskUserQuestion |
| ----------- | ------- | ----------------------------------------------------------------------- | --------------- |
| CREATE      | -       | 新 subject、active spec が capability を保持していない                  | 必須            |
| UPDATE      | APPEND  | 既存 active spec に新 US/AC/BR/EX/TC を追加（既存項目の意味変更なし）   | 不要            |
| UPDATE      | MODIFY  | 既存 US/AC/BR/EX/TC の意味を変更                                        | 不要            |
| UPDATE      | REMOVE  | 既存 US/AC/BR/EX/TC を削除（downstream 参照を切断）                     | 必須            |
| DELETE      | -       | spec の subject ごとリポジトリから消失                                  | 必須            |
| SPLIT       | -       | 1 spec が複数 capability を保持しており責務分離が必要                   | 必須            |
| MERGE       | -       | 複数 spec が同一 capability に収斂                                      | 必須            |
| SUPERSEDE   | -       | spec の責務が新 spec に置換、履歴は status: superseded で保持           | 必須            |

## APPEND vs CREATE 判定アルゴリズム

各 REQ/NFR に対して上から順に判定:

1. REQ の capability を `_policies/03_Capabilities.md` から特定
2. 単一 active spec が capability を保持し、`acCount <= 30 && tcCount <= 50` → **UPDATE:APPEND**
3. 複数 active spec が capability を共有 → **MERGE**
4. 単一 active spec が capability を保持するが size 閾値超 → **SPLIT**
5. capability 自体が新規 → **CREATE**
6. REQ が既存項目の削除を要求 → **UPDATE:REMOVE**
7. spec の subject 自体が消失 → **DELETE**
8. 責務を新 spec に移し旧 ID は履歴として残す → **SUPERSEDE**

## Decision procedure

1. `_policies/03_Capabilities.md` と active spec summary を読む（status: active のみ対象）。
2. 全変更要望に対する Triage table を spec 編集前に構築する。
3. CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE 行は AskUserQuestion で承認を取得。
4. Triage table を以下に永続化:
   - 単一 spec を触る行 → `<spec>/09_delta.md`
   - 複数 spec をまたぐ行（SPLIT / MERGE / SUPERSEDE）または policy のみの変更 → `_policies/10_delta.md`
5. 承認確定後に Phase 0 (Contracts-first) へ進む。

## Status field

各 spec の `01_Spec.md` は `Status: active | superseded | deprecated | removed` を必ず宣言する。

- SUPERSEDE 時は移行元 spec を `Status: superseded` にし `Superseded-by: spec-NNNN` を設定。
- DELETE は spec ディレクトリごと削除し、理由を delta に記録。
- deprecated / removed は `Deprecated-at: YYYY-MM-DD` 必須。
- Triage 判定では非 active spec は対象外。

## AskUserQuestion テンプレート

**CREATE / SPLIT / MERGE / SUPERSEDE 時:**

```text
${operation} を実行します。
対象: ${subject}
影響 spec: ${spec_ids_or_none}
理由: ${rationale}
承認しますか？
```

**DELETE / UPDATE:REMOVE 時:**

```text
${operation} を実行します。
対象 spec: ${spec_id}
削除内容: ${what_will_be_removed}
理由: ${rationale}
承認しますか？
```

## ID 安定性ルール

1. structural specs (0001-0002) は固定。
2. CLI specs は `03_Capabilities.md` 記載順で spec-0003 から付番。
3. skill specs はアルファベット順で CLI specs の次から付番。
4. agent spec は常に最後の spec。
5. SUPERSEDE / DELETE 後も既存 ID は再利用しない（gap を残す）。

## ギャップポリシー

- 削除時はギャップを残す（リナンバリングしない）。
- 新規 spec はカテゴリ末尾に追加。
- 順序変更は Change Request + delta.md 記録必須。

## Current Slicing Notes

- `spec-0016` は late-added skill spec として active range に含める。
- `spec-0017` は agent collective spec として維持し、renumber は行わない。
- contract-first downstream への収束は既存 slice model に閉じており、追加の reslicing は不要。
