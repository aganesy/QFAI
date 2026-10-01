# US-0003-0012: Doctor failure threshold

## User Story

As an operator, I want to choose `qfai doctor --fail-on error` or `--fail-on warning` and get an exit status that reflects that threshold, so that advisory findings do not unexpectedly fail an error-only check.

## Non-goals

- Changing any check's severity.
- Silently treating an unreadable configuration as a passing diagnostic.
