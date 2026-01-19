import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { collectFilesByGlobs } from "./fs.js";
import { extractH2Sections, type H2Section } from "./parse/markdown.js";

export type GuardrailType = "non-goal" | "not-now" | "trade-off";

export type DecisionGuardrailEntry = {
  id?: string;
  type?: string;
  guardrail?: string;
  rationale?: string;
  reconsider?: string;
  related?: string;
  keywords?: string[];
  title?: string;
  source: { file: string; line: number };
};

export type DecisionGuardrail = {
  id: string;
  type: GuardrailType;
  guardrail: string;
  rationale?: string;
  reconsider?: string;
  related?: string;
  keywords: string[];
  title?: string;
  source: { file: string; line: number };
};

export type GuardrailIssueSeverity = "warning" | "error";

export type GuardrailIssue = {
  severity: GuardrailIssueSeverity;
  code: string;
  message: string;
  file: string;
  line?: number;
  id?: string;
};

export type GuardrailCheckResult = {
  errors: GuardrailIssue[];
  warnings: GuardrailIssue[];
};

export type GuardrailLoadError = {
  path: string;
  message: string;
};

export type GuardrailLoadResult = {
  entries: DecisionGuardrailEntry[];
  errors: GuardrailLoadError[];
  files: string[];
};

