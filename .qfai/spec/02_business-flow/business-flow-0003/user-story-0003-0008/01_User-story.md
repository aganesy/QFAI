# US-0003-0008: Run-log prune under --clean

## User Story

As an operator, I want `qfai doctor --clean` to remove validate run logs older than the TTL while keeping the newest runs, so that the output directory does not grow without bound.

## Non-goals

- Deleting anything other than a validate run log.
