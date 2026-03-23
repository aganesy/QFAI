# 07 NFR (Non-Functional Requirements)

## Requirements Table

| NFR-ID   | Category        | Title                          | Target                                      | Measurement                                | Source            | Priority |
| -------- | --------------- | ------------------------------ | ------------------------------------------- | ------------------------------------------ | ----------------- | -------- |
| NFR-0001 | maintainability | TOML syntax validity           | All 39 TOML files parse without errors      | TOML parser validation (zero errors)       | SRC-0002          | must     |
| NFR-0002 | maintainability | Content parity verification    | developer_instructions match canonical MD   | Diff comparison with canonical source      | SRC-0005          | must     |
| NFR-0003 | maintainability | Naming consistency             | All filenames follow kebab-case convention  | Filename pattern check                     | SRC-0005          | must     |
| NFR-0004 | maintainability | Single-source alignment        | TOML content traceable to canonical agents  | Manual review + automated diff             | SRC-0005,SRC-0006 | should   |
| NFR-0005 | usability       | Zero additional configuration  | Agents work without user-side config changes| Functional test in Codex environment       | SRC-0001          | should   |
| NFR-0006 | reliability     | config.toml validity           | config.toml parses without errors           | TOML parser validation                     | SRC-0003          | must     |

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
