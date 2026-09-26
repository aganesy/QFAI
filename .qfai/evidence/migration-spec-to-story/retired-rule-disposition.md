# P7 retired rule disposition

This register accounts for old business rules that must not become active rules in
`03_contract/`. Their original text remains in the archived
`04_Business-Rules.md` files. The migration plan excludes all 36 IDs. Step 7 is
expected to list them under `## For a person` and exit 3; the P7 resolution
record will link the actual report lines to these rows. An unplaced active rule
is a separate blocking finding.

| Old rule | Disposition and authority | Successor | Archived source after P7 | Step 7 report |
| --- | --- | --- | --- | --- |
| BR-0001-0001 | Retired with the spec-pack required file set (`spec-0001/09_delta.md`, P7 REMOVE) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:78` |
| BR-0001-0002 | Retired with the `_policies` required file set (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:79` |
| BR-0001-0003 | Retired with the CAP-to-spec edge (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:80` |
| BR-0001-0004 | Retired with spec-pack layout detection (same REMOVE row, user decision Q3) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:81` |
| BR-0001-0005 | Retired with spec-pack layout precedence (same REMOVE row, user decision Q3) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:82` |
| BR-0001-0006 | Retired with the old per-spec ID format (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:83` |
| BR-0001-0010 | Retired with the AC-to-TC edge (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:84` |
| BR-0001-0011 | Retired with the old BR-to-EX edge (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:85` |
| BR-0001-0012 | Retired with the EX-to-TC edge (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:86` |
| BR-0001-0013 | Retired with the `01_Spec`-to-CAP edge (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:87` |
| BR-0001-0014 | Retired with the `_policies` reference-direction check (same REMOVE row, user decision Q3) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:88` |
| BR-0001-0015 | Retired with the `_policies` reference-direction check (same REMOVE row, user decision Q3) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:89` |
| BR-0001-0016 | Retired with the `01_Spec` escalation hook (same REMOVE row) | No one-to-one successor | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:90` |
| BR-0001-0020 | Retired with the fixed nine-skill catalog (`spec-0001/09_delta.md`, P7 REMOVE) | Package skill inventory and `cli/assistant-routing.md`; no new BR ID | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:91` |
| BR-0001-0022 | Retired with the absent TDD skill catalog entries (same REMOVE row) | Package skill inventory and `cli/assistant-routing.md`; no new BR ID | `retired/spec-0001/04_Business-Rules.md` | `step07-real.txt:92` |
| BR-0003-0018 | Retired with the old migration memo and guard exception (`spec-0003/09_delta.md`, P6 REMOVE) | No one-to-one successor | `retired/spec-0003/04_Business-Rules.md` | `step07-real.txt:95` |
| BR-0011-0002 | Retired with the forward-only ledger lifecycle (`spec-0011/09_delta.md`, P7 REMOVE) | No one-to-one successor | `retired/spec-0011/04_Business-Rules.md` | `step07-real.txt:104` |
| BR-0011-0007 | Retired four-field-exact `prototype-handoff.yaml` schema (`spec-0011/09_delta.md`, DR-0011-0002) | Current handoff contract DCON-008 and BR-0012-0033 | `retired/spec-0011/legacy-handoff-BR-0011-0007.md` | Pre-step-4 archive; absent from step 7 source |
| BR-0012-0002 | Superseded before this migration (`spec-0012/09_delta.md`, OP-PURGE-077) | BR-0012-0030, BR-0012-0035 | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:105` |
| BR-0012-0003 | Retired with the former per-iteration PNG/HTML evidence chain (`spec-0012/09_delta.md`, P7 REMOVE) | BR-0012-0060 and AC-0012-0072/0073 | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:106` |
| BR-0012-0008 | Retired historical validator-only mode (`spec-0012/09_delta.md`, P7 criterion review; DR-0012-0033) | Current prototyping mode contract, with no history-only public mode | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:109` |
| BR-0012-0010 | Retired old-ID reservation rule (same P7 review and DR) | Migration `id-map.json` and decision provenance | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:110` |
| BR-0012-0017 | Superseded before this migration (`spec-0012/09_delta.md`, OP-PURGE-078) | BR-0012-0029 | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:111` |
| BR-0012-0019 | Superseded before this migration (`spec-0012/09_delta.md`, OP-PURGE-079) | BR-0012-0031 | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:113` |
| BR-0012-0024 | Superseded before this migration (`spec-0012/09_delta.md`, OP-PURGE-080) | BR-0012-0032, BR-0012-0029, BR-0012-0034; the DESIGN hash obligation remains in BR-0012-0026 | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:116` |
| BR-0012-0025 | Retired fixed 130/410-line skill budget (`spec-0012/09_delta.md`, P7 criterion review; DR-0012-0033) | Shipped asset and documentation quality gates | `retired/spec-0012/04_Business-Rules.md` | `step07-real.txt:117` |
| BR-0013-0001 | Retired with the Contracts-first phase (`spec-0013/09_delta.md`, P7 REMOVE) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:127` |
| BR-0013-0002 | Retired with the old spec-pack reference direction (`spec-0013/09_delta.md`, P7 REMOVE; DR-0013-0005) | BR-0013-0031, BR-0013-0032 | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:128` |
| BR-0013-0004 | Retired with the old Plan phase (same REMOVE row) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:129` |
| BR-0013-0005 | Retired with contract stubs from the old phase order (same REMOVE row) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:130` |
| BR-0013-0006 | Retired with the Delta rejected-guardrails section (same REMOVE row) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:131` |
| BR-0013-0007 | Retired with capability batch mode (same REMOVE row) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:132` |
| BR-0013-0008 | Retired with old test-case type classification (same REMOVE row) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:133` |
| BR-0013-0009 | Retired with the old Triage table escape and parser (`spec-0013/09_delta.md`, P7 REMOVE; DR-0013-0005) | `decisions.md` row parser; no new BR ID | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:135` |
| BR-0013-0010 | Retired with spec auto-discovery (same REMOVE row) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:134` |
| BR-0013-0018 | Retired with the `surface_type` auto-populate story (`spec-0013/09_delta.md`, P7 REMOVE) | No one-to-one successor | `retired/spec-0013/04_Business-Rules.md` | `step07-real.txt:136` |

The archive paths in this table are relative to
`.qfai/evidence/migration-spec-to-story/`. The old IDs and source text are
provenance only. They are not new contract obligations.
