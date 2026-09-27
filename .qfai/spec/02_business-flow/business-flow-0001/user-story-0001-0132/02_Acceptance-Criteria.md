# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0132-01
# Parent: US-0001-0132
Scenario: proseCritique cap, unit selected by the text
  Given a Japanese-only `proseCritique` of 800–1500 characters, an English critique of 200–500 words, and a short critique in either language,
  When QFAI-PROT-002 evaluates the prose, selecting CJK characters as the unit where the text carries CJK and whitespace-separated words otherwise,
  Then all three MUST pass: the cap binds only above it, and neither unit has a lower bound.
  And over the cap the error text MUST name (a) the count form measured (words or characters), (b) the cap, (c) the actual count.
```
