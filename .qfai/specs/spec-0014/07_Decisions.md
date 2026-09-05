# 07 Decisions

## Decisions

### DR-0014-0001

- Decision: verify depends on the canonical validator path only.

### DR-0014-0002

- Decision: removed compatibility surfaces remain removed.

### DR-0014-0003

- Decision: legacy validator slices may persist as artifact-specific checks without reintroducing a public prototyping runtime.

### DR-0014-0004

- Decision: the SaaS-package certify scope (REQ-0166, certify side) seals `completion-certificate.json` with `scope: "saas-package"` + an explicit `notes:` naming what was skipped, and MUST NOT claim full DONE.
- Governing references: the validate-side contract is CLI-VAL / DCON-005 per `_policies/05_Contracts.md` §CHG-006 and the `saas-package profile` glossary entry. REQ-0166 has no dedicated shared `DR-NNNN` (it is a straight spec'd MUST). DR-0274 is a sibling REQ-0167 (pack-location lint scope) decision and is intentionally NOT cited as governing here.
- Rationale: the lightweight delivery mode preserves the certify-scope discipline established in v1.9.1 — the certificate explicitly carries its reduced scope so downstream consumers can never mistake it for full completion. `--upgrade-scope full` is the only sanctioned path to full scope and only after the skipped gates land.
