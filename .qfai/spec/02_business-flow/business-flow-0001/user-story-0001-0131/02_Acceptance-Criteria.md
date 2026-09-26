# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0131-01
# Parent: US-0001-0131
Scenario: `--*-shadow*:` declaration strip (OQ-0104 Option B)
  Given a fixture with `--shadow-sm: 0 1px 2px rgba(15,23,42,0.05);` AND a parallel `--card-shadow: 0 4px 8px rgba(0,0,0,0.1);`,
  When the input filter into `scanColors` runs,
  Then the broader `--*-shadow*:` pattern MUST strip both declarations before color scanning and `designMdViolations[]` MUST NOT contain entries naming those rgba values.
```
