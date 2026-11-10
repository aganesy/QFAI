# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                     | Expected                                                                                                                                             |
| --------------- | --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0245-01 | AC-0001-0245-01 | The shipped `grilling.md`, read for which glossaries a session checks                     | Every session, user or delegated and at every stage, checks `<specsDir>/01_policy/glossary.md` and, during a discussion, the pack's `08_Glossary.md` |
| EX-0001-0245-02 | AC-0001-0245-01 | The shipped `grilling.md`, read for a user who says a word the glossary defines otherwise | The griller raises it first in the round and proposes the glossary's term; a plain synonym is corrected and noted, two meanings make a decision      |
| EX-0001-0245-03 | AC-0001-0245-01 | The shipped `grilling.md`, read for a term that matches or is in neither glossary         | A matching term raises nothing; a term in neither is asked about only when a decision on the tree turns on its meaning                               |
| EX-0001-0245-04 | AC-0001-0245-02 | The shipped `grilling.md`, read for where a settled term goes                             | At once to the pack's `08_Glossary.md` in discussion or the project glossary where the stage writes policy, else the handoff or the session record   |
| EX-0001-0245-05 | AC-0001-0245-02 | The shipped `grilling.md`, read for a term changed later and for what a row may hold      | The changed term rewrites its row and adds no second one; a definition says what the term is, and a rule or value set belongs in the spec            |
| EX-0001-0245-06 | AC-0001-0245-03 | The shipped `qfai-grilling` SKILL.md                                                      | It points to `.agents/rules/grilling.md` § Terms against the glossary, and its body is 20,000 characters or fewer                                    |
| EX-0001-0245-07 | AC-0001-0245-03 | The shipped `grilling.md`                                                                 | 500 lines or fewer                                                                                                                                   |
