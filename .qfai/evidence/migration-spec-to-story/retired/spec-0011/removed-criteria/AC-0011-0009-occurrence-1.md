## AC-0011-0009: Simplified Handoff Schema

Given a finalized `prototype-handoff.yaml`, when `/qfai-implement` parses it, then only `finalIterIndex` (number), `finalArtifact` (path), `extractedDesignSystem` (path), and `implementationNotes` (string) fields are read. Legacy fields `mustPreserve`, `mayAdapt`, `mustNotCopy` are absent; their presence triggers a schema warning and is ignored.

