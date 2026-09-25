# Implement evidence — spec-0018

## Objective

Verify the control core's routing and feature-plan transitions, one ledger row at a time. The first row checks that a new capability opens one CREATE question before an SDD work order. The second checks that a proceeded feature plan reaches verify without opening another CREATE question.

## Items processed

| TDD-ID | TC-Refs | Status at this record |
| ------ | ------- | --------------------- |
| TDD-0001 | TC-0018-0001 | Done after both reviews and the completion gate passed |
| TDD-0002 | TC-0018-0002 | Done gate PASS (12/12); Round 2 reviews and checkpoint sealed |
| TDD-0003 | TC-0018-0003 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0004 | TC-0018-0004 | Done gate PASS (12/12); Round 1 reviews and checkpoint sealed |
| TDD-0005 | TC-0018-0005 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0006 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0007 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0008 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0009 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0010 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0011 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0012 | TC-0018-0007 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0013 | TC-0018-0008 | Done gate PASS (12/12); Round 1 reviews and checkpoint sealed |
| TDD-0014 | TC-0018-0010 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0015 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0016 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0017 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0018 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0019 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0020 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0021 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0022 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0023 | TC-0018-0013 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0024 | TC-0018-0014 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0025 | TC-0018-0015 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0026 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0027 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0028 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0029 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0030 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0031 | TC-0018-0018 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0032 | TC-0018-0021 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0033 | TC-0018-0022 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0034 | TC-0018-0023 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0056 | TC-0018-0044 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0057 | TC-0018-0045 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0058 | TC-0018-0046 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0059 | TC-0018-0047 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0060 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0061 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0062 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0063 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0064 | TC-0018-0049 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0065 | TC-0018-0051 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0066 | TC-0018-0052 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0067 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0068 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0069 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0070 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0071 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0072 | TC-0018-0054 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0073 | TC-0018-0055 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0074 | TC-0018-0057 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0075 | TC-0018-0057 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0076 | TC-0018-0058 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0077 | TC-0018-0059 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0078 | TC-0018-0060 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0081 | TC-0018-0063 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0082 | TC-0018-0064 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0083 | TC-0018-0066 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0084 | TC-0018-0067 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0085 | TC-0018-0068 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0086 | TC-0018-0069 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0087 | TC-0018-0069 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0088 | TC-0018-0073 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0089 | TC-0018-0074 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0090 | TC-0018-0076 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0091 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0092 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0093 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0094 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0095 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0096 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0097 | TC-0018-0078 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0098 | TC-0018-0079 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0099 | TC-0018-0080 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0101 | TC-0018-0082 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0102 | TC-0018-0083 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0103 | TC-0018-0083 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0212 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0213 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0214 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0215 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0216 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0217 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0527 | TC-0018-0268 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0528 | TC-0018-0269 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0529 | TC-0018-0269 | Closed `exception` under DR-0298; per-row review waived |

## Grilling Session

### /qfai-implement — run started 2026-09-24T08:42:04.624Z

Preflight: confidence high. The preceding two-round session left no unresolved critical decision for this RED seam. On-detection sessions followed the Round 2 root-dotfile finding and the Round 3 ambiguity between a bare root path and a symbolic reference.

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S2 | adopted | 2026-09-24T17:02:25Z | working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e | 2026-09-24T17:03:36.140Z | TDD-0015 root dotfile missing-path boundary | empty | none in flight | 1 | 0 | 0 |
| S3 | adopted | 2026-09-24T17:40:46Z | working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba | 2026-09-24T17:50:14.293Z | Untyped extensionless path versus symbolic route reference | empty | none in flight | 1 | 0 | 0 |
| S4 | adopted | 2026-09-24T18:09:23Z | working-tree+bfdfb927eb18f1487e62acbb6130ca58deddf23dab2c3d7011f89fd26365e4cb | 2026-09-24T18:15:32.452Z | Direct work order target from a checked spec binding | empty | none in flight | 1 | 0 | 0 |
| S5 | adopted | 2026-09-24T19:48:01Z | working-tree+9b33eddcaffb7ed3738099e87d2fcfa2922eebb960271db26c5422cb6eb2d634 | 2026-09-24T20:11:21.293Z | Bugfix missing-test diagnosis and ordered work orders | empty | none in flight | 2 | 0 | 0 |

The preceding invocation did not pass the TDD-0027 RED gate. Its S5 revision was measured after work resumed, not when S5 ended, and is not accepted as a session-ending revision. The failed record is retained below as rejected provenance; the following invocation re-evaluates the current tree and re-observes RED.

### /qfai-implement — run started 2026-09-24T20:20:52.855Z

Preflight: confidence high. The prior RED failure was a session-record defect. An on-detection session settled the selector's scope and re-observation on the current tree.

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-24T20:26:22.776Z | working-tree+fcd40b3cb714bc7fbd4e1849a338e128cb85421ad54c782de859160324a64245 | 2026-09-24T20:27:01.140Z | TDD-0027 missing-test RED scope and accurate re-observation | empty | none in flight | 3 | 0 | 0 |
| S2 | adopted | 2026-09-24T21:01:47.541Z | working-tree+2b4fbf814c2df27db7b18cfceed4b84c50572b68a19a4dc2216e4437ff532428 | 2026-09-24T21:04:09.002Z | TDD-0028 bounded-change stage fixture and selector scope | empty | none in flight | 3 | 0 | 0 |

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | orchestrator | /root | grilling(-@2026-09-24T08:42:04.624Z/none): none | Preflight confidence check | No preflight decision opened | PASS |
| 2 | backend-engineer | /root/tdd0001_red | Observe TDD-0001 RED | TC-0018-0001; BR-0018-0001; CLI-WF questions and state machine | `### TDD-0001` RED observation and assertion-stripped run | PASS |
| 2a | qa-gatekeeper | /root/qa_review | Judge TDD-0001 RED | RED selector run and assertion-stripped result | Independent RED phase verdict, recorded in the row entry | PASS |
| 3 | backend-engineer | /root/tdd0001_red | Implement TDD-0001 GREEN | RED observation; CLI-WF CREATE question | `decide.ts` transition, GREEN and oracle run below | PASS |
| 3a | qa-gatekeeper | /root/qa_review | Judge TDD-0001 GREEN | GREEN selector run, oracle mutation and restoration | Independent build phase verdict, recorded in the row entry | PASS |
| 4 | backend-engineer | /root/tdd0001_red | Verify TDD-0001 refactor stage | Cross-spec ownership and relevant-suite rules; current code | No code edit; cross-spec check and narrow test result below | PASS |
| 5 | completion-reviewer | /root/completion_review | Review TDD-0001 specification coverage | TC-0018-0001; Round 1 phase evidence | `review-20260924182257625/R01_completion-reviewer.md` | PASS |
| 6 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0001 code and architecture | `decide.ts`; owning Plan; Round 1 phase evidence | `review-20260924182257625/R02_implementation-reviewer.md` | REVISE |
| 7 | solution-architect | /root/cr0001_sdd | Apply approved Plan correction | `CR-20260924-0001`; `01_Spec.md` Design; TC-0018-0001 | `10_Plan.md` exception and `09_delta.md` CR row | PASS |
| 8 | architecture-reviewer | /root/cr0001_review | Review CR application | Plan, delta and CR resolution | Focused re-review after record correction | PASS |
| 9 | completion-reviewer | /root/completion_review | Re-review TDD-0001 after Plan correction | Round 1 phase evidence; approved CR; current revision | `review-20260924205303198/R01_completion-reviewer.md` | PASS |
| 10 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0001 after Plan correction | `decide.ts`; owning Plan; current revision | `review-20260924205303198/R02_implementation-reviewer.md` | PASS |
| 11 | backend-engineer | /root/tdd0001_red | Observe TDD-0002 RED | TC-0018-0002; BR-0018-0001; CLI-WF stage transitions | `### TDD-0002` RED observation and assertion-stripped run | PASS |
| 12 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 RED | RED selector, stripped run and restored test hash | Independent RED phase verdict | PASS |
| 13 | backend-engineer | /root/tdd0001_red | Implement TDD-0002 GREEN and re-verify shared test | RED observation; feature plan; TDD-0001 oracle | `decide.ts` stage transitions, GREEN and both oracle observations below | PASS |
| 14 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 GREEN | GREEN selector, oracle mutation, restored source and TDD-0001 recheck | Independent build phase verdict | PASS |
| 15 | backend-engineer | /root/tdd0001_red | Verify TDD-0002 refactor stage | Current source, other-spec done rows and reverse imports | No code edit; relevant two-test suite and revision below | PASS |
| 16 | completion-reviewer | /root/completion_review | Review TDD-0002 specification coverage | TC-0018-0002; Round 1 phase evidence | `review-20260924220400000/R01_completion-reviewer.md` | PASS |
| 17 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0002 journal replay safety | `decide.ts`; CLI-WF journal contract; Round 1 phase evidence | `review-20260924220400000/R02_implementation-reviewer.md` | REVISE |
| 18 | backend-engineer | /root/tdd0001_red | Observe TDD-0002 Round 2 RED | Implementation review finding; journal replay contract | `#### Round 2` RED observation and assertion-stripped run | PASS |
| 19 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 Round 2 RED | Event-derived cursor selector and restored test hash | Independent RED phase verdict | PASS |
| 20 | backend-engineer | /root/tdd0001_red | Implement TDD-0002 Round 2 GREEN | RED replay failure; journal result-reference contract | Accepted event reference; GREEN and three oracle observations below | PASS |
| 21 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 Round 2 GREEN | Event replay, two TDD-0002 mutations and TDD-0001 recheck | Independent build phase verdict | PASS |
| 22 | backend-engineer | /root/tdd0001_red | Verify TDD-0002 Round 2 refactor | Current source and shared test; reverse imports | No code edit; relevant two-test suite and revision below | PASS |
| 23 | completion-reviewer | /root/completion_review | Re-review TDD-0002 specification coverage | Round 2 event-derived RED/GREEN and prior REVISE | `review-20260924223559000/R01_completion-reviewer.md` | PASS |
| 24 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0002 journal replay safety | `decide.ts`; Round 2 reference and stage identity | `review-20260924223559000/R02_implementation-reviewer.md` | PASS |
| 25 | orchestrator | /root | Record TDD-0002 off-boundary checkpoint | Relevant two-test refactor run; both reviewers PASS | Canonical command, result, revision and seal in TDD-0002 entry | PASS |
| 26 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 12-point done gate | All phase evidence, both review packs and checkpoint | Independent final gate verdict: 12/12, no required fix | PASS |
| 27 | delivery-planner | /root/u1_plan | Select and scope TDD-0003 | TC-0018-0003; BR-0018-0002; current ledger | One causal selector covers authorization and bound SDD work order | PASS |
| 28 | backend-engineer | /root/tdd0001_red | Observe TDD-0003 RED | TC-0018-0003; CREATE question and authorization contract | `### TDD-0003` RED observation and assertion-stripped run | PASS |
| 29 | qa-gatekeeper | /root/qa_review | Judge TDD-0003 RED | RED selector and assertion-stripped result | Independent RED phase verdict; restored revision matched | PASS |
| 30 | backend-engineer | /root/tdd0001_red | Implement TDD-0003 GREEN | RED observation; CLI-WF authorization contract | `decide.ts` decision and bound SDD work order; GREEN and oracle below | PASS |
| 31 | qa-gatekeeper | /root/qa_review | Judge TDD-0003 GREEN | Restored selector, shared suite and authorization-reference oracle | Independent build phase verdict; 3/3 shared suite | PASS |
| 32 | backend-engineer | /root/tdd0001_red | Verify TDD-0003 refactor and completed-row oracles | Reverse import closure; TDD-0001/0002 prior proofs | No code edit; relevant 3-test suite and three restored mutations below | PASS |
| 33 | completion-reviewer | /root/completion_review | Review TDD-0003 specification coverage | TC-0018-0003; Round 1 phase evidence | `review-20260924232138000/R01_completion-reviewer.md` | REVISE |
| 34 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0003 authorization safety | `decide.ts`; CLI-WF/CLI-WFFILE; Round 1 evidence | `review-20260924232138000/R02_implementation-reviewer.md` | REVISE |
| 35 | backend-engineer | /root/tdd0001_red | Observe TDD-0004 RED | TC-0018-0004; BR-0018-0003; EX-0018-0003 | Two-capability selector, natural RED, assertion-stripped PASS and restored RED | PASS |
| 36 | qa-gatekeeper | /root/qa_review | Judge TDD-0004 RED | Selector, RED output, stripped output and revision | Independent RED phase verdict; reproduced assertion and verified revision | PASS |
| 37 | backend-engineer | /root/tdd0001_red | Implement TDD-0004 GREEN | RED observation; two-capability question rule | Routing question fan-out, GREEN suite and slot-ID oracle proof | PASS |
| 38 | qa-gatekeeper | /root/qa_review | Judge TDD-0004 GREEN | Restored selector, relevant suite, mutation and revision | Independent build-phase verdict; 4/4 relevant suite | PASS |
| 39 | backend-engineer | /root/tdd0001_red | Verify TDD-0004 refactor and completed-row oracles | Reverse import closure; TDD-0001/0002 original mutations | No code edit; 4/4 suite and three restored mutations below | PASS |
| 40 | completion-reviewer | /root/completion_review | Review TDD-0004 specification coverage | TC-0018-0004; Round 1 phase evidence | `review-20260925001224837/R01_completion-reviewer.md` | PASS |
| 41 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0004 question generation and sequence | `decide.ts`; CLI-WF; Round 1 evidence | `review-20260925001224837/R02_implementation-reviewer.md` | PASS |
| 42 | orchestrator | /root | Record TDD-0004 off-boundary checkpoint | Four-test relevant suite; both reviewers PASS | Canonical command, result, revision and seal in TDD-0004 entry | PASS |
| 43 | qa-gatekeeper | /root/qa_review | Judge TDD-0004 12-point done gate | All phase evidence, two reviews, pack seal and checkpoint | Independent final gate verdict: 12/12, no required fix | PASS |
| 44 | backend-engineer | /root/tdd0001_red | Observe TDD-0013 RED | TC-0018-0008; BR-0018-0006; CLI-WF decline audit | Stop-answer selector, natural RED, assertion-stripped PASS and restored RED | PASS |
| 45 | qa-gatekeeper | /root/qa_review | Judge TDD-0013 RED | Selector, RED output, stripped output and revision | Independent RED phase verdict; reproduced assertion and verified revision | PASS |
| 46 | backend-engineer | /root/tdd0001_red | Implement TDD-0013 GREEN | RED observation; CLI-WF decision and decline audit | Stop authorization, cancelled transition, GREEN suite and stop-event oracle | PASS |
| 47 | qa-gatekeeper | /root/qa_review | Judge TDD-0013 GREEN | Restored selector, relevant suite, mutation and revision | Independent build-phase verdict; 5/5 relevant suite | PASS |
| 48 | backend-engineer | /root/tdd0001_red | Verify TDD-0013 refactor and completed-row oracles | Reverse import closure; TDD-0001/0002/0004 original mutations | No code edit; 5/5 suite and four restored mutations below | PASS |
| 49 | completion-reviewer | /root/completion_review | Review TDD-0013 specification coverage | TC-0018-0008; Round 1 phase evidence | `review-20260925005231037/R01_completion-reviewer.md` | PASS |
| 50 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0013 decline audit and sequence | `decide.ts`; CLI-WF/CLI-WFFILE; Round 1 evidence | `review-20260925005231037/R02_implementation-reviewer.md` | PASS |
| 51 | orchestrator | /root | Record TDD-0013 off-boundary checkpoint | Five-test relevant suite; both reviewers PASS | Canonical command, result, revision and seal in TDD-0013 entry | PASS |
| 52 | qa-gatekeeper | /root/qa_review | Judge TDD-0013 12-point done gate | All phase evidence, two reviews, pack seal and checkpoint | Independent final gate verdict: 12/12, no required fix | PASS |
| 53 | architecture-reviewer | /root/tdd14_grill | Diagnose TDD-0014 owner mismatch | TC-0018-0010; ledger owner; spec plan | CR-20260925-0003 and scoped blocker record | PASS |
| 54 | architecture-reviewer | /root/cr0001_review | Review the TDD-0014 correction request | CR-20260925-0003; blocker work log; drift protocol | Independent pre-approval review; record issue repaired | PASS |
| 55 | test-design-analyst | /root/u1_test_design | Design TDD-0015 unknown-path boundary | TC-0018-0012; BR-0018-0008; CLI-WF route proposal | One causal assertion, observer fact and oracle plan | PASS |
| 56 | backend-engineer | /root/tdd0001_red | Observe TDD-0015 RED | TC-0018-0012; current decide.ts | Assertion RED, neutralized PASS and restored RED in TDD-0015 entry | PASS |
| 57 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 RED | RED selector, assertion strip, hashes and revision | Independent RED phase verdict; reproduced assertion and verified revision | PASS |
| 58 | backend-engineer | /root/tdd0001_red | Implement TDD-0015 GREEN | RED observation; CLI-WF proposal refusal | `decide.ts` observed-path refusal, GREEN and oracle below | PASS |
| 59 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 GREEN | GREEN selector, relevant suite, mutation, hashes and revision | Independent build phase verdict; 6/6 relevant suite | PASS |
| 60 | backend-engineer | /root/tdd0001_red | Verify TDD-0015 refactor | GREEN tree; reverse-import closure; completed-row oracle proofs | No code edit; relevant 6-test suite and revision below | PASS |
| 61 | completion-reviewer | /root/completion_review | Review TDD-0015 specification coverage | TC-0018-0012; Round 1 phase evidence | `review-20260925012708000/R01_completion-reviewer.md` | PASS |
| 62 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0015 code and path checks | `decide.ts`; CLI-WF; Round 1 phase evidence | `review-20260925012708000/R02_implementation-reviewer.md` | REVISE |
| 63 | backend-engineer | /root/tdd0001_red | Observe TDD-0015 Round 2 RED | Implementation review's two missing-path bypasses; TC-0018-0012 | Same selector expanded to three missing paths; assertion RED and stripped PASS | PASS |
| 64 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 2 RED | RED selector, assertion strip, hashes and revision | Independent RED phase verdict; three absent subjects checked | PASS |
| 65 | backend-engineer | /root/tdd0001_red | Implement TDD-0015 Round 2 GREEN | Three-path RED; Round 1 review findings | `decide.ts` checks observed and normative references, including keyed root files; GREEN and oracle results below | PASS |
| 66 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 2 GREEN | Restored source, three-path selector and two oracle mutations | Independent build phase verdict; revision and 6/6 suite verified | PASS |
| 67 | backend-engineer | /root/tdd0001_red | Verify TDD-0015 Round 2 refactor | Round 2 GREEN tree; reverse-import closure; completed-row oracle proofs | No code edit; relevant 6-test suite and revision below | PASS |
| 68 | completion-reviewer | /root/completion_review | Re-review TDD-0015 specification coverage | Round 2 evidence and prior REVISE findings | `review-20260925015119000/R01_completion-reviewer.md` | PASS |
| 69 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0015 path refusal | `decide.ts`; two Round 1 bypasses; Round 2 tests | `review-20260925015119000/R02_implementation-reviewer.md` | REVISE |
| 70 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T08:42:04.624Z/agents): classify project-root dotfile references as paths | Round 2 review finding; CLI-WF unknown-path; current selector | Adopted same-selector fourth reference and local classifier condition; blanket classification would include IDs | PASS |
| 71 | backend-engineer | /root/tdd0001_red | Observe TDD-0015 Round 3 RED | Dotfile bypass; adopted S2 decision | Same selector extended with missing dotfile; natural RED, assertion strip and restored RED | PASS |
| 72 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 3 RED | Four-path RED selector, assertion strip, hashes and revision | Independent RED phase verdict; four-path assertion reproduced | PASS |
| 73 | backend-engineer | /root/tdd0001_red | Implement TDD-0015 Round 3 GREEN | Four-path RED; adopted S2 classifier decision | Local root-dotfile path check, GREEN and oracle result | PASS |
| 74 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 3 GREEN | Restored source; four-path selector; oracle mutations | Independent build phase verdict; revision and 6/6 suite verified | PASS |
| 75 | backend-engineer | /root/tdd0001_red | Verify TDD-0015 Round 3 refactor | Round 3 GREEN tree; reverse-import closure | No code edit; relevant 6-test suite and corrected revision below | PASS |
| 76 | completion-reviewer | /root/completion_review | Re-review TDD-0015 specification coverage | Round 3 evidence and prior review findings | `review-20260925023352000/R01_completion-reviewer.md` | PASS |
| 77 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0015 path classification | `decide.ts`; three prior bypasses; Round 3 tests | `review-20260925023352000/R02_implementation-reviewer.md` | REVISE |
| 78 | architecture-reviewer | /root/architecture_review | grilling(S3@2026-09-24T08:42:04.624Z/agents): hand off route reference typing | Round 3 review; CLI-WF ref fields and unknown-path contract | Adopted CR/SDD ownership; lexical guesses would conflate bare paths and symbolic refs | PASS |
| 79 | solution-architect | /root/cr0001_sdd | Draft CR-20260925-0004 | Untyped route refs; Round 3 review; 526-row impact audit | Three representation options and a 51-row blocked set | PASS |
| 80 | orchestrator | /root | Park CR-20260925-0004 dependent todo rows | Open CR and 51-row blocked set; drift-protocol step 2 | Forty-six `todo -> blocked`; five later-status rows unchanged; blocker work log | PASS |
| 81 | architecture-reviewer | /root/architecture_review | grilling(S4@2026-09-24T08:42:04.624Z/agents): bind direct work orders to the checked spec | CLI-WF execution context and work order; CLI-WFFILE direct plan; TDD-0026 | Use a ready snapshot with one existing spec binding, carry it to both `target` fields; leave binding selection outside this row | PASS |
| 82 | backend-engineer | /root/tdd0001_red | Observe TDD-0026 RED | TC-0018-0016; direct plan; adopted S4 decision | One direct selector fails on missing stage progression; assertion strip passes; restored RED and hashes below | PASS |
| 83 | qa-gatekeeper | /root/qa_review | Judge TDD-0026 RED | Restored selector, source/test hashes and RED revision | RED assertion and strip valid; tree revision moved during SDD edits, so re-observation required | REVISE |
| 84 | backend-engineer | /root/tdd0001_red | Re-observe TDD-0026 RED on applied SDD tree | CR2/CR3/CR4 owner reruns; original RED selector | Same assertion RED, assertion-only strip PASS, restored RED; stable revision below | PASS |
| 85 | qa-gatekeeper | /root/qa_review | Re-judge TDD-0026 RED | Re-observed selector, source/test hashes and stable revision | Independent RED phase PASS; selector, assertion strip, hashes and 2,507-record revision independently reproduced | PASS |
| 86 | backend-engineer | /root/tdd0001_red | Implement TDD-0026 GREEN and target oracle | RED selector and direct-plan contract | Direct next/accept, GREEN 1/1, related 7/7, target mutation failure, restored hashes and revision below | PASS |
| 87 | qa-gatekeeper | /root/qa_review | Judge TDD-0026 GREEN | Restored source/test, target oracle, related suite and revision | Independent GREEN PASS: selector 1/1, related suite 7/7, target mutation failed and restored; source/test hashes and 2,507-record revision reproduced | PASS |
| 88 | backend-engineer | /root/tdd0001_red | Refactor verify TDD-0026 | TDD-0026 GREEN and oracle PASS; BR-0018-0010 group | No code edit; reverse-import suite 6 files and 7 tests passed; hashes and 2,507-record revision unchanged | PASS |
| 89 | architecture-reviewer | /root/architecture_review | grilling(S5@2026-09-24T08:42:04.624Z/agents): bind bugfix work orders to a checked diagnosis | TC-0018-0016; CLI-WF diagnosis and Stage result; bugfix plan | Adopted a checked spec binding, replayed `missing-test` diagnosis, then `sdd_append`; static stage order without diagnosis would not prove the branch | PASS |
| 90 | architecture-reviewer | /root/architecture_review | grilling(S5@2026-09-24T08:42:04.624Z/agents): use an Integration added-row fixture | TC-0018-0016; TC-0018-0063/0064; CLI-WFFILE predicates | Adopted five work orders through verify and a sixth `next` returning null; conditional skip belongs to another TC | PASS |
| 91 | backend-engineer | /root/tdd0001_red | Observe TDD-0027 RED | TC-0018-0016 bugfix missing-test branch; adopted S5 decisions | Assertion RED at test:393:18, assertion-only strip PASS, restored RED and hashes below | PASS |
| 92 | qa-gatekeeper | /root/qa_review | Judge TDD-0027 RED | Restored selector, strip proof, source/test hashes and revision | REVISE: S5 revision was captured after resumed work; old invocation is incomplete | REVISE |
| 93 | orchestrator | /root | grilling(-@2026-09-24T20:20:52.855Z/none): none | New invocation preflight confidence check | No preflight decision opened | PASS |
| 94 | architecture-reviewer | /root/architecture_review | grilling(S1@2026-09-24T20:20:52.855Z/agents): replay the missing-test diagnosis | TC-0018-0016; BR-0018-0010; CLI-WF Stage result and journal | Adopted resultRef/stage-identity replay into the ready snapshot before `sdd_append` selection | PASS |
| 95 | architecture-reviewer | /root/architecture_review | grilling(S1@2026-09-24T20:20:52.855Z/agents): assert five checked work orders and terminal null | TC-0018-0016; CLI-WFFILE bugfix plan | Adopted Integration fixture, plan skill/operation, checked spec target and final null | PASS |
| 96 | architecture-reviewer | /root/architecture_review | grilling(S1@2026-09-24T20:20:52.855Z/agents): keep regression branch in its own test case | TC-0018-0016; TC-0018-0067; selector granularity | Removed the regression control from this selector; the missing-test branch remains | PASS |
| 97 | backend-engineer | /root/tdd0001_red | Re-observe TDD-0027 RED on the new invocation | Revised single-boundary selector; S1 decisions; session-end revision | RED assertion at test:376:18, assertion-only strip PASS, restored RED and 2,507-record revision below | PASS |
| 98 | qa-gatekeeper | /root/qa_review | Judge TDD-0027 re-observed RED | New invocation S1 and Round 2 selector, hashes and revision | PASS: assertion RED at :376:18, comparison-only strip PASS, restored RED, hashes and 2,507-record revision reproduced; new S1 chronology and selector scope accepted | PASS |
| 99 | backend-engineer | /root/tdd0001_red | Implement TDD-0027 GREEN and predicate oracle | Round 2 RED and qa-gatekeeper PASS; bugfix missing-test plan | Selector 1/1, reverse-import suite 8/8, predicate mutation failed and restored; hashes and revision below | PASS |
| 100 | qa-gatekeeper | /root/qa_review | Judge TDD-0027 GREEN | Restored source/test, oracle, related suite and revision | PASS: selector 1/1, related suite 8/8, predicate mutation assertion failed and restored; source/test hashes and 2,507-record revision reproduced | PASS |
| 101 | backend-engineer | /root/tdd0001_red | Refactor verify TDD-0027 | TDD-0027 GREEN/oracle and independent QA PASS | No edit; reverse-import suite 6 files/8 tests passed, source/test hashes and 2,507-record revision unchanged | PASS |
| 102 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T20:20:52.855Z/agents): bind bounded-change to a checked ready snapshot | TC-0018-0016; BR-0018-0010; CLI-WF | Adopted one spec binding, empty accepted stages and unmet acceptance obligations | PASS |
| 103 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T20:20:52.855Z/agents): test four provided-plan stages | TC-0018-0016; CLI-WFFILE; checked stage results | Adopted sdd_delta, acceptance, implement and verify work orders with skill, operation, target, replay and terminal null | PASS |
| 104 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T20:20:52.855Z/agents): leave shipped-plan details to their owning test | TC-0018-0016; TC-0018-0020; TDD-0266 | The fixture proves progression without claiming the final shipped bounded-change plan or multiple-target selection | PASS |
| 105 | backend-engineer | /root/tdd0001_red | Observe TDD-0028 RED | S2 decisions; bounded-change test selector | Assertion RED at test:326:18; comparison-only strip PASS; restored RED; direct and bugfix siblings 2/2 PASS | PASS |
| 106 | qa-gatekeeper | /root/qa_review | Judge TDD-0028 RED | Current-run S2 chronology; Round 1 selector, strip, hashes and revision | Independent RED PASS: assertion failure and stripped pass reproduced; siblings 2/2; source/test hashes and 2,507-record revision matched | PASS |

