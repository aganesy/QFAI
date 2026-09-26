## BR-0011-0007: Handoff Schema Closed Field Set

- AC-Refs: AC-0011-0009

- `prototype-handoff.yaml` MUST expose exactly `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes`.
- Legacy fields `mustPreserve` / `mayAdapt` / `mustNotCopy` MUST NOT be relied on by `/qfai-implement` and MUST surface as schema warnings if encountered.

