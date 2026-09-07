# 05 Examples

## EX-0015-0001: Orchestrator Delegation

- BR-Ref: BR-0015-0001
- Given 対象 spec SDD task
- When Orchestrator runs
- Then it creates work orders for requirements-analyst, solution-architect, and test-design-analyst, and delegates; does not write spec content directly

## EX-0015-0002: Devils-Advocate Bare Negation

- BR-Ref: BR-0015-0004
- Given devils-advocate returns FAIL with only "I disagree" (no alternative)
- When validation checks the verdict
- Then re-judgment is triggered: "bare negation FAIL invalid, provide concrete alternative"

## EX-0015-0003: Devils-Advocate 3-FAIL Demotion

- BR-Ref: BR-0015-0004
- Given devils-advocate returns FAIL 3 consecutive times (each with alternative)
- When demotion check runs
- Then advisory demotion: blocking power lost, progression allowed

## EX-0015-0004: Pattern-Doubler N/A on Empty

- BR-Ref: BR-0015-0005
- Given `07_Decisions.md` with 0 ID-bearing items
- When pattern-doubler evaluates
- Then returns N/A (no patterns to double)

## EX-0015-0005: Delegation Failure Hard Stop Reporting

- BR-Ref: BR-0015-0003
- Given the first required delegation to `delivery-planner` fails with a native tool error that names no retry window
- When the stage starts
- Then the failure is classified `unavailable`, the stage stops immediately, and it reports the attempted role/task, failure summary, failure class, required user remediation, and retry condition

## EX-0015-0006: Capability Probe Uses First Required Delegation

- BR-Ref: BR-0015-0002
- Given a skill stage such as `/qfai-implement` whose first required delegation is `delivery-planner`
- When the orchestrator starts the stage in a native sub-agent environment
- Then it attempts `delivery-planner` immediately, treats that real delegation attempt as the Capability Probe, and does not wait for any separate availability confirmation before execution

## EX-0015-0007: Coverage Placeholder for BR-0015-0006

- BR-Ref: BR-0015-0006
- Given the consolidated rule BR-0015-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0015-0006

## EX-0015-0008: Coverage Placeholder for BR-0015-0007

- BR-Ref: BR-0015-0007
- Given the consolidated rule BR-0015-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0015-0007

## EX-0015-0009: Reviewer-Gate emits `R-CERTIFY-VERIFY-CIRCULAR` on regressed certify path

- BR-Ref: BR-0015-0008
- Given a PR that adds, in the certify code path, a read of `.qfai/report/verify.json` whose profile requires `/qfai-implement` artifacts (reintroducing the prototyping-phase cycle)
- When the Reviewer Gate runs against the PR
- Then it emits `R-CERTIFY-VERIFY-CIRCULAR` at severity **info** and names the way out (close the loop, re-run `/qfai-verify` for Work Order H so the file records `scope: "prototyping"`); `qfai prototyping certify` refuses the verdict with exit 2. `justification:` names the certify code path, the offending `verify.json` profile, and the option-B contract clause violated
- A control PR that adds only a prototyping-phase scoped validate read (no `/qfai-atdd` / `/qfai-implement` artifact requirement) passes without `R-CERTIFY-VERIFY-CIRCULAR`

## EX-0015-0010: Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with 3-part justification

- BR-Ref: BR-0015-0009
- Given the upstream SSOT-sync-pair CI lane signals drift on a PR that edits only `packages/qfai/src/core/validators/findDesignMdViolations.ts` (and not `packages/qfai/assets/init/.claude/skills/qfai-prototyping/references/generator-prompt.md`)
- When the Reviewer Gate processes the signal
- Then it emits `R-PROMPT-SCANNER-DRIFT` (severity error) with `justification:` containing (a) the modified file path, (b) the un-paired counterpart path, (c) the Tailwind contract clause whose match could not be confirmed
- The validate ingestion (owned by the `qfai validate` CLI spec) accepts the finding because `justification:` is non-empty and 3-part complete; if any of the 3 parts is missing, validate rejects (advisory-failing) per that ingestion rule

## EX-0015-0011: SKILL.md missing Default Autopilot Policy fires R-AUTOPILOT-POLICY-MISSING

