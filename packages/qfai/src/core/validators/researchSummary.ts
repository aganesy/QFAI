import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import {
  findLatestDiscussionPackDir,
  ResolveActiveDiscussionPackError,
  resolveActiveDiscussionPack,
} from "../discussionPack.js";
import type { LocatedPack } from "../packLocator.js";
import { findPacks } from "../packLocator.js";
import { readDiscussionCurrentId } from "../state.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const RESEARCH_SUMMARY_HEADING_RE = /^#{1,3}\s+Research\s+Summary/im;
const FULL_DATE_RE = /^[ \t]*(?:-[ \t]*)?published:[ \t]*["']?(\d{4}-\d{2}-\d{2})["']?/m;
/** ```yaml fence inside the stored section — the prose around it is not data. */
const YAML_FENCE_RE = /^```[^\n]*\n([\s\S]*?)^```/gm;
/** `key: [fill me in]` — a shipped template placeholder that was never replaced. */
const PLACEHOLDER_FIELD_RE = /^[ \t]*(?:-[ \t]*)?([A-Za-z0-9_]+):[ \t]*\[[^\]]*\][ \t]*$/gm;
/** `source_id:` reference carried by best_practices / anti_patterns / reflection entries. */
const SOURCE_ID_REF_RE = /^[ \t]*(?:-[ \t]*)?source_id:[ \t]*(.*)$/gm;
/** The decisions `reflection[].action` is allowed to record. */
const REFLECTION_ACTIONS = new Set(["apply", "reject", "defer"]);
/** The required pack file that holds the `## Research Summary` storage slot. */
const RESEARCH_SUMMARY_FILE = "04_Sources.md";
/** Output Schema fields every `best_practices[]` / `anti_patterns[]` entry carries. */
const PRACTICE_FIELDS = ["id", "category", "title", "description", "source_id"] as const;
/** Output Schema fields a `reflection[]` entry carries besides action / reason. */
const REFLECTION_FIELDS = ["source_id", "finding"] as const;

