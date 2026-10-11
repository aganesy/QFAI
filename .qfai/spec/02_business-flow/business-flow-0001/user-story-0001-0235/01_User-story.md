# US-0001-0235: Redirect observable exploratory searches through hooks

## User Story

As a project maintainer, I want to deny agents' observable direct exploratory searches while permitting necessary reads and quality checks, so that agents follow the code and document exploration policy.

## Non-goals

- Complete detection inside arbitrary scripts, aliases or continuing shell input.
- Changing a notification reminder into a denial hook.
