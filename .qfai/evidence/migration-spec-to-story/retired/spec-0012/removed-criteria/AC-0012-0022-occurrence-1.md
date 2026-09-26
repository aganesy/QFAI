## AC-0012-0022: Prose Critique Length

- Status: superseded by AC-0012-0041 (qualitative review payload supersedes single-`critique` 200..500-word rule; each `*Feel` field is bounded ≤ 200 words). See `09_delta.md` CHG-002 OP-PURGE-072.
- Given any `iter-NN/review.json`,
- When validated,
- Then `critique` is a single string between 200 and 500 words inclusive. Out-of-range raises `QFAI-PROT-022`.

