# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                       | Expected                                                                                                |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| EX-0001-0178-01 | AC-0001-0178-01 | SKILL.md with frontmatter: `name: web-research, description: Standard web research, allowed-tools: [web_search, web_fetch]` | Agent reads only frontmatter (3 fields); full body not loaded until "research Node streams" task starts |
| EX-0001-0178-02 | AC-0001-0178-02 | A SKILL.md with invalid YAML frontmatter, which the agent attempts to load                                                  | A parse error is reported and the default research behavior is activated                                |
