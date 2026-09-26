# Acceptance Criteria

## Criteria

```gherkin
Feature: Install or upgrade and get the free-text entry

# AC-0001-0203-01
# Parent: US-0001-0203
Scenario: Init and upgrade install the entry skills and their host links
  Given a fresh project, or a project an earlier release installed without `qfai-run` and `qfai-maintain`
  When `qfai init` runs
  Then `qfai-run` and `qfai-maintain` are under `.qfai/assistant/skill/`
  And each host skills directory links them to that one source
  And every stage skill a built-in plan names has its `references/orchestrated-mode.md`
  And no plan file and no workflow schema file is written into the project
  And on an upgrade every other skill directory is left as it was

# AC-0001-0203-02
# Parent: US-0001-0203
Scenario: Init writes no `agents/openai.yaml`
  Given a fresh project
  When `qfai init` runs, and again with `--force`
  Then no skill directory reached through a host skills directory contains `agents/openai.yaml`

# AC-0001-0203-03
# Parent: US-0001-0203
Scenario: The entry directive is prepended to `AGENTS.md` and `CLAUDE.md`
  Given a project whose `AGENTS.md` and `CLAUDE.md` carry no operative entry directive
  When `qfai init` runs
  Then each of the two files begins with one directive that sends a first free-text change request to `qfai-run`
  And the project's existing text and line endings follow it unchanged
  And `.github/copilot-instructions.md` carries no such directive
  And the directive is added whether or not `REVIEW.md` exists
  And a rerun adds nothing
  And the shipped Markdown lint accepts the directive above the level-1 heading of the seeded files

# AC-0001-0203-04
# Parent: US-0001-0203
Scenario: Init names the mode in force and writes no mode key
  Given a fresh install, or an upgrade over a configuration with or without a `workflow.mode` key
  When `qfai init` runs
  Then `qfai.config.yaml` gains no `workflow` key and no mode question is asked
  And the summary has one line naming the mode in force, which is `active` when the key is absent
  And a value other than `active`, `shadow` or `off` is named as invalid on that line
  And the exit code is the one the run has without the line

# AC-0001-0203-05
# Parent: US-0001-0203
Scenario: An invalid `workflow.mode` is a configuration issue
  Given `qfai.config.yaml` whose `workflow.mode` is a value other than `active`, `shadow` or `off`
  When `qfai validate` runs
  Then it reports `QFAI_CONFIG_INVALID` at severity error, with an English message naming the key and the three values
  And an absent key, or one of the three values, raises no such issue

# AC-0001-0203-06
# Parent: US-0001-0203
Scenario: Init and upgrade behave the same on Windows
  Given a project checked out with CRLF line endings under a root whose name contains a space
  When `qfai init` runs, then a plain upgrade
  Then both runs exit 0 with the same summary and tree as on Linux
  And an unmodified shipped file with CRLF endings counts as unmodified
  And every key of the provenance lock is a slash-separated relative path

# AC-0001-0203-07
# Parent: US-0001-0203
Scenario: A plain upgrade counts the skills it skipped
  Given a project whose copies of some shipped skills differ from the templates, ignoring line endings
  When a plain `qfai init` runs
  Then those skills are unchanged
  And the summary counts them and names `qfai init --force` as the command that updates them
  And it says that command replaces them with the shipped versions, overwriting local edits
  And under `--force` no count is printed, because that run replaces them
```
