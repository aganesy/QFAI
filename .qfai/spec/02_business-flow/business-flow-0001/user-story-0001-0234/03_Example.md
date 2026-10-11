# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                          | Expected                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| EX-0001-0234-01 | AC-0001-0234-01 | Callers and blast radius of a named function                                   | CodeGraph structure exploration first; Graphify not invoked                       |
| EX-0001-0234-02 | AC-0001-0234-01 | Exact source path returned by CodeGraph                                        | Known-file read allowed without another graph query                               |
| EX-0001-0234-03 | AC-0001-0234-02 | Relationship between a requirement and an ADR                                  | Graphify document exploration first; CodeGraph not invoked                        |
| EX-0001-0234-04 | AC-0001-0234-02 | Code question fully answered by CodeGraph                                      | No second engine, Graphify watcher or permanent sync                              |
| EX-0001-0234-05 | AC-0001-0234-02 | Document answer leaves a specific unresolved code relationship                 | CodeGraph queried only for that unresolved relationship                           |
| EX-0001-0234-06 | AC-0001-0234-02 | Code answer leaves a specific unresolved requirement rationale                 | Graphify queried only for that unresolved rationale                               |
| EX-0001-0234-07 | AC-0001-0234-03 | No selected backend; ambient API key present                                   | documents-not-ready; no provider selection or document transmission               |
| EX-0001-0234-08 | AC-0001-0234-03 | Explicit compatible local backend                                              | Document processing stays local with the selected settings                        |
| EX-0001-0234-09 | AC-0001-0234-03 | Explicitly authorized external destination and document scope                  | Only selected destination and scope used; no implicit paid or external processing |
| EX-0001-0234-10 | AC-0001-0234-03 | Code-only Graphify operation; document backend absent                          | Local code analysis may run; document readiness not claimed                       |
| EX-0001-0234-11 | AC-0001-0234-04 | Completed graph; current document scope and processing compatibility confirmed | Query allowed; no backend or model call required                                  |
| EX-0001-0234-12 | AC-0001-0234-04 | Changed document; required backend absent                                      | Changed scope documents-not-ready; processing configuration required              |
| EX-0001-0234-13 | AC-0001-0234-05 | Unsupported language or unreadable document                                    | Unsupported or unparsed scope named separately from no matches                    |
| EX-0001-0234-14 | AC-0001-0234-05 | Inferred document relationship; source references available                    | Inference labeled; source facts retain their locations                            |
| EX-0001-0234-15 | AC-0001-0234-06 | Required graph or index missing                                                | Prepare analysis; no automatic grep, rg or native-search fallback                 |
| EX-0001-0234-16 | AC-0001-0234-06 | Graph process fails during a query                                             | Failure and recovery reported; no raw search performed                            |
