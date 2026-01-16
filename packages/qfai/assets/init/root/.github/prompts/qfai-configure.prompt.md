---
agent: 'agent'
description: 'QFAI: Configure qfai.config.yaml based on the repository'
---

You are operating in a repository that uses QFAI.

1) Open and follow the canonical QFAI prompt:
- .qfai/assistant/prompts/qfai-configure.md

2) Use the repository as the source of truth (tools, frameworks, directory structure).
3) Ask the user for missing inputs only when necessary.
4) Do not modify files not required by the canonical prompt.
5) All outputs must match the user's language.

User notes: ${input:notes:Optional}
