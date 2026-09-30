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

- First use MCP to **read existing material and code accurately**
- **Do not include confidential information** in inputs used for analysis or specification
- Which servers are installed depends on the environment, so check with `list/get`

## MCP Servers (Representative Examples)

### `serena` (semantic search and safe editing)

- Purpose: structural search of existing code and documents, and editing support
- Typical use: finding existing patterns in `core/validators` and understanding the impact of a change

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

### Recipe A: requirements material to a discussion pack

1. For a text PDF, convert it to Markdown with `markitdown`
2. For a scanned PDF, transcribe it with `vibe-pdf-read` then `ocr`
3. Save it under `.qfai/discussion/` as a source of the pack, and use the pack
   as the input to the spec.

### Recipe B: start an impact investigation with Serena

- Understand how existing validators and parsers reference each other, and limit the scope of the change

### Recipe C: use Context7 to check a dependency's behavior

- Check the behavior of tsup, vitest, yaml and similar libraries in their official documentation