- BR-Ref: BR-0015-0010
- Given a SKILL.md with no `## Default Autopilot Policy` section OR a SKILL.md whose section is present but missing one or more required buckets (heading-only / partial population)
- When the Reviewer Gate checks it
- Then it emits `R-AUTOPILOT-POLICY-MISSING` (severity error) with `justification:` naming the SKILL.md path and either the absent section or the missing bucket(s) by name; a SKILL.md that lists all three buckets (auto-decide / ask-user / hard-required) passes without the finding

## EX-0015-0012: Architectural-decision AskUserQuestion writes a decision record

- BR-Ref: BR-0015-0011
- Given an `AskUserQuestion` whose template names "architectural decision"
- When the operator answers
- Then the skill body writes `.qfai/evidence/decisions/2026-05-27T08-15-30Z.json` `{question, answer, scope: "architectural-decision", operatorIdentity, timestamp, envelopeContractClause}`, and a routine prompt that names none of the four contexts writes no record

## EX-0015-0013: Skill writing a non-conforming handoff fires R-HANDOFF-SCHEMA-DRIFT

- BR-Ref: BR-0015-0012
- Given a skill that writes `handoff.yaml` missing the canonical schema shape (or an asymmetric edit touching only `handoff.ts` and not its consuming writers)
- When the Reviewer Gate evaluates the PR
- Then it emits `R-HANDOFF-SCHEMA-DRIFT` (severity error); a legacy `session-handoff.yaml` read during the window instead surfaces `D-HANDOFF-LEGACY-FORMAT` (warning), and a conforming `handoff.yaml` with extra per-skill keys passes (`additionalProperties: true`)

## EX-0015-0014: Catalog finding with empty justification rejected by validate

- BR-Ref: BR-0015-0013
- Given a Reviewer report emitting `R-HANDOFF-SCHEMA-DRIFT` with `justification: ""`
- When `qfai validate` ingests the report
- Then it rejects the finding as advisory-failing (empty justification); the same code with a non-empty justification is accepted; all eight catalog codes share this posture

## EX-0015-0015: `qfai audit log --scope` filters decision records

- BR-Ref: BR-0015-0014
- Given two records in `.qfai/evidence/decisions/`, one with `scope: "scope-expansion"` and one with `scope: "skill-envelope"`
- When the operator runs `qfai audit log --scope scope-expansion --format json`
- Then only the scope-expansion record is emitted as JSON; running `qfai audit log` with no filter lists both newest-first in a table (default `--format table`)

## EX-0015-0016: `qfai handoff upgrade` preserves originals under legacy

- BR-Ref: BR-0015-0015
- Given a legacy `session-handoff.yaml` with fields not in the canonical schema
- When the operator runs `qfai handoff upgrade session-handoff.yaml`
- Then a conforming `handoff.yaml` is emitted at the canonical path with the recognized fields mapped and every original field preserved under a `legacy:` key (no data loss)

## EX-0015-0017: validate --report flags a stale reference during the window

- BR-Ref: BR-0015-0016
- Given a `references/handoff.md` still describing pre-CLI-HANDOFF ad-hoc files after the implementation PR
- When `qfai validate --report` runs during the deprecation window
- Then the stale reference surfaces as a warning; after sunset the same stale reference at HEAD fails (zero-stale-reference obligation); a doc rewritten in the same atomic PR as the implementation reports zero stale references

## EX-0015-0018: Hygiene-lane drift reaches review without a justification demand

- BR-Ref: BR-0015-0017
- Given a pull request in which one shipped workflow file loses its `permissions:` block,
- When the workflow-hygiene lane runs and reports the violation with its file, job and rule name,
- Then the Reviewer Gate surfaces `R-WORKFLOW-HYGIENE-DRIFT` carrying those three fields unchanged, and does not fail the finding for a missing `justification:`.
- Contrast: `R-PACK-LOCATION-DRIFT` is emitted only by a repository lint script too, is error class, and **is** a catalog member — so it is rejected outright when its `justification:` is empty. The two codes differ today only because this one's catalog registration is deferred (OQ-0015-0001), not because a script emits it.
