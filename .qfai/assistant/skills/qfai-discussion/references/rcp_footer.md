# RCP Footer (qfai-discussion / SSOT)

This document is the SSOT for fixing the Review Cycle of `/qfai-discussion` based on the “discussion-pack premise.”
It is not a shared convention for other skills.

---

## Review Target (Fixed)

- Scope: `discussion`
- Pack: `.qfai/discussion/discussion-<YYYYMMDDhhmmssSSS>/`
- Review targets (15 required files):
  - `01_Context.md`
  - `02_Inception-Deck.md`
  - `03_Story-Workshop.md`
  - `04_Sources.md`
  - `05_Scope.md`
  - `06_REQ.md`
  - `07_NFR.md`
  - `08_Glossary.md`
  - `09_Constraints.md`
  - `10_Policy.md`
  - `11_OQ-Register.md`
  - `12_OQ-Resolution-Log.md`
  - `13_Deferred.md`
  - `14_Review-Request.md`
  - `99_delta.md`

---

## Roster Execution Rule (Fixed)

- Roster reads `.qfai/assistant/steering/review-roster.yml`
- Each review returns `PASS` / `FAIL` / `N/A`
- `N/A` requires a reason satisfying `na_rule`
- If even one `FAIL` is returned, **immediately return to remediation** (do not proceed with subsequent reviews)
- After remediation, **create a new review cycle** and re-execute the roster from the beginning (skipping is prohibited)

---

## Validate Hard Gate (Required)

- Each review cycle must execute `qfai validate --fail-on error --format github`
- `.qfai/report/validate.log` must exist and correspond to the latest artifacts

---

## discussion-pack Specific Gates (Required)

The following are treated as **errors** by the validator, so they must be resolved before a `fixed` determination:

1. Naming (latest pack determination)

- Only `discussion-YYYYMMDDhhmmssSSS/` is allowed as a pack name
- If an invalid `discussion-*` exists, it will break the latest determination, so it must be relocated or deleted

2. Resolving blocking OQs

- There must be no OQs in `11_OQ-Register.md` where **Disposition remains `open`** and the Gate is `discuss|require|sdd`
- If keeping `open`, either **remove the Gate** or change to `Disposition: deferred/resolved`

3. Deferred consistency

- OQ-IDs set to `deferred` in the OQ register must have a corresponding entry with the same OQ-ID in `13_Deferred.md`

4. Story Workshop Mermaid (minimum requirement)

- `03_Story-Workshop.md` must contain at least one mermaid fenced block
  - `flowchart` or `sequenceDiagram` is recommended

---

## Review Perspectives (discussion-pack specific)

- Whether the causal chain from Context -> Inception Deck -> Story Workshop is coherent
  - “Why build it” -> “For whom” -> “What business flow” must not contradict each other
- Whether the boundary between `06_REQ.md` and `07_NFR.md` is maintained
- Whether Glossary/Constraints/Policy are at a granularity that can serve as input for decision-making (downstream design/implementation), not just bullet-point lists
- Whether `99_delta.md` contains a “deliberation log (adopted/rejected/criteria)” rather than just an “update history”

---

## Common FAILs and Recovery (discussion-pack specific)

- FAIL: open+Gate entries remain in `11_OQ-Register.md`
  - Recovery: For high-impact items, set `Disposition: deferred` and move details to `13_Deferred.md`
- FAIL: No diagram in `03_Story-Workshop.md`
  - Recovery: Include at least one flowchart showing personas and key decision branches
- FAIL: Invalid pack name (causes latest determination to be unreliable)
  - Recovery: Relocate the invalid pack to `discussion-legacy-*` and recreate the latest pack with timestamp naming