## Ledger rows advanced

### TDD-0001

- TDD-ID: TDD-0001
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts`
- Selector: `TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability`
- TC-ref: TC-0018-0001
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — RED phase gate at `working-tree+b10641cd1611e7d900e75192ec99f942671648b597a9fd5c320fe06349338b67` and HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`; build-phase GREEN and oracle proof at `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8` and the same HEAD)

#### Round 1

- Round 1: Revision: `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8`
- Round 1: RED revision: `working-tree+b10641cd1611e7d900e75192ec99f942671648b597a9fd5c320fe06349338b67`
- Test file SHA-256: `4f4aa7912b036902bc30603fcca81f7a7d3cbc63b6cbc595b8527b7b232858ad`
- Seam file SHA-256: `f2b3946d88db99e1021e1b80da359f24d2dc9df780173e553a71001fe2473b6d`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; one test failed inside its selector at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:89:18`. The test module loaded. Full assertion output:

```text
× |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
  → expected { state: undefined, …(2) } to deeply equal { state: 'awaiting_input', …(2) }

FAIL |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
AssertionError: expected { state: undefined, …(2) } to deeply equal { state: 'awaiting_input', …(2) }

- Expected
+ Received

  Object {
-   "questions": Array [
-     Object {
-       "effects": Array [
-         "proceed",
-         "stop",
-       ],
-       "kind": "create",
-       "recommendationIsOffered": true,
-       "slotId": Any<String>,
-     },
-   ],
-   "state": "awaiting_input",
+   "questions": Array [],
+   "state": undefined,
    "workOrders": Array [],
  }

❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:89:18
   89|   expect(actual).toEqual(expected);
     |                  ^

Test Files  1 failed (1)
Tests       1 failed (1)
```

- Round 1: RED assertion-stripped result: The test call, inputs and both assertion operands stayed evaluated. Only the verdict line was neutralized; the same command then exited 0 and ran this one selector. The test was restored immediately, and its SHA-256 returned to `4f4aa7912b036902bc30603fcca81f7a7d3cbc63b6cbc595b8527b7b232858ad`.

```diff
@@ -86,5 +86,7 @@
     ],
     workOrders: [],
   };
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
+  void expect;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose
Exit: 0
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0 after restoring the oracle mutation; the selected test passed. The production source SHA-256 was `f74484f5a7ab614d2f8f81cafe4f019107a0a8791bd72c51c3797bf7d94368d3`.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: Oracle proof: Replaced only the returned run state `"awaiting_input"` with `"routing"` in `decide.ts`, ran the GREEN command, and observed exit 1 inside the selected test at line 89. The unchanged CREATE question still matched. Restored the one-line mutation immediately and reran GREEN with exit 0. This mutation proves the state predicate discriminates; it does not establish the later proposal-refusal or environment checks.

```diff
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose
Exit: 1
AssertionError: expected { state: 'routing', …(2) } to deeply equal { state: 'awaiting_input', …(2) }
-   "state": "awaiting_input",
+   "state": "routing",
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:89:18
Test Files  1 failed (1)
Tests       1 failed (1)
```

- Refactor decision: no code edit. The sole transition already names its guards and question fields directly; extracting helpers now would add an abstraction before another case uses it. No test file edit is needed.
- Relevant suite: narrow suite, reverse dependency closure resolved. The new production module has no production importer; the only test importer is this row's test, and no test imports that test file.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; one selected test passed after applying `CR-20260924-0001`. No source or test file changed in this review fix.
- Refactor verify revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8` (two consecutive calculations agreed; 2,495 path records).
- Round 1: Review pack (attempt 1): `.qfai/review/review-20260924182257625/`.
- Round 1: Review pack seal (attempt 1): `c8fe3a3493e4ba295c17cb6ea37da07e8a40043400305134232521bd44dcbd2b` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE. The completion reviewer passed. The implementation reviewer found that `decide.ts` has no production consumer and the owning Plan does not record the independently required pure decision seam as an exception to its three-consumer rule. The behaviour-preserving review path applied `CR-20260924-0001`; the next review stays in Round 1.
- Round 1: Review pack (attempt 2): `.qfai/review/review-20260924205303198/`.
- Round 1: Review pack seal (attempt 2): `1339c2cbea4597d24d008416c4c6c56b34f907c6a7b8593712979be899d5c286` (four files, Markdown normalized and JSON raw).
- Round 1: reviewer verdict (attempt 2): PASS. Both completion and implementation reviewers independently matched `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8` and audited evidence hash `bb3d6729c2a604a0c159a33b97fbfb037c69f1f7a03a1edbc27288466796313e`. The Plan now records the narrow pure-decision-function exception and its requiring obligation.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Spec review: PASS.
- Spec reviewed revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`.
- Spec audited evidence hash: `bb3d6729c2a604a0c159a33b97fbfb037c69f1f7a03a1edbc27288466796313e`.
- Spec review pack: `.qfai/review/review-20260924205303198/`.
- Spec review pack seal: `1339c2cbea4597d24d008416c4c6c56b34f907c6a7b8593712979be899d5c286`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`.
- Code quality audited evidence hash: `bb3d6729c2a604a0c159a33b97fbfb037c69f1f7a03a1edbc27288466796313e`.
- Code quality review pack: `.qfai/review/review-20260924205303198/`.
- Code quality review pack seal: `1339c2cbea4597d24d008416c4c6c56b34f907c6a7b8593712979be899d5c286`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; one selected test passed`
- Checkpoint verification revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`
- Checkpoint verification seal: `038d4cc6eb8316fd6162cf0e468b3b3541cb373b531b3a1fb674378799063162` (the canonical revision, command and result lines above).

### TDD-0002

- TDD-ID: TDD-0002
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts`
- Selector: `TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results`
- TC-ref: TC-0018-0002
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x4 (qa-gatekeeper#1 — Round 1 RED at `working-tree+cb4e1c475a4107cd444205d53400e180bd69e605a2e7efa602e5323a571d3233`; Round 1 GREEN at `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25`; Round 2 RED at `working-tree+baf390ccbdb55a4ef3f6b53c5f80fbe0cc593adf5942c67f51e7c4bdc0681db8`; Round 2 GREEN and both oracle proofs at `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`; all against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+cb4e1c475a4107cd444205d53400e180bd69e605a2e7efa602e5323a571d3233`
- Round 1: RED test hash: `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`
- Seam file SHA-256: `f74484f5a7ab614d2f8f81cafe4f019107a0a8791bd72c51c3797bf7d94368d3`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selected test loaded and failed inside its assertion at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:181:6`. The plan issued no stages, while the test required arrival at the final `verify` stage. The later CREATE-question count was zero. The first assertion establishes stage reachability so an empty event stream cannot satisfy the row.

```text
FAIL |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
AssertionError: expected { issuedStageKinds: [], …(1) } to deeply equal { …(2) }
- Expected
+ Received
  Object {
-   "issuedStageKinds": Array ["sdd", "acceptance", "implement", "verify"],
+   "issuedStageKinds": Array [],
    "laterCreateQuestions": 0,
  }
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:181:6
Test Files  1 failed (1)
Tests       1 failed | 1 skipped (2)
```

- Round 1: RED assertion-stripped result: The selected test's loop, `decide` calls and both comparison operands remained evaluated. Only the final assertion verdict was neutralized. The same command exited 0 with one selected test passed and one sibling skipped. The test was restored immediately; its SHA-256 again matched `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`.

```diff
@@ -173,13 +173,16 @@
     run = accepted.verdict.run;
   }

