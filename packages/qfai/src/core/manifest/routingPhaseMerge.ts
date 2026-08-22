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
 *
 * Two invariants bound what "add" is allowed to mean:
 *
 * - **Never add a node the project's manifests cannot satisfy.** A project that
 *   removed an agent through `qfai-configure` has no entry for it in
 *   `manifest/agent-catalog.yml`, and `--force` does not regenerate that file.
 *   Splicing in a shipped node that routes to the removed agent would leave
 *   the project failing `qfai validate` (`QFAI-AGENT-008`) on a table that was
 *   valid a moment earlier. Such a node is skipped and reported instead.
 *   `review-profiles.yml` is the same file class and the same exclusion: a
 *   skill entry shipped alongside a new profile — `qfai-implement` with
 *   `implementation-heavy` — would otherwise be appended to a project that has
 *   neither, leaving a `review_profile:` that resolves to nothing when the
 *   reviewers for that skill are selected. Reported and skipped as well.
 * - **Never let an insertion reorder a gate.** A missing phase goes in ahead of
 *   the earliest shipped phase that follows it and that the project does have,
 *   so `red` lands before `implementation` even in a project that reordered
 *   the phases around it. The project's own order is not otherwise disturbed.
 */

export type RoutingPhaseAddition = {
  skill: string;
  phase: string;
};

/**
 * Why a merge step was skipped. The caller maps this to its own diagnostic
 * code, so a syntax error is not reported as a taxonomy divergence: a consumer
 * classifying by code would otherwise be steered into the wrong repair.
 */
export type RoutingMergeWarningKind =
  /** The manifest could not be parsed, or a node has an unexpected shape. */
  | "manifest-shape"
  /** A declared phase omits an agent the shipped phase marks required. */
  | "agent-diverged"
  /** A shipped node routes to an agent the project's catalog does not list. */
  | "catalog-mismatch"
  /** A shipped entry names a review profile the project does not declare. */
  | "profile-mismatch";

export type RoutingMergeWarning = {
  kind: RoutingMergeWarningKind;
  message: string;
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
  warnings: RoutingMergeWarning[];
};

export type RoutingMergeOptions = {
  /**
   * Agent ids the project's `manifest/agent-catalog.yml` declares. `null` (the
   * default) means the catalog could not be read, so no node is filtered — the
   * merge cannot tell a removed agent from an unreadable catalog and must not
   * withhold a phase on a guess.
   */
  knownAgents?: ReadonlySet<string> | null;
  /**
   * Profile names the project's `manifest/review-profiles.yml` declares.
   * `null` (the default) means the file could not be read, which disables the
   * check for the same reason `knownAgents` does.
   */
  knownProfiles?: ReadonlySet<string> | null;
};

/** Phase keys whose shipped membership is a gate, not a preference. */
const REQUIRED_AGENT_KEYS = ["mandatory_agents", "blocking_agents"] as const;

/** Every phase key that names agents, for the catalog reachability check. */
const AGENT_LIST_KEYS = ["mandatory_agents", "conditional_agents", "blocking_agents"] as const;

/**
 * `toString` options that keep a round-trip faithful to how the shipped
 * manifests are written: flow sequences without inner padding (`[a, b]`, not
 * `[ a, b ]`) and no re-wrapping of long lines.
 */
const STRINGIFY_OPTIONS = { lineWidth: 0, flowCollectionPadding: false } as const;

