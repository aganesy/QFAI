# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.
- Every criterion names the user story it satisfies on a `# Parent:` line, and its provenance
  back to the discussion pack on a `# Source:` line.
- Normal-path and error / boundary criteria are both required. A criterion that can only pass
  cannot falsify the requirement it belongs to, and every gate in this spec has a failure
  direction that is itself load-bearing.

## AC Gherkin (required)

```gherkin
# AC-0017-0001: Verdict fails on a failed need and on a cancelled need
# Parent: US-0017-0001
# Source: discussion-20260804173914356#DAC-001-05
Scenario: A newly added job fails and the aggregate verdict notices without being edited
  Given the aggregate verdict job derives its result by iterating its serialized needs map
  And a new job is wired only into that needs list, with no edit to the verdict body
  When that job concludes as failed
  Then the verdict exits 1 and names the failed need
  And when the same job is instead cancelled, the verdict still exits 1
  And the verdict check name is unchanged in both runs

# AC-0017-0002: Verdict succeeds on all-succeeded and on all-skipped needs
# Parent: US-0017-0001
# Source: discussion-20260804173914356#DAC-001-01
Scenario: The verdict distinguishes "nothing needed running" from "nothing was verified"
  Given the aggregate verdict job derives its result from the state of every need
  When every need concluded as succeeded
  Then the verdict exits 0
  And when every need was skipped because change detection selected no lane, the verdict exits 0
  And an unrecognized need state fails closed rather than being read as success

# AC-0017-0003: Documentation-only pull request executes the minimum lane set
# Parent: US-0017-0001
# Source: discussion-20260804173914356#DAC-001-01
Scenario: A Markdown-only change runs detection, lint, build and the verdict, and nothing else
  Given the repository's duplicate validate workflow has already been retired
  And every test matrix leg is declared and carries a condition derived from the detection output
  When a pull request touches only Markdown files outside the recognized source directories
  Then at most four job instances execute while the build job carries the required status context
  And that floor falls to three once the required context moves off the build job
  And every unneeded leg reports as skipped, so its check name persists
  And no skipped leg consumes runner minutes
  And the aggregate verdict reports success

# AC-0017-0004: Detection fails open with a warning annotation
# Parent: US-0017-0001
# Source: discussion-20260804173914356#DAC-001-02
Scenario: The diff cannot be computed, so everything runs
  Given the change-detection job requests full history and diffs against the base commit
  When the diff fails because the clone is shallow or the base ref is unreachable
  Then the job emits an explicit warning annotation naming the reason
  And it selects the full lane set rather than skipping anything
  And the aggregate verdict is still reachable and still green when every selected lane passes

# AC-0017-0005: Unrecognized path and assistant-tree Markdown run the full lane set
# Parent: US-0017-0001
# Source: discussion-20260804173914356#DAC-001-03
Scenario: The exclusion set is a closed list, and the assistant tree is not documentation
  Given change detection classifies a change against a recognized-directory list
  When a pull request touches a path outside every recognized directory
  Then the full lane set is selected
  And when a pull request touches Markdown under the assistant catalog tree, the full lane set is selected
  And when a pull request touches only the agent-integration mirrors, they are treated as documentation-only

# AC-0017-0006: Lint lane and required-context job are never skipped by selection
# Parent: US-0017-0001
# Source: discussion-20260804173914356#DAC-001-04
Scenario: Two lanes are structurally exempt from change-derived selection
  Given the lint lane carries the formatter, the Markdown linter, the leakage guard and the pin guard
  And a skipped job reports success to branch protection
  When change detection selects no test lane at all
  Then the lint lane still runs, so the formatter and Markdown gates are not vacuous for a documentation change
  And the job carrying a required status context still runs unconditionally while it carries it
  And no check name is created or renamed by selection, so no repository setting has to change

# AC-0017-0007: Every own-CI job has a reachable permission block
# Parent: US-0017-0002
# Source: discussion-20260804173914356#DAC-005-01
Scenario: Least privilege measured by reachability, not by declaration
  Given a job-reachable permission block counts a workflow-level block the job inherits
  When the hygiene lane counts jobs across the own workflows tree with no reachable block
  Then the count is zero, down from eight of twelve
  And the aggregate verdict job declares an empty permission map, accepted as explicit rather than missing
  And the publishing job's identity-token write is accepted as a justified elevation

# AC-0017-0008: Removing both permission blocks fails the hygiene run
# Parent: US-0017-0002
# Source: discussion-20260804173914356#DAC-005-01
Scenario: The reachability rule is falsifiable, not just satisfiable
  Given a workflow whose job inherits a workflow-level permission block
  When both the job-level block and the workflow-level block are removed
  Then the hygiene lane exits 1 and names the workflow and the job
  And restoring either one of the two blocks makes the lane exit 0 again

# AC-0017-0009: Every checkout refuses to persist credentials, full history stays job-scoped
# Parent: US-0017-0002
# Source: discussion-20260804173914356#DAC-005-02
Scenario: The checkout token never reaches the workspace, and full history stays an exception
  Given eleven checkout steps exist across the own workflows tree and none sets the flag today
  When the hygiene lane counts checkout steps that do not set persist-credentials to false
  Then the count is zero
  And the two jobs that legitimately need full history request it on the job, not as a workflow default
  And removing the flag from any single checkout step makes the lane exit 1

# AC-0017-0010: Every action reference is a full-SHA pin; a floating tag fails
# Parent: US-0017-0002
# Source: discussion-20260804173914356#DAC-005-03
Scenario: Pins are asserted by form, and a floating reference is rejected
  Given twenty-one action references exist across the own workflows tree and none is pinned today
  When the hygiene lane asserts that every reference resolves to a forty-hex commit SHA
  Then the count of floating references is zero
  And planting a floating major-version reference makes the lane exit 1 naming that reference
  And a conventional readable version trailer beside a pin does not fail any guard in this tree

# AC-0017-0011: The pin bump owner is named in a durable repository artifact
# Parent: US-0017-0002
# Source: discussion-20260804173914356#DAC-005-06
Scenario: Pinning without an owner is an unsatisfied requirement, not a partial one
  Given no automated action-bump configuration exists in the repository
  And a repository-root bump configuration requires explicit user approval before it can be added
  When the pins land
  Then a durable repository artifact — this spec, or the bump configuration itself — names who bumps them
  And a bump owner stated only in a pull-request description does not satisfy the criterion, because no gate can read it

# AC-0017-0012: The setup preamble has one definition every job consumes
# Parent: US-0017-0003
# Source: discussion-20260804173914356#DSC-004
Scenario: Setup exists once and is consumed, not restated
  Given the frozen-lockfile install literal appears six times across the own CI workflow today
  When the setup preamble is extracted into a single repository-internal definition
  Then that literal appears zero times in the workflow and exactly once in the shared definition
  And every own-CI job that needs the toolchain consumes the shared definition rather than restating it
  And the shared definition enables the package-manager shim, sets up Node with the cache and an explicit cache-dependency path, re-shims, and installs with a frozen lockfile

# AC-0017-0013: No workflow-level Node literal; the definition never enters the shipped tree
# Parent: US-0017-0003
# Source: discussion-20260804173914356#DSC-004
Scenario: The version is file-derived here, and the mechanism does not leak into the shipped surface
  Given the Node version is duplicated as a workflow-level literal today
  When the shared setup definition reads the version from a file in the repository
  Then no workflow-level Node version literal remains but the publishing job's declared exception
  And the class of stale-version comment the shipped template exhibits becomes structurally impossible here
  And the shared definition lives outside the shipped asset tree, so pack verification still rejects an actions directory under the shipped GitHub configuration

# AC-0017-0014: The build is produced once and downloaded by the legs that need it
# Parent: US-0017-0004
# Source: discussion-20260804173914356#DSC-005
Scenario: Artifact reuse lands because the measurement supports it
  Given six bundler build executions occur per pull request today, two of them fired by the pack-verification lifecycle
  And a before-and-after baseline has been captured and recorded
  When the build is produced once, uploaded, and downloaded by the two matrix legs that rebuild today
  Then the bundler invocation count in the run logs falls against the recorded baseline
  And the two pack-lifecycle builds are unchanged, because artifact reuse cannot reach them
  And the numbers are quoted in the pull-request description as well as written to the evidence tree

# AC-0017-0015: A measured wall-clock regression keeps the rebuilds and records why
# Parent: US-0017-0004
# Source: discussion-20260804173914356#DSC-005
Scenario: A measured "no" is a legitimate outcome rather than a failed attempt
  Given artifact reuse adds a serializing dependency to jobs that run in parallel today
  When the captured before-and-after measurement shows a wall-clock regression
  Then the rebuilds are kept
  And the measurement is recorded as the reason in the evidence tree and quoted in the pull-request description
  And the requirement is satisfied by that record, so no retry-until-it-agrees loop is entered

# AC-0017-0016: The required-context job keeps its name, its unconditionality and its verification set
# Parent: US-0017-0004
# Source: discussion-20260804173914356#DSC-027
Scenario: The producer and verifier split must not hollow out the only required status check
  Given the job named build is the repository's only required status check
  When that job is split, folded into, or otherwise restructured
  Then a job of that exact name still exists
  And it carries no condition of its own, and no job it depends on carries one, because a skipped dependency makes it skipped and a skipped job reports success
  And it still performs, or depends on jobs that perform, every item of its enumerated verification set
  And no item of that set is weakened by continue-on-error
  And a removal, a rename, an added condition or a shrunk verification set is a release blocker

# AC-0017-0017: The report upload skips on cancellation and ages out sooner
# Parent: US-0017-0004
# Source: discussion-20260804173914356#DSC-020
Scenario: Cancelled runs stop paying storage
  Given the report upload runs unconditionally with fourteen-day retention today
  When the upload step is hardened
  Then it is skipped when the run is cancelled
  And it tolerates a missing report file rather than failing the job
  And its retention is at most seven days

# AC-0017-0018: Layer separation adds jobs without adding a workflow file or a check name
# Parent: US-0017-0005
# Source: discussion-20260804173914356#DSC-019
Scenario: The layer split stays inside the existing file
  Given every check name is a repository setting that no agent can configure
  When the test layers are separated into their own jobs and matrix legs by cost and duration
  Then the own-CI workflow file count is unchanged
  And the aggregate check name is unchanged
  And a new workflow file would create a check name nobody has configured, so it is rejected in review

# AC-0017-0019: The hygiene lane exits 0 over a clean own-workflow tree
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DAC-005-04
Scenario: One repository script asserts the whole hygiene rule set
  Given a repository script scans every file under the own workflows tree
  When it runs against the hardened tree
  Then it asserts that every job declares permissions and timeout-minutes
  And that every checkout refuses to persist credentials
  And that every action reference is SHA-pinned
  And that every matrix disables fail-fast
  And that secret inheritance appears nowhere
  And it exits 0

# AC-0017-0020: The hygiene lane names its rule set in its output
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DAC-005-05
Scenario: A green result is legible as a list of checks, not as a blanket assurance
  Given the hygiene lane has just exited 0
  When a reviewer reads its output
  Then the output enumerates each rule the script evaluated
  And a rule that was not evaluated is absent from that list rather than implied by the green result

# AC-0017-0021: A planted violation exits 1 naming the file, the job and the rule
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DSC-011
Scenario: Every rule is independently falsifiable
  Given a positive and a negative fixture exist for each hygiene rule
  When any single rule's violation is planted into a fixture workflow
  Then the lane exits 1
  And the failure names the offending file, the offending job and the rule identifier
  And removing the planted violation returns the lane to exit 0

# AC-0017-0022: The lane covers the shipped tree and lands with the shipped hardening
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DSC-011
Scenario: Shipped templates are enforceable from inside QFAI's own CI
  Given the shipped workflows tree is scanned either by copying it into the workflows directory inside the CI checkout or by pointing the script at both trees
  When a violation is planted in a shipped file only
  Then the lane exits 1 and names the shipped path rather than an own-CI path
  And the shipped-tree coverage lands in the same change as the shipped hardening, never before it
  And the shipped files themselves remain owned by the init capability, not by this lane

# AC-0017-0023: The shipped third-party rule is an allow-list, not a count of zero
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DAC-002-04
Scenario: The one sanctioned third-party action must not turn the lane red
  Given the shipped set legitimately keeps exactly one third-party action, the package-manager setup action
  When the lane asserts the shipped third-party rule
  Then it asserts membership in a closed sanctioned set
  And the sanctioned entry passes
  And an unsanctioned third-party reference exits 1
  And a rule expressed as a count of zero is rejected, because it would fail the lane on the sanctioned entry

# AC-0017-0024: The lane runs from the aggregate a pull request executes
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DSC-012
Scenario: Gate placement is effective rather than nominal
  Given the release gate aggregate is invoked only by the release workflow and never by own CI
  When the hygiene lane is registered
  Then its invocation appears in the lint aggregate or in a runner project the test matrix drives
  And a planted violation turns a pull request red
  And placing it in the release-only gate aggregate is rejected, because it would block no pull request

# AC-0017-0025: The lane checks the expected-required-context declaration
# Parent: US-0017-0006
# Source: discussion-20260804173914356#DSC-027
Scenario: The required-status-check obligation is enforced from a pull request, not from live settings
  Given a checked-in declaration names the job expected to carry the required status context
  And which checks branch protection requires is not inspectable from the working tree
  When the hygiene script parses every workflow
  Then it asserts that the declared context resolves to an existing job
  And that the job is not skippable, counting a condition on any job it depends on
  And that its enumerated verification set is intact
  And it exits 1 when any of the three properties is violated

# AC-0017-0026: Every vitest project declares the full knob set with the decided starting value
# Parent: US-0017-0007
# Source: discussion-20260804173914356#DAC-006-01
Scenario: Parallelism becomes explicit per project
  Given every project in the runner workspace declares only a name, an include pattern and a shared timeout today
  When the workspace is updated
  Then every project declares pool and pool options, a worker setting, a concurrency setting, a file-parallelism setting and a hook timeout
  And the declared starting value on the worker axis is ten
  And the declared starting value on the within-file concurrency axis is ten
  And each declared value is overridable rather than fixed

# AC-0017-0027: The three slice surfaces hold the same seven names
# Parent: US-0017-0007
# Source: discussion-20260804173914356#DAC-006-05
Scenario: One slice name resolves everywhere, and the dead project is gone
  Given one declared runner project matches zero files, is absent from the CI matrix, and would fail an unfiltered run
  And two CI matrix slices have no corresponding per-slice script
  When the dead project is deleted and the two missing scripts are added
  Then the runner project set, the CI matrix slice list and the per-slice script set are equal
  And each of the three sets holds seven names
  And the deleted project name no longer resolves

# AC-0017-0028: A worker value is adopted only against a recorded measurement
# Parent: US-0017-0007
# Source: discussion-20260804173914356#DAC-006-03
Scenario: The declared starting value is a hypothesis, and the measurement decides
  Given the source repository's numbers are justified as network-bound while this suite is filesystem- and subprocess-bound
  When a timing artifact under the evidence tree compares at least two worker settings on the largest project
  Then the adopted setting is the fastest measured, or within ten percent of it with a written reason
  And when the higher value measures slower or flakier, the lower value is kept and the measurement is recorded as the reason
  And revising the user's stated starting value requires the user's sign-off
  And the timings are quoted in the pull-request description as well as written to the evidence tree

# AC-0017-0029: No retry setting, and each tuning change lands alone behind three green verdicts
# Parent: US-0017-0007
# Source: discussion-20260804173914356#DAC-006-04
Scenario: Newly created races surface instead of being masked
  Given more workers means more concurrent writers against temporary trees and the spawned command-line binary
  When the workspace is tuned
  Then a search for a retry setting in the runner workspace returns zero results
  And each tuning change lands on its own pull request, largest project first
  And each such pull request records, before merge, three consecutive runs green on the lanes that tuning affects, with their run identifiers quoted
  And a rerun-to-green rate above one in twenty default-branch verdict runs afterwards reopens the setting

# AC-0017-0030: Exactly one pull-request-triggered workflow, full profile from the build job
# Parent: US-0017-0008
# Source: discussion-20260804173914356#DSC-025
Scenario: The duplicate validate workflow is retired and its coverage is folded, not dropped
  Given the repository's own copy of the shipped validate workflow is the thirteenth install and the sixth build per pull request
  And it has silently diverged from the shipped copy of the same name
  When it is deleted and its full-profile run is folded into the build job
  Then the duplicate workflow file is absent
  And exactly one workflow is triggered by a pull request
  And the full profile runs from the build job against the repository root, using the locally built binary rather than the published package
  And the folded run becomes part of that job's enumerated verification set, so removing it later is a release blocker

# AC-0017-0031: Deleting the copy before the shipped-set gate exists is rejected
# Parent: US-0017-0008
# Source: discussion-20260804173914356#DSC-012
Scenario: The only cross-check a reviewer can perform by eye is not removed before an automated one exists
  Given no drift gate covers the shipped workflows tree today
  And the repository's own copy is currently the only cross-check a reviewer can perform by eye
  When the deletion is proposed
  Then the structural contract gate over the shipped set is present in the same change or in an earlier one
  And a change that deletes the copy while no such gate exists is rejected in review
  And the justification recorded is the loss of the manual cross-check, not the absence of a mirror, which was already absent

# AC-0017-0032: The mapping file exists, is cross-linked, and disclaims the loader
# Parent: US-0017-0009
# Source: discussion-20260804173914356#DSC-016
Scenario: The layer-to-CI-lane mapping has a discoverable home the parser cannot see
  Given the layer-policy loader reads only the layer catalog and its legacy fallback
  When the mapping document is added as a sibling catalog file
  Then the file exists in the asset tree and in the mirrored repository-root tree
  And the layer catalog cross-links to it, and it cross-links back
  And its header states that the layer-policy loader does not read it
  And its prose does not read as activating per-level routing, which the layer catalog marks as not enforced

# AC-0017-0033: The layer vocabulary is unchanged after the mapping file lands
# Parent: US-0017-0009
# Source: discussion-20260804173914356#DSC-016
Scenario: A normative document must not become vocabulary
  Given the layer-policy parser extracts every layer token and every layer heading from the files it reads
  When the mapping document has landed
  Then the layer-vocabulary warning count is unchanged from the recorded baseline
  And the built-in layer token set is unmodified
  And every layer code the mapping document names also appears in the layer catalog
  And extending the built-in token set to legalize CI vocabulary is rejected

# AC-0017-0034: The mapping file is authored in the asset tree so both mirror gates pass
# Parent: US-0017-0009
# Source: discussion-20260804173914356#DTC-20
Scenario: The repository-root copy is generated, so authoring it directly is rejected
  Given the repository-root assistant tree is a generated byte-mirror of the packaged asset tree
  When the mapping document is authored under the packaged asset catalog directory and the mirror is synchronized
  Then the mirror script reports no stale file
  And the tracked-tree diff in the gate aggregate exits 0
  And a change that edits only the repository-root copy is reverted by the next synchronization and fails that diff, so it is rejected
```

