# 02 User Stories

## US Catalog

- US-0008-0001: エージェントカタログ定義 - 39 のサブエージェントの ID・名前・ミッション・カテゴリを定義
- US-0008-0002: エージェント標準契約定義 - エージェントの標準契約構造を定義
- US-0008-0003: Orchestrator Protocol 定義 - Orchestrator の委任制約と Capability Probe / Simulation Mode を定義
- US-0008-0004: Work Orders 定義 - Work Orders Summary のテーブルスキーマを定義

## US-0008-0001: エージェントカタログ定義

- Parent: CAP-0008
- Goal: 39 のサブエージェントについて、ID・名前・ミッション・カテゴリ（planning, implementation, review, operations）をカタログテーブルとして定義する
- Non-goals: 個別エージェントの詳細実装定義（SSOT は `.qfai/assistant/agents/*.md`）
- Notes: REQ-0005 準拠。カテゴリは planning（12）、implementation（13）、review（10）、operations（4）の 4 分類

## US-0008-0002: エージェント標準契約定義

- Parent: CAP-0008
- Goal: 全エージェントが準拠すべき標準契約構造（Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format）を定義する
- Non-goals: 個別エージェントごとの契約内容の記述
- Notes: REQ-0006 準拠。標準契約構造はテンプレートとして定義し、各エージェント定義ファイルで具体化する

## US-0008-0003: Orchestrator Protocol 定義

- Parent: CAP-0008
- Goal: Orchestrator の行動制約（MAY only: 委任・統合・提示、MUST NOT: 直接生成・自己承認）と Capability Probe / Simulation Mode を定義する
- Non-goals: Orchestrator の実装詳細、ランタイム挙動の規定
- Notes: REQ-0007 準拠。Simulation Mode は明示的なユーザー許可が必要

## US-0008-0004: Work Orders 定義

- Parent: CAP-0008
- Goal: Work Orders Summary のテーブルスキーマ（Step, Role, Task title, Input refs, Output refs, Status）を定義する
- Non-goals: 個別タスクの Work Orders 内容の記述
- Notes: REQ-0008 準拠。Status は PASS / REVISE の 2 値
