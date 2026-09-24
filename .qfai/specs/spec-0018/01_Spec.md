# 01 Spec — Intent-driven entry and workflow control core

- Spec: spec-0018
- Parent: CAP-0018: Intent-driven entry and workflow control core
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0018/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

The operator states a change once, in free text. `qfai-run` fixes the request
and its scope, and `npx qfai workflow` checks every step, so the run reaches a
full verify with no stage typed after the first prompt. The command and its files
are specified in CLI-WF and CLI-WFFILE; this pack states the rules that bind them
and the behaviour of the two skills.

This spec is not declared UI-bearing (DR-0018-0001). Its operator-facing screens
are a section of CLI-WF, and no UI contract exists for it.

## Scope

### In

- The `qfai-run` entry skill and the `qfai-maintain` skill for the `direct`
  route, with their references. `_policies/11_Slice-Policy.md` places both here.
- `npx qfai workflow`: the command, the control core, the payload parsers, the
  runtime tree and the tracked evidence (CLI-WF, CLI-WFFILE).
- The built-in plan files, their vocabulary, the Operations table the core reads,
  and the load refusals (CLI-WFFILE `## Plan files`).
- The five shipped JSON Schemas and the test that keeps them in agreement with the
  parser (CLI-WFFILE `## Shipped schemas`).
- The `workflow.mode` key in `qfai.config.yaml`: its values, its default and the
  config issue for an invalid value.
- The fault-seed and routing-seed fixtures, the token vocabulary, the recorded
  safety-relevant list, and the manual release-gate eval with its runner under
  `packages/qfai/tests/` (DR-0018-0012).
- The README rewrite that puts the free-text entry first, and the supported-host
  claim with its per-host record and the test that holds the two equal.

### Out

| Surface                                                                                          | Owner                                                                       |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| What `qfai init` installs, the ignore lines, the mode line, the entry directive, the upgrade     | spec-0003 (CLI-INIT)                                                        |
| The triage authorization check and `requiresApproval()` as the one approval set                  | spec-0004 (CLI-VAL)                                                         |
| `/qfai-sdd` Stage 1 checking the authorization; defect row seeding in Phase 2b                   | spec-0013                                                                   |
| Each stage skill's `references/orchestrated-mode.md`, its entry check and its Operations table   | spec-0001, spec-0008, spec-0010, spec-0011, spec-0012, spec-0013, spec-0014 |
| The diagnose-only operation and every production fix                                             | spec-0011                                                                   |
| The ATDD side of the seam-only round trip; `test_fix` for acceptance-layer rows                  | spec-0008                                                                   |
| Verify receipts copied per stage instance                                                        | spec-0014                                                                   |
| The routing and review manifest entries for the two skills; the Default Autopilot bucket mapping | spec-0015                                                                   |
| The drift-protocol carve-out for a diagnosed missing test                                        | spec-0001                                                                   |
| The `windows-latest` CI job                                                                      | spec-0017                                                                   |
| An `exec` operation or a command registry                                                        | none: the harness runs every command                                        |
| A transition that reopens a `done` ledger row                                                    | none: a `done` row stays `done`                                             |
| Hosting an agent, or running CI workflows                                                        | none: the core launches no AI and runs no repository command                |
| A UI contract, surface typing, product-surface review of these screens                           | none (DR-0018-0001)                                                         |
| Automation support on Copilot                                                                    | none: Copilot keeps the skills for manual use                               |

## Applicable Contracts

| Contract   | File                                           | Governs here                                                                                                                                                       |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI-WF     | `.qfai/contracts/cli/qfai-workflow.md`         | The seven operations, the output, the exit codes, the modes, the state machine, fail-closed, the journal and lock, the final gate, and the operator-facing screens |
| CLI-WFFILE | `.qfai/contracts/cli/workflow-files.schema.md` | The runtime and tracked trees, the authorization record, the plan files and the Operations table, the shipped schemas                                              |
| CLI-INIT   | `.qfai/contracts/cli/qfai-init.md`             | Only what this spec reads that init installs: the installed plan copies and the provenance lock                                                                    |
| CLI-VAL    | `.qfai/contracts/cli/qfai-validate.md`         | Only the config issue for an invalid `workflow.mode`                                                                                                               |

The CLI contracts declare no `CON-*` ID, so the `Contract-Refs` column of
`04_Business-Rules.md` holds `-`, and its `## Contract Realization` table names the
contract and section each rule is realized by.

