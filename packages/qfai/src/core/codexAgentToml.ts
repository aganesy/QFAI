import { parse as parseYaml } from "yaml";

import { parseAgentFrontmatter } from "./agentFrontmatter.js";

/**
 * Codex reads its sub-agent profiles from `.codex/agents/<name>.toml`, one TOML
 * document per agent, with the whole agent body carried in a single
 * `developer_instructions` string.
 *
 * The other two integrations (`.claude/agents/<name>.md`,
 * `.github/agents/<name>.agent.md`) are symlinks into
 * `.qfai/assistant/agents/`, so a correction to a canonical agent document
 * reaches them the moment it lands. TOML cannot be a symlink to markdown: the
 * body has to be escaped into a string field. So this wrapper is a *generated*
 * file, and it goes stale unless something regenerates it — which is why
 * `qfai init --force` rewrites it alongside `assistant/agents/**`.
 */
export const CODEX_AGENT_WRAPPER_DIR = ".codex/agents";

/** Filename suffix under {@link CODEX_AGENT_WRAPPER_DIR}. */
export const CODEX_AGENT_WRAPPER_SUFFIX = ".toml";

export type CodexAgentKind = "worker" | "reviewer";

/**
 * Reviewers run without write access; workers leave `sandbox_mode` unset so
 * Codex applies its own default. The split is declared once, in
 * `assistant/manifest/agent-catalog.yml#agents[].kind`.
 */
const REVIEWER_SANDBOX_MODE = "read-only";

/** Where a canonical agent body starts — everything above it is the H1 title. */
const BODY_START_MARKER = "## Mission";

/**
 * The heading, anchored to a whole line.
 *
 * A substring search finds `## Mission` wherever it appears, frontmatter
 * included — `description: "Use the ## Mission section"` is valid YAML and
 * would move the body start above the closing `---`, handing Codex a
 * `developer_instructions` that opens with the rest of the frontmatter and the
 * H1. The document still parses as TOML, so nothing downstream catches it.
 * `\b` rather than `$` so a heading that carries a subtitle
 * (`## Mission and scope`) still starts the body, as the substring search did.
 */
const BODY_START_HEADING_RE = /^## Mission\b/m;

/** Matches {@link parseAgentFrontmatter}'s block, on LF-normalised input. */
const FRONTMATTER_BLOCK_RE = /^---\n[\s\S]*?\n---(?:\n|$)/;

/**
 * Offset of the first character after the frontmatter block, or 0 when the
 * document has none.
 */
function bodySearchStart(normalized: string): number {
  return FRONTMATTER_BLOCK_RE.exec(normalized)?.[0].length ?? 0;
}

const TOML_ESCAPES = new Map<string, string>([
  ["\\", "\\\\"],
  ['"', '\\"'],
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["\t", "\\t"],
  ["\b", "\\b"],
  ["\f", "\\f"],
]);

const DELETE_CODE_POINT = 0x7f;
const FIRST_PRINTABLE_CODE_POINT = 0x20;

/**
 * Renders a TOML basic string, quotes included.
 *
 * TOML forbids raw control characters inside a basic string, so anything below
 * U+0020 (plus U+007F) that has no short escape is emitted as `\uXXXX`. Agent
 * bodies are markdown and routinely contain `"` and `\` — an unescaped one
 * would truncate `developer_instructions` at that character and hand Codex a
 * silently half-loaded agent.
 */
export function escapeTomlBasicString(value: string): string {
  let escaped = "";
  for (const character of value) {
    const shortEscape = TOML_ESCAPES.get(character);
    if (shortEscape !== undefined) {
      escaped += shortEscape;
      continue;
    }
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < FIRST_PRINTABLE_CODE_POINT || codePoint === DELETE_CODE_POINT) {
      escaped += `\\u${codePoint.toString(16).padStart(4, "0")}`;
      continue;
    }
    escaped += character;
  }
  return `"${escaped}"`;
}

export type CodexAgentTomlInput = {
  name: string;
  description: string;
  /** The canonical agent body, from `## Mission` onward. */
  body: string;
  kind: CodexAgentKind;
};

/** Emits the four-field TOML document, LF-terminated. */
export function buildCodexAgentToml(input: CodexAgentTomlInput): string {
  const lines = [
    `name = ${escapeTomlBasicString(input.name)}`,
    `description = ${escapeTomlBasicString(input.description)}`,
  ];
  if (input.kind === "reviewer") {
    lines.push(`sandbox_mode = ${escapeTomlBasicString(REVIEWER_SANDBOX_MODE)}`);
  }
  lines.push(`developer_instructions = ${escapeTomlBasicString(input.body)}`);
  return `${lines.join("\n")}\n`;
}

