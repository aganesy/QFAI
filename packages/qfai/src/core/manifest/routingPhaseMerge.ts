import { isMap, isScalar, isSeq, parseDocument } from "yaml";

/**
 * Add-only merge of the shipped routing table into a project's own
 * `assistant/manifest/agent-routing.yml`.
 *
 * The manifest layer is user configuration — `qfai-configure` is its shipped
 * editor — so `init --force` copies over it for nobody. The cost of that was
 * one-directional staleness: a phase added to the shipped routing reached new
 * projects only, while an installed project kept a table the updated skills
 * already assume a phase of, and no command would tell it so.
 *
 * The merge closes that gap in the only direction that cannot lose a decision:
 *
 * - a skill entry the project lacks is appended whole;
 * - a phase the project lacks is inserted at the position the shipped table
 *   gives it (relative to the phases the project does have), comments and all;
 * - a phase the project already declares is never touched. Its agent lists are
 *   the project's taxonomy, including deliberate removals.
 *
 * The last rule needs a policy for the case where a project dropped an agent
 * the shipped phase marks mandatory or blocking. Re-adding it would overwrite
 * a decision made through the supported path, which is the failure this whole
 * exclusion exists to prevent. So the removal is respected and reported: the
 * caller surfaces a warning naming the phase and the agent, and the operator
 * decides. A visible divergence is repairable; a silently restored agent is
 * indistinguishable from one the project chose.
 */

export type RoutingPhaseAddition = {
  skill: string;
  phase: string;
};

export type RoutingMergeResult = {
  /**
   * The merged document, or `null` when nothing was added. `null` means the
   * caller MUST NOT rewrite the file — re-serializing an unchanged manifest
   * would reflow the user's formatting for no gain.
   */
  content: string | null;
  addedPhases: RoutingPhaseAddition[];
  addedSkills: string[];
  /** Non-fatal notes: an unreadable manifest, or a required agent removed. */
  warnings: string[];
};

/** Phase keys whose shipped membership is a gate, not a preference. */
const REQUIRED_AGENT_KEYS = ["mandatory_agents", "blocking_agents"] as const;

/**
 * `toString` options that keep a round-trip faithful to how the shipped
 * manifests are written: flow sequences without inner padding (`[a, b]`, not
 * `[ a, b ]`) and no re-wrapping of long lines.
 */
const STRINGIFY_OPTIONS = { lineWidth: 0, flowCollectionPadding: false } as const;

export function mergeRoutingPhases(
  templateSource: string,
  projectSource: string,
): RoutingMergeResult {
  const addedPhases: RoutingPhaseAddition[] = [];
  const addedSkills: string[] = [];
  const warnings: string[] = [];

  const templateRouting = readRouting(templateSource);
  const projectDoc = parseProjectDocument(projectSource, warnings);
  if (!projectDoc) {
    return { content: null, addedPhases, addedSkills, warnings };
  }
  const projectRouting = readRoutingFromDocument(projectDoc);
  if (!templateRouting || !projectRouting) {
    warnings.push("agent-routing.yml has no `routing:` sequence; skipped the phase merge.");
    return { content: null, addedPhases, addedSkills, warnings };
  }

  for (const templateEntry of templateRouting) {
    const skill = readString(templateEntry, "skill");
    if (!skill) continue;
    const projectEntry = projectRouting.items.find((item) => readString(item, "skill") === skill);
    if (projectEntry === undefined) {
      projectRouting.items.push(cloneNode(templateEntry));
      addedSkills.push(skill);
      continue;
    }
    mergeSkillPhases(skill, templateEntry, projectEntry, addedPhases, warnings);
  }

  if (addedPhases.length === 0 && addedSkills.length === 0) {
    return { content: null, addedPhases, addedSkills, warnings };
  }
  return {
    content: projectDoc.toString(STRINGIFY_OPTIONS),
    addedPhases,
    addedSkills,
    warnings,
  };
}

function mergeSkillPhases(
  skill: string,
  templateEntry: unknown,
  projectEntry: unknown,
  addedPhases: RoutingPhaseAddition[],
  warnings: string[],
): void {
  const templatePhases = readSeq(templateEntry, "phases");
  const projectPhases = readSeq(projectEntry, "phases");
  if (!templatePhases || !projectPhases) return;

  // Walk the shipped phases in order, tracking where the next missing one
  // belongs: immediately after the last shipped phase the project does have.
  // That keeps `red` ahead of `implementation` even in a project whose other
  // phases were reordered.
  let cursor = 0;
  for (const templatePhase of templatePhases.items) {
    const id = readString(templatePhase, "id");
    if (!id) continue;
    const existing = projectPhases.items.findIndex((item) => readString(item, "id") === id);
    if (existing >= 0) {
      cursor = existing + 1;
      warnings.push(
        ...divergedAgentWarnings(skill, id, templatePhase, projectPhases.items[existing]),
      );
      continue;
    }
    projectPhases.items.splice(cursor, 0, cloneNode(templatePhase));
    cursor += 1;
    addedPhases.push({ skill, phase: id });
  }
}

/**
 * Required agents the shipped phase names and the project's copy does not.
 * Reported only — see the module comment for why they are not restored.
 */
function divergedAgentWarnings(
  skill: string,
  phase: string,
  templatePhase: unknown,
  projectPhase: unknown,
): string[] {
  const warnings: string[] = [];
  for (const key of REQUIRED_AGENT_KEYS) {
    const shipped = readStringList(templatePhase, key);
    if (shipped.length === 0) continue;
    const declared = new Set(readStringList(projectPhase, key));
    const missing = shipped.filter((agent) => !declared.has(agent));
    if (missing.length === 0) continue;
    warnings.push(
      `${skill}/${phase}: ${key} does not list ${missing.join(", ")}, which the shipped routing marks required. Kept as-is — re-add it or record why the project routes without it.`,
    );
  }
  return warnings;
}

function parseProjectDocument(
  source: string,
  warnings: string[],
): ReturnType<typeof parseDocument> | null {
  const doc = parseDocument(source);
  if (doc.errors.length > 0) {
    const first = doc.errors[0];
    warnings.push(
      `agent-routing.yml could not be parsed (${first?.message ?? "unknown error"}); skipped the phase merge.`,
    );
    return null;
  }
  return doc;
}

function readRouting(source: string): unknown[] | null {
  const doc = parseDocument(source);
  if (doc.errors.length > 0) return null;
  return readRoutingFromDocument(doc)?.items ?? null;
}

function readRoutingFromDocument(
  doc: ReturnType<typeof parseDocument>,
): { items: unknown[] } | null {
  const routing: unknown = doc.get("routing");
  return isSeq(routing) ? routing : null;
}

function readString(node: unknown, key: string): string | null {
  if (!isMap(node)) return null;
  const value = node.get(key);
  return typeof value === "string" ? value : null;
}

function readSeq(node: unknown, key: string): { items: unknown[] } | null {
  if (!isMap(node)) return null;
  const value = node.get(key);
  return isSeq(value) ? value : null;
}

function readStringList(node: unknown, key: string): string[] {
  const seq = readSeq(node, key);
  if (!seq) return [];
  const values: string[] = [];
  for (const item of seq.items) {
    if (typeof item === "string") {
      values.push(item);
    } else if (isScalar(item) && typeof item.value === "string") {
      values.push(item.value);
    }
  }
  return values;
}

/**
 * Deep-copy a node from the template document before it is spliced into the
 * project document, so the two documents never share mutable nodes.
 */
function cloneNode(node: unknown): unknown {
  if (isMap(node) || isSeq(node) || isScalar(node)) {
    return node.clone();
  }
  return node;
}
