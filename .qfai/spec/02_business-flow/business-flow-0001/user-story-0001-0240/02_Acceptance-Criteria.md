# Acceptance Criteria

## Criteria

```gherkin
Feature: Review a finished session from its local transcript
  # AC-0001-0240-01
  Scenario: The command finds the project's own transcripts
    Given Claude Code or Codex kept a transcript of a session run in the project root
    When `qfai session-review` runs in that root
    Then it finds the Claude Code transcript in the project directory named after the root, under the configured Claude Code home, and falls back to the transcript whose recorded working directory is the root
    And it finds the Codex transcript under the configured Codex home whose session record names the root as its working directory

  # AC-0001-0240-02
  Scenario: The user chooses the session and where the report goes
    Given transcripts of several sessions
    When the command runs with no selection, with `--agent`, with `--session` or with `--since`
    Then it reports the latest session of each chosen agent, the named session, or every session since the date
    And the report goes to standard output unless `--out` names a file, and the command writes nothing else
    And a named session no transcript holds, or `--session` with `--since`, is a usage error, while finding no transcript at all is a notice that exits 0

  # AC-0001-0240-03
  Scenario: The report counts what the session shows
    Given a transcript of a session that used QFAI
    When the command reports it
    Then it counts the QFAI hook reminders shown, per reminder; the QFAI rule, skill and step files read, with repeats and result bytes; the tool errors per tool, with the QFAI finding codes they carry; the `qfai` commands run, with their exit status; and the structured-question items asked
    And it lists each typed user turn that matches a fixed word list, by turn number and matched word
    And a line that is not a JSON record is skipped and counted

  # AC-0001-0240-04
  Scenario: The report holds counts and matched words only
    Given a transcript holding message text, secrets and local paths
    When the command reports it
    Then the report holds no message text, snippet or tool output, only counts, repository-relative paths, tool names, finding codes, command names and the matched words
    And every string it emits passes a fixed redaction set, with the home directory written as `~` and the project root as `<root>`
    And the command opens no network connection

  # AC-0001-0240-05
  Scenario: The same transcripts give the same bytes
    Given the same transcripts
    When the command runs twice, whatever order the file system lists them in
    Then both reports are byte-identical, sorted, and carry no wall-clock time

  # AC-0001-0240-06
  Scenario: The session review turns the report into proposals the user approves
    Given the agent follows `.agents/rules/session-feedback.md` at the end of the run
    When it reviews the session
    Then it runs `npx qfai session-review` once and treats the report as evidence
    And each proposal is one itemised change naming its target file, the one item added or replaced, its key terms verbatim and the report lines that support it
    And a change to a file the adopter owns is applied only after the user approves it in one multi-select question, while a change to a file QFAI ships becomes an issue draft
    And under a no-question mode the proposals are listed in the final report and none is applied
```