const DEFAULT_DECISION_GUARDRAILS_GLOBS = [".qfai/specs/**/delta.md"];
const DEFAULT_GUARDRAILS_IGNORE_GLOBS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.pnpm/**",
  "**/tmp/**",
  "**/.mcp-tools/**",
];

const SECTION_TITLE = "decision guardrails";
const ENTRY_START_RE = /^\s*[-*]\s+ID:\s*(.+?)\s*$/i;
const FIELD_RE = /^\s{2,}([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/;
const CONTINUATION_RE = /^\s{4,}(.+)$/;
const ID_FORMAT_RE = /^DG-\d{4}$/;

const TYPE_ORDER: Record<GuardrailType, number> = {
  "non-goal": 0,
  "not-now": 1,
  "trade-off": 2,
};

export async function loadDecisionGuardrails(
  root: string,
  options: { paths?: string[] } = {},
): Promise<GuardrailLoadResult> {
  const errors: GuardrailLoadError[] = [];
  const files = await scanDecisionGuardrailFiles(root, options.paths, errors);
  const entries: DecisionGuardrailEntry[] = [];

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = extractDecisionGuardrailsFromMarkdown(content, filePath);
      entries.push(...parsed);
    } catch (error) {
      errors.push({ path: filePath, message: String(error) });
    }
  }

  return { entries, errors, files };
}

export function extractDecisionGuardrailsFromMarkdown(
  markdown: string,
  filePath: string,
): DecisionGuardrailEntry[] {
  const sections = extractH2Sections(markdown);
  const section = findDecisionGuardrailsSection(sections);
  if (!section) {
    return [];
  }

  const lines = section.body.split(/\r?\n/);
  const entries: DecisionGuardrailEntry[] = [];
  let current: {
    startLine: number;
    fields: Record<string, string>;
    keywords: string[];
    lastKey?: string;
  } | null = null;

  const flush = (): void => {
    if (!current) {
      return;
    }
    entries.push({
      id: current.fields.id,
      type: current.fields.type,
      guardrail: current.fields.guardrail,
      rationale: current.fields.rationale,
      reconsider: current.fields.reconsider,
      related: current.fields.related,
      keywords: current.keywords,
      title: current.fields.title,
      source: { file: filePath, line: current.startLine },
    });
    current = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i] ?? "";
    const lineNumber = section.startLine + i;

    const entryMatch = rawLine.match(ENTRY_START_RE);
    if (entryMatch) {
      flush();
      const id = entryMatch[1]?.trim() ?? "";
      current = {
        startLine: lineNumber,
        fields: { id },
        keywords: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const fieldMatch = rawLine.match(FIELD_RE);
    if (fieldMatch) {
      const rawKey = fieldMatch[1] ?? "";
      const value = fieldMatch[2] ?? "";
      const key = normalizeFieldKey(rawKey);
      if (key) {
        if (key === "keywords") {
          current.keywords.push(
            ...value
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0),
          );
        } else {
          const trimmed = value.trim();
          if (trimmed.length > 0) {
            const existing = current.fields[key];
            current.fields[key] = existing
              ? `${existing}\n${trimmed}`
              : trimmed;
          }
        }
        current.lastKey = key;
      } else {
        current.lastKey = undefined;
      }
      continue;
    }

    const continuationMatch = rawLine.match(CONTINUATION_RE);
    if (continuationMatch && current.lastKey) {
      const value = continuationMatch[1]?.trim() ?? "";
      if (value.length > 0) {
        const existing = current.fields[current.lastKey];
        current.fields[current.lastKey] = existing
          ? `${existing}\n${value}`
          : value;
      }
    }
  }

  flush();
  return entries;
}

export function normalizeDecisionGuardrails(
  entries: DecisionGuardrailEntry[],
): DecisionGuardrail[] {
  const items: DecisionGuardrail[] = [];
  for (const entry of entries) {
    const id = entry.id?.trim();
    const type = normalizeGuardrailType(entry.type);
    const guardrail = entry.guardrail?.trim();
    if (!id || !type || !guardrail) {
      continue;
    }
    items.push({
      id,
      type,
      guardrail,
      rationale: entry.rationale?.trim() || undefined,
      reconsider: entry.reconsider?.trim() || undefined,
      related: entry.related?.trim() || undefined,
      keywords: entry.keywords?.filter((item) => item.length > 0) ?? [],
      title: entry.title?.trim() || undefined,
      source: entry.source,
    });
  }
  return items;
}

export function sortDecisionGuardrails(
  items: DecisionGuardrail[],
): DecisionGuardrail[] {
  return [...items].sort((a, b) => {
    const typeOrder =
      (TYPE_ORDER[a.type] ?? 999) - (TYPE_ORDER[b.type] ?? 999);
    if (typeOrder !== 0) {
      return typeOrder;
    }
    return a.id.localeCompare(b.id);
  });
}

export function filterDecisionGuardrailsByKeyword(
  items: DecisionGuardrail[],
  keyword: string | undefined,
): DecisionGuardrail[] {
  const needle = keyword?.trim().toLowerCase();
  if (!needle) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [
      item.title,
      item.guardrail,
      item.rationale,
      item.related,
      item.keywords.join(" "),
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    return haystack.some((value) => value.includes(needle));
  });
}

export function formatGuardrailsForLlm(
  items: DecisionGuardrail[],
  max: number,
): string {
  const limit = Math.max(0, Math.floor(max));
  const lines: string[] = ["# Decision Guardrails (extract)", ""];
  const slice = limit > 0 ? items.slice(0, limit) : [];
  if (slice.length === 0) {
    lines.push("- (none)");
    return lines.join("\n");
  }

  for (const item of slice) {
    lines.push(`- [${item.id}][${item.type}] ${item.guardrail}`);
    if (item.rationale) {
      lines.push(`  Rationale: ${item.rationale}`);
    }
    if (item.reconsider) {
      lines.push(`  Reconsider: ${item.reconsider}`);
    }
    if (item.related) {
      lines.push(`  Related: ${item.related}`);
    }
  }

  return lines.join("\n");
}

export function checkDecisionGuardrails(
  entries: DecisionGuardrailEntry[],
): GuardrailCheckResult {
  const errors: GuardrailIssue[] = [];
  const warnings: GuardrailIssue[] = [];
  const idMap = new Map<string, DecisionGuardrailEntry[]>();

  for (const entry of entries) {
    const file = entry.source.file;
    const line = entry.source.line;
    const id = entry.id?.trim();
    const typeRaw = entry.type?.trim();
    const guardrail = entry.guardrail?.trim();
    const rationale = entry.rationale?.trim();
    const reconsider = entry.reconsider?.trim();

    if (!id) {
      errors.push({
        severity: "error",
        code: "QFAI-GR-001",
        message: "ID is missing",
        file,
        line,
      });
    } else {
      const list = idMap.get(id) ?? [];
      list.push(entry);
      idMap.set(id, list);
      if (!ID_FORMAT_RE.test(id)) {
        warnings.push({
          severity: "warning",
          code: "QFAI-GR-002",
          message: `ID format is not standard: ${id}`,
          file,
          line,
          id,
        });
      }
    }

    if (!typeRaw) {
      errors.push({
        severity: "error",
        code: "QFAI-GR-003",
        message: "Type is missing",
        file,
        line,
        id,
      });
    } else if (!normalizeGuardrailType(typeRaw)) {
      errors.push({
        severity: "error",
        code: "QFAI-GR-004",
        message: `Type is invalid: ${typeRaw}`,
        file,
        line,
        id,
      });
    }

    if (!guardrail) {
      errors.push({
        severity: "error",
        code: "QFAI-GR-005",
        message: "Guardrail is missing",
        file,
        line,
        id,
      });
    }

    if (!rationale) {
      warnings.push({
        severity: "warning",
        code: "QFAI-GR-006",
        message: "Rationale is missing",
        file,
        line,
        id,
      });
    }

    if (!reconsider) {
      warnings.push({
        severity: "warning",
        code: "QFAI-GR-007",
        message: "Reconsider is missing",
        file,
        line,
        id,
      });
    }
  }

  for (const [id, list] of idMap.entries()) {
    if (list.length > 1) {
      const locations = list
        .map((entry) => `${entry.source.file}:${entry.source.line}`)
        .join(", ");
      errors.push({
        severity: "error",
        code: "QFAI-GR-008",
        message: `ID is duplicated: ${id} (${locations})`,
        file: list[0]?.source.file ?? "",
        line: list[0]?.source.line,
        id,
      });
    }
  }

  return { errors, warnings };
}

function normalizeGuardrailType(
  raw: string | undefined,
): GuardrailType | null {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized === "non-goal") {
    return "non-goal";
  }
  if (normalized === "not-now") {
    return "not-now";
  }
  if (normalized === "trade-off") {
    return "trade-off";
  }
  return null;
}

function normalizeFieldKey(raw: string): string | null {
  const normalized = raw.trim().toLowerCase().replace(/[_\s-]+/g, "");
  switch (normalized) {
    case "id":
      return "id";
    case "type":
      return "type";
    case "guardrail":
      return "guardrail";
    case "rationale":
    case "reason":
      return "rationale";
    case "reconsider":
      return "reconsider";
    case "related":
      return "related";
    case "keywords":
    case "keyword":
      return "keywords";
    case "title":
    case "heading":
      return "title";
    default:
      return null;
  }
}

async function scanDecisionGuardrailFiles(
  root: string,
  rawPaths: string[] | undefined,
  errors: GuardrailLoadError[],
): Promise<string[]> {
  if (!rawPaths || rawPaths.length === 0) {
    try {
      const result = await collectFilesByGlobs(root, {
        globs: DEFAULT_DECISION_GUARDRAILS_GLOBS,
        ignore: DEFAULT_GUARDRAILS_IGNORE_GLOBS,
      });
      return result.files.sort((a, b) => a.localeCompare(b));
    } catch (error) {
      errors.push({ path: root, message: String(error) });
      return [];
    }
  }

  const files = new Set<string>();
  for (const rawPath of rawPaths) {
    const resolved = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(root, rawPath);
    const stats = await safeStat(resolved);
    if (!stats) {
      errors.push({ path: resolved, message: "Path does not exist" });
      continue;
    }
    if (stats.isFile()) {
      files.add(resolved);
      continue;
    }
    if (stats.isDirectory()) {
      try {
        const result = await collectFilesByGlobs(resolved, {
          globs: ["**/delta.md"],
          ignore: DEFAULT_GUARDRAILS_IGNORE_GLOBS,
        });
        result.files.forEach((file) => files.add(file));
      } catch (error) {
        errors.push({ path: resolved, message: String(error) });
      }
      continue;
    }
    errors.push({ path: resolved, message: "Unsupported path type" });
  }

  return Array.from(files).sort((a, b) => a.localeCompare(b));
}

async function safeStat(target: string): Promise<Awaited<ReturnType<typeof stat>> | null> {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}

function findDecisionGuardrailsSection(
  sections: Map<string, H2Section>,
): H2Section | null {
  for (const [title, section] of sections.entries()) {
    if (title.trim().toLowerCase() === SECTION_TITLE) {
      return section;
    }
  }
  return null;
}
