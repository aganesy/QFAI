# CLI-0021: Graph exploration

## Ownership boundary

This contract owns graph selection, scope readiness, direct-search denial,
human exceptions and completed-analysis reuse. Init preparation and exit
outcomes belong to the init contract. The terminal contract owns presentation.
Native engines own their analysis formats and freshness operations; no QFAI
application database or public graph subcommand is introduced here.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0021-0001 | Code structure exploration starts with CodeGraph for symbols, calls, dependencies and change impact. | EX-0001-0234-01 |
| BR-0021-0002 | An exact known source path may be read directly; a known-file read does not require another graph query or open a general exploration exemption. | EX-0001-0234-02, EX-0001-0235-11 |
| BR-0021-0003 | Requirement, specification, design-rationale and document-relationship exploration starts with Graphify when its requested document scope is ready. | EX-0001-0234-03 |
| BR-0021-0004 | A second engine is used only for a stated unresolved cross-domain question left by the first engine. A fully answered question invokes no second engine, permanent Graphify sync or automatic watcher. | EX-0001-0234-04, EX-0001-0234-05, EX-0001-0234-06 |
| BR-0021-0005 | Document processing uses only an explicitly selected local backend or an explicitly human-authorized processing destination and scope. Ambient credentials select no backend and authorize no transmission; without a required selected backend the scope is documents-not-ready. Existing upstream processing settings are passed only to the managed process, without selecting a provider from ambient configuration. | EX-0001-0234-07, EX-0001-0234-08, EX-0001-0234-09 |
| BR-0021-0006 | Graphify code-only analysis may run locally without a document backend; its result does not make document scope ready. | EX-0001-0234-10 |
| BR-0021-0007 | A compatible completed document graph may be queried without a backend or model call after current scope is confirmed. A changed document requiring processing remains documents-not-ready until the selected processing backend is available. | EX-0001-0234-11, EX-0001-0234-12 |
| BR-0021-0008 | Unsupported, unreadable, unparsed and incomplete requested scope is identified separately from a no-match result; an incomplete search does not establish absence. | EX-0001-0234-13 |
| BR-0021-0009 | Results distinguish source facts and their locations from inferred graph relationships; inferred edges do not establish semantic correctness or complete coverage. | EX-0001-0234-14 |
| BR-0021-0010 | Missing or stale required analysis and graph-operation failures return a preparation or repair action. No automatic grep, rg or native-search fallback occurs; raw search needs a matching human-approved exception. | EX-0001-0234-15, EX-0001-0234-16 |
| BR-0021-0011 | A supported active host adapter denies observable direct exploratory grep, rg, git grep, Select-String, findstr and equivalent native search events before their search effect. The redirect selects CodeGraph for code structure and Graphify for document concepts. | EX-0001-0235-01, EX-0001-0235-02, EX-0001-0235-03, EX-0001-0235-04, EX-0001-0235-05, EX-0001-0235-06 |
| BR-0021-0012 | The classifier evaluates executable command positions in supported wrappers, pipelines and compound commands. A formatter or quality command does not exempt a separate direct exploratory search in the same event. | EX-0001-0235-07, EX-0001-0235-08, EX-0001-0235-09 |
| BR-0021-0013 | Incidental words inside quoted literal text do not constitute a search invocation and do not trigger denial. | EX-0001-0235-10 |
| BR-0021-0014 | Ordinary build, test and lint internals and native graph-engine internals remain permitted. This allowance does not extend to a separate direct exploratory search alongside them. | EX-0001-0235-12, EX-0001-0235-13, EX-0001-0235-09 |
| BR-0021-0015 | Protection claims cover only supported observable pre-tool events and tested command compositions. Searches hidden in arbitrary scripts, aliases or continuing shell input are outside the proven boundary unless separately demonstrated. | EX-0001-0235-14 |
| BR-0021-0016 | An exploratory-search exception requires explicit human approval of target, operation, reason, worktree, session and expiry. It permits only the matching operation and target in that worktree and session before expiry; incomplete, expired, out-of-scope or agent-created approval never permits search. | EX-0001-0235-15, EX-0001-0235-16, EX-0001-0235-17, EX-0001-0235-18, EX-0001-0235-25 |
| BR-0021-0017 | Claude Code, Codex, Copilot CLI and VS Code integrations report capability separately for each actual host and version: configured, trust-required, runtime-verified, unsupported or failed. Configuration alone is not proof; runtime-verified requires observed deny and permitted-event behavior for that host/version/event set. | EX-0001-0235-19, EX-0001-0235-20, EX-0001-0235-21 |
| BR-0021-0018 | Invalid classification or enforcement configuration on a supported denial event reports failed and a repair action; the tested adapter failure protocol does not automatically allow direct exploration. A host without that protocol remains unsupported. | EX-0001-0235-22, EX-0001-0235-21 |
| BR-0021-0019 | A denial hook invokes no network request, model processing, graph rebuild or document analysis. | EX-0001-0235-23 |
| BR-0021-0020 | Reuse selects only completed local analysis for the same machine and repository with compatible engine, environment, paths and selected processing definitions. It restores an independent working copy and confirms native current-scope freshness before querying; unchanged verified scope needs no unnecessary generation. | EX-0001-0236-01, EX-0001-0236-02, EX-0001-0236-21 |
| BR-0021-0021 | CodeGraph database restoration and Graphify restoration containing documents are enabled only for version and environment combinations with actual independent-copy acceptance proof. Unproved combinations use local generation and make no portability claim. | EX-0001-0236-03 |
| BR-0021-0022 | Worktrees and Windows/WSL environments share no live writable database, graph, daemon, PID, socket or lock; concurrent working copies cannot publish one another's uncommitted state. | EX-0001-0236-04, EX-0001-0236-05 |
| BR-0021-0023 | Native engine freshness and update operations reconcile uncommitted edits, added, deleted and renamed inputs before requested results are current. Engine, parser, grammar and selected processing-definition changes trigger compatibility and freshness checks again. | EX-0001-0236-06, EX-0001-0236-07, EX-0001-0236-08, EX-0001-0236-09, EX-0001-0236-10 |
| BR-0021-0024 | Native updates may rebuild a whole corpus; no universal incremental-update speed or initial-generation time is guaranteed. | EX-0001-0236-11 |
| BR-0021-0025 | Missing, partial, corrupt or incompatible cache candidates are excluded from queries. Required compatible local analysis is prepared or its preparation failure is reported. | EX-0001-0236-12, EX-0001-0236-13 |
| BR-0021-0026 | Failed checking or replacement generation preserves prior usable analysis and does not publish an incomplete replacement as completed. Changed scope remains not ready when its selected processing backend is unavailable; prior analysis is not described as current for that scope. | EX-0001-0236-14, EX-0001-0236-15, EX-0001-0236-20 |
| BR-0021-0027 | Generated DBs, graphs, manifests, caches, runtimes and live-process markers stay outside Git; project source, configuration and processing definitions remain tracked. If an adopter removes an ignore entry or tracks generated output, their choice is preserved and the conflict and recovery are reported. | EX-0001-0236-16, EX-0001-0236-17 |
| BR-0021-0028 | Source-changing pull requests need neither generated graph attachments nor a mandatory full graph-regeneration CI gate. Ordinary implementation and integration checks remain required. | EX-0001-0236-18 |
| BR-0021-0029 | Freshness and snapshot handling reuse native engine operations and their supported backup or copy mechanisms; QFAI adds no custom integrity hashes, mandatory remote cache or automatic analysis watcher. | EX-0001-0236-19, EX-0001-0236-02 |
