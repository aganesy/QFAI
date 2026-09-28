# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                            | Expected                                                                                                                                                                             |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0047-01 | AC-0001-0047-01 | A project carrying legacy layout in v1.9.x, when `qfai validate` runs                                            | `D-DEPRECATED-PATH` warning body matches `/sunset: v1\.10\.0/`; ambiguous phrasing like "future release" is absent                                                                   |
| EX-0001-0047-02 | AC-0001-0047-02 | `qfai-implement/SKILL.md` whose `project_memory:` YAML block is followed by a heading, when `qfai validate` runs | `W-SKILL-PROJECT-MEMORY` is raised at warning naming `qfai-implement`; the same block moved to the end, holding a list with no `reads:` or `writes:` sub-key, raises no such warning |
