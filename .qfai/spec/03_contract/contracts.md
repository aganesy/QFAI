# Contracts

## Purpose

This index names the current contract artifacts under `paths.contractsDir` (default `.qfai/spec/03_contract/`). The discussion pack supplies provenance; downstream execution reads the story tree and its enforcing contracts. A contract file and its index row are updated together.

QFAI itself has no project API, database, or rendered UI contract. Those families remain available to adopter repositories. Root `DESIGN.md` is an input only when a visual UI contract needs a brand lock.

## Contract Index

| Short ID         | Entity                   | Declared ID | File                                                         | Purpose                                             |
| ---------------- | ------------------------ | ----------- | ------------------------------------------------------------ | --------------------------------------------------- |
| DCON-AP          | Anti-pattern schema      | —           | `.qfai/spec/03_contract/design/anti-patterns.schema.yaml`    | Schema for classified UI anti-pattern records.      |
| DCON-BP          | Best-practice schema     | —           | `.qfai/spec/03_contract/design/best-practices.schema.yaml`   | Schema for UI practice records.                     |
| DCON-DT          | Design-token schema      | CON-DT-0001 | `.qfai/spec/03_contract/design/design-tokens.schema.yaml`    | Primitive, semantic, and component token structure. |
| CLI-ROUTING      | Assistant routing        | —           | `.qfai/spec/03_contract/cli/assistant-routing.md`            | Agent cards, routing, and review profiles.          |
| CLI-CONFIG       | Configuration            | —           | `.qfai/spec/03_contract/cli/configuration.md`                | Project override and path resolution.               |
| CLI-DELIVERY     | Delivery workflow        | —           | `.qfai/spec/03_contract/cli/delivery-workflow.md`            | ATDD, implementation, and verification handoffs.    |
| CLI-ATDD         | qfai atdd scaffold       | —           | `.qfai/spec/03_contract/cli/qfai-atdd-scaffold.md`           | BF and AC test scaffolds.                           |
| CLI-AUDIT        | qfai audit               | —           | `.qfai/spec/03_contract/cli/qfai-audit.md`                   | Decision-record query surface.                      |
| CLI-DISCUSSION   | qfai discussion          | —           | `.qfai/spec/03_contract/cli/qfai-discussion.md`              | Discussion-pack listing and active pointer.         |
| CLI-DOC          | qfai doctor              | —           | `.qfai/spec/03_contract/cli/qfai-doctor.md`                  | Environment and asset checks with repair guidance.  |
| CLI-GUARD        | qfai guardrails          | —           | `.qfai/spec/03_contract/cli/qfai-guardrails.md`              | Decision guardrail grammar and command surface.     |
| CLI-HUP          | qfai handoff upgrade     | —           | `.qfai/spec/03_contract/cli/qfai-handoff-upgrade.md`         | Legacy handoff conversion.                          |
| CLI-INIT         | qfai init                | —           | `.qfai/spec/03_contract/cli/qfai-init.md`                    | Project seed, paths, and assistant integration.     |
| CLI-MIGR         | Story-tree migration     | —           | `.qfai/spec/03_contract/cli/qfai-migration-spec-to-story.md` | Bundled migration steps and their write boundary.   |
| CLI-PITER        | qfai prototyping iterate | —           | `.qfai/spec/03_contract/cli/qfai-prototyping-iterate.md`     | Cycle flags, capture, and scope freeze.             |
| CLI-PROT         | qfai prototyping         | —           | `.qfai/spec/03_contract/cli/qfai-prototyping.md`             | UI contract loop, certification, show, and rescope. |
| CLI-REPORT       | qfai report              | —           | `.qfai/spec/03_contract/cli/qfai-report.md`                  | Report rendering and flow scope.                    |
| CLI-VAL          | qfai validate            | —           | `.qfai/spec/03_contract/cli/qfai-validate.md`                | Profiles, findings, and validation output.          |
| CLI-RESEARCH     | Research protocol        | —           | `.qfai/spec/03_contract/cli/research-protocol.md`            | Provider-independent source handling.               |
| CLI-WFSET        | Shipped workflows        | —           | `.qfai/spec/03_contract/cli/shipped-workflows.md`            | Distributed CI workflow ownership and shape.        |
| CLI-WF           | qfai workflow            | —           | `.qfai/spec/03_contract/cli/qfai-workflow.md`                | Free-text entry, run control and the final gate.    |
| CLI-WFFILE       | Workflow files           | —           | `.qfai/spec/03_contract/cli/workflow-files.md`               | Run trees, tracked evidence, plans and schemas.     |
| CLI-STORY-AUTHOR | Story authoring          | —           | `.qfai/spec/03_contract/cli/story-tree-authoring.md`         | SDD and migration authoring boundaries.             |

## Rule ownership

- `tech.md#rules` owns technology and CI rules.
- `structure.md#rules` owns story-tree and repository layout rules.
- A CLI contract owns rules for its command or shared subject. Its BR entries cite existing examples from the story tree.
- Historical contract declarations remain in `.qfai/evidence/migration-spec-to-story/retired/_policies/05_Contracts.md`; they are not execution inputs.