export async function validateResearchSummary(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const target = await resolveResearchSummaryScanTarget(root, config);
  issues.push(...describeBrokenPointer(root, target));
  issues.push(...(await checkStorageSlotPresence(root, target)));

  for (const filePath of target.files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    if (!RESEARCH_SUMMARY_HEADING_RE.test(content)) continue;

    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const section = extractResearchSummarySection(content);
    // An empty section on the storage file is QFAI-RESEARCH-014's finding
    // (reported above); elsewhere there is nothing to validate.
    if (!section) continue;

    // Only the fenced YAML payload is data. The prose that the shipped template
    // wraps around it explains the rules ("at least one entry must carry
    // action: apply") and must never be able to satisfy them.
    const yaml = extractYamlPayload(section);

    const sourceEntries = splitYamlListEntries(yaml, "sources");
    const sourceIds = sourceEntries
      .map((entry) => readScalarField(entry, "id") ?? "")
      .filter((id) => id.length > 0);
    if (sourceEntries.length === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-001",
          "Research Summary has no source entries (sources[].id required)",
          "error",
          rel,
          "researchSummary.noSources",
        ),
      );
    }

    for (let i = 0; i < sourceEntries.length; i++) {
      const entry = sourceEntries[i] ?? "";
      const label = describeEntry("sources", entry, i);

      if (!hasNonEmptyField(entry, "id")) {
        issues.push(
          issue(
            "QFAI-RESEARCH-015",
            `Source entry missing required field "id": ${label}`,
            "error",
            rel,
            "researchSummary.sourceId",
          ),
        );
      }
      if (!hasNonEmptyField(entry, "title")) {
        issues.push(
          issue(
            "QFAI-RESEARCH-004",
            `Source entry missing required field "title": ${label}`,
            "error",
            rel,
            "researchSummary.sourceTitle",
          ),
        );
      }
      if (!hasNonEmptyField(entry, "url")) {
        issues.push(
          issue(
            "QFAI-RESEARCH-005",
            `Source entry missing required field "url": ${label}`,
            "error",
            rel,
            "researchSummary.sourceUrl",
          ),
        );
      }
      if (!FULL_DATE_RE.test(entry)) {
        issues.push(
          issue(
            "QFAI-RESEARCH-006",
            `Source entry missing or invalid "published" date (YYYY-MM-DD): ${label}`,
            "error",
            rel,
            "researchSummary.sourcePublished",
          ),
        );
      }
    }

    // Check freshness (≥80% within 2 years)
    const referenceNow = resolveFreshnessReferenceNow();
    const twoYearsMs = 1000 * 60 * 60 * 24 * 365 * 2;
    const publishedDates = sourceEntries
      .map((entry) => FULL_DATE_RE.exec(entry)?.[1] ?? "")
      .map((dateText) => Date.parse(dateText))
      .filter((ts) => Number.isFinite(ts));

    if (publishedDates.length > 0) {
      const recentCount = publishedDates.filter((ts) => referenceNow - ts <= twoYearsMs).length;
      const freshnessRatio = recentCount / publishedDates.length;
      if (freshnessRatio < 0.8) {
        issues.push(
          issue(
            "QFAI-RESEARCH-002",
            `Research freshness below threshold (${(freshnessRatio * 100).toFixed(0)}% within 2 years, ≥80% required)`,
            "warning",
            rel,
            "researchSummary.freshness",
          ),
        );
      }
    }

    const placeholderKeys = collectPlaceholderKeys(yaml);
    if (placeholderKeys.length > 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-012",
          `Research Summary still carries unreplaced template placeholders (${placeholderKeys.join(", ")}); record the actual protocol run`,
          "error",
          rel,
          "researchSummary.placeholder",
        ),
      );
    }

    for (const unresolved of collectUnresolvedSourceIds(yaml, sourceIds)) {
      issues.push(
        issue(
          "QFAI-RESEARCH-013",
          `"source_id" does not resolve to any sources[].id in the same Research Summary: ${unresolved}`,
          "error",
          rel,
          "researchSummary.sourceIdReference",
        ),
      );
    }

    const bestPractices = splitYamlListEntries(yaml, "best_practices");
    if (bestPractices.length === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-007",
          'Research Summary requires non-empty "best_practices" list',
          "error",
          rel,
          "researchSummary.bestPractices",
        ),
      );
    }
    issues.push(...checkPracticeEntries(rel, "best_practices", bestPractices));

    const antiPatterns = splitYamlListEntries(yaml, "anti_patterns");
    if (antiPatterns.length === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-008",
          'Research Summary requires non-empty "anti_patterns" list',
          "error",
          rel,
          "researchSummary.antiPatterns",
        ),
      );
    }
    issues.push(...checkPracticeEntries(rel, "anti_patterns", antiPatterns));

    // Check reflection.apply presence — inside the reflection list only, and
    // entry by entry: a single complete entry must not satisfy the required
    // fields on behalf of its siblings.
    const reflectionEntries = splitYamlListEntries(yaml, "reflection");
    const hasApply = reflectionEntries.some((entry) => readReflectionAction(entry) === "apply");
    if (reflectionEntries.length === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-011",
          'Research Summary requires non-empty "reflection" list',
          "error",
          rel,
          "researchSummary.reflectionRequired",
        ),
      );
    } else if (!hasApply) {
      issues.push(
        issue(
          "QFAI-RESEARCH-003",
          "Research Summary has reflection entries but no action: apply. At least one apply entry expected.",
          "error",
          rel,
          "researchSummary.noApply",
        ),
      );
    }

    issues.push(...checkReflectionEntries(rel, reflectionEntries));
  }

  return issues;
}

