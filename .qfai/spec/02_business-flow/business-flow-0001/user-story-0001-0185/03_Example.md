# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                       | Expected                                                                                                |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| EX-0001-0185-01 | AC-0001-0185-01 | SKILL.md with frontmatter: `name: web-research, description: Standard web research, allowed-tools: [web_search, web_fetch]` | Agent reads only frontmatter (3 fields); full body not loaded until "research Node streams" task starts |
| EX-0001-0185-02 | AC-0001-0185-02 | 1. Create SKILL.md with invalid YAML. 2. Attempt load. 3. Verify error report. 4. Verify fallback behavior.                 | Parse error reported. Default behavior activated.                                                       |
