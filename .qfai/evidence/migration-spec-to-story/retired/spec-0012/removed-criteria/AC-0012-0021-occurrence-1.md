## AC-0012-0021: 4 UX Axes Ordinal Schema

- Status: superseded by AC-0012-0041 (per spec × screen review.json with 4 ordinal axes + six `*Feel` prose fields). See `09_delta.md` CHG-002 OP-PURGE-071.
- Given any `iter-NN/review.json`,
- When validated,
- Then `scores` contains exactly the keys `informationArchitecture`, `navigationFlow`, `usability`, `functionality`, each ordinal in `{weak, acceptable, strong, exceptional}`. Missing or extra keys raise `QFAI-PROT-020`.