/** Per-entry required fields of a `best_practices[]` / `anti_patterns[]` list. */
function checkPracticeEntries(rel: string, key: string, entries: readonly string[]): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? "";
    const missing = PRACTICE_FIELDS.filter((field) => !hasNonEmptyField(entry, field));
    if (missing.length > 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-016",
          `${key} entry missing required field(s) ${missing.join(", ")}: ${describeEntry(key, entry, i)}`,
          "error",
          rel,
          "researchSummary.practiceFields",
        ),
      );
    }
  }
  return issues;
}

/** Per-entry required fields of the `reflection[]` list. */
function checkReflectionEntries(rel: string, entries: readonly string[]): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? "";
    const label = describeEntry("reflection", entry, i);

    const missing = REFLECTION_FIELDS.filter((field) => !hasNonEmptyField(entry, field));
    if (missing.length > 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-017",
          `reflection entry missing required field(s) ${missing.join(", ")}: ${label}`,
          "error",
          rel,
          "researchSummary.reflectionFields",
        ),
      );
    }
    if (readReflectionAction(entry) === null) {
      issues.push(
        issue(
          "QFAI-RESEARCH-009",
          `Each reflection entry should include "action" with apply|reject|defer: ${label}`,
          "error",
          rel,
          "researchSummary.reflectionAction",
        ),
      );
    }
    if (!hasNonEmptyField(entry, "reason")) {
      issues.push(
        issue(
          "QFAI-RESEARCH-010",
          `Each reflection entry should include non-empty "reason": ${label}`,
          "error",
          rel,
          "researchSummary.reflectionReason",
        ),
      );
    }
  }
  return issues;
}

type ResearchSummaryScanTarget = {
  /** Markdown files the per-file checks read. */
  files: string[];
  /**
   * The pack the Storage contract binds — the one whose `04_Sources.md` must
   * carry the section. `null` when no single pack can be named as the current
   * session, in which case the slot-presence gate stays silent rather than
   * retro-failing a pack nobody is working on.
   */
  activePackDir: string | null;
  /**
   * Whether a `04_Sources.md` that cannot be read at all is this gate's to
   * report. `validateDiscussionPackReadiness` (QFAI-DPACK-002) only inspects
   * the LATEST pack, so an active pointer pinned to an OLDER pack that lost
   * the file is reported by nobody else — there, the missing storage slot is
   * QFAI-RESEARCH-014's finding.
   */
  reportMissingStorageFile: boolean;
  /** Discussion root, used to anchor pack-level findings. */
  discussionRoot: string;
  /** `currentId` that is set but does not resolve to exactly one pack on disk. */
  brokenPointer: { currentId: string; reason: string } | null;
};

/**
 * Which files the Research Summary gate reads.
 *
 * The Storage contract names one file in the CURRENT pack, and
 * `.qfai/state.json#discussion.currentId` is that pointer's SSOT — so
 * `resolveActiveDiscussionPack` decides first, and only `04_Sources.md` is
 * validated. Scanning every markdown file in the pack would report the whole
 * schema against, say, an `01_Context.md` that merely mentions the heading.
 *
 * A pointer that is set but unresolvable is a broken SSOT and is reported
 * (QFAI-RESEARCH-018) instead of being papered over. A pointer that is simply
 * absent is the normal state of a gitignored runtime file, so it falls back to
 * the same rule `qfai discussion list --active` uses: a lone `discussion-*`
 * directory is the de-facto active session; two or more are ambiguous, so the
 * latest pack is still read (an abandoned older pack must not keep the gate red
 * forever) but no pack is named as active. The flat discussion root is the last
 * fallback, for layouts that keep no `discussion-<timestamp>` directory at all
 * — only there does the scan widen to every markdown file.
 */
