# 07 Decisions

## Decisions

5 decisions from discussion-20260317153106326, adopted as DR-0017 through DR-0021 in \_policies/08_Decisions.md.

### DR-0017: Test file path = project root relative

- Enables language-agnostic file existence checks without build tool assumptions
- Source: OQ-0001 (discussion interview)

### DR-0018: DR-ID + Evidence = required columns

- Prevents completion fraud by ensuring every exception has a traceable decision record
- Source: OQ-0002 (discussion interview)

### DR-0019: TC Level = 06_Test-Cases.md Level column (unit|component)

- Scoping coverage to testable layers avoids false positives for integration/e2e TCs
- Source: OQ-0003 (discussion interview)

### DR-0020: TDDLIST_INVALID_ID added in v1.6.1

- Catches malformed IDs early before they propagate through the framework
- Source: OQ-0004 (discussion interview)

### DR-0021: All Phase 2 checks are errors (not warnings)

- These checks directly enable completion fraud if violated; warning severity would be insufficient
- Source: Discussion design decisions
