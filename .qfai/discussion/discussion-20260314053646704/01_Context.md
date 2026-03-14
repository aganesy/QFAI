# 01 Context

## 背景

QFAI（Quality-First AI）は、AI コーディングエージェント向けの品質第一開発キット（CLI）である。現在 9 つのスキル（discussion, sdd, atdd, configure, prototyping, tdd-green, tdd-red, tdd-refactor, verify）が存在し、各スキルは SKILL.md によって定義される。

各スキルの SKILL.md には「User Questions (AskUserQuestion Protocol)」セクションが存在する。AskUserQuestion は VS Code Copilot Chat が提供するユーザーへの質問機能であり、ターミナルではなく Chat UI 上で構造化選択肢付きの質問を提示できる。

## 問題の定義

現在の AskUserQuestion Protocol は「優先して使用する」という弱い勧告表現（SHOULD レベル）にとどまっており、エージェントが守らないケースが継続的に発生している。具体的には：

- エージェントが平文テキストで質問を投げてプロトコルを迂回する
- コンパクト実行（context compression）後にルールが消失する
- スキルによって遵守度にばらつきがあり、品質一貫性が損なわれる

## 目的

本ディスカッションの目的は、以下の変更を QFAI 仕様として正式に定義することである：

1. `constitution.md` に新しい Article（Article X）を追加し、AskUserQuestion 使用を MUST レベルの非交渉条項として昇格させる
2. `communication.md` に AskUserQuestion 使用義務の記載を追加する
3. 全 9 SKILL.md の AskUserQuestion Protocol セクションの文言を MUST レベルに改訂する
4. 上記変更をスペックデルタ（`_policies/10_delta.md`）に記録する

## ステークホルダー

| ロール                  | 関心事                                                       |
| ----------------------- | ------------------------------------------------------------ |
| QFAI ユーザー（開発者） | エージェントが常に構造化質問を使用することで操作性が向上する |
| QFAI エージェント       | 明確な MUST ルールにより判断コストが下がる                   |
| QFAI メンテナー         | constitution 追加による一貫的なルール適用が可能になる        |
| チームレビュアー        | ルール強度が仕様で明示されることでレビュー基準が統一される   |

## 前提条件

- 対象スキルは現行の 9 スキルすべて（discussion, sdd, atdd, configure, prototyping, tdd-green, tdd-red, tdd-refactor, verify）
- AskUserQuestion は VS Code Copilot Chat 環境に依存する機能であるが、ルール定義は全環境向けに記述し、非対応環境ではフォールバックを明記する
- 本変更は TypeScript コードの変更を含まない（SKILL.md および instruction ファイルのみ）
- スケジュール：即時対応（ディスカッション完了後すぐに SDD フェーズへ）

## 現状のファイル状態

| ファイル                  | 現状                                                                      | 変更内容                                 |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| `constitution.md`         | Article I〜IX（Preflight confidence gate が最終）                         | Article X を追加                         |
| `communication.md`        | Output language / Reporting format / Error handling のみ                  | AskUserQuestion 使用義務セクションを追加 |
| 各 SKILL.md（9 ファイル） | `## User Questions (AskUserQuestion Protocol)` セクションあり、文言が弱い | MUST レベルに文言改訂                    |
| `_policies/10_delta.md`   | SDP 関連の最新エントリまで記録済み                                        | 本変更の採用エントリを追加               |

## 関連する既存定義

- `_policies/06_Glossary.md` には AskUserQuestion および AskUserQuestion Protocol の定義が 2026-03-12 時点で追加済み
- `constitution.md` の Article VI（Clarification budget）は質問制限を規定しているが、AskUserQuestion の使用方法（ツール選択）は規定していない
- 本変更は Article VI を置き換えるのではなく、Article X として「質問方法の MUST 化」を別条項で追加する
