## EX-0011-0008: Simplified Handoff Parse

- BR-Ref: BR-0011-0007
- Given a `prototype-handoff.yaml` containing only `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes`
- When `/qfai-implement` parses the handoff
- Then no errors occur and no legacy field reads are attempted; if a legacy `mustPreserve` field is present, a schema warning is emitted and the field is ignored

