---
category: universal
update-frequency: rare
dependencies: none
version: 1.1.0
---

# Deep Thinking and Analysis Process

Defines the thinking steps that apply universally. Do not proceed superficially; surface the essence and the risks.

## Basic Stance

- Always dig into "why". Clarify the purpose, the constraints and the completion criteria.
- Treat exceptions and edge cases on a par with the normal path.
- Keep the short-term and long-term trade-offs in mind, and assess the scope of impact.

## Perspectives for Analysis

- **Technical**: Implementation method, performance, extensibility, maintainability.
- **Business**: Use cases, value, operational impact.
- **UX**: Usability, accessibility, explainability.
- **Security**: Authentication/authorization, data protection, vulnerabilities.
- **Operations/reliability**: Logging/monitoring, error recovery, testability.

## Listing and Comparing Options

1. A standard implementation
2. A conservative option that prioritizes reducing risk
3. An innovative option with a larger improvement

- Compare the options on cost, risk, maintainability and performance, and state the reason for the recommendation.

## Removing Ambiguity

- List ambiguous terms and assumptions, and make them concrete through questions.
- Define measurable completion conditions (for example, screen elements, API responses and test perspectives).
- If you cannot reach 95% confidence, prioritize confirmation.

## What the stage records

`qfai-sdd`, which owns `.qfai/spec/decisions.md`, records a decision as one row
there. Every other stage records it in its own evidence file. Both use the
Approach form stated at the top of
`packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md`.
