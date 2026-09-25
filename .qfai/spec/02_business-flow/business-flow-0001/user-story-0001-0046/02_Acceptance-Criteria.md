# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0046-01
# Parent: US-0001-0046
Scenario: AC-0001-0046-01
  Given a work-log entry of `kind: decision` whose declared `promote-to: spec-NNNN/07_Decisions.md` target has no row citing the entry ID as a whole token, or whose status is not `archived`, or whose `promoted-to` does not name that row's DR ID
  When `qfai validate` runs
  Then `W-PENDING-PROMOTION` is emitted at warning severity AND a dedicated section "Pending Promotions" appears in the validate report
  And On the story tree, the same finding and section appear for an entry whose `promote-to: decisions.md` is set while no `decisions.md` row cites its ID as a whole token, its status is not `archived`, or its `promoted-to` does not name that row's DEC ID

# AC-0001-0046-02
# Parent: US-0001-0046
Scenario: AC-0001-0046-02
  Given a `status: active` work-log entry whose `updated` timestamp is older than 90 days from now
  When `qfai validate` runs
  Then `W-WORKLOG-STALE` is emitted at warning severity naming the entry and its age in days
```
