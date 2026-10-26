import { parse as parseYaml } from "yaml";

export type AgentFrontmatter = {
  name: string;
  description: string;
  tools: string[];
  kind: "worker" | "reviewer";
  domain: string;
  mission: string;
  replaces: string[];
  owned_artifacts: string[];
  tool_profile: string;
  permission_profile: string;
  specialization_tags: string[];
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

// The body is optional: `---` on one line and `---` on the next is a closed,
// empty block, and requiring a line between them read it as a block that never
// closes — which sends the caller to repair delimiters that are already right.
const FRONTMATTER_PATTERN = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/;

/**
 * The opening delimiter on its own.
 *
 * A document that matches this but not {@link FRONTMATTER_PATTERN} opened a
 * frontmatter block and never closed it — a broken file, not a file without
 * frontmatter, and every reader of it (the assistant included) sees the whole
 * document as body text.
 */
const FRONTMATTER_OPEN_PATTERN = /^---\r?\n/;

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

  if (root.kind !== "worker" && root.kind !== "reviewer") {
    return { ok: false, error: "frontmatter.kind must be worker or reviewer" };
  }
  for (const key of ["domain", "mission", "tool_profile", "permission_profile"] as const) {
    if (typeof root[key] !== "string" || root[key].trim().length === 0) {
      return { ok: false, error: `frontmatter.${key} must be a non-empty string` };
    }
  }
  for (const key of ["replaces", "owned_artifacts", "specialization_tags"] as const) {
    if (
      !Array.isArray(root[key]) ||
      root[key].some((entry) => typeof entry !== "string" || entry.trim().length === 0)
    ) {
      return { ok: false, error: `frontmatter.${key} must be a list of non-empty strings` };
    }
  }

  return {
    ok: true,
    frontmatter: {
      name: root.name.trim(),
      description: root.description.trim(),
      tools: root.tools.map((entry) => (entry as string).trim()),
      kind: root.kind,
      domain: (root.domain as string).trim(),
      mission: (root.mission as string).trim(),
      replaces: (root.replaces as string[]).map((entry) => entry.trim()),
      owned_artifacts: (root.owned_artifacts as string[]).map((entry) => entry.trim()),
      tool_profile: (root.tool_profile as string).trim(),
      permission_profile: (root.permission_profile as string).trim(),
      specialization_tags: (root.specialization_tags as string[]).map((entry) => entry.trim()),
    },
  };
}

/**
 * Whether a skill's frontmatter block can be read.
 *
 * `parseError` is set when a frontmatter block IS present but cannot be read
 * as a mapping: a YAML syntax error, a block that parses to a scalar or a list,
 * or an opening `---` with no closing delimiter. The assistant cannot load such
 * a `SKILL.md` at all. Absence of a frontmatter block stays `undefined`: that
 * file makes no claim to check.
 */
export type SkillFrontmatter = {
  parseError?: string;
};

export function parseSkillFrontmatter(content: string): SkillFrontmatter | undefined {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return FRONTMATTER_OPEN_PATTERN.test(content)
      ? { parseError: "frontmatter block opens with --- but is never closed" }
      : undefined;
  }
  const rawFrontmatter = match[1];
  if (!rawFrontmatter) {
    // A closed but empty block declares nothing, exactly like no block at all.
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
  return {};
}

/**
 * A skill document's front matter as a mapping, or `undefined` when there is
 * none a host could read.
 *
 * The delimiter is {@link parseSkillFrontmatter}'s: a complete `---` line at the
 * top and a complete `---` line closing it. A document opening `--- # note` has
 * no front matter to the loader, so it has none here either — the alternative is
 * a check certifying metadata on a file the assistant cannot load.
 *
 * One `undefined` for every way of having nothing readable: no block, an empty
 * block, YAML that does not parse, and YAML that is not a mapping. A caller
 * asking whether a field is declared gets the same answer in all four, which is
 * that it is not.
 */
export function skillFrontmatterMapping(content: string): Record<string, unknown> | undefined {
  const raw = content.match(FRONTMATTER_PATTERN)?.[1];
  if (raw === undefined || raw === "") return undefined;
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  return { ...parsed };
}
