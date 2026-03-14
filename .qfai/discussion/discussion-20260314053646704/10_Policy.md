# 10 Policy

## POL-001: AskUserQuestion 使用義務ポリシー

- **適用範囲**: 全 9 QFAI スキル（discussion, sdd, atdd, configure, prototyping, tdd-green, tdd-red, tdd-refactor, verify）
- **強度**: MUST（非交渉）
- **内容**: エージェントがユーザーへ質問を行う場合、AskUserQuestion ツールを使用しなければならない。
- **根拠**: SRC-0001（ユーザー要望）、constitution.md Article X（追加予定）
- **例外**: AskUserQuestion が技術的に利用不可能な環境（フォールバック適用条件）のみ
- **フォールバック**: 非対応環境では平文テキストで質問するが、不可能な理由を明示しなければならない

---

## POL-002: --auto フラグ使用時のポリシー

- **適用範囲**: 全 9 QFAI スキル
- **強度**: MUST
- **内容**: `--auto` フラグが付与された場合、ユーザーへの質問はゼロとし、前提を明示してスキルを進行する。この挙動は AskUserQuestion MUST ルールの例外ではなく、「質問が不要な実行モード」として定義する。
- **前提の記録**: 前提は成果物または Evidence に明示的に記録されなければならない。

---

## POL-003: constitution.md 権威ポリシー

- **適用範囲**: 全 QFAI エージェント・スキル
- **強度**: MUST
- **内容**: constitution.md の全 Article（Article I〜X）は非交渉条項であり、他のすべての指示より優先される。コンパクト実行後も constitution.md が読み込まれる限り、全 Article は有効である。
- **根拠**: constitution.md の定義（SRC-0011）

---

## POL-004: 変更記録ポリシー

- **適用範囲**: `_policies/10_delta.md`
- **強度**: MUST
- **内容**: QFAI の仕様に影響を与えるすべての変更（採用・拒否を問わず）は `_policies/10_delta.md` に記録されなければならない。記録は append-only で行い、既存エントリを変更してはならない。
- **根拠**: SRC-0014

---

## POL-005: Reviewer Gate によるルール遵守確認ポリシー

- **適用範囲**: 全 QFAI スキルの Reviewer Gate
- **強度**: MUST
- **内容**: Reviewer は成果物を確認する際、AskUserQuestion MUST ルール（Article X）の遵守を確認しなければならない。未遵守が発見された場合は REVISE を返さなければならない。
- **根拠**: REQ-0001、NFR-0005、review-roster.yml
