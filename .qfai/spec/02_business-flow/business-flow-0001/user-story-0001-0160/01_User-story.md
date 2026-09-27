# US-0001-0160: Resolve active discussion pack via single helper

## User Story

As a `/qfai-sdd` downstream skill, I want to resolve the active discussion pack through one helper that reads `.qfai/state.json#discussion.currentId`, which `/qfai-discussion` writes, so that I never guess the active pack from filesystem timestamps and I report an error naming the candidate directories and the recovery command `qfai discussion use <id>` when the pointer is missing or ambiguous.
