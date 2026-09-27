# US-0001-0161: `primary_tasks` ceiling + accepted shape documented

## User Story

As a requirements analyst authoring UI contracts, I want the recommended ceiling of 7 `primary_tasks` per screen documented in the `ui-contract.sample.yaml` template comments and `references/ui-contract-guide.md` and named in the `QFAI-AUD-020` warning, and `auditProfile.ts` to accept both string-only and structured `{id, label, acceptance}` task items during the deprecation window, so that the audit guidance is explicit and structured tasks become testable without breaking string-only contracts.
