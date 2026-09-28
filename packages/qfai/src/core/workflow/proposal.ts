import path from "node:path";

import { areaCovers, DEFAULT_SPECS_DIR } from "./common.js";
import { endsAtTriageClose, flowBindingOf } from "./stages.js";
import type {
  PlanStages,
  ProposalRefusal,
  ProposalRefusalReason,
  WorkflowFacts,
  WorkflowPlan,
  WorkflowProposal,
} from "./types.js";

// Only a routed request takes a route; any other kind is refused as a scope escape.
const REQUEST_KINDS = ["routed", "verify_only", "resume", "cancel", "explicit_stage"];

const PROTECTED_PREFIXES = [
  ".git/",
  ".qfai/run/",
  ".qfai/evidence/workflow/",
  ".qfai/evidence/decision/",
];

function literalPrefix(area: string): string {
  const glob = area.search(/[*?[{]/);
  return glob < 0 ? area : area.slice(0, glob);
}

// SIMPLIFIED: two write areas overlap when one's literal prefix contains the other's.
// Lift when: a glob pair that shares no path is refused and the refusal is observed.
function areasOverlap(left: string, right: string): boolean {
  const leftPrefix = literalPrefix(left);
  const rightPrefix = literalPrefix(right);
  const leftIsGlob = leftPrefix !== left;
  const rightIsGlob = rightPrefix !== right;
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`) ||
    (leftIsGlob && right.startsWith(leftPrefix)) ||
    (rightIsGlob && left.startsWith(rightPrefix))
  );
}

// A write area inside a protected directory, naming one of the two tables, or overlapping a
// target the proposal protects.
function touchesProtectedSurface(area: string, protectedTargets: readonly string[], specs: string) {
  const prefix = literalPrefix(area);
  const tables = [`${specs}/decisions.md`, `${specs}/open-questions.md`];
  return (
    PROTECTED_PREFIXES.some(
      (surface) =>
        prefix.startsWith(surface) ||
        `${area}/` === surface ||
        (prefix !== area && surface.startsWith(prefix)),
    ) ||
    tables.some((table) => areasOverlap(area, table)) ||
    protectedTargets.some((target) => areasOverlap(area, target))
  );
}

function escapesRoot(area: string): boolean {
  const normalized = path.posix.normalize(area.replaceAll("\\", "/"));
  return (
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(area) ||
    normalized === ".." ||
    normalized.startsWith("../")
  );
}

// SIMPLIFIED: any open question counts as asking every material risk signal.
// Lift when: a question input names the risk signal it asks about.
function unaskedRiskSignals(proposal: WorkflowProposal): string[] {
  if ((proposal.unresolvedQuestions ?? []).length > 0) return [];
  return (proposal.riskSignals ?? []).filter((signal) => signal !== "authorization-restored");
}

// The one flow a proposal with no new story binds on a route's plan, or the subject a
// `flow-binding` refusal names. A route that binds a flow needs exactly one; a route whose only
// stage facing a flow is a test fix takes the one named, or none; any other route binds none,
// whatever the proposal names.
export function flowToBind(
  proposal: WorkflowProposal,
  stages: PlanStages | undefined,
  facts: WorkflowFacts,
): { flowId?: string; refused?: string } {
  const binding = stages ? flowBindingOf(stages) : "none";
  if (proposal.newStories.length > 0 || binding === "none") return {};
  const named = proposal.affectedFlowIds ?? [];
  if (binding === "optional" && named.length === 0) return {};
  const [flowId] = named;
  if (named.length !== 1 || flowId === undefined || !(facts.flows ?? []).includes(flowId)) {
    return { refused: named.length > 0 ? named.join(",") : "affectedFlowIds" };
  }
  return { flowId };
}

// A route that ends at `triage-close` writes only the records its discussion stage keeps: the
// project's discussion packs, and `DESIGN.md` for a UI-bearing target.
function recordEscapes(
  proposal: WorkflowProposal,
  stages: PlanStages,
  facts: WorkflowFacts,
): string[] {
  if (!endsAtTriageClose(stages)) return [];
  const discusses = stages.some((stage) => stage.stageKind === "discussion");
  const records = discusses ? [facts.discussionDir ?? ".qfai/discussion", "DESIGN.md"] : [];
  const covered = (area: string) =>
    records.some((record) => areaCovers(record, area) || areaCovers(record, literalPrefix(area)));
  return (proposal.proposedWriteScope ?? []).filter((area) => !covered(area));
}

function refusalsOf(reason: ProposalRefusalReason, subjects: readonly string[]): ProposalRefusal[] {
  return subjects.map((subject) => ({ reason, subject }));
}

function referenceRefusals(proposal: WorkflowProposal, facts: WorkflowFacts): ProposalRefusal[] {
  const references = [...proposal.expectedBehaviorRefs, ...proposal.observedRefs];
  const pathReferences = references
    .filter((reference) => reference.kind === "path" || reference.kind === "evidence")
    .map((reference) => reference.ref);
  const unknownPaths = [...new Set(pathReferences)].filter(
    (ref) => facts.pathExistence?.[ref] !== true,
  );
  // SIMPLIFIED: a contract reference resolves against no index, so it is always unknown.
  // Lift when: a route proposal needs to cite a contract as the normative source of a change.
  const unknownIds = references
    .filter(
      (reference) =>
        (reference.kind === "flow-id" && !(facts.flows ?? []).includes(reference.ref)) ||
        reference.kind === "contract-id",
    )
    .map((reference) => reference.ref);
  return [...refusalsOf("unknown-path", unknownPaths), ...refusalsOf("unknown-id", unknownIds)];
}

// The part of the proposal's write scope a route admits: all of it, or on a route that ends at
// `triage-close` only the records its discussion stage keeps.
export function admittedScope(
  proposal: WorkflowProposal,
  stages: PlanStages,
  facts: WorkflowFacts,
): string[] {
  const escaped = recordEscapes(proposal, stages, facts);
  return (proposal.proposedWriteScope ?? []).filter((area) => !escaped.includes(area));
}

// Every failed check of the proposal against the routes it may take: one route once routing has
// fixed it, or each candidate while a question chooses among them. A candidate is checked for
// its flow binding; its write scope is narrowed to what it admits instead of refused.
export function proposalRefusals(
  proposal: WorkflowProposal,
  facts: WorkflowFacts,
  routes: readonly string[],
): ProposalRefusal[] {
  const [route = ""] = routes;
  const fixed = routes.length === 1 ? (facts.plans?.[route]?.stages ?? []) : [];
  const specs = facts.specsDir ?? DEFAULT_SPECS_DIR;
  const scope = proposal.proposedWriteScope ?? [];
  const protectedAreas = scope.filter((area) =>
    touchesProtectedSurface(area, proposal.protectedTargets ?? [], specs),
  );
  const bindings = routes.flatMap(
    (each) => flowToBind(proposal, facts.plans?.[each]?.stages, facts).refused ?? [],
  );
  const kind = proposal.requestKind;
  return [
    ...referenceRefusals(proposal, facts),
    ...refusalsOf("protected-surface", protectedAreas),
    ...refusalsOf("scope-escape", kind === "routed" ? [] : [kind]),
    ...refusalsOf("scope-escape", scope.filter(escapesRoot)),
    ...refusalsOf("scope-escape", recordEscapes(proposal, fixed, facts)),
    ...refusalsOf("unresolved-approval", unaskedRiskSignals(proposal)),
    ...refusalsOf("flow-binding", [...new Set(bindings)]),
  ];
}

// The plan of `route` with the checked proposal's goal, scope and references.
export function checkedPlan(
  proposal: WorkflowProposal,
  facts: WorkflowFacts,
  route: string,
): WorkflowPlan | undefined {
  const builtIn = facts.plans?.[route];
  if (!builtIn || !proposal.goal || !Array.isArray(proposal.proposedWriteScope)) return undefined;
  return {
    route: builtIn.route,
    goal: proposal.goal,
    stages: builtIn.stages,
    writeScope: proposal.proposedWriteScope,
    expectedBehaviorRefs: proposal.expectedBehaviorRefs,
    observedRefs: proposal.observedRefs,
    ...(proposal.riskSignals?.length ? { riskSignals: proposal.riskSignals } : {}),
  };
}

// Whether a routing result carries what routing needs to be checked at all.
export function routingShapeIsBroken(proposal: WorkflowProposal): boolean {
  if (!REQUEST_KINDS.includes(proposal.requestKind)) return true;
  const stories = proposal.newStories;
  const extraction = proposal.extraction;
  return (
    typeof extraction !== "object" ||
    !Array.isArray(extraction.entryFlags) ||
    !Array.isArray(extraction.qualifiers) ||
    !Array.isArray(extraction.signals) ||
    !Array.isArray(extraction.risks) ||
    !Array.isArray(extraction.artifacts) ||
    !Array.isArray(proposal.expectedBehaviorRefs) ||
    !Array.isArray(proposal.observedRefs) ||
    !Array.isArray(stories) ||
    stories.some(
      (story) =>
        !story.goal ||
        !Array.isArray(story.covers) ||
        !Array.isArray(story.excludes) ||
        !Array.isArray(story.evidence) ||
        story.evidence.length === 0 ||
        (story.flowId !== null && typeof story.flowId !== "string"),
    )
  );
}
