# Acceptance Criteria

## Criteria

```gherkin
Feature: Install or upgrade and get the free-text entry
  # AC-0001-0196-01
  Scenario: Init and upgrade install the entry skills and their host links
    Given a fresh project, or a project an earlier release installed without `qfai-run` and `qfai-maintain`
    When `qfai init` runs
    Then `qfai-run` and `qfai-maintain` are under `.qfai/assistant/skill/`
    And each host skills directory links them to that one source
    And every step a built-in plan names is under `.qfai/assistant/step/`
    And no plan file and no workflow schema file is written into the project
    And on an upgrade every other skill directory is left as it was
    And no host skills or agents directory, no `.github/copilot-instructions.md` and no directory the `--force` wrapper prune reads is written or pruned when it is, or sits under, a symbolic link or a path that is not a directory, and init names the skipped path and carries on
    And `.agents/rules` and `.github/instructions` are outside that check

  # AC-0001-0196-02
  Scenario: Init writes no `agents/openai.yaml`
    Given a fresh project
    When `qfai init` runs, and again with `--force`
    Then no skill directory reached through a host skills directory contains `agents/openai.yaml`

  # AC-0001-0196-03
  Scenario: Init writes no line that sends a request to `qfai-run` into `AGENTS.md`
    Given a fresh project, or a project whose `AGENTS.md` exists
    When `qfai init` runs
    Then the seeded files open with their heading and carry no line that sends a request to `qfai-run`
    And an existing file gains no such line, and its text and line endings are kept
    And a line an earlier init wrote is kept as written, once, and is never removed or edited
    And `.github/copilot-instructions.md` carries no such line
    And the review directive is still prepended, only where `REVIEW.md` exists
    And a rerun adds nothing
    And the shipped Markdown lint accepts a directive above the level-1 heading
    And the summary has one line, whether or not `CLAUDE.md` exists, saying init does not write `CLAUDE.md` and that a project with one adds `@AGENTS.md` to it

  # AC-0001-0196-04
  Scenario: Init names the mode in force and writes no mode key
    Given a fresh install, or an upgrade over a configuration with or without a `workflow.mode` key
    When `qfai init` runs
    Then `qfai.config.yaml` gains no `workflow` key and no mode question is asked
    And the summary has one line naming the mode in force, which is `active` when the key is absent
    And a value other than `active`, `shadow` or `off` is named as invalid on that line
    And the exit code is the one the run has without the line

  # AC-0001-0196-05
  Scenario: An invalid `workflow.mode` is a configuration issue
    Given `qfai.config.yaml` whose `workflow.mode` is a value other than `active`, `shadow` or `off`
    When `qfai validate` runs
    Then it reports `QFAI-CFG-002` at severity error, with an English message naming the key and the three values
    And an absent key, or one of the three values, raises no such issue

  # AC-0001-0196-06
  Scenario: Init and upgrade behave the same on Windows
    Given a project checked out with CRLF line endings under a root whose name contains a space
    When `qfai init` runs, then a plain upgrade
    Then both runs exit 0 with the same summary and tree as on Linux
    And a managed `.gitignore` block with CRLF endings is replaced rather than duplicated

  # AC-0001-0196-08
  Scenario: Steps are installed with the assistant tree and linked into no host
    Given a fresh project, and a project whose shipped steps an earlier install wrote
    When `qfai init` runs, and again with `--force`
    Then every shipped step is at `.qfai/assistant/step/<name>/STEP.md`, one directory level under `step/`
    And no step directory holds a `SKILL.md`, and no host skills directory holds an entry for a step
    And a plain upgrade leaves a step whose copy differs from the shipped one as it is, and `--force` replaces it, as for a shipped skill

  # AC-0001-0196-11
  Scenario: User prompts restate when a new request naming no skill goes to `qfai-run`
    Given a fresh project, or a project with its own `.claude/settings.json` or `.codex/hooks.json`
    When `qfai init` runs
    Then both hosts install the free-text entry reminder for a new request naming no skill
    And Claude Code skips prompts with a line opening with `<task-notification>`, `<wake>`, `<ci-monitor-event>` or `[SYSTEM NOTIFICATION`, and prints the reminder for any other prompt or input it cannot read
    And Codex has no notification filter, so every prompt is eligible for the free-text entry reminder
    And eligible free-text entry and structured-question invocations print the message on the first invocation of a session, optional agent and message key, and nothing on later ones
    And Claude notification exclusions run before counting; skipped notifications do not consume the first full message
    And missing session identity or counter-storage failure prints the message on every prompt and exits 0
    And the free-text entry message distinguishes new requests that need planning from pending answers or requested operation results that resume the same step
    And Codex also runs the structured-question reminder on every prompt
    And the question message names `.agents/rules/user-questions.md` and asks only when the next step requires the user's answer; that rule says background waiting and completion-only reports need no question
    And a waiting report gives the current state, awaited evidence or result and resume condition without promising unsupported automatic restart
    And dismissal or no response grants no answer or permission; an already delegated routine choice may continue under that prior authorization
    And hard-required facts, mandatory approvals outside that authorization, cancellation and explicit tool blocks remain protected
    And requested free-text values resume the waiting step, independent instructions need a new plan, mixed replies are split, and unrelated instructions imply no option selection or approval
    And each Codex hook is one line that prints the same through `sh`, `cmd.exe` and PowerShell
    And an existing Codex hook file keeps the project's groups and gains only the ones it lacks, as the Claude Code settings file does
    And a file with a shape init cannot read is left unchanged, with a warning
    And a hook file reached through a symbolic link is neither read nor written, with a warning
    And when init writes or adds Codex hooks, the summary says in one line that Codex runs them only after they are reviewed and trusted with `/hooks`
    And `--dry-run` writes no hook file and prints no such line
    And a hook that cannot find its message prints nothing and exits 0

  # AC-0001-0196-12
  Scenario: Codex runs the tool-time reminders at the tool calls it has
    Given a fresh project, or a project whose `.codex/hooks.json` holds only the prompt-time reminders
    When `qfai init` runs
    Then Codex runs each tool-time reminder Claude Code runs at the Codex tool call for the same moment, with the same marker and message
    And the documentation-clarity reminder after a write fires only for a patch that adds or changes a Markdown file
    And the minimal-implementation reminder after a write fires only for a file that is product source: not a test, a file under `tmp/`, a document, a configuration file or a file outside the project
    And the API-budget reminder fires only for a shell command that runs a network client: `gh`, `curl`, `wget`, `Invoke-WebRequest`, `Invoke-RestMethod`, `iwr` or `irm`
    And in each host that supports their event, the API-budget, three grilling, minimal-implementation and three documentation-clarity keys print the full message on their first eligible invocation and nothing on any later invocation, using the existing counter for each session, optional agent and key
    And every full reminder in the catalog is one or two sentences under 500 characters that names what it points at and the action it asks for
    And no reminder has a shorter form for later calls, and a reminder that asks for its rule or skill to be read asks for it once per session
    And command filters run before counting, so a skipped call consumes no first display
    And a new session, agent or key starts its own sequence; missing session identity or counter-storage failure prints the full message and exits 0
    And the documentation-clarity reminder before a post prints on the first eligible post of a session, apart from the editing reminders, and the hook envelopes and exit behavior stay unchanged
    And no compaction event resets the counter, and the counters imply no active run, completion, approval or routing
    And the reminder before leaving plan mode has no Codex group, because Codex has no tool call that leaves plan mode
    And each runs under every shell as the prompt-time reminders do
    And an existing file gains the tool-time groups once, and a second run changes nothing

  # AC-0001-0196-13
  Scenario: Init allows the shipped skills and the launcher to run without a prompt
    Given a fresh project, or a project with its own `.claude/settings.json`
    When `qfai init` runs
    Then `.claude/settings.json` lists under `permissions.allow` one `Skill(<name>)` entry for each shipped skill and the launcher entries `Bash(npx qfai:*)`, `Bash(yarn exec qfai:*)` and `Bash(yarn qfai:*)`
    And the list holds no wildcard skill pattern
    And an existing file keeps its own entries in their order and gains only the missing ones, and no other key of `permissions` changes
    And a `permissions` value init cannot read leaves the file unchanged, with a warning
    And a second run changes nothing

  # AC-0001-0196-14
  Scenario: Every prompt says when this checkout has no qfai install
    Given a project whose `.claude/settings.json` and `.codex/hooks.json` init wrote
    When a prompt arrives and no directory from the project up to its git root holds `node_modules/.bin/qfai`, or `.pnp.cjs` beside a `package.json` that lists `qfai`
    Then both hosts print the remedy: run the project's install command when `package.json` lists qfai, and `npm i -D qfai` when it does not
    And a project with a launcher in its own checkout, or below a git root that holds one, prints nothing
    And a launcher in a directory above the git root does not count
    And each Codex line prints the same through `sh`, `cmd.exe` and PowerShell

  # AC-0001-0196-15
  Scenario: Init seeds a union merge for the two registers
    Given a fresh project with no `.gitattributes`
    When `qfai init` runs
    Then `.gitattributes` sets `merge=union` on `.qfai/spec/decisions.md` and `.qfai/spec/open-questions.md`, and on no other path
    And an existing `.gitattributes` is left as it is

  # AC-0001-0196-16
  Scenario: Init generates a preparation entry without operating the environment
    Given a fresh project or an upgrade with an edited assistant-tree entry
    When `qfai init` runs normally, with `--force` or with `--dry-run`
    Then it supplies `.qfai/assistant/skill/qfai-run/scripts/codex-cloud-install.mjs` and supported setup instructions through the existing assistant-tree rules
    And the plain upgrade keeps project edits, the forced upgrade uses the existing replacement rules and the dry run writes nothing
    And no run executes installation, configures a host or publishes an environment
    And no generic SessionStart installation group is added

  # AC-0001-0196-17
  Scenario: Explicit native preparation gates planning in the intended checkout
    Given covered authority for the project-declared command and its lifecycle scripts
    When the generated entry is invoked as `node .qfai/assistant/skill/qfai-run/scripts/codex-cloud-install.mjs --cwd <absolute-checkout> -- <executable> [argument...]`
    Then it requires the explicit absolute intended-checkout cwd, separator and native executable, refusing missing or malformed inputs and unknown options before spawning
    And the executable receives its separate argv at that cwd without shell or Markdown parsing, manager inference or a substituted install command
    And successful installation requires the existing canonical launcher proof in that same checkout, including the existing declared-qfai PnP confirmation where applicable
    And unavailable tools, spawn errors, signals, nonzero installation, observed timeout and unavailable or failed canonical proof retain the actual failure reason and block dependent planning
    And a pre-existing launcher cannot erase an install failure and no remote, cached or parent-checkout launcher replaces the target proof
    And only successful installation and canonical proof permit an exit-0 preparation result
    And the entry starts no plan, while the Start skill checks preparation and canonical proof before dependent planning without an implied retry
    And missing covered authority stops execution under the existing rules, and readiness proves neither global validation nor formal workflow completion

  # AC-0001-0196-18
  Scenario: Setup guidance keeps lifecycle, evidence and trust boundaries explicit
    Given generated preparation assets and native CI receipts without actual Cloud setup receipts
    When the operator follows the setup guidance or reports preparation evidence
    Then current support for the environment-owned Install script and Start skill is checked before real configuration
    And saving configuration, preparing and publishing a filesystem for new tasks, refresh without rerunning installation or startup, and existing tasks keeping their own state remain distinct
    And generation, actual controlled native CI and actual Cloud configuration, publication or task execution are separate proof scopes
    And native CI exercises the actual generated entry and records its actual command, argv, cwd and exit or signal and canonical outcome without exposing secrets
    And fixture success cannot prove actual host startup, which remains unobserved without its own receipts
    And existing reminder-only exit-0 behavior, user-edited hook merges, linked-path and unreadable-file handling, review and trust guidance and all command, network, secret and publication authority remain unchanged

  # AC-0001-0196-19
  Scenario: Init asks for an agent restart after it changes skill or hook text
    Given a fresh project, or an installed project whose skill, Codex agent profile, rule master, agent entry point or hook file differs from this release's or is missing
    When `qfai init` runs, with or without `--force`, or with `--dry-run`
    Then a run that wrote a skill, step, agent or rule file of the assistant tree, a Codex agent profile, a rule master that it created or that `--force` overwrote, an agent entry point it rewrote or a hook file prints one line asking to restart any running agent session
    And `.agents/rules/reminders.json` does not count, because the hooks read it on every prompt
    And a dry run, and a run that changed none of those files, print no such line
```
