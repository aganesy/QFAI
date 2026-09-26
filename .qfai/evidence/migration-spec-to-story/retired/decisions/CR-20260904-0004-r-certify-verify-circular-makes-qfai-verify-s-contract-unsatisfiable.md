# Change Request

- ID: `CR-20260904-0004`
- Title: `R-CERTIFY-VERIFY-CIRCULAR at error severity makes /qfai-verify's Completion Contract unsatisfiable outside Work Order H`
- Raised by: `issue #1097, from a Claude Code session on sim-autodialer (2026-09-01)`
- Raised at: `2026-09-04T08:40:00+09:00`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved option: `1` (scope the rule to the certify path it is named for)
- Approved at: `2026-09-04T10:05:00+09:00`
- Applied at: `2026-09-04T10:10:40+09:00`
- Superseded by: `-`

## Context

`/qfai-verify` carries two obligations that cannot both be met while a
prototyping loop is open and the run is **not** Work Order H:

- `qfai-verify/SKILL.md:148` / `:173` — "You MUST write
  `.qfai/output/verify.json`", and `scope` "names the stage this run actually
  covered — never a stage you did not run".
- `:150` — "**This** gate is full-scan … A partial profile does not satisfy it,
  **and no waiver or environment makes it satisfy it**."

An honest full-profile run is `scope: "full"`. `detectCertifyVerifyCircular`
(`reviewerGate.ts:95-135`) emits `R-CERTIFY-VERIFY-CIRCULAR` at severity
**error** whenever a `verify.json` carrying `atdd` / `full` / `implement` exists
while `prototyping.json` has `stopReason: null`. So writing the mandated verdict
file makes the mandated gate fail.

Measured on 2026-09-01: `error=22` → `error=0` → write `verify.json` →
`error=1` → remove the file → `error=0`.

The carve-out at `SKILL.md:65` does not reach it — it is scoped to "Work Order H
of `/qfai-prototyping`, before `npx qfai prototyping certify`". The run that hit
this was an ordinary repository-wide fix; the loop merely happened to be open,
and in a real project a loop stays open for weeks while other stages run.

Four exits, all blocked:

| exit                   | blocked by                                                  |
| ---------------------- | ----------------------------------------------------------- |
| `scope: "full"`        | the rule, at `error` → the mandatory gate fails             |
| `scope: "prototyping"` | `:72-73` — "never a stage you did not run"                  |
| write nothing          | `:148` / `:173` — MUST, and a Completion-Contract line item |
| waive the finding      | `:151` — waivers are `warning` / `info` only                |

## Why this needs a Change Request

The severity is stated in four upstream SSOT artifacts: `REQ-0015-0013`
(`01_Spec.md`), `US-0015-0007` (`02_User-stories.md`), `AC-0015-0013`
(`03_Acceptance-Criteria.md`) and `EX-0015-0009` (`05_Examples.md`). All are
`.qfai/specs/**` under `constitution/drift-protocol.md#core-rule`.

## Blocked downstream items

- `/qfai-verify` runs outside Work Order H while any prototyping loop is open —
  which is the general case, not an edge.
- Not blocked by this CR: #686 (the `.qfai/output/` vs `.qfai/report/` path
  split). The contradiction holds at whichever path the file lands, so the two
  are orthogonal.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0015` (`01_Spec.md`, `02_User-stories.md`,
  `03_Acceptance-Criteria.md`, `05_Examples.md`, `09_delta.md`)
- Plans: none
- Tests: `tests/integration/reviewerGateCertifyVerifyCycle.test.ts`,
  `tests/e2e/spec0015ReviewerGateFindingsE2E.test.ts` — severity expectations
- Contracts: none
- Schema: none

## Decision needed from user

Which of the issue's three fixes. **Answered: (1)** — scope the rule to the
certify path it is named for.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0015` rerun scope: **`confirm-only`**. The rule, its message and
   its emission site are unchanged in structure; only the severity moves, and
   the enforcement it stands for already exists in `certify`. Nothing downstream
   of `03`–`05` is re-derived.
2. `reviewerGate.ts`: severity `error` → `info`, and the message now names the
   way out — close the loop, re-run `/qfai-verify` for Work Order H so the file
   records `scope: "prototyping"`. It previously stated the rule and the
   contract clause but not what to write instead.
3. `prototypingCertify.ts`: the exit-2 refusal stays and its message names the
   same sequence. This is the enforcement.
4. The four spec statements record the new severity **and why**, because a
   reader finding `info` on a rule named "CIRCULAR" needs to know the
   enforcement did not go away.

## Resolution

The rule's stated purpose is to stop `prototyping certify` sealing a certificate
from a wrong-phase verdict. `prototypingCertify.ts:374-383` already refuses a
non-prototyping scope with exit 2, and its own comment says the validator
finding "keeps the certify command self-contained instead of relying on a
downstream validate pass to surface the same condition." So the certify path
fails closed without the repo-wide `error`.

A `scope: "full"` verdict sitting on disk is not damage — a full-profile run
records it truthfully. **Consuming** it in `certify` is, and `certify` refuses.
The observation is still worth making, because it tells the operator that
certification will be refused until the loop closes; that is what `info` is for.

Options (2) and (3) were rejected on the merits, not on cost:

- (2) a `prototypingLoop: "open"` field duplicates information
  `prototyping.json` already holds, and both readers would then have to agree
  which of the two is authoritative.
- (3) documenting the no-file exit would leave the skill mandating an artifact
  and describing when not to write it, while `certify` remained the thing that
  catches the real error — documentation for a gate that does not fire.

## Timestamps

| field         | value                       | anchor                                                                     |
| ------------- | --------------------------- | -------------------------------------------------------------------------- |
| `Raised at`   | `2026-09-04T08:40:00+09:00` | issue #1097                                                                |
| `Approved at` | `2026-09-04T10:05:00+09:00` | the operator's answer between the three fixes                              |
| `Applied at`  | `2026-09-04T10:10:40+09:00` | the `confirm-only` rerun's CR reference written to `spec-0015/09_delta.md` |

`Applied at` is when the owner-skill rerun completed and the upstream artifacts
carried the approved change — `skills/qfai-sdd/templates/change-request.md:20`.
A later commit repairing a defect in the applied text is not a new application
and does not move it.
