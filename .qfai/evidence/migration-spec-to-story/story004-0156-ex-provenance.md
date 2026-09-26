# Example correction provenance

- Source: `.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0156/03_Example.md`, line 7 before correction
- Source SHA-256: `D061CA537D950B242E13966CD14086BCB91892B992404DB4FE28AE050BE0B3CB`
- Original row: `| EX-0001-0156-01 | AC-0001-0156-02 | Given a rejected option "inline SQL queries" When delta is updated | Then entry includes: DO NOT use inline SQL queries, Temptation: quick prototyping without ORM |`
- Disposition: The row concerns a rejected database implementation option, not SDD source preflight. Its example ID is reused for the corrected usable-source case under AC-0001-0156-01. EX-0001-0156-02 covers an incomplete but usable pack under AC-0001-0156-02. BR-0306 is the current authority.
