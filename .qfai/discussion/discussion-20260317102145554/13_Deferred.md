# Deferred Items

| OQ-ID | Title | Gate | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| OQ-0004 | Sub-agent roster formalization | discussion | Too early; skill body description sufficient for v1.6.0 structural migration | v1.6.2 planning phase | agent | v1.6.2 | low | implementation — sub-agent behavior is guided by skill body text, not enforced by roster | Skill body contains role descriptions; behavior is soft-enforced | SRC-0001 §7 |
| OQ-0006 | TC coverage hardening | discussion | Not needed for structural migration goal; validator Phase 1 covers structure only | v1.6.1 planning phase | agent | v1.6.1 | medium | tests — coverage gaps may exist but structure is validated | Phase 1 validator ensures structural integrity; coverage checked manually | SRC-0001 §6.3 |
| OQ-0007 | Exception DR-ID enforcement | discussion | Requires decision record infrastructure not yet hardened | v1.6.1 planning phase | agent | v1.6.1 | medium | implementation — exception items in test-list may lack DR-ID traceability | DR-ID column exists in template; enforcement is documentation-based until hardened | SRC-0001 §6.3 |
