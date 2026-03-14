# 07 NFR — 非機能要件

## 非機能要件一覧

### NFR-0001: 変更の持続性（コンパクト実行後のルール維持）

- **ID**: NFR-0001
- **ソース**: SRC-0001, SRC-0011
- **カテゴリ**: 信頼性
- **説明**: AskUserQuestion MUST ルールは、コンパクト実行（context compression）後もエージェントが参照できる場所（constitution.md）に記載されなければならない。
- **計測基準**: constitution.md が読み込まれていれば Article X が常に有効であること
- **優先度**: 必須

---

### NFR-0002: 文言の一貫性

- **ID**: NFR-0002
- **ソース**: SRC-0002〜SRC-0012
- **カテゴリ**: 保守性
- **説明**: 全 9 SKILL.md、constitution.md、communication.md の AskUserQuestion ルールの表現が一貫していなければならない。「MUST」「しなければならない」等の強制表現が統一されていること。
- **計測基準**: 全ファイルのプロトコルセクションで同一のキーワード・構造を使用していること（レビュー時に確認）
- **優先度**: 高

---

### NFR-0003: 実装範囲の最小化

- **ID**: NFR-0003
- **ソース**: SRC-0011
- **カテゴリ**: 変更容易性
- **説明**: 本変更は SKILL.md および instruction ファイル（constitution.md、communication.md）のみの改訂とし、TypeScript コードを変更してはならない。
- **計測基準**: git diff に `.ts`, `.js`, `.mjs` ファイルの変更が含まれていないこと
- **優先度**: 必須

---

### NFR-0004: 後方互換性の維持

- **ID**: NFR-0004
- **ソース**: SRC-0011
- **カテゴリ**: 互換性
- **説明**: 本変更により、既存の constitution.md の Article I〜IX および既存の SKILL.md の他セクションの内容が変更されてはならない。Article X の追加は追記のみとする。
- **計測基準**: 既存 Article I〜IX の内容が変更されていないこと（diff 確認）
- **優先度**: 必須

---

### NFR-0005: 検証可能性

- **ID**: NFR-0005
- **ソース**: SRC-0011
- **カテゴリ**: テスト容易性
- **説明**: AskUserQuestion MUST ルールの適用は、Reviewer Gate で検証可能でなければならない。Reviewer は成果物を見て AskUserQuestion が使用されたかどうかを判断できること。
- **計測基準**: Reviewer Gate のチェックリストに AskUserQuestion 使用確認項目が含まれていること
- **優先度**: 高

---

### NFR-0006: バリデーション通過

- **ID**: NFR-0006
- **ソース**: SRC-0011
- **カテゴリ**: 品質
- **説明**: 変更後、`qfai validate --fail-on error` が `error=0` で完了しなければならない。
- **計測基準**: `qfai validate --fail-on error --format github | tee .qfai/report/validate.log` の exit code が 0
- **優先度**: 必須
