---
category: project
update-frequency: frequent
dependencies:
  - 02_project/spec-driven-development.md
  - 02_project/development.md
  - 03_ai-agents/codex/best-practices.md
  - 03_ai-agents/copilot/best-practices.md
version: 1.0.0
---

# MCP (Model Context Protocol) Operations Guide

This guide lists where MCP helps speed up QFAI documentation, implementation and verification.

## Basic Policy

- To search, explore or investigate code and documents, follow
  `.agents/rules/graph-exploration.md` first: it chooses the project CodeGraph or
  Graphify CLI, and allows ordinary search for a known path or an engine that is
  not ready. The MCP servers below serve what that rule does not cover
- Use MCP to **read existing material and code accurately** where it helps
- **Do not include confidential information** in inputs used for analysis or specification
- Which servers are installed depends on the environment, so check with `list/get`

## MCP Servers (Representative Examples)

### `serena` (optional: semantic search and safe editing)

- Purpose: optional structural search and editing support, where it is installed
- Typical use: following up a graph CLI answer, for example a pattern in `core/validators`
- It does not replace the graph CLIs as the first engine for impact analysis

### `context7` (official documentation lookup)

- Purpose: check the official API of a dependency and avoid implementing from guesses
- Typical use: checking the configuration and behavior of `vitest` or `tsup`

### `markitdown` (PDF/Office to Markdown)

- Purpose: importing requirements material (preparing input for a discussion pack)
- Typical use: converting requirements to Markdown before specifying them

### `vibe-pdf-read` (PDF to image) + `ocr` (image to text)

- Purpose: reading scanned PDFs
- Typical use: OCR of requirements material that `markitdown` cannot handle

### `chrome-devtools` (browser runtime information)

- Purpose: checking how a UI or document renders (only when needed)

## Typical Recipes

### Recipe A: requirements material to a deliberation record

1. For a text PDF, convert it to Markdown with `markitdown`
2. For a scanned PDF, transcribe it with `vibe-pdf-read` then `ocr`
3. Cite it from the run's deliberation record, and use the record as the input
   to the spec.

### Recipe B: start an impact investigation with the code graph

- Ask the CodeGraph CLI how existing validators and parsers reference each other, as
  `.agents/rules/graph-exploration.md` states, and limit the scope of the change
- Serena, where installed, is an optional follow-up for a question the graph left open

### Recipe C: use Context7 to check a dependency's behavior

- Check the behavior of tsup, vitest, yaml and similar libraries in their official documentation