async function resolveResearchSummaryScanTarget(
  root: string,
  config: QfaiConfig,
): Promise<ResearchSummaryScanTarget> {
  const discussionRoot = path.resolve(root, config.paths.discussionDir);
  const base = { discussionRoot, brokenPointer: null, reportMissingStorageFile: false } as const;

  let currentId: string | null = null;
  try {
    currentId = await readDiscussionCurrentId(root);
  } catch {
    currentId = null;
  }

  if (currentId !== null) {
    try {
      const active = await resolveActiveDiscussionPack(root);
      return {
        ...base,
        files: [storageFileOf(active)],
        activePackDir: active,
        reportMissingStorageFile: !(await isLatestDiscussionPack(discussionRoot, active)),
      };
    } catch (error) {
      return {
        ...base,
        files: [],
        activePackDir: null,
        brokenPointer: {
          currentId,
          reason:
            error instanceof ResolveActiveDiscussionPackError
              ? error.message
              : `the active pointer .qfai/state.json#discussion.currentId='${currentId}' could not be resolved`,
        },
      };
    }
  }

  let packs: LocatedPack[] = [];
  try {
    packs = await findPacks(discussionRoot, "discussion");
  } catch {
    packs = [];
  }
  const lone = packs.length === 1 ? packs[0] : undefined;
  if (lone) {
    return { ...base, files: [storageFileOf(lone.path)], activePackDir: lone.path };
  }

  let latest: string | null = null;
  try {
    latest = await findLatestDiscussionPackDir(discussionRoot);
  } catch {
    latest = null;
  }
  if (latest) {
    return { ...base, files: [storageFileOf(latest)], activePackDir: null };
  }

  return { ...base, files: await collectMarkdownFiles(discussionRoot), activePackDir: null };
}

function storageFileOf(packDir: string): string {
  return path.join(packDir, RESEARCH_SUMMARY_FILE);
}

/**
 * Whether `packDir` is the pack `validateDiscussionPackReadiness` inspects.
 * A pack that is NOT the latest one gets no required-file check from anybody
 * else, so this gate has to cover its storage file itself.
 */
async function isLatestDiscussionPack(discussionRoot: string, packDir: string): Promise<boolean> {
  let latest: string | null = null;
  try {
    latest = await findLatestDiscussionPackDir(discussionRoot);
  } catch {
    return false;
  }
  return latest !== null && path.resolve(latest) === path.resolve(packDir);
}

async function collectMarkdownFiles(scanRoot: string): Promise<string[]> {
  const pattern = path.posix.join(scanRoot.replace(/\\/g, "/"), "**/*.md");
  try {
    return await fg(pattern, { absolute: true });
  } catch {
    return [];
  }
}

/**
 * A `currentId` that names no pack (or two) leaves the gate with nothing to
 * validate. Falling through to the latest pack would let a completed unrelated
 * pack report success for a session whose pointer is broken.
 */
function describeBrokenPointer(root: string, target: ResearchSummaryScanTarget): Issue[] {
  if (target.brokenPointer === null) {
    return [];
  }
  return [
    issue(
      "QFAI-RESEARCH-018",
      `Cannot resolve the current discussion pack: ${target.brokenPointer.reason}`,
      "error",
      path.relative(root, target.discussionRoot).replace(/\\/g, "/"),
      "researchSummary.brokenCurrentPointer",
    ),
  ];
}

/**
 * The gate's completion half: shipping the section in the template only helps
 * while it survives. A pack whose `04_Sources.md` lost the `## Research
 * Summary` heading — or kept the heading over an empty body — would otherwise
 * be skipped by the per-file loop and pass `--profile discussion --fail-on
 * error` with no research at all.
 *
 * A `04_Sources.md` that is missing outright is QFAI-DPACK-002's finding only
 * while the active pack is also the LATEST pack — the single pack
 * `inspectLatestDiscussionPack` looks at. When `qfai discussion use` pins an
 * older pack, nothing else checks that pack's required files, so an unreadable
 * storage file there is reported here instead of passing silently.
 */
