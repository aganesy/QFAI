import { parse as parseYaml } from "yaml";

export type AgentFrontmatter = {
  name: string;
  description: string;
  tools: string[];
};

export type AgentFrontmatterParseResult =
  | {
      ok: true;
      frontmatter: AgentFrontmatter;
    }
  | {
      ok: false;
      error: string;
    };

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseAgentFrontmatter(content: string): AgentFrontmatterParseResult {
  const match = content.match(FRONTMATTER_PATTERN);
  const rawFrontmatter = match?.[1];
  if (!rawFrontmatter) {
    return {
      ok: false,
      error: "missing YAML frontmatter block",
    };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawFrontmatter);
  } catch {
    return {
      ok: false,
      error: "frontmatter could not be parsed as YAML",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      error: "frontmatter must parse to an object",
    };
  }

  const root = parsed as Record<string, unknown>;
  if (typeof root.name !== "string" || root.name.trim().length === 0) {
    return {
      ok: false,
      error: "frontmatter.name must be a non-empty string",
    };
  }
  if (typeof root.description !== "string" || root.description.trim().length === 0) {
    return {
      ok: false,
      error: "frontmatter.description must be a non-empty string",
    };
  }
  if (
    !Array.isArray(root.tools) ||
    root.tools.length === 0 ||
    root.tools.some((entry) => typeof entry !== "string" || entry.trim().length === 0)
  ) {
    return {
      ok: false,
      error: "frontmatter.tools must be a non-empty string array",
    };
  }

  return {
    ok: true,
    frontmatter: {
      name: root.name.trim(),
      description: root.description.trim(),
      tools: root.tools.map((entry) => (entry as string).trim()),
    },
  };
}

/**
 * What a skill's own frontmatter declares about who may act inside it.
 *
 * `roles` is `undefined` when the frontmatter carries no `roles:` key at all,
 * which is deliberately different from declaring an empty list: only the
 * latter is a claim the validator can hold a routing manifest against.
 *
 * `rolesError` is set instead when the key IS present but is not a list of
 * non-empty strings. Folding that case into "no declaration" let one notation
 * slip (`roles: completion-reviewer`, valid YAML but a scalar) silently
 * disable both `QFAI-AGENT-014` and `QFAI-AGENT-015` for the skill, so even a
 * missing mandatory routed agent passed as success.
 */
export type SkillFrontmatter = {
  roles?: string[];
  rolesError?: string;
  routingProfile?: string;
  /**
   * Set when a frontmatter block IS present but cannot be read as a mapping —
   * a YAML syntax error, or a block that parses to a scalar or a list.
   *
   * Folding this into "no declaration" made a plain indentation slip silently
   * disable every check in this family: the assistant cannot load such a
   * `SKILL.md` at all, yet agent-definition validation passed. Absence of a
   * frontmatter block stays `undefined` — that file makes no claim to check.
   */
  parseError?: string;
};

/**
 * The frontmatter fields that bind a skill to `agent-routing.yml`.
 *
 * That manifest and a skill's `roles:` both say who may act inside the skill,
 * and until `QFAI-AGENT-014` / `QFAI-AGENT-015` nothing compared them. Reading
 * them here rather than in the validator keeps the frontmatter delimiter a
 * single expression, shared with `parseAgentFrontmatter`.
 *
 * `undefined` — no frontmatter block at all — means the file makes no
 * declaration this rule can adjudicate. A block that IS present but cannot be
 * read comes back with {@link SkillFrontmatter.parseError} set instead, so the
 * caller reports it rather than treating a broken file as a silent pass.
 */
export function parseSkillFrontmatter(content: string): SkillFrontmatter | undefined {
  const match = content.match(FRONTMATTER_PATTERN);
  const rawFrontmatter = match?.[1];
  if (!rawFrontmatter) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawFrontmatter);
  } catch {
    return { parseError: "frontmatter could not be parsed as YAML" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { parseError: "frontmatter must parse to an object" };
  }

  const root: Record<string, unknown> = { ...parsed };
  const rawProfile = root["routing-profile"];
  const declared = readDeclaredRoles(root.roles);
  if (typeof rawProfile === "string" && rawProfile.trim().length > 0) {
    return { ...declared, routingProfile: rawProfile.trim() };
  }
  return declared;
}

/** The `roles:` half of {@link parseSkillFrontmatter}. */
function readDeclaredRoles(roles: unknown): Pick<SkillFrontmatter, "roles" | "rolesError"> {
  if (roles === undefined) {
    return {};
  }
  if (!Array.isArray(roles)) {
    return { rolesError: "frontmatter.roles must be a list of agent ids" };
  }
  const names: string[] = [];
  for (const entry of roles) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      return { rolesError: "frontmatter.roles must contain only non-empty agent ids" };
    }
    names.push(entry.trim());
  }
  return { roles: names };
}
