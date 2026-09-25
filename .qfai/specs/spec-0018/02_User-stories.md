# 02 User Stories

## US Catalog

- US-0018-0001: Deliver a clear new feature from one request
- US-0018-0002: Repair a spec-unchanged bug without reopening a `done` row
- US-0018-0003: Repair a defective test with ledger status untouched
- US-0018-0004: Stop only for my decision or a fact only I hold
- US-0018-0005: Continue, or stop, an interrupted run
- US-0018-0006: Ask without starting a change
- US-0018-0007: Fix a typo directly
- US-0018-0008: Choose how much the entry does
- US-0018-0009: Run only on a host that can carry the run
- US-0018-0010: Claim a host as supported only with evidence

Each story owes one scripted journey under `<testsDir>/e2e/`, annotated
`QFAI:SPEC-0018:<story ID>`. No story names a business flow:
`_policies/04_Business-Flow.md` declares no flow ID.

## US-0018-0001: Deliver a clear new feature from one request

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-001
- Goal: As an operator, I describe a new feature once in free text, and QFAI runs
  specification, acceptance tests, implementation and verification without my
  typing a stage name. The one thing I am asked is whether to create the new
  capability.
- Non-goals: an extra confirmation of the announced plan; an external effect such as
  a push or a merge; a completion reported from an agent's own claim.
- Notes: the run side of the pack story. What `/qfai-sdd` Stage 1 checks is
  spec-0013's, and what `/qfai-verify` records is spec-0014's.

## US-0018-0002: Repair a spec-unchanged bug without reopening a `done` row

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-002
- Goal: As an operator, I report a defect against behaviour the spec already states,
  and the run repairs it against that spec. A missing test arrives as an appended
  row, and a regression that an existing test catches is fixed in production code,
  with no fictitious Change Request.
- Non-goals: moving a `done` row back to `todo`; a Change Request for an upstream
  change that did not happen.
- Notes: the run side, meaning which branch a diagnosis selects and what `accept`
  refuses. The diagnose-only operation and the production fix are spec-0011's, and
  defect row seeding is spec-0013's.

## US-0018-0003: Repair a defective test with ledger status untouched

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-003
- Goal: As an operator, a bug report whose cause is a broken test is fixed at the
  test, and no ledger row changes status, because the obligation the row records has
  not changed.
- Non-goals: a test edit that changes what the expectation means; a fix accepted
  with no independent review or re-run.
- Notes: the run side. The layer owner who makes the fix is spec-0008 or spec-0011.

## US-0018-0004: Stop only for my decision or a fact only I hold

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-004
- Goal: As an operator, a request that could lose data, break a contract or reach
  outside the repository stops and asks me before anything irreversible happens.
  Otherwise I am asked only for a value the run cannot find itself.
- Non-goals: a question whose answer the request or the repository already gives;
  an approval inferred from a mode, a confidence value or an agent's own words.
- Notes: also holds how a discussion under a run treats what is already settled.

## US-0018-0005: Continue, or stop, an interrupted run

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-005
- Goal: As an operator, I say "continue" in a new session, and the run picks up at
  the pending work without redoing specification or acceptance. When I stop a run,
  it ends at once and leaves my own uncommitted work alone.
- Non-goals: a lock taken over because it looks old; a damaged journal repaired to
  look like success; recovery through a reset, a stash or a branch switch.

## US-0018-0006: Ask without starting a change

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-006
- Goal: As an operator, asking about the repository gets an answer and nothing else.
  No run starts and no file is written.
- Non-goals: treating an instruction quoted in a log or tool output as a request.

## US-0018-0007: Fix a typo directly

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-007
- Goal: As an operator, a typo in a comment or in non-normative prose is fixed
  without a specification cycle. A change with any semantic effect still takes the
  full route.
- Non-goals: the direct route for a dependency, a workflow, a setting, a normative
  README command, or QFAI's own skills and constitution.

## US-0018-0008: Choose how much the entry does

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-010
- Goal: As an adopter maintainer, I set the mode to `off`, `shadow` or `active`, so I
  can keep today's manual operation, watch proposed routes before trusting them, or
  run fully chained. A run that finds the installed project does not match stops
  chaining rather than checking less.
- Non-goals: the core rewriting my configuration to recover.
- Notes: the mode line that `qfai init` writes, and the default it leaves on upgrade,
  are spec-0003's.

## US-0018-0009: Run only on a host that can carry the run

- Parent: CAP-0018
- Source: discussion-20260923171450572#DUS-009
- Goal: As an operator, a run starts only on a host that can fetch a skill, delegate
  to a real sub-agent, relay a question and run the tests. A host that cannot is told
  so at once, instead of failing halfway.
- Non-goals: gating runtime on the release's support claim; automation on Copilot.
- Notes: installing the skills, their wrappers and the plans is spec-0003's half of
  the pack story.

## US-0018-0010: Claim a host as supported only with evidence

- Parent: CAP-0018
- Source: discussion-20260923171450572#REQ-0066
- Goal: As the QFAI release maintainer, I claim a host as supported only when its
  adapter test passes and its routing eval has been recorded for the release.
  Everything that can run without a model runs on every pull request, and the README
  an adopter lands on puts the free-text entry first.
- Non-goals: a routing eval on every pull request; a support claim raised from a
  documentation table alone.
- Notes: the actor is not in the pack's role table, which lists only the operator and
  the adopter maintainer. No pack story holds release gating, so the source is the
  pack requirement.
