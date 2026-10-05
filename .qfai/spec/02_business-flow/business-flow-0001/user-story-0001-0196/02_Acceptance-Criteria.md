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
  Scenario: Init writes no line that sends a request to `qfai-run` into `AGENTS.md` or `CLAUDE.md`
    Given a fresh project, or a project whose `AGENTS.md` and `CLAUDE.md` exist
    When `qfai init` runs
    Then the seeded files open with their heading and carry no line that sends a request to `qfai-run`
    And an existing file gains no such line, and its text and line endings are kept
    And a line an earlier init wrote is kept as written, once, and is never removed or edited
    And `.github/copilot-instructions.md` carries no such line
    And the review directive is still prepended, only where `REVIEW.md` exists
    And a rerun adds nothing
    And the shipped Markdown lint accepts a directive above the level-1 heading

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
    Then it reports `QFAI_CONFIG_INVALID` at severity error, with an English message naming the key and the three values
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
  Scenario: Every prompt restates that a request naming no skill goes to `qfai-run`
    Given a fresh project, or a project with its own `.claude/settings.json` or `.codex/hooks.json`
    When `qfai init` runs
    Then Claude Code and Codex each run, on every prompt, a hook that sends a request naming no skill to `qfai-run`
    And Codex also runs the structured-question reminder on every prompt
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
    And the API-budget reminder fires only for a shell command that names the forge's CLI or its API host
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
```