## Design

The control core is a decision function between the observers that read and the
persistence layer that writes. The split lets a test case observe a transition, a
refusal or a seed's outcome without files, a lock or a process.

### The decision function

`decide(snapshot, input, facts) → { verdict, events }`. It performs no I/O.

| Input      | Content                                                     |
| ---------- | ----------------------------------------------------------- |
| `snapshot` | The run as rebuilt from its journal, or none before `start` |
| `input`    | The operation and its parsed payload                        |
| `facts`    | What the observers read, listed below                       |

`facts` holds:

- the lock owner stamp, `now` and whether the owner is alive;
- the current digests of the watched paths and of every submitted path;
- the row set of the bound ledger;
- the git identity and the diff inside the scope;
- the validate findings, at `start` and at `finish`;
- the result of the correspondence check for triggers (b) and (c).

| Output    | Content                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verdict` | The CLI-WF output document the operation returns, without I/O                                                                                            |
| `events`  | The ordered journal events to publish, possibly none. Each carries the documents it references — a work order, a result, a report copy, an authorization |

A replay, a refusal and a read return an empty `events` list.

### The layers around it

- **Persistence** is the only writer. It takes the lock, writes the files each
  event references, publishes the events, and rebuilds the snapshot and the
  tracked files, in the write order of CLI-WF `## Journal, lock and crash states`.
- **Observers** are the only readers of the environment: the journal, the
  lock, git, the ledger, the watched files, the installed plans and validate.
- `now` and the liveness probe are optional parameters of the core, so a test
  passes them in. The core reads no environment variable for either.
- The command adapter parses argv, checks the `--in` path, calls the observers,
  `decide` and persistence in that order, prints the verdict and maps it to an
  exit code.

## Applicable NFR

Pack NFRs, written without the pack half here and in `NFR-Refs`. The first table
is held by business rules and their test cases. The second is measured, not
tested: no deterministic test can state its target, so it has no rule.

| NFR      | Target                                                                                        | Held by                                  |
| -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| NFR-0001 | `qfai-run/SKILL.md` at most 150 lines, about 1,500 tokens as a budget                         | BR-0018-0115                             |
| NFR-0002 | Every shipped asset added or changed within 800 lines and 400 characters per line             | BR-0018-0116                             |
| NFR-0004 | Every measured run records the token and effort fields, `null` where the host exposes nothing | BR-0018-0109                             |
| NFR-0005 | Every safety case passes: all fault seeds and every safety-relevant routing seed              | BR-0018-0105, BR-0018-0107, BR-0018-0108 |
| NFR-0007 | No manual stage selection after the first prompt on a clear routine change                    | BR-0018-0010                             |
| NFR-0009 | Deterministic tests on every pull request; the real-model eval only as a manual release gate  | BR-0018-0104, BR-0018-0106               |
| NFR-0010 | A process killed during an event write resumes from the journal or stops with a named error   | BR-0018-0072, BR-0018-0073               |
| NFR-0011 | Journal, publish, lock and path handling behave the same on Windows as on Linux               | BR-0018-0070, BR-0018-0071               |
| NFR-0012 | stdout is JSON only, and operator messages say what happened and what to do next              | BR-0018-0018                             |
| NFR-0013 | No code path passes request text, agent output or file content to a shell                     | BR-0018-0086                             |
| NFR-0014 | Tracked evidence holds no conversation text, secret, token or absolute path                   | BR-0018-0120                             |
| NFR-0015 | No private version marker or internal identifier in what ships                                | BR-0018-0117                             |
| NFR-0016 | Every shipped mention of the command is `npx qfai workflow …`                                 | BR-0018-0118                             |
| NFR-0017 | New operator-facing CLI strings are English                                                   | BR-0018-0119                             |

| NFR               | Target                                                                                                                                                                                                    | Measured by                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-0006 (should) | Median total tokens on the routine workload at least 30% below today's manual chain, counting P90, retries, cached tokens and every sub-agent. An adoption candidate, not a promise                       | Three systems compared on the same snapshot, request, model, harness, permissions and cache: today's manual chain, the entry with today's stage depth, and the entry with adaptive stages. `10_Plan.md` names the run |
| NFR-0008 (should) | Fewer questions to the operator than the manual chain on the routine workload, with review outcomes at least as good; no question REQ-0008 requires is dropped                                            | The question count per run from the NFR-0004 fields, across the same three systems                                                                                                                                    |
| NFR-0018 (should) | Activation and execution quality re-verified when the model version, a skill description or a host's skill-invocation behaviour changes; a support claim is never raised from a documentation table alone | The routing eval re-run and recorded for each such change before the next release                                                                                                                                     |

