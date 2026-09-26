# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Every criterion names the user story it satisfies on a `# Parent:` line, and
  its provenance on a `# Source:` line.
- New-layout IDs appear as placeholders (`BF-NNNN`, `US-NNNN-NNNN`,
  `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN`, `OQ-NNNN`), so
  none is read as an ID of this pack.

## AC Gherkin (required)

```gherkin
# AC-0018-0001: A step refuses a bad start before it writes
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-01
Scenario: A step exits 2 and writes nothing when it cannot run
  Given a project on the spec-pack layout
  When a step script is run with an argument other than --dry-run, outside the project root, without the qfai package installed, or over an input it cannot read or parse
  Then it exits 2 and names the cause
  And no file in the project has changed

# AC-0018-0002: Steps run in number order
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-01
Scenario: A step whose input an earlier step produces refuses to run first
  Given a project on the spec-pack layout where step 1 has not run
  When step 5 is run
  Then it exits 2, names the earlier step that has not run, and writes nothing

# AC-0018-0003: A dry run writes nothing and shows the real run
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-03
Scenario: A dry run lists the operations the real run then performs
  Given a project on the spec-pack layout
  When a step is run with --dry-run and then without it
  Then the dry run changes no file
  And the operations it prints are, in order, the operations the real run prints
  And they name exactly the files the real run changes

# AC-0018-0004: A second run changes nothing and an interrupted run completes
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-03
Scenario: Running a step again is safe
  Given a project a step has already migrated
  When the step is run again
  Then no file changes
  And given a tree that step left half migrated, running it again leaves the tree an uninterrupted run leaves

# AC-0018-0005: A step writes only inside its write set
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Nothing outside the step's write set changes
  Given a project on the spec-pack layout inside a temporary directory
  When every step runs in order
  Then every changed path is one the step's write set allows
  And no step opens a network connection

# AC-0018-0006: The report and the exit code say whether a person is needed
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-01
Scenario: A step reports on standard output and exits 3 only when a person must act
  Given a project on the spec-pack layout
  When a step completes
  Then it prints its report sections as Markdown on standard output, with none under an empty section
  And it writes no report file
  And it exits 3 when its For a person section lists an item, and 0 otherwise

# AC-0018-0007: A consumed source leaves the old layout and nothing is lost
# Parent: US-0018-0001
# Source: discussion-20260923063306456#DAC-006-01
Scenario: A step removes or archives what it consumed
  Given a project on the spec-pack layout
  When a step has written a source file's content to its destinations
  Then the source file is gone from the old layout
  And a source file holding content with no destination is kept under the migration's retired archive
  And a directory left empty is removed

# AC-0018-0008: Step 1 moves each directory to its singular name
# Parent: US-0018-0002
# Source: discussion-20260923063306456#DAC-006-01
Scenario: The plural directories and the contracts directory move, and the config follows
  Given a project on the spec-pack layout whose qfai.config.yaml holds the default paths
  And an assistant directory whose singular destination already holds an entry of the same name
  When step 1 runs
  Then every directory in the rename map is at its new path and the config paths name the new paths
  And the colliding entry is under the migration's legacy archive, listed under Operations
  And nothing is deleted

# AC-0018-0009: Step 1 renames skills.local
# Parent: US-0018-0002
# Source: discussion-20260923063306456#DAC-006-01
Scenario: The project's own skill overlay keeps its content under the singular name
  Given a project with a .qfai/assistant/skills.local directory
  When step 1 runs
  Then its content is under .qfai/assistant/skill.local and skills.local is gone

# AC-0018-0010: Step 2 turns every decision-side record into one decisions.md row
# Parent: US-0018-0003
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Decision records, log entries, triage records and change requests become rows
  Given a project on the spec-pack layout with decision records, decision log entries, triage rows, change requests and a retired spec pack
  When step 2 runs
  Then each becomes exactly one decisions.md row of four cells under a new DEC-NNNN ID, naming its old ID
  And each row's Status is the one the status map gives its old status
  And no flow or story is made from the retired spec pack

# AC-0018-0011: Step 2 turns every open question into one open-questions.md row
# Parent: US-0018-0003
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Open questions keep their standing, and an unanswered one keeps blocking
  Given a project on the spec-pack layout with open, deferred, resolved and unadjudicated open questions
  When step 2 runs
  Then each becomes exactly one open-questions.md row under a new OQ-NNNN ID
  And an unadjudicated question becomes a TODO row whose Content opens with Unadjudicated:

# AC-0018-0012: Step 3 moves policy and catalog content into the merged files once
# Parent: US-0018-0004
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Every section lands in one destination, and no fact is stated twice
  Given a project on the spec-pack layout with the policy files and the adopter-owned catalog files
  When step 3 runs
  Then every section except those in the retired slice policy is in the destination the source map gives it
  And the complete original `_policies/11_Slice-Policy.md` is archived without copying a section into `principle.md`
  And the current operation and ID rules remain in the shipped `qfai-sdd/references/sdd-triage.md`
  And no paragraph appears twice in a destination
  And the consumed source files are gone

# AC-0018-0013: Step 3 carries only the project's own agent settings
# Parent: US-0018-0004
# Source: discussion-20260923063306456#DAC-006-01
Scenario: A manifest entry that equals the built-in default is not carried
  Given a project whose agent manifests hold one entry changed from the package default and one equal to it
  When step 3 runs
  Then qfai.config.yaml holds an override for the changed entry only

# AC-0018-0014: Step 4 places every story, criterion, example and rule from the plan
# Parent: US-0018-0005
# Source: discussion-20260923063306456#DAC-006-01
Scenario: The plan becomes flows and stories with new IDs, and the ID map records them
  Given a project on the spec-pack layout and a plan that places every story and rule
  When step 4 runs
  Then every story, criterion and example is in its story directory under its new ID
  And each flow has its business-flow.md and user-stories.md, and business-flows.md lists every flow
  And id-map.json maps every old ID to its new one
  And every work-log entry names flows and decision rows in place of the old spec IDs

# AC-0018-0015: A story the plan does not place stays where it is
# Parent: US-0018-0005
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Step 4 does not guess a flow
  Given a plan that places no flow for one old user story
  When step 4 runs
  Then that story stays in its spec pack and is listed under For a person with its file and the reason
  And step 4 exits 3

# AC-0018-0016: A test case with no example becomes an example under its criterion
# Parent: US-0018-0006
# Source: discussion-20260923063306456#DAC-006-02
Scenario: Step 5 converts a test-case-only row citing one criterion
  Given a 06_Test-Cases row whose EX-Ref is — and which cites exactly one AC
  When step 5 runs
  Then an EX row for it is under that AC's story, with the new ID the ID map gives it
  And Cases to examples lists its old TC ID and its new EX ID

# AC-0018-0017: No test case is dropped
# Parent: US-0018-0006
# Source: discussion-20260923063306456#DAC-006-02
Scenario: A case step 5 cannot convert is listed for a person
  Given 06_Test-Cases rows whose EX-Ref is —, one citing no AC and one citing two
  When step 5 runs
  Then both are listed under For a person with their file and the reason
  And the rows with EX-Ref — in the input number exactly the entries under Cases to examples plus the TC rows under For a person

# AC-0018-0018: Each example takes the criterion its test cases point at
# Parent: US-0018-0006
# Source: discussion-20260923063306456#DAC-006-02
Scenario: Step 6 sets the AC-Ref from the test cases that cite the example
  Given examples cited by test cases naming exactly one AC, no AC, and two ACs
  When steps 4 and 6 run
  Then the first example's AC-Ref names that AC's new ID
  And the other two stay in their spec pack with no new ID, and step 4 lists them under For a person

# AC-0018-0019: Step 7 writes each rule into its contract in the file's own form
# Parent: US-0018-0007
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Rules land in YAML, SQL and Markdown contracts with their examples
  Given a plan placing one rule in a YAML contract, one in a SQL contract and one in a Markdown contract
  When step 7 runs
  Then each contract carries its rule in the form its file type allows
  And each rule's examples are the new IDs of every example whose old BR-Ref named it

# AC-0018-0020: What step 7 cannot place is listed for a person
# Parent: US-0018-0007
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Unplaced rules and the old non-functional requirement lists go to a person
  Given a rule the plan does not place, a rule placed in a contract file that does not exist, a rule no example cites, and a spec pack with an Applicable NFR list
  When step 7 runs
  Then each is listed under For a person with its file and the reason
  And the Applicable NFR entry names the contracts that spec's rules went to

# AC-0018-0021: Step 8 rewrites annotations that have a new counterpart
# Parent: US-0018-0008
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Test-case annotations become example annotations, and story annotations in E2E files become flow annotations
  Given test files with QFAI:SPEC-NNNN:TC-… annotations, and a QFAI:SPEC-NNNN:US-… annotation in a file under the E2E layer
  When step 8 runs
  Then each test-case annotation names the EX the ID map gives it
  And the story annotation names the BF of the flow its story joined

# AC-0018-0022: Step 8 keeps and reports what it cannot rewrite
# Parent: US-0018-0008
# Source: discussion-20260923063306456#DAC-006-01
Scenario: Annotations with no new counterpart stay and are listed
  Given a story annotation outside the E2E layer, a QFAI:CON-* annotation, an old deferral marker, and a test-case annotation the ID map does not hold
  When step 8 runs
  Then none of them changes
  And the first three are listed under Annotations kept with the file and line
  And the unresolved one is listed under For a person

# AC-0018-0023: Step 9 repoints the host links and nothing else
# Parent: US-0018-0009
# Source: discussion-20260923063306456#DAC-006-01
Scenario: The host integration links follow the singular directories
  Given a project whose host integration links point at the plural skill and agent directories
  When step 9 runs
  Then each link points at the singular directory
  And no other file changes and qfai init --force is not run

# AC-0018-0024: Step 10 keeps decision records tracked
# Parent: US-0018-0009
# Source: discussion-20260923063306456#DAC-006-01
Scenario: The managed .gitignore block matches the installed package's
  Given a project whose managed .gitignore block negates the plural decision-record directory
  When step 10 runs
  Then the managed block equals the one the installed package writes
  And git check-ignore reports no path under .qfai/evidence/decision/

# AC-0018-0025: The skill runs the migration in order and says when there is nothing to do
# Parent: US-0018-0010
# Source: discussion-20260923063306456#DAC-006-01
Scenario: SKILL.md plans, previews, runs and keeps the reports
  Given the installed /qfai-migration-spec-to-story skill
  When an AI follows SKILL.md on a project on the spec-pack layout
  Then it writes the plan, runs each step with --dry-run and then without it, keeps every report as evidence, and runs qfai validate after step 10
  And on a project with nothing to migrate it reports that there is nothing to migrate

# AC-0018-0026: A migrated project validates
# Parent: US-0018-0010
# Source: discussion-20260923063306456#DAC-006-01
Scenario: The migrated fixture has no layout or chain error
  Given the old-layout fixture migrated by all ten steps, with every For a person item resolved
  When qfai validate runs on it
  Then it reports no layout error and no chain error
  And its test-obligation findings list every BF, AC and EX left without a test at its layer

# AC-0018-0027: The migration guide ships with the skill
# Parent: US-0018-0010
# Source: discussion-20260923063306456#DAC-006-01
Scenario: A person can read how to migrate before running the skill
  Given the package's shipped skills
  When a person opens the migration skill's references
  Then migration-guide.md is there, naming the release that brings the story tree as 2.0.0
  And it states that 2.x does not read the spec-pack layout: a project that keeps it stays on a pinned 1.x release, and a project that upgrades runs the migration first
```
