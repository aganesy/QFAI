# Change Request

- ID: `CR-20260818-0004`
- Title: `The shipped layer catalog states two incompatible location rules for L1, and a family of unit-declared TCs is driven through real infrastructure`
- Raised by: `implementation-reviewer (advisory A-3) during the spec-0006 TDD-0034 … TDD-0037 review; the catalog contradiction measured separately`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — delete the L1/L2 Location rule lines
- Applied at: `2026-08-23T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `(none — no row is blocked; four rows have already landed under the reading the catalog's routing rule requires)`

## Two findings, and only the first is unambiguous

### 1. The catalog contradicts itself, in the shipped surface

`packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md`:

- `:31-33` — "**L1 and L2 have no mandated directory**: unit and component tests live wherever the
  project's own convention puts them. Only L3-L5 are directory-pinned, and only those directories are
  scanned by the ATDD traceability rules."
- `:76` — under `### L1 Unit`, a bolded `Location rule` line naming `tests/unit/**` as L1's home.
  (Not quoted with surrounding emphasis here: the path's own `**` and a bold marker are the same two
  characters, and prettier reflows the collision into nonsense — a hazard this repository has
  recorded before.)

One says L1 has no mandated directory; the other mandates one, eight lines into the section that
defines L1. This is a shipped asset, mirrored into every adopter tree, and it is the document
`06_Test-Cases.md` files cite as the normative layer-derivation procedure.

It is not academic: an adopter following `:76` puts a `TC-*` row's unit test in `tests/unit/**`, where
`:34-42`'s routing rule cannot see it — `QFAI-ATDD-112` answers `TC-*` from `<testsDir>/integration/**`
and rejects a `TC-*` reference in some other scanned directory outright. So the two sentences do not
merely disagree; following the wrong one produces a validation failure with no obvious cause.

**The placement used by the four rows just landed is the one `:31-42` requires** — `Level: unit` TCs
annotated from `tests/integration/**` — and it is confirmed against the validator source rather than
by precedent: `src/core/atddTraceability.ts` `LEVEL_TO_TEST_KIND` has no `unit` key, so `unit` falls
back to `integration`. So the rows are correct and the document is what needs repair.

### 2. Whether the family is `unit` at all — arguable, and deliberately not asserted here

`TC-0006-0029`, `TC-0006-0032` and `TC-0006-0033` declare `Level: unit`. Their tests run a real
`qfai init` into a temp directory and drive `runDoctor` over a real filesystem. `:73-74` defines L1 as
"a single module's inputs and return values, with **no port collaboration and no real
infrastructure**".

Against that, `:147-150` says the opposite reading is the governing one: "**The layer is never
inferred from how a test happens to be driven.** A unit-level obligation — one whose oracle, after
step 2, observes only inputs and return values — exercised through an HTTP client is still L1 badly
implemented; it is not an L4 test."

Both TCs' oracles observe return values (`runDoctor`'s exit code, `summary.warning`). So by `:147-150`
they are L1 badly implemented, and by `:73-74` they are not L1 at all. **This CR does not decide it**
— the derivation procedure is the spec pack's, and asserting a re-level from an implementation review
is exactly the reviewer-originated-obligation move the drift protocol forbids. It is recorded so the
question is answered once for the family rather than re-argued per row.

## Options (at least 3) and recommendation

### Option A — delete the L1/L2 `Location rule` lines (recommended for finding 1)

`:76` and its L2 counterpart go; `:31-33` is already the general statement and `:34-42` already
carries the routing rule that actually binds. Cost: one shipped-asset edit plus the `sync:ssot`
mirror, and whatever pins those lines.

### Option B — keep `:76` and narrow `:31-33`

`:31-33` becomes "only L3-L5 are scanned by the ATDD traceability rules", dropping the
no-mandated-directory claim, and L1/L2 keep their location rules as project convention. Cost: it
leaves an adopter who follows `:76` for a `TC-*` row in the failure described above, so it needs a
sentence saying the location rule does not apply to `TC-*` annotation placement — which is more text
to keep consistent, not less.

### Option C — repair the contradiction and re-level the family in one change

A plus a decision on finding 2, applied to `TC-0006-0029` / `0032` / `0033` and their ledger rows.
Cost: it moves a `Level` on rows that are `done` or `refactor`, which is an upstream `/qfai-sdd`
change, and it is a strictly larger review than the contradiction warrants.

**Recommendation: A now, and finding 2 routed separately.** The contradiction is unambiguous, shipped,
and cheap to fix; the re-level is a judgement about the derivation procedure that belongs to the spec
pack's owner and should not ride along with a typo-class repair.

## Impact scope

- Shipped surface: `assets/init/.qfai/assistant/catalog/test-layers.md` and its `sync:ssot` mirror.
  Inside the distributed surface.
- Production: none.
- Specs: none under A; `06_Test-Cases.md` `Level` columns and the matching ledger rows under C.
- Adopter-visible: yes — the catalog is the document adopters derive their own layers from.

## Decision needed from user

Choose A, B or C for the contradiction, and say whether finding 2 should be routed to `/qfai-sdd` as
its own change.

## Approved actions (owner skill rerun plan)

1. Owner is the packaged asset, not a spec-authoring skill:
   `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md` states two incompatible
   location rules for L1. Edit the packaged copy and propagate to the installed `.qfai/` mirror by
   reinstall, never by hand-editing the mirror. **No mode applies** — a packaged asset under
   `packages/qfai/assets/init/**`, which the step-4 invocation table does not cover. The
   propagation to the installed mirror is a reinstall, not a skill rerun.
2. Downstream ledger sweep: **no rows are reset.** Four rows landed under the reading the catalog's
   routing rule requires, and that reading is the one this CR recommends keeping. Named so a later
   sweep cannot widen: if the approved option instead adopts the OTHER reading, the sweep is every
   row whose `Layer` cell says `unit` while its test drives real infrastructure — a verifiable
   selection rule, listed rather than enumerated because the population depends on which reading
   wins.
3. Cross-check after applying: the catalog must state one location rule for L1, and
   `QFAI-SPACK-091` must report no policy-versus-built-in drift.

## Resolution

finding 1 does not reproduce: the lines became Convention plus an explicit no-mandated-directory disclaimer in 59df60d82 on 2026-08-06, twelve days before this was filed. finding 2 routed as a follow-up

Pending.
