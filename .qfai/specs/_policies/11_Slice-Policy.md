# 11 Slice Policy

spec ディレクトリのスライス（分割単位）と、それに基づく spec の作成・更新・削除の判断基準を定義する。

## スライスカテゴリ

| Category   | Slice Rule                     | ID Range        |
| ---------- | ------------------------------ | --------------- |
| structural | 1 pack-type = 1 spec           | spec-0001..0002 |
| cli        | 1 command = 1 spec             | spec-0003..0007 |
| skill      | 1 skill = 1 spec               | spec-0008..0014 |
| agent      | all agents = 1 collective spec | spec-0015       |

### カテゴリ定義

- **structural**: QFAI フレームワーク自体の構造定義（spec-pack, discussion-pack）。
- **cli**: `packages/qfai/src/cli/commands/` に実装される CLI コマンド。1 コマンド = 1 spec。
- **skill**: `packages/qfai/assets/init/.qfai/assistant/skills/` に定義される SKILL.md。1 skill = 1 spec。
- **agent**: `packages/qfai/assets/init/.qfai/assistant/agents/` に定義されるサブエージェント。全エージェントで 1 spec。

## 作成・更新・削除の判断基準

| 操作   | トリガー                                 | AskUserQuestion |
| ------ | ---------------------------------------- | --------------- |
| CREATE | 新 CLI コマンド / skill / pack-type 追加 | **必須**        |
| UPDATE | 既存の要件変更                           | 不要            |
| DELETE | CLI コマンド / skill 廃止                | **必須**        |

### AskUserQuestion テンプレート

**CREATE 時:**

```text
新規 spec-XXXX (${subject}) を作成します。
カテゴリ: ${category}
スコープ: ${scope_summary}
承認しますか？
```

**DELETE 時:**

```text
spec-XXXX (${subject}) を削除します。
理由: ${rationale}
承認しますか？
```

## ID 安定性ルール

1. structural specs (0001-0002) は固定。
2. CLI specs は `03_Capabilities.md` 記載順で spec-0003 から付番。
3. skill specs はアルファベット順で CLI specs の次から付番。
4. agent spec は常に最後の spec。

## ギャップポリシー

- 削除時はギャップを残す（リナンバリングしない）。
- 新規 spec はカテゴリ末尾に追加。
- 順序変更は Change Request + delta.md 記録必須。
- delta.md に記載された旧 spec 番号（例: spec-0035〜0037）は統合前の履歴であり、現行の ID Range とは一致しない。

## v1.7.15 Slicing Confirmation

v1.7.15 の scope extension (runtime truthfulness hardening) は spec-0012 (qfai-prototyping, category: skill) 内に閉じており、既存のスライスモデルと整合する。新規 spec の作成や re-slicing は不要。

## v1.7.17 Slicing Confirmation

v1.7.17 の DGS-axis traceability hardening は既存の slice model に閉じる。

- spec-0010 (qfai-discussion, category: skill): design guideline research step / sources category / score-anchor authoring guidance
- spec-0004 (qfai validate, category: CLI): guideline coverage / anchor concreteness validators

新規 spec の作成や re-slicing は不要。