-  expect({
+  const actual = {
     issuedStageKinds,
     laterCreateQuestions: postRoutingEvents.filter(
       (event) => event.type === "question-opened" && event.question?.kind === "create",
     ).length,
-  }).toEqual({
+  };
+  const expected = {
     issuedStageKinds: ["sdd", "acceptance", "implement", "verify"],
     laterCreateQuestions: 0,
-  });
+  };
+  void actual;
+  void expected;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 0
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 1: Oracle proof plan: After GREEN reaches `verify`, temporarily make a non-routing `next` decision emit one `question-opened` event with `kind: create` while preserving the issued work order. Run the same TDD-0002 selector; it must fail on `laterCreateQuestions: 1` against expected `0`. Restore the source and rerun GREEN. This tests the row's no-repeat predicate independently of the RED stage-reachability failure.
- Round 1: Revision: `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25`
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the TDD-0002 selector passed, issuing `sdd`, `acceptance`, `implement` and `verify` in order with no later CREATE question. The complete test file also passed 2/2. The restored source SHA-256 was `15c9044818c82bd941a5fd20c28cda7453750ccba8c067bdc88d5a460a73afa1`; the unchanged test SHA-256 was `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 1: Oracle proof: A temporary source mutation added one `create` `question-opened` event to the non-routing SDD `next` result while retaining the work order. The TDD-0002 selector failed at line 181 with all four issued stages still matching and `laterCreateQuestions: 1` against expected `0`. The mutation was removed; the selector and the complete two-test file passed again.

```diff
@@ -138,6 +138,23 @@ export function decide(
       events: [
         { type: "work-order-issued", workOrder: nextWorkOrder },
         { type: "dispatch-work-order" },
+        ...(stage.stageKind === "sdd"
+          ? [{
+              type: "question-opened",
+              question: {
+                questionId: "mutation-create",
+                kind: "create",
+                text: "Create the capability again?",
+                options: [
+                  { optionId: "create", label: "Create", description: "Proceed", effect: "proceed" },
+                  { optionId: "decline", label: "Decline", description: "Stop", effect: "stop" },
+                ],
+                selection: { min: 1, max: 1 },
+                recommendation: "create",
+                capability: { goal: "mutation", covers: [], excludes: [], slotId: approval.target.slotId },
+              },
+            } as WorkflowEvent]
+          : []),
       ],
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 1
The selected assertion at line 181 received laterCreateQuestions 1 instead of 0, while all four issuedStageKinds matched.
Test Files  1 failed (1)
```

#### Shared-artifact re-verify

##### spec-0018/TDD-0001

- Evidence file: `.qfai/evidence/implement-spec-0018.md#tdd-0001`
- Revision: `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25`
- Selector: `TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability`
- Re-verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0001` (cwd: `packages/qfai`)
- Re-verify result: PASS; exit 0; one selected test passed under the changed test file.
- Proof command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0001` (cwd: `packages/qfai`), with the original one-line returned-state mutation.
- Proof result: exit 1; the selected assertion failed at line 90 with `routing` received against `awaiting_input` expected; the CREATE question and work-order checks still matched.
- Restored GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0001` (cwd: `packages/qfai`)
- Restored GREEN result: PASS; exit 0; one selected test passed after restoring the source.
- RED test manifest: `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts` (`file`, mode `0666`, SHA-256 `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`).
- RED test hash: `3ae1c46c0b0d5740da9374b14e4f40dd9e8fd7c604ffc39bb8b4f3ab99767aaa`.

```diff
@@ -250,7 +250,7 @@ export function decide(
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
```

- Refactor decision: no code edit. The `next` and `accept` branches validate different state boundaries. A common abstraction would precede the later schema, receipt and staleness obligations; the current source marks the limited checks and their lifting conditions.
- Relevant suite: the shared test file is the reverse dependency closure of `decide.ts`. The two selectors include this row and completed TDD-0001. A scan of the other 18 specs found 386 `done` rows with no direct ownership of either file; no other production importer reaches the source.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; both TDD-0001 and TDD-0002 selectors passed, with no source or test edit after the GREEN observations.
- Refactor verify revision: `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25` (two consecutive calculations agreed; 2,495 path records).
- Round 1: Review pack (attempt 1): `.qfai/review/review-20260924220400000/`.
- Round 1: Review pack seal (attempt 1): `3cfbbe264b6a8975bfb21219e1fb5ffec4d85ac64f967513a2303fd55e6f1916` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE

#### Round 2

- Round 2: RED revision: `working-tree+baf390ccbdb55a4ef3f6b53c5f80fbe0cc593adf5942c67f51e7c4bdc0681db8`
- Round 2: RED test hash: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`
- Seam file SHA-256: `15c9044818c82bd941a5fd20c28cda7453750ccba8c067bdc88d5a460a73afa1`
- Round 2: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 2: RED failure mode: assertion
- Round 2: RED result: exit 1; the selected test failed inside its assertion at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6`. The event fold found no accepted-result reference or stage identity, so the plan stopped after `sdd`. The later CREATE-question count remained zero. The test obtains `stageKind` from the previously issued work-order event and the accepted result from its `resultRef`; it does not supply the accepted cursor by hand.

```text
FAIL |unit|  tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
AssertionError: expected { issuedStageKinds: [ 'sdd' ], …(3) } to deeply equal { …(4) }

- Expected
+ Received

    "issuedStageKinds": Array [
      "sdd",
-     "acceptance",
-     "implement",
-     "verify",
    ],
    "laterCreateQuestions": 0,
-   "replayFailure": null,
-   "replayedResults": Array [
-     Object {
-       "outcome": "accepted",
-       "resultId": "result-feature-sdd",
-       "stageInstanceId": "feature-sdd",
-       "stageKind": "sdd",
-     },
-     Object {
-       "outcome": "accepted",
-       "resultId": "result-feature-acceptance",
-       "stageInstanceId": "feature-acceptance",
-       "stageKind": "acceptance",
-     },
-     Object {
-       "outcome": "accepted",
-       "resultId": "result-feature-implement",
-       "stageInstanceId": "feature-implement",
-       "stageKind": "implement",
-     },
-   ],
+   "replayFailure": "accepted event lacks its result reference or stage identity",
+   "replayedResults": Array [],
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6
Test Files  1 failed (1)
Tests  1 failed | 1 skipped (2)
```

- Round 2: RED assertion-stripped result: Only the final assertion verdict was neutralized; the event fold, `decide` calls, fixture lookup and both operands remained evaluated. The same command exited 0 with the TDD-0002 selector passed and the sibling skipped. The test was restored immediately; its SHA-256 returned to `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.

```diff
@@ -223,14 +223,15 @@
     run = accepted.verdict.run;
   }

-  expect({
+  const actual = {
     issuedStageKinds,
     replayedResults,
     replayFailure,
     laterCreateQuestions: postRoutingEvents.filter(
       (event) => event.type === "question-opened" && event.question?.kind === "create",
     ).length,
-  }).toEqual({
+  };
+  const expected = {
     issuedStageKinds: ["sdd", "acceptance", "implement", "verify"],
     replayedResults: [
@@ -254,5 +255,7 @@
     ],
     replayFailure: null,
     laterCreateQuestions: 0,
-  });
+  };
+  void actual;
+  void expected;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 0
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 2: Oracle proof plan: After GREEN, omit or corrupt only the `accept-nonfinal-result` event's `resultRef` and confirm this selector fails on replay identity while the work order remains issued. Restore and rerun GREEN. Also repeat Round 1's extra-CREATE-event mutation under the changed test and confirm `laterCreateQuestions: 1` against expected `0`, then restore and rerun GREEN.
- Round 2: Revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`
- Round 2: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 2: GREEN result: exit 0; the selector passed with the `sdd`, `acceptance`, `implement` and `verify` work orders in order. The test replayed three accepted results from work-order events and `resultRef` documents, reported no replay failure and saw no later CREATE question. The complete shared test file passed 2/2. Restored source SHA-256: `78a84088d91dff0b946d33daec125669950ca618539ac72087461da7893e20ea`; test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 2: Oracle proof: Two mutations were taken against the final source and changed test. First, the accepted event's `resultRef` pointed to a missing result document. The selector failed at line 233 with replay failure, no replayed results and only `sdd` issued. Second, a non-routing SDD `next` emitted one CREATE question while retaining its work order. The selector failed at line 233 with `laterCreateQuestions: 1` against expected `0`; stage order and replayed results still matched. Each mutation was removed immediately and the same selector passed again.

```diff
@@ -184,7 +184,7 @@ export function decide(
       events: [
         {
           type: "accept-nonfinal-result",
-          resultRef: `results/${result.resultId}.json`,
+          resultRef: `results/missing-${result.resultId}.json`,
           stageInstanceId: workOrder.stageInstanceId,
           outcome: result.outcome,
         },
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 1
AssertionError: expected { issuedStageKinds: [ 'sdd' ], …(3) } to deeply equal { …(4) }
Received replayFailure: "accepted event lacks its result reference or stage identity"; replayedResults: []; issuedStageKinds: ["sdd"]
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6
Tests  1 failed | 1 skipped (2)
```

```diff
@@ -141,6 +141,23 @@ export function decide(
       events: [
         { type: "work-order-issued", workOrder: nextWorkOrder },
         { type: "dispatch-work-order" },
+        ...(stage.stageKind === "sdd"
+          ? [{
+              type: "question-opened",
+              question: {
+                questionId: "mutation-create",
+                kind: "create",
+                text: "Create the capability again?",
+                options: [
+                  { optionId: "create", label: "Create", description: "Proceed", effect: "proceed" },
+                  { optionId: "decline", label: "Decline", description: "Stop", effect: "stop" },
+                ],
+                selection: { min: 1, max: 1 },
+                recommendation: "create",
+                capability: { goal: "mutation", covers: [], excludes: [], slotId: approval.target.slotId },
+              },
+            } as WorkflowEvent]
+          : []),
       ],
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 1
AssertionError: expected { …(4) } to deeply equal { …(4) }
-   "laterCreateQuestions": 0,
+   "laterCreateQuestions": 1,
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6
Tests  1 failed | 1 skipped (2)
```

- Round 2: Shared test re-verification: The changed file still passes the completed TDD-0001 selector (exit 0; 1 passed and 1 sibling skipped). Repeating TDD-0001's original returned-state mutation makes its selector fail at line 90 on `routing` versus `awaiting_input`; restoring the source yields 2/2 PASS. The current test artifact is `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts` (`file`, mode `0666`, SHA-256 `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`); its one-record manifest hash is `ee9e365867b776d2b21be20ab992141cf58144b4c4bfb39e1ce243181ff21621`. This supersedes the Round 1 shared-test observation without changing its reviewed evidence.

```diff
@@ -260,7 +260,7 @@ export function decide(
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
```

- Round 2: Refactor decision: no code edit. The accepted event carries a result reference and stage identity, and the test reconstructs the accepted cursor from events. A generic replay abstraction is reserved for later obligations.
- Relevant suite: the shared test file covers the touched `decide.ts` module and its current reverse dependency closure; no production importer reaches the source. Both TDD-0001 and TDD-0002 selectors run in this file.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; both selectors passed (2/2). No source or test edit followed the restored Round 2 GREEN observations. Source SHA-256: `78a84088d91dff0b946d33daec125669950ca618539ac72087461da7893e20ea`; test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.
- Refactor verify revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37` (two consecutive calculations agreed; 2,495 path records).
- Round 2: Review pack (attempt 1): `.qfai/review/review-20260924223559000/`.
- Round 2: Review pack seal (attempt 1): `0d02f352eed07ba045537c4ad4b82e90d3ad21a5ef2e0d7428e32758179b0943` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 2: reviewer verdict (attempt 1): PASS
- Spec review: PASS.
- Spec reviewed revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`.
- Spec audited evidence hash: `f69cef78559c1b0f8c94365654f35c6e213e592e318b0550536fa4812ce1560d`.
- Spec review pack: `.qfai/review/review-20260924223559000/`.
- Spec review pack seal: `0d02f352eed07ba045537c4ad4b82e90d3ad21a5ef2e0d7428e32758179b0943`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`.
- Code quality audited evidence hash: `f69cef78559c1b0f8c94365654f35c6e213e592e318b0550536fa4812ce1560d`.
- Code quality review pack: `.qfai/review/review-20260924223559000/`.
- Code quality review pack seal: `0d02f352eed07ba045537c4ad4b82e90d3ad21a5ef2e0d7428e32758179b0943`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results; two selected tests passed`
- Checkpoint verification revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`
- Checkpoint verification seal: `23e1c7229e251f931727c205a6fe17e21b456536d84f5000951b1285edea3449` (the canonical revision, command and result lines above).

#### Fixture correction under CR-20260924-0002

- The ready-snapshot `approval` now carries `authorizationId: "authorization-4"`. `next` no longer issues an SDD work order for a CREATE approval without a persisted ID, so the fixture's ID-less approval stopped reaching SDD.
- Before the fixture change, with the missing-ID check in `decide.ts`: exit 1; the comparison at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6` failed.
- After the fixture change: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --testNamePattern='TC-0018-0002 \(TDD-0002\)' --reporter=verbose` (cwd `packages/qfai`) exit 0; 1 passed, 1 skipped. The no-repeat assertion is unchanged. Status stays `done`.

### TDD-0003

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived; the Round 1 REVISE finding is fixed below.

- TDD-ID: TDD-0003
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts`
- Selector: `TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order`
- TC-ref: TC-0018-0003
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — RED phase at `working-tree+abb7b0f8c5bcca9e37cbf1c33e09b302054168a1b9c697c4fef4434890273085`; GREEN and oracle phase at `working-tree+3aaf41d9fc2b30faf95af865bb0bfe43deb3d544edbcc60441ed333f339d6b0a`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1
- Round 1: RED revision: `working-tree+abb7b0f8c5bcca9e37cbf1c33e09b302054168a1b9c697c4fef4434890273085` (two consecutive calculations agreed; 2,496 path records).
- Round 1: RED test hash: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`
- Seam file SHA-256: `78a84088d91dff0b946d33daec125669950ca618539ac72087461da7893e20ea`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selector loaded and failed at `tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:143:18`. The decision remained `awaiting_input`, emitted no human decision, and supplied no bound SDD work order. The test continues through `next` and evaluates all four expected outcomes before its final assertion.

```text
FAIL |unit|  tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts > TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order
AssertionError: expected { …(4) } to deeply equal { decisionState: 'ready', …(3) }
- Expected
+ Received
  Object {
-   "authorization": ObjectContaining {
-     "capture": "agent_captured",
-     "kind": "human_decision",
-     "operation": "CREATE",
-     "target": Object {
-       "slotId": "slot-3-1",
-     },
-   },
-   "decisionState": "ready",
-   "humanDecisionCount": 1,
+   "authorization": null,
+   "decisionState": "awaiting_input",
+   "humanDecisionCount": 0,
    "sddWorkOrder": Object {
-     "authorizationRefsMatch": true,
-     "stageKind": "sdd",
-     "target": Object {
-       "slotId": "slot-3-1",
-     },
+     "authorizationRefsMatch": false,
+     "stageKind": undefined,
+     "target": null,
    },
  }
❯ tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:143:18
Test Files  1 failed (1)
Tests       1 failed (1)
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`; both `decide` calls and both operands were still evaluated. The identical selector command passed 1/1 with exit 0. The test was restored and the selector failed again at the same assertion; test SHA-256 returned to `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`.

```diff
@@ -140,5 +140,6 @@ it("TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision use
       authorizationRefsMatch: true,
     },
   };
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose
Exit: 0
✓ |unit| tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts > TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: Oracle proof plan: After GREEN, temporarily remove the new SDD work order's `authorizationRefs` while preserving the authorization and target. The same selector must fail on `authorizationRefsMatch: false` against expected `true`. Restore the source and rerun GREEN.
- Round 1: Revision: `working-tree+3aaf41d9fc2b30faf95af865bb0bfe43deb3d544edbcc60441ed333f339d6b0a` (two consecutive calculations agreed; 2,496 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the selector passed 1/1. The decision returned a `human_decision` CREATE authorization with `capture: agent_captured` for the opened slot, and the next SDD work order carried that slot as its target and referenced the authorization document. The shared two-file suite passed all three selectors. Restored source SHA-256: `cdf08d52b6d28845f871730a9fd72837426c425bf1c041dec560a0d71ff16682`; TDD-0003 test SHA-256: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`; shared test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.

```text
✓ |unit| tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts > TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: Oracle proof: A temporary source mutation removed only the SDD work order's `authorizationRefs` property. The same selector failed at line 143:18 on `authorizationRefsMatch: false` against expected `true`; authorization creation, target and ready state remained. The source was restored immediately, then the selector passed 1/1 and the shared suite passed 3/3 again.

```diff
@@ -217,11 +217,6 @@ export function decide(
       ...(stage.stageKind === "sdd"
         ? {
             target: { kind: "new_capability" as const, slotId: approval.target.slotId },
-            authorizationRefs: approval.authorizationId
-              ? [`authorizations/${approval.authorizationId}.json`]
-              : [],
           }
         : {}),
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose
Exit: 1
AssertionError: expected { decisionState: 'ready', …(3) } to deeply equal { decisionState: 'ready', …(3) }
-     "authorizationRefsMatch": true,
+     "authorizationRefsMatch": false,
❯ tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:143:18
Test Files  1 failed (1)
Tests       1 failed (1)
```

- Cross-spec ownership: all 18 other spec ledgers and 386 `done` rows were checked before editing `decide.ts`. None directly owns the source or either test file; the reverse production import closure reaches only this spec's test files. No other spec's completed row was affected.
- Refactor decision: no code edit. The new `decision` branch and SDD reference generation serve this row's causal boundary. A generic replay or decision abstraction would precede later obligations.
- Relevant suite: the reverse production import closure of `decide.ts` contains the two spec-0018 unit test files and no production importer; package fallback is unnecessary. The suite covers TDD-0001, TDD-0002 and TDD-0003.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; two files and all three selectors passed before and after the completed-row oracle re-verification. No source or test edit followed the restored GREEN run.
- Refactor verify revision: `working-tree+3aaf41d9fc2b30faf95af865bb0bfe43deb3d544edbcc60441ed333f339d6b0a` (two consecutive calculations agreed; 2,496 path records).
- Completed-row oracle re-verification: On the current source, TDD-0001's returned-state mutation failed its selector at line 90:18 on `routing` versus `awaiting_input`. TDD-0002's missing-result-reference mutation failed at line 233:6 with replay failure and only SDD issued. Its later CREATE-event mutation failed at line 233:6 on `laterCreateQuestions: 1` against expected `0`, with stages and replayed results intact. Each mutation was removed immediately, and the shared suite passed 3/3 afterward. Restored source SHA-256: `cdf08d52b6d28845f871730a9fd72837426c425bf1c041dec560a0d71ff16682`; shared test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`; TDD-0003 test SHA-256: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`.

```text
TC-0018-0001 mutation: exit 1; line 90:18; expected awaiting_input, received routing; 1 failed, 1 skipped.
TC-0018-0002 missing resultRef mutation: exit 1; line 233:6; replayFailure "accepted event lacks its result reference or stage identity"; 1 failed, 1 skipped.
TC-0018-0002 extra CREATE mutation: exit 1; line 233:6; laterCreateQuestions expected 0, received 1; 1 failed, 1 skipped.
Restored suite: exit 0; Test Files 2 passed (2); Tests 3 passed (3).
```

```diff
@@ -353,7 +353,7 @@ export function decide(
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
@@ -277,7 +277,7 @@ export function decide(
-          resultRef: `results/${result.resultId}.json`,
+          resultRef: `results/missing-${result.resultId}.json`,
@@ -233,6 +233,9 @@ export function decide(
       events: [
         { type: "work-order-issued", workOrder: nextWorkOrder },
+        ...(stage.stageKind === "sdd"
+          ? [{ type: "question-opened", question: { kind: "create" } as WorkflowQuestion }]
+          : []),
         { type: "dispatch-work-order" },
```

- Round 1: Review pack (attempt 1): `.qfai/review/review-20260924232138000/`.
- Round 1: Review pack seal (attempt 1): `c0ea171f89875ed76b17a5f514b2e1aa1995ed734239e2e954e62e4ffb8470c5` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE

#### Review fix under CR-20260924-0002

- The Round 1 blocking finding is fixed: `next` issues the SDD work order only when the CREATE approval carries a persisted `authorizationId`, and the order's `authorizationRefs` holds exactly that record's path. A missing ID opens a new `create` question instead (TDD-0527). The `SIMPLIFIED` marker that deferred this check is removed.
- `decide.ts` TS2322 fixed: the decision branch narrows `snapshot.scopeDigest` to `string` before building the authorization record.
- The test's ready snapshot now passes the recorded authorization itself as the approval, which removed a type assertion and an `exactOptionalPropertyTypes` error under `tsconfig.tests.json`.
- Re-run: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern='TC-0018-0003 \(TDD-0003\)' --reporter=verbose` (cwd `packages/qfai`) exit 0; 1 passed, 1 skipped.
- The Round 1 advisory on round-evidence layout was repaired earlier (see Record defects).

### TDD-0004

- TDD-ID: TDD-0004
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/oneApprovalPerCapability.test.ts`
- Selector: `TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round`
- TC-ref: TC-0018-0004
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — Round 1 RED phase at `working-tree+5cfdcc5a3a2d209496a007fcd45ec33679a5b9a9de0d5662edb8cec7e657a1d9`; Round 1 GREEN and oracle phase at `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+5cfdcc5a3a2d209496a007fcd45ec33679a5b9a9de0d5662edb8cec7e657a1d9` (two calculations agreed; 2,499 path records).
- Round 1: RED test hash: `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`
- Seam file SHA-256: `cdf08d52b6d28845f871730a9fd72837426c425bf1c041dec560a0d71ff16682`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneApprovalPerCapability.test.ts --testNamePattern=TC-0018-0004 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selector loaded and failed at `tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18`. The two-capability proposal was refused, leaving state `routing` and zero opened questions. The expected state was `awaiting_input` with two CREATE questions in one round, distinct slot IDs and no work order.

```text
FAIL |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
AssertionError: expected { state: 'routing', opened: [], …(3) } to deeply equal { state: 'awaiting_input', …(4) }
Expected: state awaiting_input; opened two distinct CREATE questions; sameRound true; distinctSlots true; workOrders 0.
Received: state routing; opened []; sameRound false; distinctSlots false; workOrders 0.
❯ tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18
Test Files 1 failed (1); Tests 1 failed (1)
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, questions, event checks and both comparison operands remained evaluated. The same command passed the selector 1/1 with exit 0. The original assertion was restored; the same selector failed again. The restored test SHA-256 was `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily give the second CREATE question the first question's `slotId` while preserving both questions and their goals. The selector must fail on `distinctSlots: false` against `true`. Restore the source and rerun the selector and shared suite.
- Round 1: Revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628` (two calculations agreed; 2,499 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneApprovalPerCapability.test.ts --testNamePattern=TC-0018-0004 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the selected test passed 1/1. The routing branch maps both valid capabilities to CREATE questions with distinct indexed question and slot IDs. One capability retains its existing IDs and `sequence + 2`; two emit two `question-opened` events and one `unsettled-material-input` event with `sequence + 3`. The three-file suite passed all four selectors after restoring the oracle mutation. Restored source SHA-256: `264cbf0c2d034e55f0457a2d61b907c53ecd25c3aa8be2ca6038aa6ce3195344`; TDD-0004 test SHA-256: `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`.

```text
✓ |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof: A temporary source mutation gave the second CREATE question the first question's `slotId` and preserved the two questions, their goals, `sameRound: true`, state `awaiting_input` and zero work orders. The selected test failed at `tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18` on `distinctSlots: false` against expected `true`. The source was restored immediately; the selector passed 1/1 and the three-file suite passed 4/4. Source and test hashes returned to those in the GREEN result.

```diff
@@ -347,7 +347,7 @@ export function decide(
       goal: capability.goal,
       covers: capability.covers,
       excludes: capability.excludes,
-      slotId: `slot-${run.sequence + 1}-${index + 1}`,
+      slotId: `slot-${run.sequence + 1}-1`,
     },
```

```text
Mutation command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneApprovalPerCapability.test.ts --testNamePattern=TC-0018-0004 --reporter=verbose
Mutation: exit 1; FAIL |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'awaiting_input', …(4) }
-   "distinctSlots": true,
+   "distinctSlots": false,
❯ tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18
Restored selector: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
Restored relevant suite: exit 0; Test Files 3 passed (3); Tests 4 passed (4).
```

- Cross-spec ownership: The other 18 spec ledgers and 386 `done` rows were screened. Only spec-0018 names `decide.ts` directly. The reverse production import closure reaches this spec's three unit test files and no production importer.
- Refactor decision: no code edit. The routing branch maps valid capabilities to questions; another abstraction would not reduce the current obligation.
- Relevant suite: `oneCreateQuestionAtRouting.test.ts`, `theAnswerIsABoundHumanDecision.test.ts` and `oneApprovalPerCapability.test.ts` are the reverse dependency closure of `decide.ts` and cover TDD-0001 through TDD-0004.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; three test files and all four selectors passed before and after the completed-row mutations. No source or test edit followed the restored GREEN run.
- Refactor verify revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628` (two calculations agreed; 2,499 path records).
- Completed-row oracle re-verification: On the current source, TDD-0001's returned-state mutation failed its selector at line 90:18 on `routing` versus `awaiting_input`. TDD-0002's missing-result-reference mutation failed at line 233:6 with replay failure and only SDD issued. Its later CREATE-event mutation failed at line 233:6 on `laterCreateQuestions: 1` against expected `0`. Each source mutation was removed immediately. The relevant suite passed 4/4 afterward. Restored source SHA-256: `264cbf0c2d034e55f0457a2d61b907c53ecd25c3aa8be2ca6038aa6ce3195344`; shared test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`; TDD-0003 test SHA-256: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`; TDD-0004 test SHA-256: `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`.

```text
TC-0018-0001 mutation: exit 1; line 90:18; expected awaiting_input, received routing; 1 failed, 1 skipped.
TC-0018-0002 missing resultRef mutation: exit 1; line 233:6; replayFailure "accepted event lacks its result reference or stage identity"; 1 failed, 1 skipped.
TC-0018-0002 extra CREATE mutation: exit 1; line 233:6; laterCreateQuestions expected 0, received 1; 1 failed, 1 skipped.
Restored suite: exit 0; Test Files 3 passed (3); Tests 4 passed (4).
```

- Round 1: Review pack (attempt 1): `.qfai/review/review-20260925001224837/`.
- Round 1: Review pack seal (attempt 1): `118d059f26cce67536c545949ab34b16d2f74d1ad2afd4081fb439cc72478edc` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): PASS.
- Spec review: PASS.
- Spec reviewed revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`.
- Spec audited evidence hash: `748d67d6cb2b70285f6502c00993cdcf8dcec22f6cc5aa5289c15cfa061afa68`.
- Spec review pack: `.qfai/review/review-20260925001224837/`.
- Spec review pack seal: `118d059f26cce67536c545949ab34b16d2f74d1ad2afd4081fb439cc72478edc`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`.
- Code quality audited evidence hash: `748d67d6cb2b70285f6502c00993cdcf8dcec22f6cc5aa5289c15cfa061afa68`.
- Code quality review pack: `.qfai/review/review-20260925001224837/`.
- Code quality review pack seal: `118d059f26cce67536c545949ab34b16d2f74d1ad2afd4081fb439cc72478edc`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results; TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order; TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round; four selected tests passed`
- Checkpoint verification revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`
- Checkpoint verification seal: `8e6ec6ed825762871b8b12387526e38079fd264b0c941be10ecad9c56086085a`

### TDD-0005

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theSddWorkOrderAlwaysHasATarget.test.ts`
- Selector: `TC-0018-0005 (TDD-0005): Issue the SDD work order, then accept an SDD result reporting bindings for the slot`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theSddWorkOrderAlwaysHasATarget.test.ts --testNamePattern='TC-0018-0005 \(TDD-0005\): Issue the SDD work order, then accept an SDD result reporting bindings for the slot' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theSddWorkOrderAlwaysHasATarget.test.ts:97:18` — the SDD work order targeted the slot, but accepting the result with `bindings` published no `binding-recorded` event, so no later work order was issued.
- GREEN result: exit 0; `✓ ... TC-0018-0005 (TDD-0005): ...`, 1 passed. The SDD order targets `{ kind: "new_capability", slotId }`, one `binding-recorded` event carries the binding, and the next work order targets `{ kind: "spec", specId }`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`accept` of an SDD result publishes one `binding-recorded` event per binding; a later feature work order targets the bound spec).

### TDD-0006

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0006): scope-digest-at-issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0006\): scope-digest-at-issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(reasked)` at `tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts:104:34` — `next` issued the SDD work order (state `running`, `work-order-issued`) although the current scope digest differed from the approval's.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0006): scope-digest-at-issue`, 1 passed. State `awaiting_input`, one new `create` question for the slot, no work order.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`approvalIsStale` compares the recorded and current scope digests; a stale approval at SDD issue re-asks through `reaskCreate`, the same path as a missing authorization ID).

### TDD-0007

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0007): scope-digest-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0007\): scope-digest-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(reasked)` at `tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts:108:34` — `accept` applied the SDD result (`accept-nonfinal-result`, `binding-recorded`) under a changed scope digest.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0007): scope-digest-at-accept`, 1 passed, 1 skipped. The result is not applied; the run moves to `awaiting_input` with a new `create` question.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`accept` of the SDD work order re-asks when the approval is stale).

