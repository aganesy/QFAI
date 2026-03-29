# 07 NFR (Non-Functional Requirements)

## Requirements Table

| NFR-ID   | Category        | Title | Target | Measurement | Source   | Priority |
| -------- | --------------- | ----- | ------ | ----------- | -------- | -------- |
| NFR-0001 | maintainability | Internal consistency | Zero contradictions between skill docs, CLI behavior, and internal modules | qfai validate --fail-on error exits 0 | SRC-0001 | must |
| NFR-0002 | usability | Mode discoverability | All 3 prototyping modes visible in --help output and skill docs | Manual review of CLI --help and SKILL.md | SRC-0001, SRC-0005 | must |
| NFR-0003 | reliability | Backward compatibility | Existing qfai.config.yaml and discussion/spec packs work without modification | Regression test suite passes | SRC-0001, SRC-0010 | must |
| NFR-0004 | maintainability | Documentation coverage | All internal modules have usage, entrypoint, mode relationship, and failure behavior docs | Documentation audit checklist | SRC-0001, SRC-0002 | should |
| NFR-0005 | operability | Migration guidance | Upgrade from v1.7.5 to v1.7.6+ has documented migration path with stale asset detection | Migration test on sample project | SRC-0001, SRC-0010 | should |
| NFR-0006 | maintainability | Single source of truth | Each design decision (evaluation model, UI-bearing detection, mode definitions) has exactly one authoritative location | Cross-reference audit | SRC-0001, SRC-0004, SRC-0006 | must |

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
