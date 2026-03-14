# 06 REQ — 機能要件

## 要件一覧

### REQ-0001: AskUserQuestion ツールの MUST 化（全スキル）

- **ID**: REQ-0001
- **ソース**: SRC-0001, SRC-0002〜SRC-0010
- **優先度**: 必須（MUST）
- **説明**: 全 9 QFAI スキルにおいて、エージェントがユーザーに質問する場合は AskUserQuestion ツールを使用しなければならない。「優先して使用する」（SHOULD）から「使用しなければならない」（MUST）への昇格。
- **受入条件**:
  - 全 9 SKILL.md の AskUserQuestion Protocol セクションが MUST 表現に改訂されていること
  - MUST 表現が各スキルで統一されていること
  - フォールバック条件（非対応環境）が明示されていること

---

### REQ-0002: constitution.md への Article X 追加

- **ID**: REQ-0002
- **ソース**: SRC-0001, SRC-0011
- **優先度**: 必須（MUST）
- **説明**: `constitution.md` に Article X として AskUserQuestion 使用義務を非交渉条項として追加する。既存の Article I〜IX と同等の権威を持ち、コンパクト実行後も有効であること。
- **受入条件**:
  - Article X が constitution.md に追加されていること
  - Article X の内容が MUST レベルの強制表現で記述されていること
  - 既存 Article I〜IX の内容が変更されていないこと
  - Article VI（Clarification budget）との整合性が保たれていること

---

### REQ-0003: communication.md への AskUserQuestion セクション追加

- **ID**: REQ-0003
- **ソース**: SRC-0001, SRC-0012
- **優先度**: 必須（MUST）
- **説明**: `communication.md` に AskUserQuestion 使用義務セクションを追加する。対応環境・非対応環境のフォールバック手順を明記する。
- **受入条件**:
  - communication.md に AskUserQuestion Protocol セクションが追加されていること
  - フォールバック手順（非対応環境）が明記されていること
  - `--auto` フラグとの整合性ルールが明記されていること

---

### REQ-0004: フォールバック手順の明示定義

- **ID**: REQ-0004
- **ソース**: SRC-0002〜SRC-0010
- **優先度**: 必須（MUST）
- **説明**: AskUserQuestion が技術的に利用不可能な環境（非 VS Code Copilot Chat 環境等）でのフォールバック手順を各 SKILL.md および constitution.md に明示的に定義する。
- **受入条件**:
  - フォールバック条件が「AskUserQuestion が技術的に利用不可能な場合」と明確に定義されていること
  - フォールバック時は理由を明示しなければならないことが記述されていること
  - フォールバック使用時も質問の構造化（選択肢の提示等）を維持する努力義務が記述されていること

---

### REQ-0005: _policies/10_delta.md への変更記録

- **ID**: REQ-0005
- **ソース**: SRC-0014
- **優先度**: 必須（MUST）
- **説明**: 本変更（AskUserQuestion MUST 化）を `_policies/10_delta.md` の Change Summary テーブルに採用エントリとして追加する。
- **受入条件**:
  - Date, Change Type（adopted）, Section, Summary, Rationale の全列が記入されていること
  - 変更対象ファイルがすべて列挙されていること

---

### REQ-0006: --auto フラグとの整合性ルール

- **ID**: REQ-0006
- **ソース**: SRC-0001, SRC-0015
- **優先度**: 必須（MUST）
- **説明**: `--auto` フラグ使用時は AskUserQuestion による質問をゼロとし、前提を明示してスキルを進行するルールを明記する。このルールは AskUserQuestion MUST ルールの例外ではなく、「質問が不要な実行モード」として定義する。
- **受入条件**:
  - constitution.md または communication.md に --auto 時の挙動が明記されていること
  - 前提の明示が成果物に記録されることが明記されていること