export function mergeRoutingPhases(
  templateSource: string,
  projectSource: string,
  options: RoutingMergeOptions = {},
): RoutingMergeResult {
  const knownAgents = options.knownAgents ?? null;
  const knownProfiles = options.knownProfiles ?? null;
  const addedPhases: RoutingPhaseAddition[] = [];
  const addedSkills: string[] = [];
  const warnings: RoutingMergeWarning[] = [];

  const templateRouting = readRouting(templateSource);
  const projectDoc = parseProjectDocument(projectSource, warnings);
  if (!projectDoc) {
    return { content: null, addedPhases, addedSkills, warnings };
  }
  const projectRouting = readRoutingFromDocument(projectDoc);
  if (!templateRouting || !projectRouting) {
    warnings.push(
      shapeWarning("agent-routing.yml has no `routing:` sequence; skipped the phase merge."),
    );
    return { content: null, addedPhases, addedSkills, warnings };
  }

  for (const templateEntry of templateRouting) {
    const skill = readString(templateEntry, "skill");
    if (!skill) continue;
    const projectEntry = projectRouting.items.find((item) => readString(item, "skill") === skill);
    if (projectEntry === undefined) {
      const unknown = unknownAgentRefs(entryAgentRefs(templateEntry), knownAgents);
      if (unknown.length > 0) {
        warnings.push(catalogWarning(skill, null, unknown));
        continue;
      }
      const profile = unknownProfileRef(templateEntry, knownProfiles);
      if (profile !== null) {
        warnings.push(profileWarning(skill, profile));
        continue;
      }
      projectRouting.items.push(cloneNode(templateEntry));
      addedSkills.push(skill);
      continue;
    }
    mergeSkillPhases(skill, templateEntry, projectEntry, knownAgents, addedPhases, warnings);
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

/**
 * Agent ids declared by a project's `manifest/agent-catalog.yml`, or `null`
 * when the file cannot be read as one. `null` is "unknown", not "empty": it
 * disables the reachability filter rather than skipping every addition.
 */
export function readCatalogAgentIds(source: string): ReadonlySet<string> | null {
  const doc = parseDocument(source);
  if (doc.errors.length > 0) return null;
  const agents: unknown = doc.get("agents");
  if (!isSeq(agents)) return null;
  const ids = new Set<string>();
  for (const item of agents.items) {
    const id = readString(item, "id");
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * Profile names declared by a project's `manifest/review-profiles.yml`, or
 * `null` when the file cannot be read as one — "unknown", not "empty", as in
 * {@link readCatalogAgentIds}.
 */
export function readProfileNames(source: string): ReadonlySet<string> | null {
  const doc = parseDocument(source);
  if (doc.errors.length > 0) return null;
  const profiles: unknown = doc.get("profiles");
  if (!isMap(profiles)) return null;
  const names = new Set<string>();
  for (const item of profiles.items) {
    const key: unknown = item.key;
    if (typeof key === "string") {
      names.add(key);
    } else if (isScalar(key) && typeof key.value === "string") {
      names.add(key.value);
    }
  }
  return names;
}

function mergeSkillPhases(
  skill: string,
  templateEntry: unknown,
  projectEntry: unknown,
  knownAgents: ReadonlySet<string> | null,
  addedPhases: RoutingPhaseAddition[],
  warnings: RoutingMergeWarning[],
): void {
  const templatePhases = readSeq(templateEntry, "phases");
  // Nothing shipped to merge for this skill; not a project defect.
  if (!templatePhases) return;
  const projectPhases = readSeq(projectEntry, "phases");
  if (!projectPhases) {
    // The entry exists but carries no `phases:` sequence, so the phases the
    // regenerated skill routes to stay missing. `validateRouting` skips a
    // non-array `phases` too, so silence here left the operator with no
    // diagnostic from any command.
    warnings.push(
      shapeWarning(
        `${skill}: routing entry has no \`phases:\` sequence; skipped the phase merge for it.`,
      ),
    );
    return;
  }

  // Walk the shipped phases in order, tracking where the next missing one
  // belongs: after every shipped phase that precedes it and that the project
  // does have, but never after a shipped phase that follows it. That keeps
  // `red` ahead of `implementation` even in a project whose other phases were
  // reordered.
  //
  // The cursor only ever moves forward. Taking it from the phase matched last
  // let it *retreat* across a project that reordered two phases: shipped
  // `coverage, red, implementation` against a project holding
  // `red, coverage, evidence`, `coverage` puts the cursor at 2 and `red` —
  // sitting earlier — pulled it back to 1, so `implementation` was spliced in
  // ahead of the `coverage` it must follow. The maximum is the only position
  // that is after *all* of the preceding phases the project declares.
  let cursor = 0;
  for (const [templateIndex, templatePhase] of templatePhases.items.entries()) {
    const id = readString(templatePhase, "id");
    if (!id) continue;
    const existing = projectPhases.items.findIndex((item) => readString(item, "id") === id);
    if (existing >= 0) {
      cursor = Math.max(cursor, existing + 1);
      warnings.push(
        ...divergedAgentWarnings(skill, id, templatePhase, projectPhases.items[existing]),
      );
      continue;
    }
    const unknown = unknownAgentRefs(phaseAgentRefs(templatePhase), knownAgents);
    if (unknown.length > 0) {
      warnings.push(catalogWarning(skill, id, unknown));
      continue;
    }
    const at = insertionIndex(templatePhases.items, templateIndex, projectPhases.items, cursor);
    projectPhases.items.splice(at, 0, cloneNode(templatePhase));
    // `at` is never past the cursor, so the splice shifts every position the
    // cursor already accounts for one to the right — including the cursor
    // itself. Re-anchoring on `at + 1` would drop the earlier phases back
    // behind the insertion point whenever the clamp pulled `at` below it.
    cursor += 1;
    addedPhases.push({ skill, phase: id });
  }
}

/**
 * Where a missing shipped phase goes: at the cursor, unless a shipped phase
 * that comes *after* it already sits earlier in the project's list.
 *
 * The cursor alone was not enough. A project that reordered its phases to
 * `implementation, coverage` and lacks `red` moves the cursor to the end when
 * it matches `coverage`, so `red` was appended *after* `implementation` — the
 * one placement the phase exists to prevent, since after the surfaces are
 * built there is nothing left to watch fail. Clamping to the earliest
 * following shipped phase restores the gate without reordering anything the
 * project already declared.
 */
function insertionIndex(
  templateItems: unknown[],
  templateIndex: number,
  projectItems: unknown[],
  cursor: number,
): number {
  let limit = projectItems.length;
  for (let i = templateIndex + 1; i < templateItems.length; i += 1) {
    const laterId = readString(templateItems[i], "id");
    if (!laterId) continue;
    const at = projectItems.findIndex((item) => readString(item, "id") === laterId);
    if (at >= 0 && at < limit) limit = at;
  }
  return Math.min(cursor, limit);
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
): RoutingMergeWarning[] {
  const warnings: RoutingMergeWarning[] = [];
  for (const key of REQUIRED_AGENT_KEYS) {
    const shipped = readStringList(templatePhase, key);
    if (shipped.length === 0) continue;
    const declared = new Set(readStringList(projectPhase, key));
    const missing = shipped.filter((agent) => !declared.has(agent));
    if (missing.length === 0) continue;
    warnings.push({
      kind: "agent-diverged",
      message: `${skill}/${phase}: ${key} does not list ${missing.join(", ")}, which the shipped routing marks required. Kept as-is — re-add it or record why the project routes without it.`,
    });
  }
  return warnings;
}

function shapeWarning(message: string): RoutingMergeWarning {
  return { kind: "manifest-shape", message };
}

function catalogWarning(
  skill: string,
  phase: string | null,
  unknown: string[],
): RoutingMergeWarning {
  const subject =
    phase === null ? `${skill}: the shipped routing entry` : `${skill}/${phase}: the shipped phase`;
  return {
    kind: "catalog-mismatch",
    message: `${subject} routes to ${unknown.join(", ")}, which agent-catalog.yml does not declare. Skipped rather than added — adding it would fail \`qfai validate\`; re-add the agent to the catalog, or record why the project routes without this phase.`,
  };
}

function profileWarning(skill: string, profile: string): RoutingMergeWarning {
  return {
    kind: "profile-mismatch",
    message: `${skill}: the shipped routing entry names review profile "${profile}", which review-profiles.yml does not declare. Skipped rather than added — the reviewers for the skill would resolve to nothing; add the profile through \`qfai-configure\`, then re-run \`qfai init --force\`.`,
  };
}

/**
 * The `review_profile` a shipped entry names when the project does not declare
 * it, or `null` when it does, when the entry names none, or when the profiles
 * file could not be read.
 */
function unknownProfileRef(
  entry: unknown,
  knownProfiles: ReadonlySet<string> | null,
): string | null {
  if (knownProfiles === null) return null;
  const profile = readString(entry, "review_profile");
  if (profile === null || knownProfiles.has(profile)) return null;
  return profile;
}

/** Agent references in `refs` the project's catalog does not declare. */
function unknownAgentRefs(refs: string[], knownAgents: ReadonlySet<string> | null): string[] {
  if (knownAgents === null) return [];
  const missing = new Set(refs.filter((ref) => !knownAgents.has(ref)));
  return [...missing];
}

/** Every agent a shipped phase names, across all four routing keys. */
function phaseAgentRefs(phase: unknown): string[] {
  const refs: string[] = [];
  for (const key of AGENT_LIST_KEYS) {
    refs.push(...readStringList(phase, key));
  }
  const groups = readSeq(phase, "parallel_groups");
  if (groups) {
    for (const group of groups.items) {
      refs.push(...seqStrings(isSeq(group) ? group : null));
    }
  }
  return refs;
}

/** Every agent a whole shipped skill entry names, across all its phases. */
function entryAgentRefs(entry: unknown): string[] {
  const phases = readSeq(entry, "phases");
  if (!phases) return [];
  return phases.items.flatMap((phase) => phaseAgentRefs(phase));
}

function parseProjectDocument(
  source: string,
  warnings: RoutingMergeWarning[],
): ReturnType<typeof parseDocument> | null {
  const doc = parseDocument(source);
  if (doc.errors.length > 0) {
    const first = doc.errors[0];
    warnings.push(
      shapeWarning(
        `agent-routing.yml could not be parsed (${first?.message ?? "unknown error"}); skipped the phase merge.`,
      ),
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
  return seqStrings(readSeq(node, key));
}

function seqStrings(seq: { items: unknown[] } | null): string[] {
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
