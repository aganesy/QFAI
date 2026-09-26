## AC-0012-0030: Per-Iter Evidence Layout

- Status: superseded by AC-0012-0046 (`iter-NN/spec-NNNN/<screen>.review.json` only; no PNG / HTML / interaction.json). See `09_delta.md` CHG-002 OP-PURGE-075.
- Given `.qfai/evidence/prototyping/iter-NN/`,
- When listed,
- Then it contains exactly the files matching `<screen>.png`, `<screen>.html`, `review.json`. Extra files (e.g., `screenshots/`, `html/` subdirs, `breakthrough.json`, `concept.json`) raise `QFAI-PROT-030`.

