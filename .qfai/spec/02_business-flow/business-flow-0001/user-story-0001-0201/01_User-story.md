# US-0001-0201: Claim a host as supported only with evidence

## User Story

- Goal: As the QFAI release maintainer, I claim a host as supported only when its adapter test passes and its routing eval has been recorded for the release. Everything that can run without a model runs on every pull request, and the README an adopter lands on puts the free-text entry first.
- Non-goals: A routing eval on every pull request; a support claim raised from a documentation table alone.
- Notes: discussion-20260923171450572#REQ-0024,
  discussion-20260923171450572#REQ-0025,
  discussion-20260923171450572#REQ-0058,
  discussion-20260923171450572#REQ-0066,
  discussion-20260923171450572#REQ-0067,
  discussion-20260923171450572#NFR-0001,
  discussion-20260923171450572#NFR-0002,
  discussion-20260923171450572#NFR-0004,
  discussion-20260923171450572#NFR-0005,
  discussion-20260923171450572#NFR-0009,
  discussion-20260923171450572#NFR-0014,
  discussion-20260923171450572#NFR-0015,
  discussion-20260923171450572#NFR-0016,
  discussion-20260923171450572#NFR-0017,
  discussion-20260923171450572#NFR-0018. The actor is not in the discussion pack's role table, which lists only the operator and the adopter maintainer. No pack story holds release gating, so the source is the pack requirement.

## Source Provenance

- Story block: `.qfai/evidence/migration-spec-to-story/retired/main-sync-20260926/spec-0018/02_User-stories.md#us-0018-0010`, which `main` added as US-0018-0010 of its spec-0018. `decisions.md#DEC-0744` records the carry, and `.qfai/evidence/migration-spec-to-story/main-sync-20260926-spec-0018-id-map.csv` maps every item.
