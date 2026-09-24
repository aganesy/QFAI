# SDD Execution Playbook

Use this sequence for /qfai-sdd. The shipped templates under ../templates/spec/ define each file's shape.

## Stage 0: source inventory

1. Run npx qfai sdd preflight and read its selectedInputPath and source. Respect an explicitly selected discussion pack, including one older than the newest pack.
2. Read the selected pack, completed reviews that target it, explicit user requirements, and the existing story tree. A pack is reference and provenance material. Disposition its applicable review advice in SDD evidence, a decision row, or an open question. A pack discrepancy does not itself block SDD.
3. Stop if there is no usable input source. Stop on an unresolved product decision that cannot safely be inferred; record the question in open-questions.md.
4. If no discussion pack exists and an imported specification or an explicit source does, create .qfai/evidence/import-lite-<ts>.md from ../templates/evidence/import-lite.md before editing the tree. Fill the timestamp, source or user excerpt, and selected input path. Do not manufacture a discussion pack.

A review is completed only when its summary.json exists. Match the resolved pack path, include archived reviews, and distinguish a tracked pack's diff from an ignored or untracked pack whose earlier bytes cannot be compared. Do not treat an incomparable review as a current binding verdict.

## Stage 1: triage and decisions

Follow sdd-triage.md. Classify each requirement against existing policy, flow, story, example, and contract content. Identify every affected flow. Append decisions and open questions to the two four-column tables before a dependent write. If a row requires approval, obtain it through the shared user-question protocol; in --auto, leave it pending and stop dependent work. A declined change stays as a REJECTED decision row.

## Stage 2: policy and flow

1. Write affected 01_policy/ files from their paired templates. Each fact has one home among objective.md, initiative.md, principle.md, tech.md, and structure.md.
2. Write 02_business-flow/business-flows.md and the affected business-flow-NNNN/business-flow.md files. Each flow has a Mermaid flowchart or sequenceDiagram.
3. Allocate BF and US IDs from the highest existing ID in their scopes, counting retired IDs named in decisions rows. Add rows to the flow and story indexes.

## Stage 3: concrete stories

1. Write each affected story directory with exactly 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md, based on the matching templates.
2. Each AC is a Gherkin scenario. Each EX has exactly one existing AC-Ref. Each AC has at least one EX. Preserve observable normal, boundary, and kept-failure outcomes.
3. Check the BF → US → AC → EX edges before writing a BR. The test-layer policy later routes BF to E2E, AC to API or Integration, and EX to the applicable other layer.
4. Record retired stories as decision rows. Do not recycle their IDs.

## Stage 4: enforcing contracts

1. Write the 03_contract/ view and each contract file from its paired template or contract-specific template. The only quality-gate command definitions are in the Standard commands section of tech.md.
2. Put each BR inside the contract that enforces it. Cite at least one EX already written. Every EX is cited by at least one BR. A shared rule has one authoritative definition; dependent contracts use file-level rule refs.
3. Add each contract file to contracts.md in the same change. Reconcile API and DB fields, state transitions, errors, and persisted attributes. Run the executable DB contract checks required by contract-artifact-rules.md.
4. For a visual UI surface, complete the DESIGN.md lock protocol before finalizing design contracts. A CLI-only surface does not require a visual lock.

## Stage 5: gate, review, and completion

Run npx qfai validate --profile sdd --fail-on error --flow BF-NNNN for each flow changed. Resolve errors in the owning source and rerun. Record each command, result, log path, and contract executability in .qfai/evidence/sdd-BF-NNNN.md from ../templates/evidence/sdd-flow.md. Route independent reviewers under review-cycle-playbook.md; all blocking verdicts must be PASS. Report unfinished approval, source, or gate work as an incomplete run.

For a contract-scoped change, apply the same gate to every existing BF whose obligations rely on the contract, whether or not its BF file changed. When no BF owns the contract, record the pending ownership in the work log and do not claim a flow gate passed.

## Contract-scoped rerun

The --contract selector accepts an existing contract ID or a repository-relative path under <paths.contractsDir>. Stop on an unknown target. Read the named contract, its paired contracts, and the AC and EX of every flow that cites them. Reconcile those existing obligations with the changed contract. After each authorized contract write, expand the affected-flow set and repeat until no new flow or contract write appears. Do not edit a story to make a contract-only change appear valid; widen the approved change request first. A confirm-only request checks without repair. If an activated API contract still has no owning flow, leave it planned and report the gap.

## Parallel work

A flow is the smallest independent write and validation scope. Parallel workers need separate worktrees or the declared degraded mode in .qfai/assistant/rule/workflow.md. Assign shared policy, indexes, contracts, and decision rows to one integrator. Integrate before final per-flow gates; do not claim completion from one flow's gate while a shared dependency is still changing.
