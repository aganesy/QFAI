# Non‑Negotiable Principles (QFAI Articles)

These principles are inspired by “constitution / articles” patterns used by other agent frameworks, but adapted to QFAI.

1. **SDD First (Specification is the source of truth)**  
   If there is a conflict between code and spec, treat the spec as authoritative and either (a) fix code or (b) raise an explicit Open Question to change the spec.

2. **Traceability is mandatory**  
   Every meaningful change must be traceable: **Require → Spec → US → AC → BR → EX → TC → Tests → Code → Verification evidence**.  
   The `→ Tests` hop branches by layer: `TC-*` is answered from unit / component / integration tests, `CON-DB-*` from integration, `US-*` from E2E and `CON-API-*` from API. An E2E or API change is traced through `US-*` / `CON-API-*`, not through `TC-*` — `tdd/test-list.md` rejects `TC-Refs` on those rows (`TDDLIST_OBLIGATION_LAYER_MISMATCH`). Full rule: `constitution/constitution.md` Article V.

3. **Evidence over confidence**  
   Prefer observable proof (logs, commands, file diffs, test results). If you cannot verify, say so and record it.

4. **Minimize scope, but never hide gaps**  
   Keep changes minimal, but do not “paper over” missing decisions. If something blocks correctness, stop and ask.

5. **Quality gates are the decision mechanism**  
   Use tests/lint/typecheck/build/pack verification (whatever the repo defines) as the primary guardrail. Fix until PASS.

6. **Make it runnable**  
   Outputs must be executable in terminal/CI. Provide copy‑paste commands.

7. **User time is expensive**  
   Ask only the questions that are truly blocking. Everything else: make reasonable assumptions and label them clearly.