## AC Catalog (optional)

| AC-ID        | Title                                                              | Notes                                                                           | Priority |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------- |
| AC-0017-0001 | Verdict fails on a failed need and on a cancelled need             | Negative path, US-0017-0001, REQ-0006                                           | Must     |
| AC-0017-0002 | Verdict succeeds on all-succeeded and on all-skipped needs         | Happy path plus boundary (all-skipped), US-0017-0001, REQ-0006                  | Must     |
| AC-0017-0003 | Documentation-only pull request executes the minimum lane set      | Happy path, US-0017-0001, REQ-0007                                              | Should   |
| AC-0017-0004 | Detection fails open with a warning annotation                     | Error path (fail-open), US-0017-0001, REQ-0007                                  | Should   |
| AC-0017-0005 | Unrecognized path and assistant-tree Markdown run everything       | Edge / boundary (exclusion set), US-0017-0001, REQ-0007                         | Should   |
| AC-0017-0006 | Lint lane and required-context job are never skipped               | Edge / boundary (non-skippability), US-0017-0001, REQ-0007                      | Should   |
| AC-0017-0007 | Every own-CI job has a reachable permission block                  | Happy path, US-0017-0002, REQ-0001                                              | Must     |
| AC-0017-0008 | Removing both permission blocks fails the hygiene run              | Negative path (planted removal), US-0017-0002, REQ-0001                         | Must     |
| AC-0017-0009 | Every checkout refuses to persist credentials                      | Happy path plus boundary (job-scoped full history), US-0017-0002, REQ-0002      | Must     |
| AC-0017-0010 | Every action reference is a full-SHA pin                           | Happy path plus negative (planted floating tag), US-0017-0002, REQ-0003         | Must     |
| AC-0017-0011 | The pin bump owner is named in a durable repository artifact       | Boundary (unsatisfied without it), US-0017-0002, REQ-0003                       | Must     |
| AC-0017-0012 | The setup preamble has one definition every job consumes           | Happy path, US-0017-0003, REQ-0004                                              | Must     |
| AC-0017-0013 | No workflow-level Node literal; definition stays unshipped         | Edge / boundary (shipped-surface exclusion), US-0017-0003, REQ-0004             | Must     |
| AC-0017-0014 | The build is produced once and downloaded by the legs that need it | Happy path, measurement-gated, US-0017-0004, REQ-0005                           | Should   |
| AC-0017-0015 | A measured wall-clock regression keeps the rebuilds                | Negative path as a legitimate outcome, US-0017-0004, REQ-0005                   | Should   |
| AC-0017-0016 | The required-context job keeps name, unconditionality and set      | Edge / boundary, release blocker, US-0017-0004, REQ-0005                        | Must     |
| AC-0017-0017 | The report upload skips on cancellation and ages out sooner        | Happy path, US-0017-0004, REQ-0009                                              | Should   |
| AC-0017-0018 | Layer separation adds no workflow file and no check name           | Happy path plus boundary, US-0017-0005, REQ-0008                                | Should   |
| AC-0017-0019 | The hygiene lane exits 0 over a clean own-workflow tree            | Happy path, US-0017-0006, REQ-0012                                              | Should   |
| AC-0017-0020 | The hygiene lane names its rule set in its output                  | Happy path (output contract), US-0017-0006, REQ-0012                            | Should   |
| AC-0017-0021 | A planted violation exits 1 naming file, job and rule              | Negative path, per-rule fixtures, US-0017-0006, REQ-0012                        | Should   |
| AC-0017-0022 | The lane covers the shipped tree and lands with its hardening      | Happy path plus sequencing boundary, US-0017-0006, REQ-0013                     | Should   |
| AC-0017-0023 | The shipped third-party rule is an allow-list, not a count         | Edge / boundary (instantly-red failure mode), US-0017-0006, REQ-0013            | Should   |
| AC-0017-0024 | The lane runs from the aggregate a pull request executes           | Edge / boundary (gate placement), US-0017-0006, REQ-0012                        | Should   |
| AC-0017-0025 | The lane checks the expected-required-context declaration          | Edge / boundary, US-0017-0006, REQ-0012                                         | Must     |
| AC-0017-0026 | Every project declares the knob set with the decided value         | Happy path, US-0017-0007, REQ-0010                                              | Must     |
| AC-0017-0027 | The three slice surfaces hold the same seven names                 | Happy path plus state transition (dead project removed), US-0017-0007, REQ-0011 | Must     |
| AC-0017-0028 | A worker value is adopted only against a recorded measurement      | Happy path plus negative measurement, US-0017-0007, REQ-0010                    | Must     |
| AC-0017-0029 | No retry setting, and one tuning change per pull request           | Edge / boundary (flake budget), US-0017-0007, REQ-0010                          | Must     |
| AC-0017-0030 | Exactly one pull-request-triggered workflow, full profile folded   | Happy path, US-0017-0008, REQ-0015                                              | Must     |
| AC-0017-0031 | Deleting the copy before the shipped-set gate exists is rejected   | Negative path (sequencing), US-0017-0008, REQ-0015                              | Must     |
| AC-0017-0032 | The mapping file exists, is cross-linked, disclaims the loader     | Happy path, US-0017-0009, REQ-0014                                              | Should   |
| AC-0017-0033 | The layer vocabulary is unchanged after the mapping file lands     | Edge / boundary, US-0017-0009, REQ-0014                                         | Should   |
| AC-0017-0034 | The mapping file is authored in the asset tree                     | Negative path (root-only edit rejected), US-0017-0009, REQ-0014                 | Should   |

> This catalog is a human-facing index. It deliberately carries no `Source` column: provenance
> has exactly one home, the `# Source:` comment in the required Gherkin block above, so the two
> can never disagree. The `REQ-NNNN` values in `Notes` are spec-local; their upstream discussion
> requirement IDs are mapped in `01_Spec.md` § `Relevant Requirements`.
