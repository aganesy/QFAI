# Legacy EX-0011-0001 before P7

- BR-Ref: BR-0011-0002, BR-0011-0003
- Given TDD-0001 with status `todo`
- When implement runs: write failing test -> observe RED -> write minimal code -> observe GREEN -> refactor -> reviewers PASS
- Then status transitions: todo -> red -> green -> refactor -> done
- On the story tree: given an EX that no test annotates, when implement runs the same cycle, then the test it writes carries `QFAI:EX-NNNN-NNNN-NN`, each phase keeps its evidence, and no ledger status is written
