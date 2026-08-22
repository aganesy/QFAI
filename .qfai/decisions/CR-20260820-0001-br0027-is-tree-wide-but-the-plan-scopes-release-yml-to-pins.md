# Change Request

- ID: `CR-20260820-0001`
- Title: `BR-0017-0027 forbids a workflow-level Node literal tree-wide, the plan scopes release.yml to pins, and the publish job encodes an npm constraint engines.node cannot express`
- Raised by: `/qfai-implement orchestrator, spec-0017 change 4; the conflict surfaced as a test failure and every claim below was measured before filing`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-atdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `C` — keep the rule tree-wide and exempt the publish job explicitly
- Applied at: `2026-08-23T00:00:00Z` — release.yml gate rewired onto the shared setup definition; TC-0017-0030 covered
- Superseded by: `-`
- Blocked set: `spec-0017 TDD-0030 (TC-0017-0030)`

## Three statements that cannot all hold

**1. `BR-0017-0027` is tree-wide.** "The shared setup definition MUST read the Node version from a file
in the repository, and no workflow-level Node version literal may remain, so a stale version comment
becomes structurally impossible **in this tree**." `TC-0017-0030`'s oracle repeats the scope: "**The own
workflows tree** holds zero workflow-level Node version literals."

**2. `10_Plan.md`'s file table scopes `release.yml` to pins.** "`.github/workflows/release.yml` |
present | 4 jobs today, one workflow-level permission block. **Gains checkout flags and SHA pins
only.**"

**3. `release.yml` carries two workflow-level Node literals**, measured at `28b7a8e2`:

```text
release.yml:40   NODE_LTS: "20.19"      used by the gate job
release.yml:49   NODE_PUBLISH: "24"     used by the publish job
```

Change 4 removed `ci.yml`'s `NODE_LTS` and rewired its six toolchain jobs onto the shared definition.
That satisfies `BR-0017-0024`/`0025`, which are scoped to "the own-CI workflow" (singular). It does not
satisfy `BR-0017-0027`, which is not.

## Why the publish job is the hard half, and not merely out of scope

`NODE_PUBLISH` is not a stale convenience. Its comment records a measured constraint:

> Trusted publishing needs npm >= 11.5.1. Pinning Node to that requirement's documented minimum
> (22.14.0) is not enough: `npm@latest` carries its own engine range — npm 12 wants
> `^22.22.2 || ^24.15.0 || >=26.0.0` — so the install fails with EBADENGINE before the version check
> ever runs. Track the current LTS major instead, and let setup-node resolve its newest patch.

So the publish job's Node is chosen to satisfy **npm's** engine range, which `packages/qfai/package.json`
`engines.node` (`>=20.19.0`) does not encode and is not about. Pointing that job at the file would
couple the publish path's npm compatibility to a field that means something else — and it would do so
on the one workflow whose failure mode is an irreversible publish.

There is a coincidence worth naming and not relying on: `>=20.19.0` resolved as "latest satisfying" is
Node 24 today, which is what `NODE_PUBLISH` asks for. That is today's arithmetic, not a guarantee. The
comment says "track the current LTS major"; the range says "anything at or above 20.19". Those diverge
the moment a newer major ships, and they diverge silently.

The gate job is the easy half: it uses `NODE_LTS`, the comment says it "stays on `NODE_LTS`, which is
the version `engines.node` promises", and `node-version-file: package.json` is exactly that intent
expressed as a file read.

## Options (at least 3) and recommendation

### Option A — extend change 4 to `release.yml`, and give the composite action inputs (recommended)

Rewire the gate job onto the shared definition, and let the publish job consume it too by adding two
optional inputs — `node-version-file` (defaulted to `package.json`) and `registry-url`. The publish job
then passes a Node source of its own and keeps its registry configuration, and no workflow-level
literal remains.

Cost: the plan's file table needs correcting, and the publish job's Node source becomes a second file
rather than an inline literal — which is what `BR-0017-0027` asks for but is not obviously safer for a
publish path than a literal beside its own justification. The action also gains inputs, which is a
larger surface than the current no-input form.

### Option B — narrow `BR-0017-0027` to the own-CI workflow, matching its siblings

`BR-0017-0024` and `BR-0017-0025` are already scoped to "the own-CI workflow". Scope `BR-0017-0027` the
same way and the conflict disappears: `ci.yml` is clean, `release.yml` keeps its two literals beside the
reasoning that chose them, and `TC-0017-0030`'s oracle narrows to match.

Cost: a stale version comment stays structurally possible in `release.yml`, which is the exact failure
the rule was written to eliminate — and `release.yml` is where a stale version is most expensive.

### Option C — keep the rule tree-wide and exempt the publish job explicitly

`BR-0017-0027` stays tree-wide with one named exception: the publishing job's Node version, because it
encodes an npm engine constraint no repository file expresses. The gate job is rewired; `NODE_PUBLISH`
survives as a declared exception with its justification, in the same shape as the two permission-block
exceptions `BR-0017-0016` already carries.

Cost: an enumerated exception is a thing to maintain, and this spec already has one enumeration whose
count did not match the tree (`CR-20260818-0007`).

**Recommendation: C.** It keeps the rule where it does the most good — `release.yml` — while refusing to
launder a measured npm constraint through a field that means something else. The publish job's literal
is not the failure `BR-0017-0027` describes: it has its justification attached, it is read by exactly
one job, and moving it into `engines.node` would make it _less_ legible, not more. A is defensible and
strictly more work; B gives up the rule precisely where it matters.

Whichever is chosen, `10_Plan.md`'s file table needs the correction, because it currently states a
scope the business rules contradict.

## Impact scope

- Specs: `spec-0017` `04_Business-Rules.md` (BR-0017-0027), `06_Test-Cases.md` (TC-0017-0030),
  `10_Plan.md` (the file table). Upstream — a `/qfai-sdd` change.
- Production: `.github/workflows/release.yml` and `.github/actions/setup/action.yml` under A or C; none
  under B.
- Ledger rows: `TDD-0030` blocked. `TDD-0027`, `TDD-0028`, `TDD-0029` and `TDD-0031` are unaffected and
  land with change 4.
- Adopter-visible: no.

## Decision needed from user

Choose A, B or C. `TDD-0030` stays `todo` until then.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: reconcile the three statements that cannot all hold — `BR-0017-0027`'s
   tree-wide prohibition, `10_Plan.md`'s narrower `release.yml` scope, and the publish job's
   engine constraint. The publish job is the hard half and the reconciliation has to name it.
   Mode: **`re-derive`**. Three statements have to be reconciled into new text, which
   `confirm-only` cannot produce.
2. Downstream ledger sweep: reset the row this CR blocks, recording `CR-20260820-0001` in its
   `DR-ID` column:
   - `TDD-0030`
     `todo` today, so the reset is a no-op on status; the `DR-ID` record is what matters. No other
     row asserts over `release.yml`'s Node literal, which is why the list is one row and not the
     whole change.
3. Cross-check after applying: whichever way it resolves, `check-workflow-hygiene` and
   `lint:workflow-shape` must both agree with the reconciled rule over the real `release.yml`.

## Resolution

Pending.
