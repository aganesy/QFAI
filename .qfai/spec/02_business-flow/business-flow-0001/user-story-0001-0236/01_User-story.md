# US-0001-0236: Reuse completed analysis safely across worktrees

## User Story

As a developer, I want to restore compatible completed analysis into an independent worktree, so that I reuse analysis without sharing writable state or trusting stale results.

## Non-goals

- Generated graph or database commits and mandatory PR regeneration.
- A remote team cache, custom integrity hashes or shared writable daemons.
