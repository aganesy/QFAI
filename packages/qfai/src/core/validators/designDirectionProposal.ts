/**
 * `QFAI-DPACK-011` (warning): a discussion pack proposes a `DESIGN.md` key or
 * archetype the front-matter schema does not have.
 *
 * On a visual surface the pack records the design direction `/qfai-sdd`
 * Phase 0 turns into root `DESIGN.md`. That file meets its schema only when
 * Phase 0 writes it, after the pack has closed, so a key the schema lacks is
 * found where it is expensive to take back. This reads the proposal while it
 * is still one, against the same key tree the parser uses.
 *
 * Only the forms that name a key without doubt are read:
 *
 * - a fenced YAML block, under each top-level key that is a `DESIGN.md`
 *   section;
 * - a code span holding a dotted key path and nothing else but a value;
 * - a list item `- archetype: <value>`.
 *
 * Prose is not: `visual.md` in a sentence is a file name, not a key.
 *
 * Warning, not error: the pack is a proposal, and the file that must conform is
 * held at error by `QFAI-DCON-*` once it is written.
 */

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { ARCHETYPES, DESIGN_MD_KEYS } from "../design/designMd.js";
import { readValidatedClassification, VISUAL_BROWSER_SURFACES } from "../detection/surfaceType.js";
import { collectFiles } from "../fs.js";
import { maskFencedCodeBlocks } from "../ids.js";
import { findPacks, latestPack } from "../packLocator.js";
import type { Issue } from "../types.js";
import { extractFencedCodeBlocks } from "./mermaidUtils.js";
import { issue, readSafe } from "./utils.js";

const CODE = "QFAI-DPACK-011";

type Section = keyof typeof DESIGN_MD_KEYS;

const ROOT_SECTIONS = new Set<string>(DESIGN_MD_KEYS.root);
const ARCHETYPE_VALUES = new Set<string>(ARCHETYPES);
const YAML_LANGUAGES = new Set(["yaml", "yml"]);

/** A dotted key path in a code span, with an optional value after a colon. */
const KEY_PATH_SPAN_RE =
  /^(brand|visual|audience|accessibility)((?:\.[A-Za-z0-9_]+)+)(?:\s*:\s*(.+))?$/;
const CODE_SPAN_RE = /`([^`\n]+)`/g;
const ARCHETYPE_ITEM_RE = /^\s*[-*]\s+(?:brand\.)?archetype\s*:\s*(.+?)\s*$/gim;

function isSection(key: string): key is Section {
  return Object.hasOwn(DESIGN_MD_KEYS, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A value an author has not filled in yet: `[…]`, `<…>` or empty. */
function isPlaceholder(value: string): boolean {
  return value.length === 0 || /^[[<]/.test(value);
}

function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

/** Why a dotted key path is not one the schema admits, or `null`. */
function keyPathProblem(segments: readonly string[]): string | null {
  let section: Section = "root";
  for (const [index, segment] of segments.entries()) {
    const allowed: readonly string[] = DESIGN_MD_KEYS[section];
    const at = section === "root" ? "the top level" : `\`${section}\``;
    if (!allowed.includes(segment)) {
      return `\`${segment}\` is not a key of ${at}. Allowed: ${allowed.join(", ")}.`;
    }
    const next: string = section === "root" ? segment : `${section}.${segment}`;
    if (!isSection(next)) {
      return index === segments.length - 1 ? null : `\`${next}\` takes a value, not keys.`;
    }
    section = next;
  }
  return null;
}

function archetypeProblem(value: string): string | null {
  return ARCHETYPE_VALUES.has(value)
    ? null
    : `\`${value}\` is not an archetype. Allowed: ${ARCHETYPES.join(", ")}.`;
}

/** Every problem under one parsed YAML mapping, read as the named section. */
function yamlProblems(value: Record<string, unknown>, section: Section): string[] {
  const problems: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const segments = section === "root" ? [key] : [...section.split("."), key];
    const problem = keyPathProblem(segments);
    if (problem !== null) {
      problems.push(problem);
      continue;
    }
    const next = segments.join(".");
    if (next === "brand.archetype" && typeof child === "string") {
      const archetype = archetypeProblem(child);
      if (archetype !== null) problems.push(archetype);
    }
    if (isSection(next) && isRecord(child)) problems.push(...yamlProblems(child, next));
  }
  return problems;
}

function fencedYamlProblems(text: string): string[] {
  const problems: string[] = [];
  for (const block of extractFencedCodeBlocks(text)) {
    if (block.language === null || !YAML_LANGUAGES.has(block.language)) continue;
    let parsed: unknown;
    try {
      parsed = parseYaml(block.content);
    } catch {
      // A block that is not YAML proposes no key.
      continue;
    }
    if (!isRecord(parsed)) continue;
    for (const [key, child] of Object.entries(parsed)) {
      if (!ROOT_SECTIONS.has(key) || !isSection(key) || !isRecord(child)) continue;
      problems.push(...yamlProblems(child, key));
    }
  }
  return problems;
}

function codeSpanProblems(prose: string): string[] {
  const problems: string[] = [];
  for (const span of prose.matchAll(CODE_SPAN_RE)) {
    const match = KEY_PATH_SPAN_RE.exec((span[1] ?? "").trim());
    if (!match) continue;
    const segments = [match[1] ?? "", ...(match[2] ?? "").split(".").filter(Boolean)];
    const problem = keyPathProblem(segments);
    if (problem !== null) {
      problems.push(problem);
      continue;
    }
    const value = unquote(match[3] ?? "");
    if (segments.join(".") === "brand.archetype" && !isPlaceholder(value)) {
      const archetype = archetypeProblem(value);
      if (archetype !== null) problems.push(archetype);
    }
  }
  return problems;
}

function archetypeItemProblems(prose: string): string[] {
  const problems: string[] = [];
  for (const item of prose.matchAll(ARCHETYPE_ITEM_RE)) {
    const value = unquote((item[1] ?? "").replace(/`/g, ""));
    if (isPlaceholder(value)) continue;
    const problem = archetypeProblem(value);
    if (problem !== null) problems.push(problem);
  }
  return problems;
}

/** Every schema mismatch one pack file proposes. */
export function designDirectionProblems(text: string): string[] {
  const prose = maskFencedCodeBlocks(text);
  return [...fencedYamlProblems(text), ...codeSpanProblems(prose), ...archetypeItemProblems(prose)];
}

export async function validateDesignDirectionProposal(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const packs = await findPacks(resolvePath(root, config, "discussionDir"), "discussion");
  const pack = latestPack(packs);
  if (!pack) return [];
  const classification = await readValidatedClassification(pack.path);
  if (!classification) return [];
  const surfaces = [classification.primary_surface, ...classification.secondary_surfaces];
  if (!surfaces.some((surface) => VISUAL_BROWSER_SURFACES.has(surface))) return [];

  const issues: Issue[] = [];
  for (const file of (await collectFiles(pack.path, { extensions: [".md"] })).sort()) {
    for (const problem of designDirectionProblems(await readSafe(file))) {
      issues.push(
        issue(
          CODE,
          `The design direction proposes what DESIGN.md does not accept: ${problem}`,
          "warning",
          file,
          "designDirection.schema",
          undefined,
          "change",
          "Restate the direction with keys and values from the DESIGN.md front-matter schema, or record the need as an open question for /qfai-sdd Phase 0.",
        ),
      );
    }
  }
  return issues;
}