### TDD-0008

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0008): capability-text-at-issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0008\): capability-text-at-issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(reasked)` at `tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts:117:42` — the SDD work order was issued although the checked capability text for the slot differed from the approved text.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0008): capability-text-at-issue`, 1 passed, 2 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`approvalIsStale` also compares the approved capability text with the current one for the slot; the new question carries the current text).

### TDD-0009

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0009): capability-text-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0009\): capability-text-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0007 and TDD-0008: the accept-time check calls the same staleness judgement.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0009): capability-text-at-accept`, 1 passed, 3 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0008).

### TDD-0010

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0010): widening-replan-at-issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0010\): widening-replan-at-issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0006. The fixture computes both digests from the write areas, so a replan that adds `src/billing/**` changes the scope digest the approval was given under.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0010): widening-replan-at-issue`, 1 passed.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0006).

### TDD-0011

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0011): widening-replan-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0011\): widening-replan-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0007, for the same reason as TDD-0010.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0011): widening-replan-at-accept`, 1 passed, 6 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0007).

### TDD-0012

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0007 (TDD-0012): Bind the created spec ID, then issue the next SDD-bound work order`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0007 \(TDD-0012\): Bind the created spec ID, then issue the next SDD-bound work order' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0005 and TDD-0006: binding the spec leaves the scope digest unchanged, so the next work order targets the bound spec and no question opens.
- GREEN result: exit 0; `✓ ... TC-0018-0007 (TDD-0012): ...`, 1 passed, 6 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0005).

### TDD-0013

- TDD-ID: TDD-0013
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts`
- Selector: `TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order`
- TC-ref: TC-0018-0008
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — Round 1 RED phase at `working-tree+25095ae4136a17dde3a3535e3cb918e8255bcfb30f6f476fa03891800ce0022b`; Round 1 GREEN and oracle phase at `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+25095ae4136a17dde3a3535e3cb918e8255bcfb30f6f476fa03891800ce0022b` (two calculations agreed; 2,500 path records).
- Round 1: RED test hash: `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`
- Seam file SHA-256: `264cbf0c2d034e55f0457a2d61b907c53ecd25c3aa8be2ca6038aa6ce3195344`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --testNamePattern=TC-0018-0008 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selected test loaded and failed at `tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18`. The stop answer was refused, leaving state `awaiting_input` without an authorization or stop event. The expected state was `cancelled` over `authorized-stop`, with a recorded `human_decision` stop answer, no binding and no work order.

```text
FAIL |unit|  tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
AssertionError: expected { ok: false, …(6) } to deeply equal { ok: true, state: 'cancelled', …(5) }

- Expected
+ Received

  Object {
-   "authorization": Object {
-     "capture": "agent_captured",
-     "effect": "stop",
-     "kind": "human_decision",
-     "operation": "CREATE",
-     "optionIds": Array [
-       "decline",
-     ],
-     "slotId": "slot-3-1",
-   },
+   "authorization": null,
    "bindingEvents": 0,
-   "ok": true,
-   "state": "cancelled",
-   "stopEvents": 1,
+   "ok": false,
+   "state": "awaiting_input",
+   "stopEvents": 0,
    "workOrder": null,
    "workOrderEvents": 0,
  }
 ❯ tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, event checks and both comparison operands remained evaluated. The same command passed the selector 1/1 with exit 0. The original assertion was restored; the same selector failed again. The restored test SHA-256 was `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily omit the `authorized-stop` event while preserving the `cancelled` verdict and recorded stop authorization. The selector must fail on `stopEvents: 0` against `1`. Restore the source and rerun the selector and relevant suite.
- Round 1: Revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578` (two calculations agreed; 2,500 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --testNamePattern=TC-0018-0008 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the selected test passed 1/1. A valid stop answer records a `human_decision` with effect `stop`, emits `authorized-stop`, returns `cancelled` with sequence advanced by the two events, and issues no work order or binding. The existing proceed path stays `ready` with one event. The four-file relevant suite passed all five selectors after restoring the oracle mutation. Restored source SHA-256: `a2ff1270001346bd89f9b770925e8ff0bbef10a5e98852c409c6ef7bd8406029`; TDD-0013 test SHA-256: `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`.

```text
✓ |unit| tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof: A temporary source mutation omitted only the `authorized-stop` event, preserving the recorded stop authorization and `cancelled` verdict. The same selector failed at `tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18` on `stopEvents: 0` against expected `1`. The source was restored immediately; the selector passed 1/1 and the four-file suite passed 5/5. Source and test hashes returned to the GREEN values.

```diff
-    if (chosen.effect === "stop") events.push({ type: "authorized-stop" });
```

```text
Mutation command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --testNamePattern=TC-0018-0008 --reporter=verbose
Mutation: exit 1; FAIL |unit| tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
AssertionError: expected { ok: true, state: 'cancelled', …(5) } to deeply equal { ok: true, state: 'cancelled', …(5) }
-   "stopEvents": 1,
+   "stopEvents": 0,
❯ tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18
Restored selector: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
Restored relevant suite: exit 0; Test Files 4 passed (4); Tests 5 passed (5).
```

- Cross-spec ownership: The other 18 spec ledgers and their completed rows were screened. Only spec-0018 names `decide.ts` directly; no other spec's done test owns this module or a reverse dependency.
- Refactor decision: no code edit. The stop and proceed outcomes and their event counts remain clear in the local decision branch; an added abstraction would not reduce this obligation.
- Relevant suite: four unit test files directly import `decide.ts`; no production importer reaches it. They cover TDD-0001 through TDD-0004 and TDD-0013.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; four files and all five selectors passed before and after the completed-row oracle mutations. No source or test edit followed the restored GREEN run.
- Refactor verify revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578` (two calculations agreed; 2,500 path records).
- Completed-row oracle re-verification: TDD-0001's returned-state mutation failed its selector at line 90:18 on `routing` versus `awaiting_input`. TDD-0002's missing-result-reference mutation failed at line 233:6 with replay failure and only SDD issued. Its later CREATE-event mutation failed at line 233:6 on `laterCreateQuestions: 1` against expected `0`. TDD-0004's duplicated slot-ID mutation failed at line 104:18 on `distinctSlots: false` against `true`. Each source mutation was removed immediately; the relevant suite passed 5/5 afterward. Restored source SHA-256: `a2ff1270001346bd89f9b770925e8ff0bbef10a5e98852c409c6ef7bd8406029`; test SHA-256 values: TDD-0001/0002 `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`, TDD-0003 `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`, TDD-0004 `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`, TDD-0013 `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`.

```text
TC-0018-0001 mutation: exit 1; line 90:18; expected awaiting_input, received routing; 1 failed, 1 skipped.
TC-0018-0002 missing resultRef mutation: exit 1; line 233:6; replayFailure "accepted event lacks its result reference or stage identity"; 1 failed, 1 skipped.
TC-0018-0002 extra CREATE mutation: exit 1; line 233:6; laterCreateQuestions expected 0, received 1; 1 failed, 1 skipped.
TC-0018-0004 duplicated slot mutation: exit 1; line 104:18; distinctSlots expected true, received false; 1 failed.
Restored suite: exit 0; Test Files 4 passed (4); Tests 5 passed (5).
```

- Round 1: Review pack (attempt 1): `.qfai/review/review-20260925005231037/`.
- Round 1: Review pack seal (attempt 1): `51bc232f68df1ff99750fdaa733848e00338f16752ad067ef3da4e7ecf37ad4e` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): PASS.
- Spec review: PASS.
- Spec reviewed revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`.
- Spec audited evidence hash: `1ad1a9d6a9e3351c9a502d5bd4d44d984fb36b3a2f619c0951c644fa7882a16a`.
- Spec review pack: `.qfai/review/review-20260925005231037/`.
- Spec review pack seal: `51bc232f68df1ff99750fdaa733848e00338f16752ad067ef3da4e7ecf37ad4e`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`.
- Code quality audited evidence hash: `1ad1a9d6a9e3351c9a502d5bd4d44d984fb36b3a2f619c0951c644fa7882a16a`.
- Code quality review pack: `.qfai/review/review-20260925005231037/`.
- Code quality review pack seal: `51bc232f68df1ff99750fdaa733848e00338f16752ad067ef3da4e7ecf37ad4e`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results; TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order; TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round; TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order; five selected tests passed`
- Checkpoint verification revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`
- Checkpoint verification seal: `a248375e5b52de270e8bd8485aceb177c4c4b1dfee914b078f7845acc1d46ff5`

### TDD-0014

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theAnnouncement.test.ts`
- Selector: `TC-0018-0010 (TDD-0014): Decide accept of a routing result whose proposal passes every check`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnnouncement.test.ts --testNamePattern='TC-0018-0010 \(TDD-0014\): Decide accept of a routing result whose proposal passes every check' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theAnnouncement.test.ts:99:18` — the routing accept only knew the feature route with a new capability, so a checked bounded-change proposal was refused `invalid-input` with no plan.
- GREEN result: exit 0; `✓ ... TC-0018-0010 (TDD-0014): ...`, 1 passed. State `ready`; the verdict's plan holds the goal, the built-in plan's stages in order and the proposal's write scope; no question opens.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a checked proposal with no new capability becomes the plan: the built-in plan for its route, passed in `facts.plans`, with the proposal's goal and write scope; one `plan-accepted` event).

### TDD-0015

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived; the Round 3 REVISE finding is fixed below under the approved reference shape.

- TDD-ID: TDD-0015
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0015): unknown-path`
- TC-ref: TC-0018-0012
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (Round 1 RED phase gate at `working-tree+68d6796b21f9928473ecab7b6e48c5c706581d1e86ab7d232ee2082b06c8bceb`; GREEN and oracle phase gate at `working-tree+ad867399af45718211f7f2f98157044e07647f2cfb7cd1683e7b53d4bca52385`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+68d6796b21f9928473ecab7b6e48c5c706581d1e86ab7d232ee2082b06c8bceb` (independently calculated; 2,503 path records).
- Round 1: RED test hash: `36b3bb736e8be02c12d4991bb32824ddfe18615419e3fcb9154171586ea0360b`
- Seam file SHA-256: `a2ff1270001346bd89f9b770925e8ff0bbef10a5e98852c409c6ef7bd8406029`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the test loaded and failed at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:86:18`. Its only nonexistent `observedRefs` path is `packages/qfai/src/core/workflow/missing-observed-reference.ts`, and `facts.pathExistence` marks that same path false. The current core opens a CREATE question and moves from `routing` sequence 2 to `awaiting_input` sequence 4. The test expects `proposal-refused`, projects `error.reasons[].reason` to `reasons: ["unknown-path"]`, and checks the unchanged run and empty events. It does not assert `error.reasons[].subject`.

```text
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: true, code: undefined, …(3) } to deeply equal { ok: false, …(4) }
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:86:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, reason extraction and both operands remained evaluated. The same selector passed 1/1 with exit 0. The original assertion was restored and failed at the same line. The restored test SHA-256 is `36b3bb736e8be02c12d4991bb32824ddfe18615419e3fcb9154171586ea0360b`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily omit the unknown-path refusal while preserving routing acceptance. The same selector must fail on `ok: true`, `awaiting_input` and question events against the refusal expectation. Restore the source and rerun the selector and relevant suite.
- Round 1: Revision: `working-tree+ad867399af45718211f7f2f98157044e07647f2cfb7cd1683e7b53d4bca52385` (two calculations agreed; 2,503 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; one selected test passed. For a path-shaped `observedRefs` item without a true entry under the same key in `facts.pathExistence`, the pure core returns `proposal-refused` with `{ reason: "unknown-path", subject: path }`, preserves the `routing` run and emits no event. It does not check future `proposedWriteScope` globs. Restored source SHA-256: `d9534af70fed9e4e300aef115edbe5c01d7d68ea280762cadea55f6b76a8debc`; test SHA-256: `36b3bb736e8be02c12d4991bb32824ddfe18615419e3fcb9154171586ea0360b`.

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof: The guard was changed from `unknownPaths.length > 0` to `< 0` without altering the test. The same selector failed at `:86:18` because it returned `ok: true`, state `awaiting_input`, sequence 4 and question events rather than the refusal. The source was restored immediately; selector 1/1 and the five-file relevant suite 6/6 passed. Both source and test hashes returned to the GREEN values.

```diff
-  if (unknownPaths.length > 0) {
+  if (unknownPaths.length < 0) {
```

```text
Mutation command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose (cwd: packages/qfai).
Mutation selector: exit 1; FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path; AssertionError at tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:86:18.
Expected projection: ok false; code proposal-refused; reasons [unknown-path]; run routing/2; events [].
Received projection: ok true; code undefined; reasons []; run awaiting_input/4; two events (question-opened and unsettled-material-input).
Restored selector: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
Restored relevant suite: exit 0; Test Files 5 passed (5); Tests 6 passed (6).
```

- Completed-row oracle re-verification: The original TDD-0001 returned-state mutation failed at line 90:18. TDD-0002's result-reference mutation and extra CREATE mutation each failed at line 233:6. TDD-0004's duplicated slot mutation failed at line 104:18. TDD-0013's omitted `authorized-stop` event failed at line 86:18. Each selector failed on its original assertion, and each source mutation was restored immediately. The relevant suite passed 6/6 afterward. Restored source SHA-256: `d9534af70fed9e4e300aef115edbe5c01d7d68ea280762cadea55f6b76a8debc`.
- Cross-spec ownership: Eighteen other spec ledgers were screened. No `done` row directly owns `decide.ts` or the new test, and no production importer reaches `decide.ts`. Five unit test files import it directly.
- Relevant suite command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Relevant suite result: exit 0; five files and six selectors passed after restoring every mutation.
- Quality checks: direct Prettier and ESLint on `decide.ts`, and `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0. The root `pnpm` gate remains unavailable because the existing `node_modules` junction is rejected as unsafe before scripts run.
- Refactor decision: no code edit. The local filter and early refusal serve one reason; extracting a shared proposal validator is deferred until later proposal-reason rows supply its other checks.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; five files and six selectors passed. No source or test edit followed the restored GREEN run. The completed-row oracle re-verification above applies to the same source and test hashes.
- Refactor verify revision: `working-tree+ad867399af45718211f7f2f98157044e07647f2cfb7cd1683e7b53d4bca52385` (two calculations agreed; 2,503 path records).
- Round 1: Review pack (attempt 1): `.qfai/review/review-20260925012708000/`.
- Round 1: Review pack seal (attempt 1): `95b8a7a4d5ba0147a9bc846e1d4680cb3398ecfdaa23e3f496f4bad0e7a9054d` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE. The implementation review found two bypasses: an extensionless root-file `observedRefs` path with an explicit false existence fact, and a nonexistent path in `expectedBehaviorRefs`. Both reach the CREATE question instead of `unknown-path` refusal. The completion review passed the tested boundary and recorded a nonblocking example-trace advisory.

#### Round 2

- Round 2: RED revision: `working-tree+12d8fa6bb8b8468b6f738d61b6eb13a65e07f886e4aee53cb58b3af5e14e8733` (two calculations agreed; 2,503 path records).
- Round 2: RED test hash: `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`
- Seam file SHA-256: `d9534af70fed9e4e300aef115edbe5c01d7d68ea280762cadea55f6b76a8debc`
- Round 2: qa-gatekeeper RED: PASS at `working-tree+12d8fa6bb8b8468b6f738d61b6eb13a65e07f886e4aee53cb58b3af5e14e8733` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`.
- Round 2: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`)
- Round 2: RED failure mode: assertion
- Round 2: RED result: exit 1; the single selector loaded and failed at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18`. Three absent paths are supplied in `facts.pathExistence` and the proposal: the original slash-containing observed path, extensionless root file `Dockerfile`, and normative `.qfai/specs/missing/01_Spec.md`. The core returns `proposal-refused`, keeps the run at `routing` sequence 2 and emits no event, but its `reasons[]` contains only the original observed path. The test expects `unknown-path` with the correct subject for all three.

```text
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
Expected reasons: [.qfai/specs/missing/01_Spec.md, Dockerfile, packages/qfai/src/core/workflow/missing-observed-reference.ts], each with reason unknown-path.
Received reasons: [packages/qfai/src/core/workflow/missing-observed-reference.ts] only; code, run and events matched.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

- Round 2: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, all three path observations, projections and both comparison operands remained evaluated. The same selector passed 1/1 with exit 0. The original assertion was restored and failed at the same line. Restored test SHA-256: `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 2: Oracle proof plan: After GREEN, separately suppress the explicit false fact for an extensionless root file and omit normative references from the unknown-path candidate set. Each temporary mutation must make the same selector fail with two reasons instead of three, while preserving the original slash-containing observed-path refusal. Restore and rerun the selector and relevant suite after each mutation.
- Round 2: Revision: `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` (two consecutive calculations agreed; 2,503 path records).
- Round 2: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: GREEN result: exit 0; one selected test passed. The pure core refused all three absent references with `unknown-path` and the correct subject while preserving the `routing` run and emitting no event. It now checks `expectedBehaviorRefs` and `observedRefs` together, de-duplicates references, and treats an explicit `facts.pathExistence` key as a path even when the name has no slash or extension. The restored source SHA-256 is `d1040dc41c4979a81b3056fc570e4d33dd84c86fb5fc69f1f9e6aa2ca03d5e78`; the test SHA-256 is `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`.

```text
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 2: Oracle proof: Two isolated source mutations made the same selector fail at line 99 with exit 1. Replacing the explicit existence-key check with `false` omitted only the `Dockerfile` reason. Removing `expectedBehaviorRefs` from the candidate set omitted only the `.qfai/specs/missing/01_Spec.md` reason. Both mutations were restored immediately, and the selector passed again. The original completed-row mutations for TDD-0001, TDD-0002 (result reference and extra CREATE question), TDD-0004 and TDD-0013 all failed their respective selectors by assertion and were restored. The full relevant suite then passed 6/6.
- Round 2: Oracle command for each isolated mutation: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`). Each run exited 1 on the selected row's assertion at line 99; neither was a load or syntax failure. The mutations were applied and restored one at a time.

```diff
-Object.hasOwn(facts.pathExistence ?? {}, ref)
+false
```

```diff
-new Set([...proposal.expectedBehaviorRefs, ...proposal.observedRefs])
+new Set([...proposal.observedRefs])
```

```text
Mutation 1: explicit existence-key check replaced by false
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
-       "subject": "Dockerfile",
Received retained the normative path and slash-containing observed path, but omitted Dockerfile.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18
Test Files  1 failed (1); Tests  1 failed (1); exit 1

Mutation 2: expectedBehaviorRefs omitted from candidate set
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
-       "subject": ".qfai/specs/missing/01_Spec.md",
Received retained Dockerfile and the slash-containing observed path, but omitted the normative path.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18
Test Files  1 failed (1); Tests  1 failed (1); exit 1
```

- Round 2: Relevant suite: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`), exit 0; five files and six tests passed after all source mutations were restored.
- Round 2: Quality checks: direct Prettier and ESLint on `decide.ts`, and `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0. The root `pnpm` commands cannot start because the existing `node_modules` junction is rejected as unsafe before scripts run.
- Round 2: qa-gatekeeper GREEN: PASS at `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`. The independent replay ran the selector 1/1 and relevant suite 6/6, checked both assertion-failing mutations and restored hashes, and recomputed the 2,503-record revision.
- Round 2: Refactor decision: no code edit. The local set of normative and observed references and the existing early refusal cover this row. A shared validator is deferred until later proposal-reason rows need it.
- Round 2: Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: Refactor verify result: exit 0; five files and six tests passed. No source or test edit followed the GREEN and oracle observations. The source and test SHA-256 values remain `d1040dc41c4979a81b3056fc570e4d33dd84c86fb5fc69f1f9e6aa2ca03d5e78` and `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`. The reverse import scan found five direct unit tests, no production importer and no other spec's completed row directly owning these paths.
- Round 2: Refactor verify revision: `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` (two consecutive calculations agreed; 2,503 path records).
- Round 2: Review pack (attempt 1): `.qfai/review/review-20260925015119000/`.
- Round 2: Review pack seal (attempt 1): `82bc38bc6365bb2c1c8a76ffb5dffeabe6122200a9508faf470f48f0cced17ac` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 2: reviewer verdict (attempt 1): REVISE. Completion review passed. Implementation review confirmed the two Round 1 fixes but reproduced a project-root dotfile reference `.missing-observed-file` with no existence fact passing to a CREATE question. The CLI-WF missing-path rule requires fail-closed refusal; Round 3 will extend the same selector and path classification. Both reviewers independently recorded revision `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` and audited evidence hash `ef7f28929a16c25a1b951e011a110f0a6f9b18a3f7fcf767a1fac96066da9d1a`.

#### Round 3

- Round 3: RED revision: `working-tree+6556c52da5c75b8c4b49096ddaf8a8a3af08d060d64f75fe8496cbf53c482c11` (two consecutive calculations agreed; 2,503 path records).
- Round 3: RED test hash: `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`
- Seam file SHA-256: `d1040dc41c4979a81b3056fc570e4d33dd84c86fb5fc69f1f9e6aa2ca03d5e78`
- Round 3: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`).
- Round 3: RED failure mode: assertion
- Round 3: RED result: exit 1; the selected test failed at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:100:18`. The same proposal now includes `.missing-observed-file` in `observedRefs` with no corresponding `facts.pathExistence` key. The test observes that the file does not exist. The current code returns the existing three `unknown-path` reasons but omits the dotfile reason; refusal code, `routing` sequence 2 and empty events match.

```text
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
Expected also includes: "subject": ".missing-observed-file"
Received omits only the dotfile reason and retains the other three reasons.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:100:18
Test Files  1 failed (1); Tests  1 failed (1); exit 1
```

- Round 3: RED assertion-stripped result: Only the final assertion was replaced by `void actual; void expected;`; the proposal, `decide` call and both comparison operands still ran. The same selector passed 1/1 with exit 0. The test was restored immediately and failed again at line 100. The restored test SHA-256 is `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
Assertion-stripped selector, same command as RED:
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files  1 passed (1); Tests  1 passed (1); exit 0.
Restored selector: Test Files 1 failed (1); Tests 1 failed (1); exit 1, assertion at line 100.
Baseline excluding this RED selector: Test Files 4 passed (4); Tests 5 passed (5); exit 0.
```

- Round 3: Oracle proof plan: After GREEN, remove only the root-dotfile path condition. The same selector must fail with the dotfile reason absent and the other three reasons retained. Restore immediately, rerun the selector and relevant suite, and reverify completed-row oracles for the shared source.
- Round 3: Quality checks: direct Prettier and ESLint on the test, plus `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0.
- Round 3: qa-gatekeeper RED: PASS at `working-tree+6556c52da5c75b8c4b49096ddaf8a8a3af08d060d64f75fe8496cbf53c482c11` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`. The independent replay reproduced the assertion failure for the single missing dotfile reason, checked the selector's assertion-stripped PASS and restored test/source hashes, and recomputed the 2,503-record revision.
- Round 3: Revision: `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` (two consecutive calculations agreed; 2,503 path records).
- Round 3: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`).
- Round 3: GREEN result: exit 0; the selected test passed 1/1 with `unknown-path` reason and subject for all four missing references, unchanged `routing` sequence 2 and no events. The only code change in this round is a root-dotfile path condition in the existing classifier. Restored source SHA-256: `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e`; test SHA-256: `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`.

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files  1 passed (1); Tests  1 passed (1); exit 0
```

- Round 3: Oracle proof: Three isolated mutations each made the same TDD-0015 selector fail at the final assertion, and each was restored immediately. Removing the new dotfile condition omitted only `.missing-observed-file`; disabling the explicit existence-key check omitted only `Dockerfile`; omitting `expectedBehaviorRefs` from the candidate set omitted only `.qfai/specs/missing/01_Spec.md`. The completed-row mutations for TDD-0001, TDD-0002 (result reference and extra CREATE question), TDD-0004 and TDD-0013 also failed their own selectors by assertion and were restored. All eight mutations were removed before the final relevant-suite run.
- Round 3: Oracle command for each TDD-0015 mutation: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`). Each run exited 1 on the selected test's assertion at line 100, with the named reason absent and the other three reasons retained.

```diff
-        /^\.[^./\\]+$/.test(ref)) &&
+        false) &&
```

```text
Mutation 1 (root-dotfile condition removed): expected 4 reasons, received 3; missing subject .missing-observed-file.
Mutation 2 (explicit existence-key check removed): expected 4 reasons, received 3; missing subject Dockerfile.
Mutation 3 (normative candidate removed): expected 4 reasons, received 3; missing subject .qfai/specs/missing/01_Spec.md.
Each: FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Each: AssertionError at tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:100:18; Test Files 1 failed (1); Tests 1 failed (1); exit 1.
Each: ok false, proposal-refused, routing sequence 2 and events [] matched the expectation.
```

- Round 3: Relevant suite: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`), exit 0; five files and six tests passed after every mutation was restored.
- Round 3: Quality checks: direct Prettier and ESLint on `decide.ts`, and `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0.
- Round 3: qa-gatekeeper GREEN: PASS at `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`. The independent replay ran the selector 1/1 and relevant suite 6/6, checked the dotfile mutation's assertion failure and restored hashes, and recomputed the 2,503-record revision.
- Round 3: Refactor decision: no code edit. The root-dotfile condition is one local branch of the existing path classifier. A broader abstraction is unnecessary for this row.
- Round 3: Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Round 3: Refactor verify result: exit 0; five files and six tests passed. No source or test edit followed the restored GREEN observations. The reverse import scan found five direct unit tests and no production importer. Source and test SHA-256 values remain `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e` and `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`.
- Round 3: Refactor verify revision: `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` (two corrected calculations agreed; 2,503 path records). An earlier temporary helper erroneously included 49 evidence paths and produced `working-tree+12f88ce329cd165178c482347bfd2e42e4eb44a58a31b68a59add096b715b5e2`; that value is invalid and was not used for a gate or review. The helper was corrected, rerun twice and removed.
- Round 3: Review pack (attempt 1): `.qfai/review/review-20260925023352000/`.
- Round 3: Review pack seal (attempt 1): `2a922e435142d870d0d564fd76a3caa6153886d9455edff620b58ea9e01d2828` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 3: reviewer verdict (attempt 1): REVISE. Completion review passed. Implementation review confirmed all three prior fixes but reproduced an absent extensionless root path `Dockerfile` without any `facts.pathExistence` entry passing to a CREATE question. The untyped reference also admits symbolic values such as `request`, so the next step must settle path classification before another GREEN edit. Both reviewers independently recorded revision `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` and audited evidence hash `03c9f1dd6a57b53b10fb43184beabf4458668467368439acf24008823174d733`.

#### Typed route references under CR-20260925-0004

- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0015): unknown-path`
- The fixture now carries `{ kind, ref }` entries: normative `request` and a missing `path`; observed a missing `path`, `Dockerfile` as a `path` with no path-existence fact, and a missing `evidence` file with no fact.
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0015\): unknown-path' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:106:18` — `code` was `invalid-input` where `proposal-refused` with four `unknown-path` reasons was expected.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0015): unknown-path`, 1 passed.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (classifies a reference by its declared kind; a `path` or `evidence` reference without a `true` existence fact is `unknown-path`; spelling and observer-map keys no longer decide), `packages/qfai/src/core/workflow/parse.ts` (the reference kinds and entry type).
- Shared fixtures migrated to typed references: `oneCreateQuestionAtRouting.test.ts` (TDD-0001) and `oneApprovalPerCapability.test.ts` (TDD-0004), with the symbolic `request` entry typed as `request`. All ten selectors in `tests/unit/workflow/` pass after the change, TDD-0001, TDD-0004 and TDD-0013 included.

### TDD-0016

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0016): unknown-id`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0016\): unknown-id' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:196:18` — typed `spec-id` and `contract-id` references that resolve to nothing reached the CREATE question.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0016): unknown-id`, 1 passed, 1 skipped. `proposal-refused` with one `unknown-id` reason per reference; state `routing`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`proposalRefusals` collects every failed proposal check; a `spec-id` absent from `facts.specs` or a `contract-id` absent from `facts.contractIds` is `unknown-id`, judged by the declared kind).

### TDD-0017

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0017): inactive-spec`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0017\): inactive-spec' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:211:18` — an affected spec whose lifecycle is `retired` was not refused.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0017): inactive-spec`, 1 passed, 2 skipped. `proposal-refused` / `inactive-spec` naming `spec-0008`; state `routing`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (an affected spec whose lifecycle fact is not `active` is `inactive-spec`).

### TDD-0018

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0018): broken-reference`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0018\): broken-reference' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: undefined, reasons: [], …(2) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:225:18`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0018): broken-reference`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: observers report item references as `facts.itemReferences`, a map from the reference to its resolution, `resolved` or `unresolved`. It has the shape `facts.pathExistence` and `facts.receiptValidity` already have: keyed by what was observed, valued by what the observation found. The core refuses every `unresolved` entry `broken-reference`, naming the reference, and reads no spec or contract text itself. Which references an observer reports, and how it spells one, stay the observer's; no later row in this ledger specifies that observer, so the fact carries no further field. Decided between agents.

### TDD-0019

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0019): protected-surface`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0019\): protected-surface' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:225:18` — write areas under `.qfai/runs/`, a change-request record and one overlapping a protected target reached the CREATE question.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0019): protected-surface`, 1 passed, 3 skipped. One `protected-surface` reason per offending write area; state `routing`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a write area whose literal prefix lies inside a protected path or record pattern, or overlaps a protected target, is `protected-surface`; the overlap rule is a marked simplification).

### TDD-0020

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0020): scope-escape`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0020\): scope-escape' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:239:18` — write areas outside the project root were not refused.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0020): scope-escape`, 1 passed, 4 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a write area that is absolute or normalizes to a path above the root is `scope-escape`, using `node:path`).

### TDD-0021

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0021): unresolved-approval`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0021\): unresolved-approval' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:254:18` — a `data-loss` risk signal with no question reached the CREATE question.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0021): unresolved-approval`, 1 passed, 5 skipped. `authorization-restored` asks nothing; `data-loss` is named.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a material risk signal, any but `authorization-restored`, in a proposal with no question is `unresolved-approval`; linking a question to its signal is a marked simplification).

### TDD-0022

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0022): stage-set`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0022\): stage-set' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:272:18` — a stage set omitting `implement` and `verify` and naming `deploy` was refused `invalid-input` without reasons.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0022): stage-set`, 1 passed, 6 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the stage-set check names each `always` stage of the built-in plan the proposal omits, a missing `verify` on a change route, and each stage the plan lacks; it replaces the earlier `invalid-input` check on `verify` and `sdd`).

### TDD-0023

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0013 (TDD-0023): A proposal failing unknown-id and stage-set at once`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0013 \(TDD-0023\): A proposal failing unknown-id and stage-set at once' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0016 and TDD-0022: every check adds to one `reasons[]` list.
- GREEN result: exit 0; `✓ ... TC-0018-0013 (TDD-0023): ...`, 1 passed, 8 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0022).

### TDD-0024

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0014 (TDD-0024): A proposal failing unknown-id with confidence`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0014 \(TDD-0024\): A proposal failing unknown-id with confidence' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0016: no check reads `confidence`.
- GREEN result: exit 0; `✓ ... TC-0018-0014 (TDD-0024): ...`, 1 passed, 8 skipped. The refusal with `confidence: 1` equals the refusal without it.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the proposal type admits the advisory `confidence`; no behaviour reads it).

### TDD-0025

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts`
- Selector: `TC-0018-0015 (TDD-0025): Decide accept of a routing result with normative references, observed references and a new`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts --testNamePattern='TC-0018-0015 \(TDD-0025\): Decide accept of a routing result with normative references, observed references and a new' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` in `tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts` — the create question opened with no authorization, but the verdict carried no plan, so both reference arrays were `undefined`.
- GREEN result: exit 0; `✓ ... TC-0018-0015 (TDD-0025): ...`, 1 passed. The plan holds the typed normative and observed arrays separately, one `create` question opens, and no authorization is recorded.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`checkedPlan` builds the plan from the built-in plan and the proposal, keeping both typed reference arrays; the capability path returns it beside the questions). The test title is the ledger selector as written.

### TDD-0026

- Closed: `exception` under DR-0298 on 2026-09-25. The user waived the remaining per-row reviews; the T1 group review of BR-0018-0010 is not taken.

- TDD-ID: TDD-0026
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0026): direct`
- TC-ref: TC-0018-0016
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS on re-observation at `working-tree+6c315802783d5ecf41d4fbdb29faf9dae2c0023cda08f96488d7f6c5904c6d7c`. The first review was REVISE because concurrent SDD edits moved the tree revision; the independent second review reproduced the RED, strip, restored hashes and 2,507-record revision.
- Round 1: qa-gatekeeper GREEN: PASS at `working-tree+36c3bc9944b5115612e5ed25cba03dfbb8d4bdce29aa70b7afb65c9d5524c97e`; independently reran the selector 1/1 and related suite 7/7, checked the target mutation's assertion failure and restored hashes, and recomputed the 2,507-record revision.
- Refactor decision: no code edit. The direct two-stage branch remains local while the other plan branches are still unimplemented; extracting a shared abstraction now would precede their behavior.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; six test files and seven tests passed. Cross-spec done-row path scan matched only spec-0018; no production reverse importer or cross-spec test consumer was found. Source/test SHA-256 stayed `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed` and `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`.
- Refactor verify revision: `working-tree+36c3bc9944b5115612e5ed25cba03dfbb8d4bdce29aa70b7afb65c9d5524c97e` (two calculations agreed; 2,507 path records). The BR-0018-0010 T1 group remains open with TDD-0027 through TDD-0030 at `todo`; this member will be reverified on group close before reviews.

#### Round 1

- Round 1: RED revision: `working-tree+bfdfb927eb18f1487e62acbb6130ca58deddf23dab2c3d7011f89fd26365e4cb` (two calculations agreed; 2,506 path records).
- Round 1: RED test hash: `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`
- Seam file SHA-256: `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0026\): direct' --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; one selected test failed at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18`. The feature-only `next` guard refuses the checked direct plan, so no maintenance or verify work order is issued, no result is accepted and final `next` is not successful. The selector expects the two ordered work orders with plan-defined executor skills and operations, a `spec-0018` target from the existing spec binding, two replayed accepted results, and a terminal `workOrder: null` with no events.
- Round 1: RED assertion-stripped result: Only the final comparison changed from `expect(actual).toEqual(expected)` to `void actual; void expected;`. The same selector passed 1/1 with exit 0 while all `decide` calls and operands still evaluated. The original assertion was restored, and the same selector failed again at `:153:18`; restored test hash `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`.

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { Object (issued, acceptedStages, ...) }
- Expected
+ Received
-   "acceptedStages": Array [
-     Object { "stageInstanceId": "direct-edit", "stageKind": "maintenance", "outcome": "accepted" },
-     Object { "stageInstanceId": "direct-verify", "stageKind": "verify", "outcome": "accepted" },
-   ],
+   "acceptedStages": Array [],
-   "finalNextOk": true,
+   "finalNextOk": false,
-   "finalWorkOrder": null,
+   "finalWorkOrder": undefined,
-   "issued": Array [
+   "issued": Array [],
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

```diff
@@ -150,5 +150,6 @@ it("TC-0018-0016 (TDD-0026): direct", () => {
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily alter the direct maintenance work order's `target.specId` while preserving stage progression. The same selector must fail on target mismatch. Restore the source and rerun the selector and reverse-import relevant suite.
- Round 1: RED re-observation revision: `working-tree+6c315802783d5ecf41d4fbdb29faf9dae2c0023cda08f96488d7f6c5904c6d7c` (two calculations agreed; 2,507 path records, after CR2/CR3/CR4 SDD reruns). The earlier `working-tree+bfdfb927eb18f1487e62acbb6130ca58deddf23dab2c3d7011f89fd26365e4cb` remains the first RED observation, not the current QA revision.
- Round 1: RED re-observation: the same selector command exited 1 at `:153:18`; actual `issued` and `acceptedStages` were empty, `finalNextOk` was false and `finalWorkOrder` was undefined. The assertion-only strip shown above passed 1/1 with exit 0. After restoring the original bytes, the selector exited 1 again at the same assertion. Restored source SHA-256: `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e`; test SHA-256: `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551` (matching the backup). No GREEN edit was made.
- Round 1: Revision: `working-tree+36c3bc9944b5115612e5ed25cba03dfbb8d4bdce29aa70b7afb65c9d5524c97e` (two calculations agreed; 2,507 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0026\): direct' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: GREEN result: exit 0; one selected test passed. The direct ready plan issues maintenance and verify orders in sequence with the plan's skill and operation and a `spec-0018` target from the checked spec binding. Both canned accepted results produce replayable result references; terminal `next` returns `workOrder: null`, state `ready` and no events. The six-file reverse-import related suite passed 7/7. Direct Prettier, ESLint and TypeScript checks passed. Restored source SHA-256: `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed`; test SHA-256: `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`.

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0026\): direct' --reporter=verbose` (cwd: `packages/qfai`; the same selector command as GREEN).
- Round 1: Oracle proof: Temporarily changed the maintenance work order target from `spec-0018` to `spec-9999`, leaving the test unchanged. The oracle command exited 1 at `:153:18`: the issued maintenance target was wrong, `accept` refused it, and verify was not reached. The source was immediately restored. The selector passed 1/1 and the six-file related suite passed 7/7 again; source and test hashes returned to the GREEN values above.

```diff
-      nextWorkOrder.target = { kind: "spec", specId };
+      nextWorkOrder.target = {
+        kind: "spec",
+        specId: stage.stageKind === "maintenance" ? "spec-9999" : specId,
+      };
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { Object (issued, acceptedStages, ...) }
target.specId: expected "spec-0018", received "spec-9999"
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { Object (issued, acceptedStages, ...) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

### TDD-0027

- Closed: `exception` under DR-0298 on 2026-09-25. The user waived the remaining per-row reviews; the T1 group review of BR-0018-0010 is not taken.

- TDD-ID: TDD-0027
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0027): bugfix`
- TC-ref: TC-0018-0016
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: Round 1 RED record REVISE because the old S5 session-ending revision was not captured. Round 2 RED and GREEN PASS on the new invocation: the independent reviewer reproduced the RED assertion and comparison-only strip, then reran GREEN 1/1, related suite 8/8, predicate mutation failure and restored hashes/revision.

#### Round 1

- Round 1: RED revision: `working-tree+9b33eddcaffb7ed3738099e87d2fcfa2922eebb960271db26c5422cb6eb2d634` (two calculations agreed; 2,507 path records).
- Round 1: RED test hash: `de0dee75cde1a30425b275003e5989a302b2f10727576d3cc2af248851ee3bcf`
- Seam file SHA-256: `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed` (no source seam edit required).
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: RED failure mode: assertion.
- Round 1: RED result: exit 1; one selected test failed at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:393:18` (one sibling skipped). The current core refuses the bugfix plan before issuing a work order: `issued` and `acceptedStages` are empty, the diagnosis and regression control are null, final `next` is not successful and `workOrder` is undefined. The selector expects the replayed `missing-test` diagnosis to select `sdd_append`, then the Integration fixture's acceptance branch, implementation and verification, with the plan's skill/operation and the checked spec target on all five work orders. A regression diagnosis is a control expected to select `regression_fix`.
- Round 1: RED assertion-stripped result: Only the final comparison changed from `expect(actual).toEqual(expected)` to `void actual; void expected;`. The same selector passed 1/1 (one sibling skipped), then the original assertion was restored and failed again at `:393:18`. The direct sibling passed 1/1. The restored test hash matched its backup and direct Prettier, ESLint and TypeScript checks passed.

```diff
@@ -390,5 +390,6 @@ it("TC-0018-0016 (TDD-0027): bugfix", () => {
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { ...(5) }, ...(4) ], ...(8) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:393:18
Test Files 1 failed (1); Tests 1 failed (1), 1 skipped; exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
Test Files 1 passed (1); Tests 1 passed (1), 1 skipped; exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily remove the `missing-test` predicate's effect while preserving the accepted diagnosis record. The same selector must fail because `sdd_append` is skipped or a different branch issues. Restore the source, rerun the selector and the reverse-import relevant suite, and compare hashes.

#### Round 2

- Round 2: Session-end revision: `working-tree+fcd40b3cb714bc7fbd4e1849a338e128cb85421ad54c782de859160324a64245` (S1 ended at `2026-09-24T20:26:22.776Z`, two calculations agreed; 2,507 path records). First test edit after the session: `2026-09-24T20:27:01.140Z`.
- Round 2: RED revision: `working-tree+0393c1ffec3ede3d4f223ed2c3374eddbd35881187da6a0a041eca86d95ea6f6` (two calculations agreed; 2,507 path records).
- Round 2: RED test hash: `59e731baf1aae7b9661a1a1f267449c2d3c8f06e869102ef554fe57800adcb27`
- Seam file SHA-256: `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed` (source unchanged).
- Round 2: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: RED failure mode: assertion.
- Round 2: RED result: exit 1; the selected test failed at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:376:18` (one sibling skipped). The core issued no bugfix work order, accepted no stage, replayed no diagnosis and returned no final work order. The selector now asserts only the missing-test branch's five work orders and terminal null; the regression control was removed because its obligation belongs to TC-0018-0067.
- Round 2: RED assertion-stripped result: The final comparison alone changed from `expect(actual).toEqual(expected)` to `void actual; void expected;`. The same selector passed 1/1 (one sibling skipped); after restoration, the same command failed at `:376:18` again. The direct sibling passed 1/1. The restored test hash matched the backup; direct Prettier, ESLint and TypeScript checks passed.

```diff
@@ -373,5 +373,6 @@ it("TC-0018-0016 (TDD-0027): bugfix", () => {
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { ...(5) }, ...(4) ], ...(7) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:376:18
Test Files 1 failed (1); Tests 1 failed (1), 1 skipped; exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
Test Files 1 passed (1); Tests 1 passed (1), 1 skipped; exit 0
```

- Round 2: Oracle proof plan: After GREEN, temporarily remove the `missing-test` predicate's effect while preserving the accepted diagnosis record. The same selector must fail because `sdd_append` is skipped or a different stage issues. Restore the source, rerun the selector and reverse-import relevant suite, and compare hashes.
- Round 2: Revision: `working-tree+2b4fbf814c2df27db7b18cfceed4b84c50572b68a19a4dc2216e4437ff532428` (two calculations agreed; 2,507 path records).
- Round 2: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: GREEN result: exit 0; one selected test passed and one sibling skipped. The bugfix plan evaluates the accepted `missing-test` diagnosis and Integration acceptance fact, issues five ordered work orders with plan skill/operation and the checked spec target, accepts and replays each result, and returns null after verification. The reverse-import relevant suite passed six files and eight tests. Direct Prettier, ESLint and TypeScript checks passed. Restored source SHA-256: `d99294bc89dc828c2d1e4cde13fbeb00e4a1ab99ea0993846bb3766595b9a6f7`; test SHA-256: `59e731baf1aae7b9661a1a1f267449c2d3c8f06e869102ef554fe57800adcb27`.
- Round 2: Relevant suite command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`); exit 0, Test Files 6 passed, Tests 8 passed.
- Round 2: Oracle command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`; the same selector command as GREEN).
- Round 2: Oracle proof: Temporarily changed only `case "missing_test_row_needed"` from `return diagnosis?.verdict === "missing-test";` to `return false;`. The selector exited 1 at `:376:18`, missing the `sdd_append`, `acceptance` and `implement` work orders. The source was restored immediately; the same selector passed 1/1, the related suite passed 8/8, and source/test hashes returned to the values above.
- Refactor decision: no code edit. `activeStages` is shared by `next` and `accept`; another abstraction before the remaining bugfix branches are implemented would add no needed behavior.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; six test files and eight tests passed. Other specs' done rows have no direct ownership of the source or test; reverse imports found six workflow unit files and no importer of the test file. Source/test SHA-256 stayed `d99294bc89dc828c2d1e4cde13fbeb00e4a1ab99ea0993846bb3766595b9a6f7` and `59e731baf1aae7b9661a1a1f267449c2d3c8f06e869102ef554fe57800adcb27`.
- Refactor verify revision: `working-tree+2b4fbf814c2df27db7b18cfceed4b84c50572b68a19a4dc2216e4437ff532428` (two calculations agreed; 2,507 path records). BR-0018-0010 remains open with TDD-0028 through TDD-0030 at `todo`; this member will be reverified on group close before reviews.

```diff
 case "missing_test_row_needed":
-  return diagnosis?.verdict === "missing-test";
+  return false;
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
Test Files 1 passed (1); Tests 1 passed, 1 skipped (2); exit 0
```

```text
× |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { ...(5) }, ...(4) ], ...(7) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:376:18
Test Files 1 failed (1); Tests 1 failed, 1 skipped (2); exit 1
```

### TDD-0028

- Closed: `exception` under DR-0298 on 2026-09-25. The user waived the remaining per-row reviews; the T1 group review of BR-0018-0010 is not taken.

- TDD-ID: TDD-0028
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0028): bounded-change`
- TC-ref: TC-0018-0016
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: Round 1 RED PASS. Independent review reproduced assertion failure at `:326:18`, comparison-only strip PASS, restored RED and siblings 2/2. Source/test hashes and 2,507-record revision matched. Round 1 GREEN PASS on re-submission: the first GREEN submission was REVISE because its revision was taken while another writer was active; the re-taken GREEN and Oracle proof at `working-tree+dbfcb0e40e33b4026bb18ec253a6187909be459f333a64eaa56ab4ee21145ef8` (HEAD `0ee5c1781`) were reproduced independently, audited evidence hash `3cd044616305c6bd71c61772ef5c417193de23230556f1e73be678f633836529`. Group reviews remain pending.
- Group status: BR-0018-0010 remains open; group reviews and done gate wait for TDD-0029 and TDD-0030.

#### Round 1

- Round 1: RED revision: `working-tree+64323366ff1e44571a24c3819ce0c836a78657ddbe84f8f1d5a3275427680fa6` (two calculations agreed; 2,507 path records).
- Round 1: RED test hash: `efbfba64528939ae5faba7a18b44174d4bd76361b524c1a137edc9c377e7d872`.
- Round 1: Source seam SHA-256: `d99294bc89dc828c2d1e4cde13fbeb00e4a1ab99ea0993846bb3766595b9a6f7` (unchanged).
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: RED failure mode: assertion.
- Round 1: RED result: exit 1; one failed, two skipped. The final comparison at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:326:18` failed. The core issued no work orders, accepted no stages, and returned no successful final `next`; the fixture expects four ordered work orders from the provided plan and a fifth `next` with a null work order.
- Round 1: RED assertion-stripped result: Replaced the final `expect(actual).toEqual(expected);` with `void actual; void expected;`, preserving the constructed operands, `decide` calls and fixture. The same command passed one selector with two siblings skipped. After restoring the assertion, the same command failed again at `:326:18`; the restored test hash matched. The direct and bugfix sibling selectors passed 2/2. Direct Prettier, ESLint and TypeScript checks passed.
- Round 1: Oracle proof plan: Once GREEN, temporarily make `acceptance_obligations_unmet` evaluate false for the bounded-change plan. The missing acceptance work order must fail the same selector: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`). Restore the source and rerun that selector and the relevant suite.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
× |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { …(5) }, …(3) ], …(6) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:326:18
Test Files 1 failed (1); Tests 1 failed, 2 skipped (3); exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
Test Files 1 passed (1); Tests 1 passed, 2 skipped (3); exit 0
```

- Round 1: Revision: `working-tree+dbfcb0e40e33b4026bb18ec253a6187909be459f333a64eaa56ab4ee21145ef8` at HEAD `0ee5c1781f6b808ec1ed0cc4a78e90809f5ef196` (two calculations agreed; 2,507 path records). It is the tree the restored GREEN ran on, taken straight after that run.
- Round 1: GREEN command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: GREEN result: exit 0; one selected test passed and two siblings skipped. The bounded-change plan issues four ordered work orders with the plan's skill and operation and the checked spec target. `bounded-acceptance` is issued because `acceptanceObligationsUnmet` is true. Each result is accepted and replayed, and a fifth `next` returns a null work order. Direct Prettier and ESLint on both files passed. `tsc -p packages/qfai/tsconfig.json --noEmit` exits 1 with TS2322 at `decide.ts(197,7)`: the CREATE decision branch assigns `snapshot.scopeDigest`, typed `string | undefined`, to a `string`. That line is outside this row's change. Source SHA-256: `a49294c3ca11f8dde947869eba0ee42f9da2223556e81d2e33b1011e038c367e`; test SHA-256: `efbfba64528939ae5faba7a18b44174d4bd76361b524c1a137edc9c377e7d872`.
- Round 1: Relevant suite command: not run in this observation; Refactor step 2 runs it.
- Round 1: Oracle command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`; the same selector command as GREEN).
- Round 1: Oracle proof: One line in `activeStages` was changed temporarily, in `case "acceptance_obligations_unmet"`. It went from `return acceptanceObligationsUnmet === true;` to `return plan.route !== "bounded-change" && acceptanceObligationsUnmet === true;`. The predicate then evaluates false for the bounded-change plan and is unchanged for bugfix. The selector exited 1 at `:326:18`: `bounded-acceptance` was missing from both `issued` and `acceptedStages`, leaving three work orders instead of four. The source was restored at once from a byte copy. The same selector then passed 1/1, and the source SHA-256 returned to the value above.

```diff
       case "acceptance_obligations_unmet":
-        return acceptanceObligationsUnmet === true;
+        return plan.route !== "bounded-change" && acceptanceObligationsUnmet === true;
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
Test Files 1 passed (1); Tests 1 passed | 2 skipped (3); exit 0
```

```text
× |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
  → expected { issued: [ { …(5) }, …(2) ], …(6) } to deeply equal { issued: [ { …(5) }, …(3) ], …(6) }
AssertionError: expected { issued: [ { …(5) }, …(2) ], …(6) } to deeply equal { issued: [ { …(5) }, …(3) ], …(6) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:326:18
Test Files 1 failed (1); Tests 1 failed | 2 skipped (3); exit 1
```

### TDD-0029

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0029): feature`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0029\): feature' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:665:18` — all four feature work orders were issued in order but each carried `skill: undefined` and `operation: undefined`.
- GREEN result: exit 0; `✓ ... TC-0018-0016 (TDD-0029): feature`, 1 passed, 3 skipped. Four work orders name the plan's skill and operation in order, each result is accepted, and a fifth `next` returns `workOrder: null`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (every issued work order copies `executor.skill` and `operation` from its plan stage).

### TDD-0030

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0030): discovery`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0030\): discovery' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:699:18` — `next` refused the discovery plan, so nothing was issued and the run stayed `ready`.
- GREEN result: exit 0; `✓ ... TC-0018-0016 (TDD-0030): discovery`, 1 passed, 4 skipped. The `discussion` work order names `qfai-discussion` / `resolve-unsettled-product-scope`; accepting its result fires `scope-or-obligation-revision` and returns the run to `routing`. The other four plan selectors still pass after the route checks moved into `routePlanIsInvalid`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`routePlanIsInvalid` holds the per-route plan checks and accepts a discovery plan whose stages name a skill and operation; `accept` of the last discovery stage moves `running` to `routing`; feature and discovery stage predicates stay unevaluated under a marked simplification).

### TDD-0031

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/nextRepeatsAnUnansweredWorkOrder.test.ts`
- Selector: `TC-0018-0018 (TDD-0031): next twice on a run in running, then resume twice, with no result between`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/nextRepeatsAnUnansweredWorkOrder.test.ts --testNamePattern='TC-0018-0018 \(TDD-0031\): next twice on a run in running, then resume twice, with no result between' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(...).toEqual(...)` at `tests/unit/workflow/nextRepeatsAnUnansweredWorkOrder.test.ts:43:52` — `next` and `resume` on a run in `running` returned no work order.
- GREEN result: exit 0; `✓ ... TC-0018-0018 (TDD-0031): ...`, 1 passed. All four calls return `work-order-direct-edit-1`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`next` in `running` returns the outstanding work order and publishes nothing; `resume` in `running` fires the interruption, reconcile and dispatch edges and returns the same work order; its missing revalidation is a marked simplification).

### TDD-0032

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts`
- Selector: `TC-0018-0021 (TDD-0032): Decide accept of a result with notRun`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts --testNamePattern='TC-0018-0021 \(TDD-0032\): Decide accept of a result with notRun' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(...)` at `tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts:64:18` — the accepted event carried no `notRun`, so the stage's reason was not recorded.
- GREEN result: exit 0; `✓ ... TC-0018-0021 (TDD-0032): ...`, 1 passed. The accepted event records `notRun` with its reason, and no `receipt-recorded` event is published.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the accepted stage event carries the result's `notRun`).

### TDD-0033

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts`
- Selector: `TC-0018-0022 (TDD-0033): A result with notRun and no reason`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts --testNamePattern='TC-0018-0022 \(TDD-0033\): A result with notRun and no reason' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(refusedInput("skip-unexplained"))` at `tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts:93:53` — a `not_applicable` skip with no reason was accepted.
- GREEN result: exit 0; `✓ ... TC-0018-0022 (TDD-0033): ...`, 1 passed, 1 skipped. `invalid-input` / `skip-unexplained`; state `running`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`notRunRefusalOf` refuses a `not_applicable` entry with no reason; `invalid-input` now carries `reasons[]`).

### TDD-0034

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts`
- Selector: `TC-0018-0023 (TDD-0034): A result with notRun`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts --testNamePattern='TC-0018-0023 \(TDD-0034\): A result with notRun' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(refusedInput("reuse-stale"))` at `tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts:101:5` — a reuse naming a receipt classed `stale` was accepted.
- GREEN result: exit 0; `✓ ... TC-0018-0023 (TDD-0034): A result with notRun`, 1 passed, 2 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a `reused` entry whose receipt is not classed `valid` in `facts.receiptValidity` is `reuse-stale`; `unknown` counts as not valid).

### TDD-0056

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0044 (TDD-0056): A result with a debt that has no resolvingOwner`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0044 \(TDD-0056\): A result with a debt that has no resolvingOwner' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }` at `tests/unit/workflow/debtBlocksCompletion.test.ts:74:18`; the core refused the `accepted_with_debt` outcome with no reasons
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0044 (TDD-0056): A result with a debt that has no resolvingOwner`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0057

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theSeamOnlyRoundTrip.test.ts`
- Selector: `TC-0018-0045 (TDD-0057): An acceptance result with seamRequest and outcome needs_repair`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theSeamOnlyRoundTrip.test.ts --testNamePattern='TC-0018-0045 \(TDD-0057\): An acceptance result with seamRequest and outcome needs_repair' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { repairState: 'running', …(3) } to deeply equal { repairState: 'ready', …(3) }` at `tests/unit/workflow/theSeamOnlyRoundTrip.test.ts:139:6`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theSeamOnlyRoundTrip.test.ts > TC-0018-0045 (TDD-0057): An acceptance result with seamRequest and outcome needs_repair`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: the snapshot carries the open seam request as `seamRequest` (the acceptance work order it returns to, that stage instance, its attempt and the target test) and the last issued attempt per stage instance as `attempts`. While `seamRequest` is set, `next` issues the seam-only work order: stage kind `implement`, skill `qfai-implement`, operation `seam-only`, `parentWorkOrderId` naming the acceptance work order. Once the snapshot no longer holds it, `next` reissues the acceptance stage instance at the next attempt. How the journal replays into those two fields belongs to persistence.

### TDD-0058

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts`
- Selector: `TC-0018-0046 (TDD-0058): A seam-only result whose seam`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts --testNamePattern='TC-0018-0046 \(TDD-0058\): A seam-only result whose seam' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { …(4) } to deeply equal { …(4) }` at `tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts:80:6`; the seam-only result observing `pass` was accepted
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts > TC-0018-0046 (TDD-0058): A seam-only result whose seam`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0059

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0047 (TDD-0059): An acceptance result with testObservation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0047 \(TDD-0059\): An acceptance result with testObservation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run; already satisfied by TDD-0028, whose bounded-change stage driving accepts an acceptance result and issues implement next
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0047 (TDD-0059): An acceptance result with testObservation`
- Production files: none; the test adds the `testObservation` and `red` result fields to the input type in `packages/qfai/src/core/workflow/decide.ts`

### TDD-0060

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0060): collection`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0060\): collection' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:121:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0060): collection`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0061

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0061): import`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0061\): import' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:126:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0061): import`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0062

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0062): startup`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0062\): startup' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:131:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0062): startup`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0063

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0063): timeout`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0063\): timeout' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:136:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0063): timeout`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0064

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/outcomeAndObservationStayApart.test.ts`
- Selector: `TC-0018-0049 (TDD-0064): A result with outcome unrun`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/outcomeAndObservationStayApart.test.ts --testNamePattern='TC-0018-0049 \(TDD-0064\): A result with outcome unrun' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, state: 'running', …(1) } to deeply equal { ok: true, state: 'blocked', …(1) }` at `tests/unit/workflow/outcomeAndObservationStayApart.test.ts:57:6`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/outcomeAndObservationStayApart.test.ts > TC-0018-0049 (TDD-0064): A result with outcome unrun`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0065

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0051 (TDD-0065): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0051 \(TDD-0065\): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { verdict: { ok: false, …(2) }, …(1) } to deeply equal { verdict: { ok: true, …(1) }, …(1) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:102:62`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0051 (TDD-0065): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: the snapshot carries `recordedResults`, each accepted result's payload digest and stored verdict keyed by `resultId`, and the input carries `payloadDigest`, which the command adapter computes from the submitted bytes. `accept` looks the `resultId` up before any other check, so a resubmission returns its stored verdict with no events whatever the run's current sequence.

### TDD-0066

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0052 (TDD-0066): The recorded resultId with a different payload digest`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0052 \(TDD-0066\): The recorded resultId with a different payload digest' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:111:27`; the refusal carried no `result-id-reused` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0052 (TDD-0066): The recorded resultId with a different payload digest`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0067

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0067): length-1`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0067\): length-1' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied: the running-stage accept path already checked `resultId` against `[A-Za-z0-9._-]{1,64}`, from the checkpoint that preceded these rows
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0067): length-1`
- Production files: none

### TDD-0068

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0068): length-64`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0068\): length-64' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied: the running-stage accept path already checked `resultId` against `[A-Za-z0-9._-]{1,64}`, from the checkpoint that preceded these rows
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0068): length-64`
- Production files: none

### TDD-0069

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0069): empty`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0069\): empty' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:179:37`; the refusal carried no `schema` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0069): empty`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0070

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0070): length-65`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0070\): length-65' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:183:49`; the refusal carried no `schema` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0070): length-65`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0071

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0071): outside-char`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0071\): outside-char' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:187:48`; the refusal carried no `schema` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0071): outside-char`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0072

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/acceptIsCompareAndSet.test.ts`
- Selector: `TC-0018-0054 (TDD-0072): A result whose expectedSequence is behind the run's`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/acceptIsCompareAndSet.test.ts --testNamePattern='TC-0018-0054 \(TDD-0072\): A result whose expectedSequence is behind the run's' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-cas', …(2) }, …(2) } to deeply equal { run: { id: 'run-cas', …(2) }, …(2) }` at `tests/unit/workflow/acceptIsCompareAndSet.test.ts:61:6`; the code was `invalid-input`, not `stale-sequence`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/acceptIsCompareAndSet.test.ts > TC-0018-0054 (TDD-0072): A result whose expectedSequence is behind the run's`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0073

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/acceptIsCompareAndSet.test.ts`
- Selector: `TC-0018-0055 (TDD-0073): A result naming a work order other than the outstanding one`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/acceptIsCompareAndSet.test.ts --testNamePattern='TC-0018-0055 \(TDD-0073\): A result naming a work order other than the outstanding one' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/acceptIsCompareAndSet.test.ts:76:6`; the refusal carried no `work-order` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/acceptIsCompareAndSet.test.ts > TC-0018-0055 (TDD-0073): A result naming a work order other than the outstanding one`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0074

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts`
- Selector: `TC-0018-0057 (TDD-0074): outside-write-areas`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts --testNamePattern='TC-0018-0057 \(TDD-0074\): outside-write-areas' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts:109:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts > TC-0018-0057 (TDD-0074): outside-write-areas`
- Production files: `packages/qfai/src/core/workflow/decide.ts`; write areas are matched with the existing `compileGlob` of `packages/qfai/src/core/atdd/scaffoldDialect.ts`

### TDD-0075

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts`
- Selector: `TC-0018-0057 (TDD-0075): diagnose-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts --testNamePattern='TC-0018-0057 \(TDD-0075\): diagnose-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts:130:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts > TC-0018-0057 (TDD-0075): diagnose-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0076

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theScopeNeverWidensByItself.test.ts`
- Selector: `TC-0018-0058 (TDD-0076): An SDD result binding the spec it created to the goal's slot`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theScopeNeverWidensByItself.test.ts --testNamePattern='TC-0018-0058 \(TDD-0076\): An SDD result binding the spec it created to the goal's slot' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0005, whose SDD accept records one `binding-recorded` event per reported binding
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theScopeNeverWidensByItself.test.ts > TC-0018-0058 (TDD-0076): An SDD result binding the spec it created to the goal's slot`
- Production files: none

### TDD-0077

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theScopeNeverWidensByItself.test.ts`
- Selector: `TC-0018-0059 (TDD-0077): An SDD result creating a capability no approved slot is bound to`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theScopeNeverWidensByItself.test.ts --testNamePattern='TC-0018-0059 \(TDD-0077\): An SDD result creating a capability no approved slot is bound to' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/theScopeNeverWidensByItself.test.ts:83:6`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theScopeNeverWidensByItself.test.ts > TC-0018-0059 (TDD-0077): An SDD result creating a capability no approved slot is bound to`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0078

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theScopeNeverWidensByItself.test.ts`
- Selector: `TC-0018-0060 (TDD-0078): Issue a work order whose inputs include paths outside the plan's write scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theScopeNeverWidensByItself.test.ts --testNamePattern='TC-0018-0060 \(TDD-0078\): Issue a work order whose inputs include paths outside the plan's write scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ 'src/notify/**', 'tests/notify/**' ]` at `tests/unit/workflow/theScopeNeverWidensByItself.test.ts:103:55`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theScopeNeverWidensByItself.test.ts > TC-0018-0060 (TDD-0078): Issue a work order whose inputs include paths outside the plan's write scope`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the fixture's plan names an observed path outside its write scope. Work orders carry no `inputs` yet, so the case holds that the issued `scope.writeAreas` is the plan's write scope and nothing the plan reads.

### TDD-0081

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theMissingTestBranch.test.ts`
- Selector: `TC-0018-0063 (TDD-0081): A diagnose result missing-test whose appended row's layer is Integration, driven to the last stage`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theMissingTestBranch.test.ts --testNamePattern='TC-0018-0063 \(TDD-0081\): A diagnose result missing-test whose appended row's layer is Integration, driven to the last stage' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0027, whose bugfix drive selects `acceptance` under `acceptance_obligations_unmet` for an `Integration` row.
- GREEN result: exit 0; `✓ … TC-0018-0063 (TDD-0081)`, 1 passed
- Production files: none; the test reads `packages/qfai/src/core/workflow/decide.ts`

### TDD-0082

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theMissingTestBranch.test.ts`
- Selector: `TC-0018-0064 (TDD-0082): The same with the appended row's layer Unit`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theMissingTestBranch.test.ts --testNamePattern='TC-0018-0064 \(TDD-0082\): The same with the appended row's layer Unit' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theMissingTestBranch.test.ts:113:6` — `acceptanceNotRun` was `undefined`: the core dropped the acceptance stage and recorded nothing for it.
- GREEN result: exit 0; `✓ … TC-0018-0064 (TDD-0082)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: the contract names no event for a stage whose predicate does not hold. `next` records each such stage, when it issues the stage after it, as a `receipt-recorded` event carrying `notRun: { kind: "not_applicable", reason }`, the reason naming the predicate. Marked `SIMPLIFIED` in `decide.ts`.

### TDD-0083

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theAppendedRowCarriesItsReason.test.ts`
- Selector: `TC-0018-0066 (TDD-0083): Issue the sdd_append work order after a missing-test diagnosis`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAppendedRowCarriesItsReason.test.ts --testNamePattern='TC-0018-0066 \(TDD-0083\): Issue the sdd_append work order after a missing-test diagnosis' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theAppendedRowCarriesItsReason.test.ts:52:6` — `inputs` was `undefined`.
- GREEN result: exit 0; `✓ … TC-0018-0066 (TDD-0083)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the work order's `inputs` entry takes its digest from a new `fileDigests` fact. An input whose digest the facts lack is left out, marked `SIMPLIFIED` in `decide.ts` until the command adapter supplies every digest.

### TDD-0084

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRegressionBranch.test.ts`
- Selector: `TC-0018-0067 (TDD-0084): A diagnose result regression for a done row`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRegressionBranch.test.ts --testNamePattern='TC-0018-0067 \(TDD-0084\): A diagnose result regression for a done row' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theRegressionBranch.test.ts:94:6` — no `regression_fix` work order was issued and `digestRecorded` was `false`.
- GREEN result: exit 0; `✓ … TC-0018-0067 (TDD-0084)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the predicates `regression_found` and `test_defect_found` now read the diagnosis verdict. A work order bound to a spec carries `ledger: { specId, rowIds, rowSetDigest }` from a new `ledger` fact: the digest covers each row's ID, status and digest; `rowIds` are the diagnosis's matched rows for `regression_fix` and `test_fix`, and the rows not `done` otherwise.

### TDD-0085

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts`
- Selector: `TC-0018-0068 (TDD-0085): A regression_fix result with the same test's GREEN re-run receipt and an independent review receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts --testNamePattern='TC-0018-0068 \(TDD-0085\): A regression_fix result with the same test's GREEN re-run receipt and an independent review receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0084: the accept path takes a complete regression_fix result and returns the run to `ready` with no ledger event.
- GREEN result: exit 0; `✓ … TC-0018-0068 (TDD-0085)`, 1 passed
- Production files: none; the test reads `packages/qfai/src/core/workflow/decide.ts`

### TDD-0086

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts`
- Selector: `TC-0018-0069 (TDD-0086): no-rerun-receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts --testNamePattern='TC-0018-0069 \(TDD-0086\): no-rerun-receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts:106:56` — `code` was `undefined` and an `accept-nonfinal-result` event was returned.
- GREEN result: exit 0; `✓ … TC-0018-0069 (TDD-0086)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0087

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts`
- Selector: `TC-0018-0069 (TDD-0087): no-review-receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts --testNamePattern='TC-0018-0069 \(TDD-0087\): no-review-receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts:112:57` — `code` was `undefined` and an `accept-nonfinal-result` event was returned.
- GREEN result: exit 0; `✓ … TC-0018-0069 (TDD-0087)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0088

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aWorkOrderNamesRowsNotTheirStatus.test.ts`
- Selector: `TC-0018-0073 (TDD-0088): Issue an implement work order bound to a spec`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aWorkOrderNamesRowsNotTheirStatus.test.ts --testNamePattern='TC-0018-0073 \(TDD-0088\): Issue an implement work order bound to a spec' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0084, which added the work order's `ledger` of row IDs and the row-set digest.
- GREEN result: exit 0; `✓ … TC-0018-0073 (TDD-0088)`, 1 passed
- Production files: none; the test reads `packages/qfai/src/core/workflow/decide.ts`

### TDD-0089

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDifferentExpectationReclassifies.test.ts`
- Selector: `TC-0018-0074 (TDD-0089): A diagnose result expectation-differs`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDifferentExpectationReclassifies.test.ts --testNamePattern='TC-0018-0074 \(TDD-0089\): A diagnose result expectation-differs' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/aDifferentExpectationReclassifies.test.ts:77:6` — the run went to `ready` by `accept-nonfinal-result` and the next call issued the implement work order.
- GREEN result: exit 0; `✓ … TC-0018-0074 (TDD-0089)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0090

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLighterRouteKeepsEveryObligation.test.ts`
- Selector: `TC-0018-0076 (TDD-0090): A RED receipt accepted for an unfinished row, then a reclassification from bugfix to bounded-change, then next`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLighterRouteKeepsEveryObligation.test.ts --testNamePattern='TC-0018-0076 \(TDD-0090\): A RED receipt accepted for an unfinished row, then a reclassification from bugfix to bounded-change, then next' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/aLighterRouteKeepsEveryObligation.test.ts:51:6` — `priorStageReceiptRefs` was `undefined`.
- GREEN result: exit 0; `✓ … TC-0018-0076 (TDD-0090)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the snapshot gains `receiptRefs`, every result the run has accepted, which survives a replan. Each work order lists them as `priorStageReceiptRefs`, the validity read from the `receiptValidity` fact and `unknown` where the fact is absent.

### TDD-0091

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0091): e2e`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0091\): e2e' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; the plan's own `test_fix` stage names `qfai-atdd`, which is the expected executor for this layer.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0091)`, 1 passed; stays green once the core derives the executor from the row's layer
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0092

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0092): api`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0092\): api' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; the plan's own `test_fix` stage names `qfai-atdd`, which is the expected executor for this layer.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0092)`, 1 passed; stays green once the core derives the executor from the row's layer
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0093

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0093): integration-l3`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0093\): integration-l3' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; the plan's own `test_fix` stage names `qfai-atdd`, which is the expected executor for this layer.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0093)`, 1 passed; stays green once the core derives the executor from the row's layer
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0094

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0094): integration-l1-l2`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0094\): integration-l1-l2' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(testFixSkillFor(...)).toEqual([...])` at `tests/unit/workflow/theTestFixBranch.test.ts:60:46` — the executor was the plan's `qfai-atdd`, not `qfai-implement`.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0094)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: the `ledger` fact's rows gain `layer` and `tcLevels`. The core derives a `test_fix` executor from the first matched row; a row the fact does not describe keeps the plan's skill, marked `SIMPLIFIED` in `decide.ts`.

### TDD-0095

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0095): unit`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0095\): unit' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(testFixSkillFor(...)).toEqual([...])` at `tests/unit/workflow/theTestFixBranch.test.ts:60:46` — the executor was the plan's `qfai-atdd`, not `qfai-implement`.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0095)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0096

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0096): component`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0096\): component' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(testFixSkillFor(...)).toEqual([...])` at `tests/unit/workflow/theTestFixBranch.test.ts:60:46` — the executor was the plan's `qfai-atdd`, not `qfai-implement`.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0096)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0097

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts`
- Selector: `TC-0018-0078 (TDD-0097): A test_fix result with citedBefore equal to citedAfter, a review receipt and a re-run receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts --testNamePattern='TC-0018-0078 \(TDD-0097\): A test_fix result with citedBefore equal to citedAfter, a review receipt and a re-run receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts:109:6` — `ok` was `false`: accept compared the `qfai-implement` executor against the plan's `qfai-atdd` and refused the result.
- GREEN result: exit 0; `✓ … TC-0018-0078 (TDD-0097)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0098

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts`
- Selector: `TC-0018-0079 (TDD-0098): Issue work orders across a run with an author, a recommender and a reviewer recorded`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts --testNamePattern='TC-0018-0079 \(TDD-0098\): Issue work orders across a run with an author, a recommender and a reviewer recorded' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect([...]).toEqual([actorHistory, actorHistory])` at `tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts:90:6` — both work orders' `actorHistory` were `undefined`.
- GREEN result: exit 0; `✓ … TC-0018-0079 (TDD-0098)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the snapshot gains `actorHistory`, entries of `{ role, agentInstance, stageInstanceId }`, and every issued work order copies it. A review result whose reviewer instance the history shows as an author or recommender anywhere in the run is refused, marked `SIMPLIFIED` in `decide.ts` until a review result names the stage it reviewed.

### TDD-0099

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts`
- Selector: `TC-0018-0080 (TDD-0099): A review result whose reviewer instance the actor history shows as the author`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts --testNamePattern='TC-0018-0080 \(TDD-0099\): A review result whose reviewer instance the actor history shows as the author' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts:144:6` — the result was accepted and the run moved to `ready`.
- GREEN result: exit 0; `✓ … TC-0018-0080 (TDD-0099)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0101

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theFindingSOwnerRepairsIt.test.ts`
- Selector: `TC-0018-0082 (TDD-0101): A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theFindingSOwnerRepairsIt.test.ts --testNamePattern='TC-0018-0082 \(TDD-0101\): A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theFindingSOwnerRepairsIt.test.ts:87:6` — the `needs_repair` verify result was refused, the run stayed `running` and no repair work order was issued.
- GREEN result: exit 0; `✓ … TC-0018-0082 (TDD-0101)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: a `needs_repair` result with debts is now accepted, and its `accept-nonfinal-result` event carries them as `repairs`. The snapshot's `repairRequest` sends `next` to the plan stage the first finding's owner serves. Marked `SIMPLIFIED` in `decide.ts`: a repair owned by no plan stage is refused rather than returning the run to routing, and reissuing the detecting stage after the repair waits on a later row.

### TDD-0102

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts`
- Selector: `TC-0018-0083 (TDD-0102): no-review-ref`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts --testNamePattern='TC-0018-0083 \(TDD-0102\): no-review-ref' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts:119:51` — `reasons` was empty.
- GREEN result: exit 0; `✓ … TC-0018-0083 (TDD-0102)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0103

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts`
- Selector: `TC-0018-0083 (TDD-0103): no-rerun-ref`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts --testNamePattern='TC-0018-0083 \(TDD-0103\): no-rerun-ref' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts:125:50` — `reasons` was empty.
- GREEN result: exit 0; `✓ … TC-0018-0083 (TDD-0103)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0212

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0212): read-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0212\): read-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:64:42`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0212): read-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Correction: the contract names `scope-escape` for a `requestKind` other than `change`, and the core refused that kind `invalid-input` before any proposal check. The core now refuses a non-`change` kind `proposal-refused` with reason `scope-escape`, naming the kind, and keeps `invalid-input` for a kind outside the seven the contract lists. A proposal with `candidateRoute: null` no longer draws a `stage-set` refusal for omitting `verify`, because it names no change route.

### TDD-0213

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0213): plan-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0213\): plan-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:68:42`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0213): plan-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0214

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0214): verify-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0214\): verify-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:72:44`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0214): verify-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0215

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0215): resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0215\): resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:76:39`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0215): resume`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0216

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0216): cancel`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0216\): cancel' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:80:39`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0216): cancel`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0217

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0217): explicit-stage`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0217\): explicit-stage' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:84:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0217): explicit-stage`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0527

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts`
- Selector: `TC-0018-0268 (TDD-0527): missing persisted CREATE authorization at SDD issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern='TC-0018-0268 \(TDD-0527\): missing persisted CREATE authorization at SDD issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:190:18` — the run went to `running` with an SDD work order carrying `authorizationRefs: []` and one `work-order-issued` event, where `awaiting_input` with one `create` question for `slot-3-1` was expected.
- GREEN result: exit 0; `✓ ... TC-0018-0268 (TDD-0527): missing persisted CREATE authorization at SDD issue`, 1 passed, 1 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`next` opens a new `create` question for the approval's slot and moves `ready` to `awaiting_input` when the CREATE approval has no `authorizationId`; the question builder is shared with routing).

### TDD-0528

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/routeProposalReferenceShape.test.ts`
- Selector: `TC-0018-0269 (TDD-0528): bare string in expectedBehaviorRefs`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/routeProposalReferenceShape.test.ts --testNamePattern='TC-0018-0269 \(TDD-0528\): bare string in expectedBehaviorRefs' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/routeProposalReferenceShape.test.ts:72:18` — the stub parser accepted the bare string, `error` was `null` and the proposal reached `decide`, which returned events.
- GREEN result: exit 0; `✓ ... TC-0018-0269 (TDD-0528): bare string in expectedBehaviorRefs`, 1 passed.
- Production files: `packages/qfai/src/core/workflow/parse.ts` (`parseRouteReferences` requires exact `{ kind, ref }` entries of the closed kinds each array allows, and refuses anything else `invalid-input` / `schema` naming the entry, before `decide` runs).

### TDD-0529

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/routeProposalReferenceShape.test.ts`
- Selector: `TC-0018-0269 (TDD-0529): bare string in observedRefs`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/routeProposalReferenceShape.test.ts --testNamePattern='TC-0018-0269 \(TDD-0529\): bare string in observedRefs' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0528, whose parser checks both arrays with one entry check.
- GREEN result: exit 0; `✓ ... TC-0018-0269 (TDD-0529): bare string in observedRefs`, 1 passed, 1 skipped.
- Production files: `packages/qfai/src/core/workflow/parse.ts` (no change beyond TDD-0528).

## Record defects

- Repaired — `record:ROUND-EVIDENCE`, TDD-0003: Round 1 phase evidence records its RED, GREEN, oracle and review fields without `Round 1:` or a `#### Round 1` block, although that was the single cycle observed. The Round 1 implementation review reported this advisory. Existing values were moved into Round 1 before opening Round 2; the sealed Round 1 review pack is preserved.
- Repaired — `record:ROUND-EVIDENCE`, TDD-0028: `Round 1: Revision` sat with the RED record, above the RED fields, and held the RED tree's address. `Revision` names the GREEN tree and is outside the RED subject. The line now sits below the RED record and holds the GREEN address. `Round 1: RED revision` still holds the RED address, unchanged.

## Test results summary

TDD-0001's RED selector failed on the expected `awaiting_input` and CREATE-question predicate. With only its assertion neutralized, the same selector passed. Its first review attempt returned REVISE on the Plan's missing architecture exception; the approved Plan correction, second reviews and checkpoint passed. TDD-0002's RED failed on final-stage reachability; its GREEN reached `verify` without another CREATE question. A temporary extra CREATE question made TDD-0002 fail, and the original TDD-0001 mutation still made the shared test fail. Both mutations were restored; the two-test refactor suite passed.

## Exception items

None.

## Cross-spec obligations

None. Before considering a source or test edit, all 18 other specs' ledgers were scanned for `done` rows naming either file by repository path or dotted module alias; direct matches: 0. The reverse dependency scan found only this row's test importing `decide.ts`, no production importer, and no importer of the test file. No other spec's completed selector is reached by either file.

## Commands executed

| Command | Result |
| ------- | ------ |
| `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` from `packages/qfai` | RED exit 1; one assertion failure at line 89 |
| `node tmp/revision-tdd0001.mjs` from repository root, twice | Both exit 0 and report `working-tree+b10641cd1611e7d900e75192ec99f942671648b597a9fd5c320fe06349338b67`; 2,494 path records |
| `git diff --no-index -- tmp/tdd0001-strip/original.test.ts packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts` | Exit 1 because the intentional one-line assertion strip differed; diff captured above |
| Same Vitest command with the assertion neutralized | Exit 0; one selected test passed |
| `Get-FileHash -Algorithm SHA256` for the test and seam | File digests recorded in Round 1; restored test digest matched |
| GREEN Vitest command from `packages/qfai` | Exit 0; one selected test passed |
| Same Vitest command with returned state changed to `routing` | Exit 1; state assertion at line 89 failed |
| Same Vitest command after restoring the source | Exit 0; one selected test passed |
| `node tmp/revision-tdd0001-green.mjs` from repository root, twice | Both exit 0 and report `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8`; 2,494 path records |
| Direct `tsc --noEmit`, Prettier check and ESLint on the changed source | Exit 0 after source formatting and one unnecessary optional chain was removed |
| `rg --files .qfai/specs -g test-list.md` plus `Select-String` on other specs' `done` rows | 18 other ledgers, 0 direct matches for either file or dotted alias |
| `rg -l 'workflow/decide\|oneCreateQuestionAtRouting\|core\.workflow\.decide' packages/qfai/src packages/qfai/tests` | Only this row's test imports the new source; no other importer found |
| Refactor verify Vitest command from `packages/qfai` | Exit 0; one selected test passed |
| `node tmp/revision-tdd0001-refactor.mjs` from repository root, twice | Both exit 0 and report `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8`; 2,494 path records |
| Refactor verify Vitest command after `CR-20260924-0001` from `packages/qfai` | Exit 0; one selected test passed |
| `node tmp/revision-tdd0001-after-cr.mjs` from repository root, twice | Both exit 0 and report `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`; 2,495 path records; temporary helper removed |
