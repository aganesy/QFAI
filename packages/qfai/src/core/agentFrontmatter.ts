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