/** The key order {@link buildCodexAgentToml} emits, per kind. */
const GENERATED_KEY_ORDER: Record<CodexAgentKind, readonly string[]> = {
  worker: ["name", "description", "developer_instructions"],
  reviewer: ["name", "description", "sandbox_mode", "developer_instructions"],
};

/**
 * True when `content` has the exact shape {@link buildCodexAgentToml} emits for
 * `agentName`: one `key = "…"` line per field, in order, nothing else.
 *
 * `.codex/agents/` is not a directory qfai owns end to end — a project may keep
 * its own Codex profiles there — so pruning by filename alone would delete
 * somebody's hand-written agent the first time they ran `--force`. Every
 * generated profile is three or four single-line basic strings, which a
 * hand-written profile carrying a `model`, a `tools` array or a multi-line
 * string is not, so the shape is the licence to delete.
 */
export function isGeneratedCodexAgentToml(content: string, agentName: string): boolean {
  const lines = content.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  const expected =
    lines.length === GENERATED_KEY_ORDER.reviewer.length
      ? GENERATED_KEY_ORDER.reviewer
      : GENERATED_KEY_ORDER.worker;
  if (lines.length !== expected.length) {
    return false;
  }
  if (lines[0] !== `name = ${escapeTomlBasicString(agentName)}`) {
    return false;
  }
  return lines.every((line, index) => {
    const key = expected[index];
    return key !== undefined && line.startsWith(`${key} = "`) && line.endsWith('"');
  });
}

export type CodexAgentTomlResult = { ok: true; toml: string } | { ok: false; error: string };

/**
 * Turns one canonical `.qfai/assistant/agents/<name>.md` document into its
 * Codex profile. `name` / `description` come from the shared frontmatter, so
 * the three integrations cannot disagree about either.
 */
export function renderCodexAgentToml(markdown: string, kind: CodexAgentKind): CodexAgentTomlResult {
  const frontmatter = parseAgentFrontmatter(markdown);
  if (!frontmatter.ok) {
    return { ok: false, error: frontmatter.error };
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const searchStart = bodySearchStart(normalized);
  const heading = BODY_START_HEADING_RE.exec(normalized.slice(searchStart));
  if (heading === null) {
    return { ok: false, error: `missing \`${BODY_START_MARKER}\` section` };
  }
  const body = normalized.slice(searchStart + heading.index).trim();
  if (body.length === 0) {
    return { ok: false, error: `\`${BODY_START_MARKER}\` section is empty` };
  }

  return {
    ok: true,
    toml: buildCodexAgentToml({
      name: frontmatter.frontmatter.name,
      description: frontmatter.frontmatter.description,
      body,
      kind,
    }),
  };
}

export type AgentCatalogDeclarations = {
  /** Entries declaring both a usable `id` and a `worker` / `reviewer` `kind`. */
  kinds: Map<string, CodexAgentKind>;
  /**
   * IDs the document names but does not classify — a missing, misspelt or
   * non-string `kind`.
   *
   * Kept apart from "absent from the document" so a caller merging two catalogs
   * can refuse to fill one in from the other. An unclassified entry is a
   * project's broken statement about an agent; a missing one is no statement at
   * all, and only the second may be answered by the shipped default.
   */
  unclassified: Set<string>;
  /** True when the document as a whole is not an agent catalog. */
  unusable: boolean;
};

/**
 * Reads `agents[].kind` out of `agent-catalog.yml`.
 *
 * Entries that do not declare a string `id` and a `worker` / `reviewer` `kind`
 * are left out rather than guessed at: the caller skips the agents it cannot
 * classify, because defaulting an unknown agent to `worker` would drop
 * `sandbox_mode` from a reviewer and hand it write access.
 */
export function parseAgentCatalogDeclarations(catalogYaml: string): AgentCatalogDeclarations {
  const kinds = new Map<string, CodexAgentKind>();
  const unclassified = new Set<string>();
  let parsed: unknown;
  try {
    parsed = parseYaml(catalogYaml);
  } catch {
    return { kinds, unclassified, unusable: true };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kinds, unclassified, unusable: true };
  }
  const agents: unknown = Reflect.get(parsed, "agents");
  if (!Array.isArray(agents)) {
    return { kinds, unclassified, unusable: true };
  }
  for (const entry of agents) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const id: unknown = Reflect.get(entry, "id");
    const kind: unknown = Reflect.get(entry, "kind");
    if (typeof id !== "string" || id.trim().length === 0) {
      continue;
    }
    if (kind !== "worker" && kind !== "reviewer") {
      unclassified.add(id.trim());
      continue;
    }
    kinds.set(id.trim(), kind);
  }
  return { kinds, unclassified, unusable: false };
}

/** {@link parseAgentCatalogDeclarations}, keeping only the classified entries. */
export function parseAgentCatalogKinds(catalogYaml: string): Map<string, CodexAgentKind> {
  return parseAgentCatalogDeclarations(catalogYaml).kinds;
}
