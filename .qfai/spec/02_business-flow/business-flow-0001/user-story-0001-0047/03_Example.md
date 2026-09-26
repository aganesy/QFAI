# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                     | Expected                                                                                                                                                                                                                              |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0047-01 | AC-0001-0047-01 | Given a project carrying legacy layout in v1.9.x When `qfai validate` runs                                | Then `D-DEPRECATED-PATH` warning body matches `/sunset: v1\.10\.0/`; ambiguous phrasing like "future release" is absent                                                                                                               |
| EX-0001-0047-02 | AC-0001-0047-02 | Given `qfai-implement/SKILL.md` without a trailing `project_memory:` YAML block When `qfai validate` runs | Then `W-SKILL-PROJECT-MEMORY` is raised at warning naming `qfai-implement` and the missing `project_memory:` block And a trailing `project_memory:` block holding a list with no `reads:` or `writes:` sub-key raises no such warning |
