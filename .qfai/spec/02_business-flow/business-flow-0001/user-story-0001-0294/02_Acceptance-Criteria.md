# Acceptance Criteria

## Criteria

```gherkin
Feature: Review a finished session from its local transcript
  # AC-0001-0294-01
  Scenario: The command finds the project's own transcripts
    Given Claude Code or Codex kept a transcript of a session run in the project root
    When `qfai session-review` runs in that root
    Then it finds the Claude Code transcript in the project directory named after the root, under the configured Claude Code home, and falls back to the transcript whose recorded working directory is the root
    And it finds the Codex transcript under the configured Codex home whose session record names the root as its working directory

  # AC-0001-0294-02
  Scenario: The user chooses the session and where the report goes
    Given transcripts of several sessions
    When the command runs with no selection, with `--agent`, with `--session` or with `--since`
    Then it reports the session of each chosen agent whose transcript changed last, the named session, or every session whose transcript changed since the instant given
    And the report goes to standard output as Markdown, or as JSON with `--format json`, unless `--out` names a file, and the command writes nothing else
    And a named session no transcript holds, `--session` with `--since`, or a `--since` that is not an ISO 8601 date or zoned date and time is a usage error, while finding no session is a notice that exits 0
    And a transcript, the project's reminder file or the `--out` file that is there but cannot be read or written ends the run with exit 1

  # AC-0001-0294-03
  Scenario: The report counts what the session shows
    Given a transcript of a session that used QFAI
    When the command reports it
    Then it counts the QFAI hook reminders shown, per reminder; the files read under the agent rule and skill directories and `.qfai/assistant/`, with repeats and result bytes; the tool errors per tool, with the QFAI finding codes they carry; the `qfai` commands run, with their exit status; and the structured-question items asked
    And it lists each typed user turn that matches a fixed word list, by turn number and matched word
    And a line that is not a JSON record is skipped and counted

  # AC-0001-0294-04
  Scenario: The report holds counts and matched words only
    Given a transcript holding message text, secrets and local paths
    When the command reports it
    Then the report holds no message text, snippet or tool output, only counts, repository-relative paths, tool names, finding codes, command names and the matched words
    And every string it emits passes a fixed redaction set, with the home directory written as `~` and the project root as `<root>`
    And the command opens no network connection

  # AC-0001-0294-05
  Scenario: The same transcripts give the same bytes
    Given the same transcripts
    When the command runs twice, whatever order the file system lists them in
    Then both reports are byte-identical, sorted, and carry no wall-clock time

  # AC-0001-0294-06
  Scenario: The session review turns the report into proposals the user approves
    Given the agent follows `.agents/rules/session-feedback.md` at the end of the run
    When it reviews the session
    Then it runs `npx qfai session-review --agent <host>` once for the host it runs on and treats the report as evidence, discarding a report of a session it does not recognise
    And where the command is missing, fails or finds no transcript, it reviews the session itself
    And each proposal is one item added to the `<name>.local.md` overlay beside a shipped rule, naming that file, the item, its key terms verbatim and the report lines that support it, and no proposal replaces a rule's item or names any other file of the project
    And a change to a file QFAI ships becomes an issue draft, and a change to the spec tree is left to `qfai-sdd`
    And an item is added only after the user approves it, asked as `user-questions.md` sets out, and the files changed are listed in one line and left uncommitted
    And under a no-question mode the proposals are listed in the final report and none is added
    And the entry points `qfai init` writes tell the agent to read a rule's overlay with the rule
```