async function checkStorageSlotPresence(
  root: string,
  target: ResearchSummaryScanTarget,
): Promise<Issue[]> {
  const { activePackDir } = target;
  if (activePackDir === null) {
    return [];
  }

  const storageFile = storageFileOf(activePackDir);
  let content: string;
  try {
    content = await readFile(storageFile, "utf-8");
  } catch {
    return target.reportMissingStorageFile
      ? [storageSlotIssue(root, storageFile, "the file is missing or unreadable")]
      : [];
  }

  const hasHeading = RESEARCH_SUMMARY_HEADING_RE.test(content);
  const section = hasHeading ? extractResearchSummarySection(content) : null;
  if (section) {
    return [];
  }

  const detail = hasHeading ? "the section is empty" : 'no "## Research Summary" heading';
  return [storageSlotIssue(root, storageFile, detail)];
}

function storageSlotIssue(root: string, storageFile: string, detail: string): Issue {
  return issue(
    "QFAI-RESEARCH-014",
    `${RESEARCH_SUMMARY_FILE} does not store a Research Summary (${detail}); record the research-first protocol output there`,
    "error",
    path.relative(root, storageFile).replace(/\\/g, "/"),
    "researchSummary.storageSlotMissing",
  );
}

/**
 * The fenced YAML blocks of the stored section, or the whole section when it
 * carries none (packs written before the template shipped a fence).
 */
function extractYamlPayload(section: string): string {
  const blocks = [...section.matchAll(YAML_FENCE_RE)].map((match) => match[1] ?? "");
  return blocks.length > 0 ? blocks.join("\n") : section;
}

/** Keys whose value is still a `[bracketed]` template placeholder. */
function collectPlaceholderKeys(yaml: string): string[] {
  const keys = new Set<string>();
  for (const match of yaml.matchAll(PLACEHOLDER_FIELD_RE)) {
    const key = match[1];
    if (key) keys.add(key);
  }
  return [...keys];
}

/** `source_id` values that no `sources[].id` in the same summary resolves. */
function collectUnresolvedSourceIds(yaml: string, sourceIds: readonly string[]): string[] {
  if (sourceIds.length === 0) {
    return [];
  }

  const known = new Set(sourceIds);
  const unresolved = new Set<string>();
  for (const match of yaml.matchAll(SOURCE_ID_REF_RE)) {
    // Compare the parsed scalar, not the literal text: a serializer that
    // quotes `id: "SRC-0001"` but leaves `source_id: SRC-0001` bare writes the
    // same value twice, and the reference must still resolve.
    const value = normalizeScalar(match[1] ?? "");
    // A placeholder value is already reported as QFAI-RESEARCH-012; an empty
    // one is reported as a missing required field.
    if (!value || value.startsWith("[") || known.has(value)) {
      continue;
    }
    unresolved.add(value);
  }
  return [...unresolved];
}

