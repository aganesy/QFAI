# 14 Decisions

### ADR-0001: Enforce duplicate protection at persistence boundary

- Context: duplicate races are possible under concurrent submissions.
- Decision: use unique index on customer and item and map conflict to explicit API response.
- Consequence: API and DB constraints must stay aligned.
