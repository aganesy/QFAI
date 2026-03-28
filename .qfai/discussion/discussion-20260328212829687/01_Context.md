# 01_Context

## Background

QFAI v1.8.0 focuses on enhancing Web research capabilities of CLI-launched AI coding agents. Current CLI agents (Claude Code, Codex CLI, Copilot CLI) have varying levels of built-in web research support, but lack a standardized, secure, and reproducible pipeline for search→fetch→extract→verify→cite workflows.

The input research report (SRC-0001) provides a comprehensive analysis of the current state, tools, and best practices for strengthening these capabilities, covering MCP integration, skill packaging, security hardening, observability, and evaluation.

## Purpose

Define and implement a standardized web research enhancement framework within QFAI that:
1. Establishes a reproducible research pipeline (search→rank→fetch→extract→sanitize→cache→verify→cite)
2. Integrates MCP servers (Brave Search, Firecrawl, Playwright) as modular tool components
3. Packages research procedures as reusable Skills (SKILL.md) with progressive disclosure
4. Hardens security through prompt injection defense, sandbox controls, and domain allowlisting
5. Enables observability via structured logging and evaluation harnesses
6. Supports human-in-the-loop review gates at critical decision points

## Stakeholders

| Role | Responsibility |
|------|---------------|
| QFAI Maintainers | Design, implement, and validate the web research enhancement framework |
| CLI Agent Users (Developers) | Consume the enhanced research capabilities via QFAI skills and configuration |
| Security Reviewers | Validate prompt injection defenses and sandbox configurations |
| QA Engineers | Design evaluation harnesses and golden task regression suites |

## Assumptions

- ASM-001: Users have Node 18+ or Docker available for MCP server execution
- ASM-002: API keys (Brave Search, Firecrawl) are managed outside QFAI via environment variables
- ASM-003: QFAI operates within CLI agent ecosystems that support MCP protocol
- ASM-004: Web content is treated as untrusted input by default
- ASM-005: Organizational network constraints (proxy, custom CA, mTLS) may apply

## Issues

- ISS-001: No standardized pipeline exists across CLI agents for web research
- ISS-002: Prompt injection via web content is a known high-risk attack vector (OWASP Top 10 for LLM)
- ISS-003: Web research quality varies significantly without reproducible skill definitions
- ISS-004: Observability gaps make debugging failed research workflows difficult
- ISS-005: Rate limiting and caching strategies are agent-specific, not standardized