function extractResearchSummarySection(content: string): string | null {
  const heading = RESEARCH_SUMMARY_HEADING_RE.exec(content);
  if (!heading) {
    return null;
  }

  const start = heading.index + heading[0].length;
  const remainder = content.slice(start);
  const nextHeadingOffset = remainder.search(/^#{1,3}\s+/m);
  const section = nextHeadingOffset === -1 ? remainder : remainder.slice(0, nextHeadingOffset);
  const trimmed = section.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The scalar written after `field:` inside the entry, or `null` when the key
 * is absent. The key is anchored to the start of a line (with an optional list
 * marker) so `source_id:` is never mistaken for `id:`.
 */
function readScalarField(entry: string, field: string): string | null {
  const match = new RegExp(`^[ \\t]*(?:-[ \\t]*)?${field}:[ \\t]*(.*)$`, "im").exec(entry);
  return match ? normalizeScalar(match[1] ?? "") : null;
}

/**
 * A single-line YAML scalar as YAML itself would read it: surrounding quotes
 * removed, a trailing ` # comment` dropped, and the null spellings folded to
 * the empty string. Testing the raw text instead would accept `title: ""` and
 * `reason: null` as filled in, and would compare `"SRC-0001"` against
 * `SRC-0001` as two different values.
 */
function normalizeScalar(raw: string): string {
  const text = raw.trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(text);
  if (quoted) {
    return (quoted[2] ?? "").trim();
  }
  const uncommented = text.replace(/[ \t]+#.*$/, "").trim();
  return uncommented === "~" || /^null$/i.test(uncommented) ? "" : uncommented;
}

/** `field:` present with a non-empty YAML scalar value, anywhere in the entry. */
function hasNonEmptyField(entry: string, field: string): boolean {
  const value = readScalarField(entry, field);
  return value !== null && value.length > 0;
}

/** `action:` of a reflection entry when it records one of the allowed decisions. */
function readReflectionAction(entry: string): string | null {
  const value = readScalarField(entry, "action")?.toLowerCase() ?? "";
  return REFLECTION_ACTIONS.has(value) ? value : null;
}

/** Names an entry in a finding message by its `id` / `source_id`, else index. */
function describeEntry(key: string, entry: string, index: number): string {
  const ref = readScalarField(entry, "id") || readScalarField(entry, "source_id");
  return ref ? `${key}[${index}] (${ref})` : `${key}[${index}]`;
}

function extractYamlListBlock(section: string, key: string): string | null {
  const lines = section.split(/\r?\n/);
  const keyLineRe = new RegExp(`^(\\s*)${key}\\s*:\\s*$`);
  const keyLineIndex = lines.findIndex((line) => keyLineRe.test(line));
  if (keyLineIndex < 0) {
    return null;
  }

  const keyLineMatch = keyLineRe.exec(lines[keyLineIndex] ?? "");
  if (!keyLineMatch) {
    return null;
  }
  const keyIndent = (keyLineMatch[1] ?? "").length;

  const blockLines: string[] = [];

  for (let i = keyLineIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    const currentIndent = line.length - line.trimStart().length;

    if (!trimmed) {
      blockLines.push(line);
      continue;
    }

    const isYamlKey = /^\s*[A-Za-z0-9_-]+\s*:\s*/.test(line);
    if (isYamlKey && currentIndent <= keyIndent) {
      break;
    }

    blockLines.push(line);
  }

  return blockLines.length > 0 ? blockLines.join("\n") : null;
}

/**
 * The `- ` items of a YAML list, each as its own text block, so a required
 * field can be demanded of every entry instead of once per list. Splitting on
 * the list marker (not on a particular key) is what lets an entry that dropped
 * its `id` still be seen as its own entry instead of being absorbed into the
 * previous one.
 */
function splitYamlListEntries(section: string, key: string): string[] {
  const listBlock = extractYamlListBlock(section, key);
  if (!listBlock) {
    return [];
  }

  const lines = listBlock.split(/\r?\n/);
  const firstNonEmpty = lines.find((line) => line.trim().length > 0);
  if (!firstNonEmpty) {
    return [];
  }
  const baseIndent = firstNonEmpty.length - firstNonEmpty.trimStart().length;

  const entries: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const currentIndent = line.length - line.trimStart().length;
    if (/^\s*-\s+\S/.test(line) && currentIndent === baseIndent) {
      entries.push([line]);
      continue;
    }
    entries[entries.length - 1]?.push(line);
  }

  return entries.map((entryLines) => entryLines.join("\n"));
}

function resolveFreshnessReferenceNow(): number {
  const fromEnv =
    process.env.QFAI_RESEARCH_REFERENCE_DATE ?? process.env.QFAI_VALIDATE_REFERENCE_DATE;
  if (!fromEnv) {
    return Date.now();
  }

  const parsed = Date.parse(fromEnv);
  return Number.isFinite(parsed) ? parsed : Date.now();
}
