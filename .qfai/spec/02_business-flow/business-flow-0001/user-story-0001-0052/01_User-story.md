# US-0001-0052: Audit profile task forms

## User Story

As a UI-contract author, I want `auditProfile.ts` to accept both the legacy string-only `primary_tasks` form and the structured `{id, label, acceptance}` form, and `QFAI-AUD-020` to name the recommended count band in its warning, so that I can move to the structured form at my own pace while string-only items keep passing during the deprecation window.
