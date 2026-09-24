# Credential reuse across parallel workers

Acceptance tests that need an authenticated actor pay for the sign-in once per worker, not once
per test. This file is the rule set. It is prose guidance — it adds no validator, no finding code,
no test layer and no annotation token, and nothing here is checked by a tool.

## Scope

These rules oblige the **E2E, API and Integration** layers only, which is this skill's whole scope.
They introduce no unit or component obligation: those layers belong to `/qfai-implement`, and a
unit test that needs a credential is describing an integration.

This guidance names no test runner and no browser automation library. Every rule below is stated
about a _session cache_ and a _worker_, which every parallel runner has under some spelling, so
choosing the tool stays the adopter's decision.

## Not dogfooded here

**QFAI's own suite has zero credentials.** Nothing in this repository signs in, so none of these
rules is exercised by running the tests here. They are recorded because the rule set is the
transferable asset, not because they were verified by execution in this tree — read them as
guidance to adopt, not as a report of something that already runs.

## The seven session-reuse rules

Each is a separate obligation. A harness can satisfy six of them and still authenticate on every
test, or still leak one account across workers.

### 1. Never sign in per test

Authentication belongs to worker setup, not to a test body. A suite that signs in per test pays
the slowest operation it has once per case, and the cost grows with the suite instead of with the
worker count.

### 2. Never share one account across parallel workers

Two workers driving the same actor at the same time is a race with no test to blame it on: a
sign-out, a session invalidation or a state change made by one worker arrives inside the other's
assertions. One account per worker, always — a shared account is not an optimisation, it is a
cross-test dependency that the runner cannot see.

### 3. Key the cached session by the pair of worker index and actor

Neither half is sufficient on its own. Keyed by actor alone, two workers exercising the same role
collide — rule 2 again, arriving through the cache. Keyed by worker alone, a suite that needs an
administrator and an ordinary user hands the second one the first one's session, and the test
fails on an authorisation it never intended to exercise. The key is the **pair**.

### 4. Tear the cache down at worker exit

A session cache that outlives its worker is a credential on disk. It also becomes a correctness
problem the next run: a restored session from a previous run reflects a state the current run
never established, so a test can pass against data it did not create. Bind the cache's lifetime to
the worker's.

### 5. Re-authenticate and rewrite the cache when a restored session is rejected

A cached session expires, gets revoked, or stops being valid because the environment was reset
between runs. The harness must detect the rejection, sign in again, and **overwrite** the cache
with the fresh session. Two failure modes this closes: a suite that treats the rejection as a test
failure reports a red that says nothing about the product, and a suite that retries against the
stale cache loops.

### 6. A test that mutates its own account creates a dedicated one

Changing a password, disabling the account, altering a profile, consuming a one-time entitlement:
each of those breaks the cached session every _other_ test on that actor depends on. A test whose
subject is the account itself provisions its own actor, uses it, and does not put it back in the
pool.

### 7. Test-level parallelism costs more workers, not more sign-ins

Raising parallelism adds workers; each new worker pays one sign-in. If raising parallelism raises
the sign-in count faster than the worker count, one of the six rules above is not being followed —
most often rule 1, and most often because a helper was called from a test body rather than from
setup. The ratio is the diagnostic.

## The companion rule: a caller-injected environment is not the harness's to manage

When the caller injects an environment identifier — a target URL, a tenant, a named deployment,
any handle that says _use this one_ — the harness **must not provision that environment and must
not tear it down.** It signs in against it, runs, and leaves it exactly as it found it.

The reason is that the injection is what tells the harness the environment is owned elsewhere.
A harness that provisions when it was handed a target creates a second environment nobody asked
for; a harness that tears one down at the end of a run destroys a shared or long-lived environment
that other work depends on. Both are irreversible from inside the run.

The rule is about _ownership_, not about the shape of the value: a harness that creates its own
ephemeral environment when nothing was injected is following this rule, not breaking it.

## Script naming: adopter guidance

**A credential-free lane and a credentialed lane should be reachable under different script
names.** A lane that structurally cannot touch the network is a different thing from one that must
have a working account, and giving them one name makes that difference invisible to whoever runs
them: contributors without credentials cannot tell which lane they can run, and CI cannot express
"run the half that needs no secrets" without a name for it.

Two properties do the work, whatever the names are:

- the credential-free lane is runnable by someone who has no account at all, and
- reading the script name tells you which of the two you are about to run.

**This is adopter guidance and QFAI adopts none of it.** QFAI keeps its own script names unchanged;
because its suite has no credentials there is no credentialed lane here to name, and renaming a
lane to model a distinction this repository does not have would be a cost with no reader.

## A worked example, as one illustration among possible backends

The shape below is **one** way to satisfy the rules, sketched in no particular tool. Any runner
with per-worker setup and a place to persist a session can express it, and the rules — not this
sketch — are what has to survive the translation.

```text
worker setup:
    key   = (worker index, actor role)
    cached = load(key)                       # rule 3: the pair is the key
    if cached is absent:
        session = sign_in(actor for key)     # rule 1: once per worker
        save(key, session)
    else:
        if not accepted(cached):             # rule 5: a restored session can be rejected
            session = sign_in(actor for key)
            save(key, session)               #         ...and the cache is rewritten

each test:
    attach the session for this worker's key # never sign_in here

a test that mutates its actor:
    actor = create_dedicated_actor()         # rule 6: not from the pool
    ...
    (the pooled session is untouched)

worker teardown:
    discard(key)                             # rule 4: lifetime is the worker's

environment:
    if the caller injected a target:
        use it; provision nothing; tear down nothing   # the companion rule
    else:
        the harness may create and destroy its own
```

Nothing in that sketch names a library, and it should not: the moment a rule is expressed as one
tool's API call, it stops being portable to the next one.