## Applicable Policy

Cited, not copied. The pack policies are `discussion-20260923171450572`
`10_Policy.md`; the pack is not tracked, so the rule each one reaches is named.

| Policy                              | Holds that                                                                               | Realized by                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| `_policies/08_Decisions.md` DR-0296 | A new capability is approved once, at routing                                            | BR-0018-0001..BR-0018-0006               |
| `_policies/08_Decisions.md` DR-0297 | A diagnosed missing-test row is appended without a Change Request                        | BR-0018-0036, BR-0018-0037               |
| DPOL-01                             | The run asks only for a material decision or a fact only the operator holds              | BR-0018-0051, BR-0018-0057               |
| DPOL-02                             | Authority has exactly three kinds                                                        | CLI-WF `## Authorizations`; BR-0018-0059 |
| DPOL-03                             | The CREATE approval is asked once, and Stage 1 never asks it                             | BR-0018-0001..BR-0018-0006               |
| DPOL-04                             | No agent approves its own work                                                           | BR-0018-0059, BR-0018-0060               |
| DPOL-05                             | `--auto` is a no-question mode and never an approval                                     | BR-0018-0056                             |
| DPOL-06                             | External effects are never implied                                                       | BR-0018-0053                             |
| DPOL-07                             | An operator stop outranks every other policy                                             | BR-0018-0074, BR-0018-0075               |
| DPOL-08                             | Review stays independent across the run                                                  | BR-0018-0048                             |
| DPOL-09                             | A stage that did not run is never a pass                                                 | BR-0018-0015, BR-0018-0030               |
| DPOL-10                             | Debt with no owner is not handed on                                                      | BR-0018-0026                             |
| DPOL-11                             | `finish` observes validate and takes only this run's receipts                            | BR-0018-0019..BR-0018-0021               |
| DPOL-12                             | `active` by default, failing closed on drift, a missing capability or a broken invariant | BR-0018-0094..BR-0018-0098               |

## Evidence Summary

- Evidence: `.qfai/evidence/discussion-20260923171450572.md` (the discussion
  record) and the batch record under `.qfai/evidence/`. The Phase 0 contracts and
  `_policies/08_Decisions.md` DR-0296 and DR-0297 carry the decisions made before
  this pack was written.

## Relevant Requirements

Every requirement of the approved CREATE row, with its ranges expanded. `Home`
is the contract section that realizes it, the rules of `04_Business-Rules.md`
that state it, or both. A requirement with no rule here is realized by a
contract alone. IDs are the pack's, and this spec numbers none of its own.

