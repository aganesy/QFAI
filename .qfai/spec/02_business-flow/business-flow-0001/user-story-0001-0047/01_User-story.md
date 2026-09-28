# US-0001-0047: Deprecated assistant paths and skill project memory

## User Story

As an adopter migrating off the legacy layout, I want `qfai validate` to emit `D-DEPRECATED-PATH` naming the sunset release when it finds `.qfai/assistant/steering/`, and to warn when a `qfai-*` SKILL.md declares a `project_memory:` YAML block that is not its last content, so that read paths are explicit and the deprecation timeline is unambiguous.
