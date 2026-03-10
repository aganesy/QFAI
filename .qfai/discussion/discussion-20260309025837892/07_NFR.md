# 07 NFR (Non-Functional Requirements)

## Requirements Table

| NFR-ID   | Category        | Title                  | Target                                                                              | Measurement                                     | Source             | Priority |
| -------- | --------------- | ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------ | -------- |
| NFR-0101 | maintainability | Spec-SSOT整合性        | SKILL.md/agent定義とspecsの記述が矛盾しない                                         | qfai validateで構造検証、差分レビューで内容検証 | SRC-0023           | must     |
| NFR-0102 | maintainability | Spec更新容易性         | SKILL.md/agent定義の変更時にspecsの更新箇所が特定可能                               | 各specの01_Spec.mdにSSOT参照先を明記            | SRC-0023           | must     |
| NFR-0103 | usability       | Spec可読性             | 新規開発者がCAP-0007〜0010を読んで30分以内にAssistant Frameworkの全体像を理解できる | User test（新規開発者の理解度アンケート）       | SRC-0023           | should   |
| NFR-0104 | maintainability | 用語一貫性             | Glossaryで定義された用語がspecs全体で一貫して使用される                             | qfai validate（glossary-consistency validator） | SRC-0021, SRC-0023 | must     |
| NFR-0105 | operability     | Validate互換性         | 新規spec-0007〜0010がqfai validate --fail-on errorでエラー0を維持                   | CI/CDパイプラインで自動検証                     | SRC-0022, SRC-0023 | must     |
| NFR-0106 | maintainability | トレーサビリティ完全性 | 全REQ-0001〜0018が対応するCAP/US/AC/BR/EX/TCに追跡可能                              | qfai validate（traceability validator）         | SRC-0023           | must     |
| NFR-0107 | usability       | 階層ナビゲーション     | \_policies/からspec-XXXXへの参照パスが明確で、3ステップ以内に到達可能               | Escalation Hook + Parent IDによるナビゲーション | SRC-0019, SRC-0023 | should   |

## Categories

- `performance`: Response time, throughput, latency.
- `reliability`: Availability, fault tolerance, recovery.
- `security`: Authentication, authorization, data protection.
- `scalability`: Load handling, horizontal/vertical scaling.
- `usability`: Accessibility, UX standards, i18n.
- `maintainability`: Code quality, documentation, testability.
- `operability`: Monitoring, deployment, logging.

## Rules

- Each NFR must have a measurable target.
- Each NFR must reference at least one Source (SRC-ID).
