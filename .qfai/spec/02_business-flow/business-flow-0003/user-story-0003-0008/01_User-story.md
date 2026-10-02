# US-0003-0008: stale review-pack TTL archival

## User Story

As an operator, I want `qfai doctor --clean` to move each review pack under `.qfai/review/<ts>/` older than the TTL (14 days by default, set by `review.staleTtlDays` in `qfai.config.yaml`) to `.qfai/review/_archive/<ts>/` without ever deleting it, and `qfai validate --profile review` to scan only the top-level packs, so that stale packs stop being validated while every pack stays restorable by hand.

## Non-goals

- Deleting packs automatically.
- Validating packs under `_archive/`.
- A restore subcommand: a pack is restored by moving it back with `mv`.
