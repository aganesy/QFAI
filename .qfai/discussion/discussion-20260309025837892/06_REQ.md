# 06 REQ (Functional Requirements)

## Requirements Table

### CAP-0007: Skill Orchestration

| REQ-ID   | Title                  | Description                                                                                                                                                    | Source                       | Priority | Status |
| -------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | ------ |
| REQ-0001 | Skillカタログ定義      | 9つのSkill（discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor）の名前・目的・引数・ロール・必須出力をspec-0007で定義する | SRC-0012〜SRC-0018, SRC-0023 | must     | draft  |
| REQ-0002 | Skill依存関係定義      | Skill間の依存関係（discussion→sdd→prototyping→atdd→verify）と実行順序制約をspec-0007で定義する                                                                 | SRC-0006, SRC-0023           | must     | draft  |
| REQ-0003 | Skill完了契約定義      | 各SkillのCompletion Contract（必須成果物、OQ exit条件、Gate pass条件）をspec-0007で定義する                                                                    | SRC-0012〜SRC-0017, SRC-0023 | must     | draft  |
| REQ-0004 | Skill Evidence要件定義 | 各Skillが生成すべきEvidence（パス命名、必須セクション、gitignoreポリシー）をspec-0007で定義する                                                                | SRC-0012〜SRC-0017, SRC-0023 | must     | draft  |

### CAP-0008: Agent Delegation

| REQ-ID   | Title                     | Description                                                                                                                                        | Source                                 | Priority | Status |
| -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------- | ------ |
| REQ-0005 | エージェントカタログ定義  | 39のサブエージェントのID・名前・ミッション・カテゴリ（planning, implementation, review, operations）をspec-0008で定義する                          | SRC-0011, SRC-0023                     | must     | draft  |
| REQ-0006 | エージェント標準契約定義  | エージェントの標準契約構造（Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format）をspec-0008で定義する | SRC-0011, SRC-0023                     | must     | draft  |
| REQ-0007 | Orchestrator Protocol定義 | Orchestratorの制約（委任のみ・直接生成禁止・自己承認禁止）とCapability Probe/Simulation Modeをspec-0008で定義する                                  | SRC-0009, SRC-0012〜SRC-0017, SRC-0023 | must     | draft  |
| REQ-0008 | Work Orders定義           | Work Orders Summary（テーブルスキーマ: Step, Role, Task title, Input refs, Output refs, Status）をspec-0008で定義する                              | SRC-0012〜SRC-0017, SRC-0023           | must     | draft  |

### CAP-0009: Traceability & Spec Architecture

| REQ-ID   | Title                         | Description                                                                                                                     | Source                       | Priority | Status |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | ------ |
| REQ-0009 | トレーサビリティ連鎖定義      | discussion → specs → tests → code → verificationの5段連鎖と各段の成果物をspec-0009で定義する                                    | SRC-0008, SRC-0019, SRC-0023 | must     | draft  |
| REQ-0010 | Layered Spec Architecture定義 | \_policies/（共有ポリシー層）+ spec-XXXX/（Capability固有層）の2層構造、1 CAP = 1 spec directoryの設計根拠をspec-0009で定義する | SRC-0019, SRC-0023           | must     | draft  |
| REQ-0011 | 参照方向ルール定義            | upper-to-lower禁止（\_policiesにUS/AC/BR/EX/TCを書かない）、lower-to-upper許可（spec-XXXXからCAPを参照）をspec-0009で定義する   | SRC-0019, SRC-0023           | must     | draft  |
| REQ-0012 | Escalation Hook定義           | spec-XXXX/01_Spec.mdから\_policiesへの参照委譲メカニズム（NFR/policy/requirements/evidenceのcopy-down）をspec-0009で定義する    | SRC-0019, SRC-0023           | must     | draft  |
| REQ-0013 | Drift Protocol体系化          | upstream SSOT保護、Change Request手順、owner skill rerun、allowed exceptions（evidence append）をspec-0009で体系化する          | SRC-0007, SRC-0023           | must     | draft  |

### CAP-0010: Steering & Governance

| REQ-ID   | Title                         | Description                                                                                                                                             | Source                       | Priority | Status |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | ------ |
| REQ-0014 | Steering文書構造定義          | 5つのsteering文書（manifest, product, structure, tech, test-layers）の役割・責務・適用範囲をspec-0010で定義する                                         | SRC-0001〜SRC-0005, SRC-0023 | must     | draft  |
| REQ-0015 | Instructions文書構造定義      | 5つのinstructions文書（workflow, drift-protocol, constitution, agent-selection, requirements-decomposition）の役割・責務・適用範囲をspec-0010で定義する | SRC-0006〜SRC-0010, SRC-0023 | must     | draft  |
| REQ-0016 | Review Roster & RCP定義       | 10 reviewersの構成・PASS/FAIL/N/Aルール・ループ復帰ルール・append-onlyポリシーをspec-0010で定義する                                                     | SRC-0020, SRC-0023           | must     | draft  |
| REQ-0017 | Constitution位置づけ定義      | 非交渉条項Article I〜IXの位置づけ・適用範囲・例外なし原則をspec-0010で定義する                                                                          | SRC-0008, SRC-0023           | must     | draft  |
| REQ-0018 | Canonical Workflow Stages定義 | Stage 0（steering refresh）〜Stage 6（verify）の全体像・各ステージの入出力・遷移条件をspec-0010で定義する                                               | SRC-0006, SRC-0023           | must     | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
