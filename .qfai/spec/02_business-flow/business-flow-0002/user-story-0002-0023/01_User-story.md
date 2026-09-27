# US-0002-0023: The shape table moves with the leak guards

## User Story

As a QFAI maintainer, I want the shape table in `.agents/rules/distributed-surface.local.md` to list every internal ID shape the three distributed-surface guards reject, with the sample band a shipped template may use, and to change in the same pull request as the guards, so that the rule a contributor reads and the patterns the guards enforce never disagree.

## Non-goals

- Choosing the guards' patterns, which belong to the specs that own the guards.
- Editing a shipped template in the same pull request.
- Dropping a shape the table already lists.
