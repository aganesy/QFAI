# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                           | Expected                                                                              |
| --------------- | --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| EX-0001-0235-01 | AC-0001-0235-01 | rg auth packages/                                                               | Denied before execution; CodeGraph operation suggested                                |
| EX-0001-0235-02 | AC-0001-0235-01 | grep -R policy .qfai/spec                                                       | Denied before execution; Graphify document operation suggested                        |
| EX-0001-0235-03 | AC-0001-0235-01 | git grep authorize; direct exploration                                          | Denied before execution                                                               |
| EX-0001-0235-04 | AC-0001-0235-01 | PowerShell Select-String over an exploratory project scope                      | Denied before execution                                                               |
| EX-0001-0235-05 | AC-0001-0235-01 | findstr over an exploratory project scope                                       | Denied before execution                                                               |
| EX-0001-0235-06 | AC-0001-0235-01 | Native Grep or equivalent host search event                                     | Denied through the supported pre-tool event                                           |
| EX-0001-0235-07 | AC-0001-0235-02 | rg auth packages/ piped to a formatter                                          | Denied; pipeline does not exempt search                                               |
| EX-0001-0235-08 | AC-0001-0235-02 | Supported wrapper invoking grep over the project                                | Wrapped direct search denied                                                          |
| EX-0001-0235-09 | AC-0001-0235-02 | pnpm test followed by rg auth packages/ in one command                          | Separate exploration denied despite the quality command                               |
| EX-0001-0235-10 | AC-0001-0235-02 | Print the quoted literal word grep without executing search                     | Allowed; incidental text is not an invocation                                         |
| EX-0001-0235-11 | AC-0001-0235-03 | Read an exact known file with cat or Get-Content                                | Known-file read allowed                                                               |
| EX-0001-0235-12 | AC-0001-0235-03 | Build, test or lint searches inside its ordinary implementation                 | Quality-check internals allowed                                                       |
| EX-0001-0235-13 | AC-0001-0235-03 | CodeGraph or Graphify searches inside its engine                                | Graph internals allowed                                                               |
| EX-0001-0235-14 | AC-0001-0235-03 | Arbitrary script, alias or continuing write_stdin hides search                  | Outside the proven event boundary; no universal blocking claim                        |
| EX-0001-0235-15 | AC-0001-0235-04 | Human approval; matching target, operation, worktree and session; before expiry | Only approved search permitted; approval reason retained                              |
| EX-0001-0235-16 | AC-0001-0235-04 | Matching approval after expiry                                                  | Search denied                                                                         |
| EX-0001-0235-17 | AC-0001-0235-04 | Approval for another path, operation, worktree or session                       | Search denied                                                                         |
| EX-0001-0235-18 | AC-0001-0235-04 | Agent-created exception or incomplete approval fields                           | Search denied; agent cannot approve its own exception                                 |
| EX-0001-0235-19 | AC-0001-0235-05 | Claude Code, Codex, Copilot CLI and VS Code configured separately               | Host-specific capability and trust reported; configuration alone is not runtime proof |
| EX-0001-0235-20 | AC-0001-0235-05 | Supported host; trust granted; deny and allow events actually exercised         | Only tested host, version and event set marked runtime-verified                       |
| EX-0001-0235-21 | AC-0001-0235-05 | Host has no usable pre-tool denial event                                        | unsupported reported; protection not claimed                                          |
| EX-0001-0235-22 | AC-0001-0235-06 | Invalid classifier or enforcement configuration                                 | failed reported; search not allowed; repair guidance provided                         |
| EX-0001-0235-23 | AC-0001-0235-06 | Ordinary denial hook invocation                                                 | No network, model call, graph rebuild or document processing                          |
| EX-0001-0235-24 | AC-0001-0235-06 | Existing reminder after graph denial configured                                 | Reminder exits 0; independent adapter uses its host denial protocol                   |