| Requirement                             | Home                                                                                                                                                                                                                                                              | Stories                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `discussion-20260923171450572#REQ-0001` | CLI-WF operator-facing screens; BR-0018-0007, BR-0018-0010                                                                                                                                                                                                        | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0002` | CLI-WF operator-facing screens; BR-0018-0066, BR-0018-0082, BR-0018-0083, BR-0018-0084                                                                                                                                                                            | US-0018-0005, US-0018-0006                             |
| `discussion-20260923171450572#REQ-0003` | CLI-WF operator-facing screens; BR-0018-0085                                                                                                                                                                                                                      | US-0018-0006                                           |
| `discussion-20260923171450572#REQ-0004` | CLI-WF `## Payloads`, operator-facing screens; BR-0018-0009                                                                                                                                                                                                       | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0005` | CLI-WFFILE `### Load refusals`; BR-0018-0043, BR-0018-0044, BR-0018-0045                                                                                                                                                                                          | US-0018-0002                                           |
| `discussion-20260923171450572#REQ-0006` | CLI-WFFILE `### Load refusals`; BR-0018-0013, BR-0018-0014, BR-0018-0036, BR-0018-0037, BR-0018-0038, BR-0018-0039, BR-0018-0046, BR-0018-0047, BR-0018-0087                                                                                                      | US-0018-0001, US-0018-0002, US-0018-0003, US-0018-0007 |
| `discussion-20260923171450572#REQ-0007` | BR-0018-0089, BR-0018-0090                                                                                                                                                                                                                                        | US-0018-0007                                           |
| `discussion-20260923171450572#REQ-0008` | CLI-WF `## Questions and decisions`, operator-facing screens; BR-0018-0051, BR-0018-0052                                                                                                                                                                          | US-0018-0004                                           |
| `discussion-20260923171450572#REQ-0009` | CLI-WF `## Questions and decisions`, operator-facing screens; BR-0018-0057                                                                                                                                                                                        | US-0018-0004                                           |
| `discussion-20260923171450572#REQ-0010` | CLI-WF `## Authorizations`, operator-facing screens; BR-0018-0053                                                                                                                                                                                                 | US-0018-0004                                           |
| `discussion-20260923171450572#REQ-0011` | CLI-WF `## Payloads`, operator-facing screens; CLI-WFFILE `## Shipped schemas`; BR-0018-0007, BR-0018-0008                                                                                                                                                        | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0012` | CLI-WF `## Payloads`, `## Boundaries`, operator-facing screens; CLI-WFFILE `## Authorization record`; BR-0018-0003, BR-0018-0033, BR-0018-0034, BR-0018-0123, BR-0018-0124, BR-0018-0126                                                                          | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0013` | CLI-WF `## Payloads`, `## Authorizations`, operator-facing screens; CLI-WFFILE `## Authorization record`; BR-0018-0004                                                                                                                                            | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0014` | CLI-WF `## Command line`; BR-0018-0017                                                                                                                                                                                                                            | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0015` | CLI-WF `## Operations`, operator-facing screens; BR-0018-0011                                                                                                                                                                                                     | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0016` | CLI-WF `## Operations`, operator-facing screens; BR-0018-0012                                                                                                                                                                                                     | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0017` | CLI-WF `## Operations`, operator-facing screens; BR-0018-0032                                                                                                                                                                                                     | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0018` | CLI-WF `## Operations`, `## Questions and decisions`, operator-facing screens; CLI-WFFILE `## Authorization record`; BR-0018-0002, BR-0018-0054, BR-0018-0055, BR-0018-0059                                                                                       | US-0018-0001, US-0018-0004                             |
| `discussion-20260923171450572#REQ-0019` | CLI-WF `## Operations`, operator-facing screens; BR-0018-0093                                                                                                                                                                                                     | US-0018-0008                                           |
| `discussion-20260923171450572#REQ-0020` | CLI-WF `## Operations`, operator-facing screens; BR-0018-0064                                                                                                                                                                                                     | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0021` | CLI-WF `## Operations`, `## Completion`, `## Exit codes`, operator-facing screens; BR-0018-0022, BR-0018-0129                                                                                                                                                     | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0022` | CLI-WF `## Command line`, `## Output`, `## Exit codes`; BR-0018-0018                                                                                                                                                                                              | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0023` | CLI-WF `## Command line`, `## Boundaries`; CLI-WFFILE `## Runtime tree`; BR-0018-0086                                                                                                                                                                             | US-0018-0006                                           |
| `discussion-20260923171450572#REQ-0024` | CLI-WF `## Boundaries`, `## Decline audit`, `## Completion`; CLI-WFFILE `## Runtime tree`, `## Tracked tree`; BR-0018-0006, BR-0018-0120, BR-0018-0122, BR-0018-0128, BR-0018-0129                                                                                | US-0018-0001, US-0018-0010                             |
| `discussion-20260923171450572#REQ-0025` | CLI-WF `## Payloads`; CLI-WFFILE `## Runtime tree`, `## Shipped schemas`; BR-0018-0062, BR-0018-0117, BR-0018-0121                                                                                                                                                | US-0018-0005, US-0018-0010                             |
| `discussion-20260923171450572#REQ-0026` | CLI-WF `## State machine`, `## Journal, lock and crash states`, `## Output`, operator-facing screens; CLI-WFFILE `## Runtime tree`; BR-0018-0070, BR-0018-0072, BR-0018-0073                                                                                      | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0027` | CLI-WF `## Operations`, `## Journal, lock and crash states`, operator-facing screens; CLI-WFFILE `## Runtime tree`; BR-0018-0069, BR-0018-0071                                                                                                                    | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0028` | CLI-WF `## Questions and decisions`, operator-facing screens; BR-0018-0031, BR-0018-0060                                                                                                                                                                          | US-0018-0001, US-0018-0004                             |
| `discussion-20260923171450572#REQ-0029` | CLI-WF `## Fingerprints and receipts`, operator-facing screens; BR-0018-0067, BR-0018-0068                                                                                                                                                                        | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0030` | CLI-WF `## Operations`, `## Fingerprints and receipts`, operator-facing screens; BR-0018-0061, BR-0018-0064, BR-0018-0065                                                                                                                                         | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0031` | CLI-WF `## State machine`, operator-facing screens; BR-0018-0078, BR-0018-0079, BR-0018-0080, BR-0018-0081                                                                                                                                                        | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0032` | CLI-WF `## Questions and decisions`, `## State machine`, operator-facing screens; BR-0018-0074, BR-0018-0075, BR-0018-0076                                                                                                                                        | US-0018-0005                                           |
| `discussion-20260923171450572#REQ-0033` | CLI-WF `## State machine`, operator-facing screens; BR-0018-0022, BR-0018-0077                                                                                                                                                                                    | US-0018-0001, US-0018-0005                             |
| `discussion-20260923171450572#REQ-0034` | CLI-WF `## Payloads`, `## Ledger row-set check`, operator-facing screens; BR-0018-0040, BR-0018-0041, BR-0018-0042                                                                                                                                                | US-0018-0002                                           |
| `discussion-20260923171450572#REQ-0035` | CLI-WF `## Payloads`, operator-facing screens; BR-0018-0029, BR-0018-0030                                                                                                                                                                                         | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0036` | CLI-WF `## Payloads`, operator-facing screens; BR-0018-0015                                                                                                                                                                                                       | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0037` | CLI-WF `## Payloads`, `## Completion`, operator-facing screens; CLI-WFFILE `## Tracked tree`; BR-0018-0026                                                                                                                                                        | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0038` | CLI-WF `## Payloads`; BR-0018-0027, BR-0018-0028                                                                                                                                                                                                                  | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0039` | CLI-WF `## Questions and decisions`, `## State machine`, operator-facing screens; BR-0018-0045, BR-0018-0049, BR-0018-0050, BR-0018-0125                                                                                                                          | US-0018-0002, US-0018-0003, US-0018-0004               |
| `discussion-20260923171450572#REQ-0040` | CLI-WF `## Payloads`, `## State machine`, operator-facing screens; BR-0018-0047, BR-0018-0048, BR-0018-0078                                                                                                                                                       | US-0018-0003, US-0018-0005                             |
| `discussion-20260923171450572#REQ-0041` | CLI-WF `## Authorizations`, operator-facing screens; CLI-WFFILE `## Authorization record`; BR-0018-0059                                                                                                                                                           | US-0018-0004                                           |
| `discussion-20260923171450572#REQ-0042` | CLI-WF `## Questions and decisions`, `## Authorizations`, `## Decline audit`, operator-facing screens; CLI-WFFILE `## Tracked tree`, `## Authorization record`; BR-0018-0001, BR-0018-0002, BR-0018-0003, BR-0018-0005, BR-0018-0006                              | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0044` | CLI-WF `## Authorizations`, operator-facing screens; BR-0018-0056                                                                                                                                                                                                 | US-0018-0004                                           |
| `discussion-20260923171450572#REQ-0049` | BR-0018-0088                                                                                                                                                                                                                                                      | US-0018-0007                                           |
| `discussion-20260923171450572#REQ-0054` | BR-0018-0016                                                                                                                                                                                                                                                      | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0055` | BR-0018-0058                                                                                                                                                                                                                                                      | US-0018-0004                                           |
| `discussion-20260923171450572#REQ-0057` | CLI-WFFILE `### Load refusals`; BR-0018-0099                                                                                                                                                                                                                      | US-0018-0008                                           |
| `discussion-20260923171450572#REQ-0058` | CLI-WF `## Host capability report`, operator-facing screens; BR-0018-0100, BR-0018-0101, BR-0018-0102, BR-0018-0110, BR-0018-0111                                                                                                                                 | US-0018-0009, US-0018-0010                             |
| `discussion-20260923171450572#REQ-0059` | CLI-WF `## Modes`, `## Fail-closed`, operator-facing screens; CLI-WFFILE `## Operations`, `### Load refusals`; CLI-VAL `## Workflow mode setting`; BR-0018-0091, BR-0018-0092, BR-0018-0094, BR-0018-0095, BR-0018-0096, BR-0018-0097, BR-0018-0098, BR-0018-0101 | US-0018-0008, US-0018-0009                             |
| `discussion-20260923171450572#REQ-0060` | CLI-WF `## Fingerprints and receipts`, `## Completion`, operator-facing screens; BR-0018-0019, BR-0018-0021                                                                                                                                                       | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0061` | CLI-WF `## Completion`, operator-facing screens; BR-0018-0023, BR-0018-0024, BR-0018-0025, BR-0018-0128                                                                                                                                                           | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0062` | CLI-WF `## Completion`, operator-facing screens; BR-0018-0035                                                                                                                                                                                                     | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0063` | CLI-WF `## Fingerprints and receipts`, `## Completion`, operator-facing screens; BR-0018-0020                                                                                                                                                                     | US-0018-0001                                           |
| `discussion-20260923171450572#REQ-0066` | BR-0018-0103, BR-0018-0104, BR-0018-0105, BR-0018-0106, BR-0018-0107, BR-0018-0108, BR-0018-0109, BR-0018-0112                                                                                                                                                    | US-0018-0010                                           |
| `discussion-20260923171450572#REQ-0067` | BR-0018-0113, BR-0018-0114                                                                                                                                                                                                                                        | US-0018-0010                                           |
| `discussion-20260923171450572#REQ-0068` | CLI-WF `## Journal, lock and crash states`, operator-facing screens; BR-0018-0063, BR-0018-0092                                                                                                                                                                   | US-0018-0005, US-0018-0008                             |
| `discussion-20260923171450572#NFR-0001` | BR-0018-0115                                                                                                                                                                                                                                                      | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0002` | BR-0018-0116                                                                                                                                                                                                                                                      | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0004` | CLI-WF `## Payloads`; CLI-WFFILE `## Shipped schemas`; BR-0018-0109                                                                                                                                                                                               | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0005` | BR-0018-0105, BR-0018-0107, BR-0018-0108                                                                                                                                                                                                                          | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0006` | measured, no rule (`## Applicable NFR`)                                                                                                                                                                                                                           | -                                                      |
| `discussion-20260923171450572#NFR-0007` | CLI-WF operator-facing screens; BR-0018-0010                                                                                                                                                                                                                      | US-0018-0001                                           |
| `discussion-20260923171450572#NFR-0008` | measured, no rule (`## Applicable NFR`)                                                                                                                                                                                                                           | -                                                      |
| `discussion-20260923171450572#NFR-0009` | CLI-WFFILE `## Shipped schemas`; BR-0018-0104, BR-0018-0106                                                                                                                                                                                                       | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0010` | CLI-WF `## Journal, lock and crash states`; BR-0018-0072, BR-0018-0073                                                                                                                                                                                            | US-0018-0005                                           |
| `discussion-20260923171450572#NFR-0011` | CLI-WF `## Journal, lock and crash states`, `## Fingerprints and receipts`, `## Boundaries`; BR-0018-0070, BR-0018-0071                                                                                                                                           | US-0018-0005                                           |
| `discussion-20260923171450572#NFR-0012` | CLI-WF `## Output`, operator-facing screens; BR-0018-0018                                                                                                                                                                                                         | US-0018-0001                                           |
| `discussion-20260923171450572#NFR-0013` | CLI-WF `## Command line`, `## Boundaries`; BR-0018-0086                                                                                                                                                                                                           | US-0018-0006                                           |
| `discussion-20260923171450572#NFR-0014` | CLI-WF `## Command line`, `## Boundaries`, `## Decline audit`; CLI-WFFILE `## Runtime tree`, `## Tracked tree`; BR-0018-0120                                                                                                                                      | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0015` | CLI-WFFILE `### Load refusals`, `## Shipped schemas`; BR-0018-0117                                                                                                                                                                                                | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0016` | CLI-WF `## Command line`, `## Boundaries`; BR-0018-0118                                                                                                                                                                                                           | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0017` | CLI-WF `## Output`; BR-0018-0119                                                                                                                                                                                                                                  | US-0018-0010                                           |
| `discussion-20260923171450572#NFR-0018` | BR-0018-0110; measured, no rule (`## Applicable NFR`)                                                                                                                                                                                                             | US-0018-0010                                           |

REQ-0059 reads here as: `active` chains stages automatically on a host whose
capability report and first delegation pass. Whether the release claims that
host as supported changes nothing at runtime (BR-0018-0101).

## Entry points

- US range in this spec: US-0018-0001..US-0018-0010
- Primary actors: the operator, on Claude Code or Codex; `qfai-run` through the
  host session; an operator or a script calling `npx qfai workflow` by hand
- Notes: a stage skill invoked by name still runs standalone and ends at that
  stage; this spec adds a path beside that one.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
