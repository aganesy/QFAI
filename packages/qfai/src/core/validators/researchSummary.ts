import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import {
  findLatestDiscussionPackDir,
  ResolveActiveDiscussionPackError,
  resolveActiveDiscussionPack,
} from "../discussionPack.js";
import type { LocatedPack } from "../packLocator.js";
import { findPacks } from "../packLocator.js";
import { readDiscussionCurrentId } from "../state.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

/** The release `QFAI-RESEARCH-012` stops being a warning at. */
const SECTION_MISSING_PROMOTION = RULE_PROMOTIONS.researchSummarySectionMissing.promoteAt;
/** The release the per-entry schema rules stop being warnings at. */
const SCHEMA_FIELDS_PROMOTION = RULE_PROMOTIONS.researchSummarySchemaFields.promoteAt;

/** The window note every rule under {@link SCHEMA_FIELDS_PROMOTION} carries. */
function schemaWindowNote(severity: "warning" | "error"): string {
  return severity === "warning"
    ? ` Reported as a warning until the ${SCHEMA_FIELDS_PROMOTION} release, then an error`
    : "";
}

const RESEARCH_SUMMARY_HEADING_RE = /^#{1,3}\s+Research\s+Summary/im;
const FULL_DATE_RE = /^[ \t]*(?:-[ \t]*)?published:[ \t]*["']?(\d{4}-\d{2}-\d{2})["']?/m;
/** ```yaml fence inside the stored section — the prose around it is not data. */
const YAML_FENCE_RE = /^```[^\n]*\n([\s\S]*?)^```/gm;
/** Any `key: value` line, so the value can be judged after YAML reads it. */
const FIELD_LINE_RE = /^[ \t]*(?:-[ \t]*)?([A-Za-z0-9_]+):[ \t]*(.*)$/gm;
/** `[fill me in]` — the shipped template's placeholder shape, once parsed. */
const PLACEHOLDER_TEXT_RE = /^\[[^\]]*\]$/;
/**
 * The Output Schema fields that carry a scalar, and the only keys the
 * placeholder scan reads.
 *
 * Scanning every key would have to decide what a flow sequence means on a key
 * the schema says nothing about — `tags: [a, b]` is data, not a placeholder.
 * On these keys it is never data: the schema says scalar, so a sequence there
 * is the unreplaced `[...]` the template shipped.
 */
const SCALAR_SCHEMA_FIELDS = new Set([
  "id",
  "title",
  "url",
  "published",
  "category",
  "description",
  "source_id",
  "finding",
  "action",
  "reason",
]);
/** `|`, `>` with optional chomping and indentation indicators. */
const BLOCK_SCALAR_HEADER_RE = /^[|>][+-]?\d*$/;
/** A `key: value` line of a list entry, with or without the leading `- `. */
const ENTRY_FIELD_LINE_RE = /^[ \t]*(?:-[ \t]+)?([A-Za-z0-9_-]+):[ \t]*(.*)$/;
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
  // Resolved once for the whole run: the promotion window is a property of the
  // tool, not of any one pack, and every rule below reads the same answer.
  const toolVersion = await resolveToolVersion();
  // The per-entry schema rules ride one window (`researchSummarySchemaFields`).
  // A literal `"error"` beside any of these calls would be a registered pin
  // that never governs anything — the state `sunsetLedger.test.ts` rejects.
  const schemaSeverity = newRuleSeverity(toolVersion, SCHEMA_FIELDS_PROMOTION);
  const target = await resolveResearchSummaryScanTarget(root, config);
  issues.push(...describeBrokenPointer(root, target, schemaSeverity));
  // `uiux.requireResearchSummary: false` is a project stating the section is
  // not required here, so reporting its absence contradicts the setting — and
  // under `--fail-on warning` or `--strict` it fails the run over a rule the
  // project opted out of. Only the two ABSENCE rules are governed by it: every
  // rule below judges a section the project chose to write, and declining the
  // requirement is not a licence to record the protocol wrongly.
  const requireSection = config.uiux?.requireResearchSummary !== false;
  if (requireSection) {
    issues.push(...(await checkStorageSlotPresence(root, target, schemaSeverity)));
    // Resolved here rather than inside the builder: the promotion window is a
    // property of the tool, and the builder runs once per validator run anyway.
    const missing = await buildMissingSectionIssue(root, target.discussionRoot, toolVersion);
    if (missing) {
      issues.push(missing);
    }
  }

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
    const bestPractices = splitYamlListEntries(yaml, "best_practices");
    const antiPatterns = splitYamlListEntries(yaml, "anti_patterns");
    const reflectionEntries = splitYamlListEntries(yaml, "reflection");
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
            `Source entry missing required field "id": ${label}${schemaWindowNote(schemaSeverity)}`,
            schemaSeverity,
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
          "QFAI-RESEARCH-019",
          `Research Summary still carries unreplaced template placeholders (${placeholderKeys.join(", ")}); record the actual protocol run${schemaWindowNote(schemaSeverity)}`,
          schemaSeverity,
          rel,
          "researchSummary.placeholder",
        ),
      );
    }

    const referencingEntries = [...bestPractices, ...antiPatterns, ...reflectionEntries];
    for (const unresolved of collectUnresolvedSourceIds(referencingEntries, sourceIds)) {
      issues.push(
        issue(
          "QFAI-RESEARCH-013",
          `"source_id" does not resolve to any sources[].id in the same Research Summary: ${unresolved}${schemaWindowNote(schemaSeverity)}`,
          schemaSeverity,
          rel,
          "researchSummary.sourceIdReference",
        ),
      );
    }

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
    issues.push(...checkPracticeEntries(rel, "best_practices", bestPractices, schemaSeverity));

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
    issues.push(...checkPracticeEntries(rel, "anti_patterns", antiPatterns, schemaSeverity));

    // Check reflection.apply presence — inside the reflection list only, and
    // entry by entry: a single complete entry must not satisfy the required
    // fields on behalf of its siblings.
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

    issues.push(...checkReflectionEntries(rel, reflectionEntries, schemaSeverity));
  }

  return issues;
}

/**
 * Every content rule is skipped when a file carries no heading, so omitting the
 * section entirely used to score zero findings while half-writing it scored
 * several errors. Make the omission visible with a single warning on the pack
 * directory when the latest pack has markdown but none of it carries the
 * section.
 *
 * This is broader than QFAI-RESEARCH-014, which asks the narrower question of
 * whether the slot sits in the file that owns it: a pack that recorded the
 * protocol in some other file answers this rule and still fails that one.
 */
async function buildMissingSectionIssue(
  root: string,
  discussionRoot: string,
  toolVersion: string,
): Promise<Issue | null> {
  let latestPackDir: string | null = null;
  try {
    latestPackDir = await findLatestDiscussionPackDir(discussionRoot);
  } catch {
    latestPackDir = null;
  }
  if (!latestPackDir) {
    return null;
  }

  const packFiles = await collectMarkdownFiles(latestPackDir);
  if (packFiles.length === 0) {
    return null;
  }
  for (const filePath of packFiles) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }
    if (extractResearchSummarySection(content)) {
      return null;
    }
  }

  const rel = path.relative(root, latestPackDir).replace(/\\/g, "/");
  const sectionMissingSeverity = newRuleSeverity(toolVersion, SECTION_MISSING_PROMOTION);
  const windowNote =
    sectionMissingSeverity === "warning"
      ? ` Reported as a warning until the ${SECTION_MISSING_PROMOTION} release, then an error`
      : "";
  return issue(
    "QFAI-RESEARCH-012",
    `Discussion pack has no "Research Summary" section, so the research-first protocol is never checked.${windowNote}`,
    sectionMissingSeverity,
    rel,
    "researchSummary.sectionMissing",
    undefined,
    "canonical",
    [
      'Add a "## Research Summary" section to a file in the pack (04_Sources.md by default).',
      "Follow the Output Schema in .qfai/assistant/constitution/research-first-protocol.md.",
    ].join("\n"),
  );
}

/** Per-entry required fields of a `best_practices[]` / `anti_patterns[]` list. */
function checkPracticeEntries(
  rel: string,
  key: string,
  entries: readonly string[],
  schemaSeverity: "warning" | "error",
): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? "";
    const missing = PRACTICE_FIELDS.filter((field) => !hasNonEmptyField(entry, field));
    if (missing.length > 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-016",
          `${key} entry missing required field(s) ${missing.join(", ")}: ${describeEntry(key, entry, i)}${schemaWindowNote(schemaSeverity)}`,
          schemaSeverity,
          rel,
          "researchSummary.practiceFields",
        ),
      );
    }
  }
  return issues;
}

/** Per-entry required fields of the `reflection[]` list. */
function checkReflectionEntries(
  rel: string,
  entries: readonly string[],
  schemaSeverity: "warning" | "error",
): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? "";
    const label = describeEntry("reflection", entry, i);

    const missing = REFLECTION_FIELDS.filter((field) => !hasNonEmptyField(entry, field));
    if (missing.length > 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-017",
          `reflection entry missing required field(s) ${missing.join(", ")}: ${label}${schemaWindowNote(schemaSeverity)}`,
          schemaSeverity,
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
      // The already-resolved root, so the pointer is resolved against the
      // config this validator was handed rather than the one on disk.
      const active = await resolveActiveDiscussionPack(root, discussionRoot);
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
function describeBrokenPointer(
  root: string,
  target: ResearchSummaryScanTarget,
  schemaSeverity: "warning" | "error",
): Issue[] {
  if (target.brokenPointer === null) {
    return [];
  }
  return [
    issue(
      "QFAI-RESEARCH-018",
      `Cannot resolve the current discussion pack: ${target.brokenPointer.reason}${schemaWindowNote(schemaSeverity)}`,
      schemaSeverity,
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
  schemaSeverity: "warning" | "error",
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
      ? [storageSlotIssue(root, storageFile, "the file is missing or unreadable", schemaSeverity)]
      : [];
  }

  // Asked of the masked copy for the same reason extractResearchSummarySection
  // masks: a heading shown inside a fenced example is not this pack's own.
  const hasHeading = RESEARCH_SUMMARY_HEADING_RE.test(maskFencedCodeBlocks(content));
  const section = hasHeading ? extractResearchSummarySection(content) : null;
  if (section) {
    return [];
  }

  const detail = hasHeading ? "the section is empty" : 'no "## Research Summary" heading';
  return [storageSlotIssue(root, storageFile, detail, schemaSeverity)];
}

function storageSlotIssue(
  root: string,
  storageFile: string,
  detail: string,
  schemaSeverity: "warning" | "error",
): Issue {
  return issue(
    "QFAI-RESEARCH-014",
    `${RESEARCH_SUMMARY_FILE} does not store a Research Summary (${detail}); record the research-first protocol output there${schemaWindowNote(schemaSeverity)}`,
    schemaSeverity,
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

/**
 * Keys whose value is still a `[bracketed]` template placeholder.
 *
 * Judged on the value **YAML reads**, not on the literal line. Matching the
 * whole line let `title: "[Reference title]"` and `reason: [Why...] # TODO`
 * through — both legal YAML, both still the shipped template — and the
 * required-field checks then accepted them as filled in, so a pack that
 * changed only the date cleared the completion gate.
 */
function collectPlaceholderKeys(yaml: string): string[] {
  const keys = new Set<string>();
  for (const match of yaml.matchAll(FIELD_LINE_RE)) {
    const key = match[1];
    if (!key || !SCALAR_SCHEMA_FIELDS.has(key.toLowerCase())) continue;
    if (isPlaceholderValue(match[2] ?? "")) {
      keys.add(key);
    }
  }
  return [...keys];
}

/** Whether a raw value text is the template's `[...]` placeholder. */
function isPlaceholderValue(raw: string): boolean {
  const text = raw.trim();
  return text.length > 0 && isPlaceholderParsed(parseScalarText(text));
}

/** The same judgement on a value that has already been parsed. */
function isPlaceholderParsed(parsed: unknown): boolean {
  // Unquoted, `[fill me in]` is a one-element flow sequence; quoted, it is the
  // string `[fill me in]`. Both spellings are the same unreplaced placeholder.
  if (Array.isArray(parsed)) {
    return parsed.length === 1 && typeof parsed[0] === "string";
  }
  return typeof parsed === "string" && PLACEHOLDER_TEXT_RE.test(parsed.trim());
}

/**
 * `source_id` values that no `sources[].id` in the same summary resolves.
 *
 * Read off the entries that the Output Schema says carry a reference, not off
 * the whole section: a `source_id:` line quoted inside a `description: |-`
 * body is prose, and scanning for it reported QFAI-RESEARCH-013 against a
 * summary whose real references all resolved.
 */
function collectUnresolvedSourceIds(
  referencingEntries: readonly string[],
  sourceIds: readonly string[],
): string[] {
  if (sourceIds.length === 0) {
    return [];
  }

  // Compare the parsed scalar, not the literal text: a serializer that quotes
  // `id: "SRC-0001"` but leaves `source_id: SRC-0001` bare writes the same
  // value twice, and the reference must still resolve.
  const known = new Set(sourceIds);
  const unresolved = new Set<string>();
  for (const entry of referencingEntries) {
    const value = readScalarField(entry, "source_id") ?? "";
    // A placeholder value is already reported as QFAI-RESEARCH-019; an absent
    // or empty one is reported as a missing required field.
    if (!value || PLACEHOLDER_TEXT_RE.test(value) || known.has(value)) {
      continue;
    }
    unresolved.add(value);
  }
  return [...unresolved];
}

/**
 * A fenced code block is quoted text, not document structure: a pack that shows
 * the schema in a ```markdown example must not read as owning the section.
 * Blank every fenced line — including the fences — while preserving each
 * character offset, so indices taken from the mask still address the original.
 */
function maskFencedCodeBlocks(content: string): string {
  const lines = content.split("\n");
  let openFence: { marker: string; length: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const fence = parseFenceLine(line);
    const open = openFence;

    if (!open) {
      if (fence) {
        openFence = { marker: fence.marker, length: fence.length };
        lines[i] = " ".repeat(line.length);
      }
      continue;
    }

    // A closing fence is the same marker, at least as long as the opener, and
    // carries no info string.
    if (
      fence &&
      fence.marker === open.marker &&
      fence.length >= open.length &&
      !fence.info.trim()
    ) {
      openFence = null;
    }
    lines[i] = " ".repeat(line.length);
  }

  return lines.join("\n");
}

function parseFenceLine(line: string): { marker: string; length: number; info: string } | null {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  const run = match?.[1];
  if (!run) {
    return null;
  }
  return { marker: run.startsWith("`") ? "`" : "~", length: run.length, info: match[2] ?? "" };
}

function extractResearchSummarySection(content: string): string | null {
  // Locate the heading — and the heading that ends the section — on the masked
  // copy, so fenced examples neither impersonate the section nor truncate it.
  // The body itself comes from the original: the shipped template writes its
  // schema inside a ```yaml fence, and that fence is the section's content
  // (extractYamlPayload reads it back out).
  const masked = maskFencedCodeBlocks(content);
  const heading = RESEARCH_SUMMARY_HEADING_RE.exec(masked);
  if (!heading) {
    return null;
  }

  const start = heading.index + heading[0].length;
  const nextHeadingOffset = masked.slice(start).search(/^#{1,3}\s+/m);
  const end = nextHeadingOffset === -1 ? content.length : start + nextHeadingOffset;
  const trimmed = content.slice(start, end).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The scalar written after `field:` inside the entry, or `null` when the key
 * is absent.
 */
function readScalarField(entry: string, field: string): string | null {
  return readEntryFields(entry).get(field.toLowerCase()) ?? null;
}

/**
 * The fields of one list entry, keyed by lowercased name.
 *
 * Only lines at the entry's own field column are fields; a block scalar's body
 * is folded into the value of the key that opened it instead of being read as
 * fields of its own. Scanning every `key:`-shaped line let a `source_id:` line
 * quoted inside a multi-line `description` stand in for the entry's own
 * reference — and, through the whole-section scan this replaces, be reported as
 * an unresolved one.
 */
function readEntryFields(entry: string): Map<string, string> {
  const fields = new Map<string, string>();
  const lines = entry.split(/\r?\n/);
  const first = lines.find((line) => line.trim().length > 0);
  if (first === undefined) {
    return fields;
  }
  const fieldColumn = contentColumnOf(first);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0 || contentColumnOf(line) !== fieldColumn) {
      continue;
    }
    const match = ENTRY_FIELD_LINE_RE.exec(line);
    const key = match?.[1]?.toLowerCase();
    if (key === undefined || fields.has(key)) {
      continue;
    }
    const inline = (match?.[2] ?? "").trim();
    // A block scalar's value is the more-indented lines under its header, so
    // reading the header line alone returned `|-` — a non-empty string that
    // passed every required-field check while the field held nothing.
    fields.set(
      key,
      BLOCK_SCALAR_HEADER_RE.test(inline)
        ? readBlockScalar(lines, index, fieldColumn)
        : normalizeScalar(inline),
    );
  }
  return fields;
}

/** The column an entry line's content starts at, counting a `- ` list marker. */
function contentColumnOf(line: string): number {
  const match = /^([ \t]*)(-[ \t]+)?/.exec(line);
  return (match?.[1] ?? "").length + (match?.[2] ?? "").length;
}

/** The body of a block scalar whose header sits at `lines[headerIndex]`. */
function readBlockScalar(
  lines: readonly string[],
  headerIndex: number,
  headerIndent: number,
): string {
  const body: string[] = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0) {
      body.push("");
      continue;
    }
    if ((/^[ \t]*/.exec(line)?.[0] ?? "").length <= headerIndent) {
      break;
    }
    body.push(line.trim());
  }
  return body.join("\n").trim();
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
  if (text.length === 0) {
    return "";
  }
  const parsed = parseScalarText(text);
  if (parsed === null || parsed === undefined) {
    return "";
  }
  if (typeof parsed === "string") {
    // Quoting a placeholder is ordinary YAML, so `title: "[Source title]"` is
    // the same unfilled slot as the bare form and has to read as empty here
    // too — otherwise the required-field rules accept the quoted spelling and
    // reject only the bare one, for values that are the same shipped text.
    return isPlaceholderParsed(parsed) ? "" : parsed.trim();
  }
  if (typeof parsed === "number" || typeof parsed === "boolean") {
    return String(parsed);
  }
  // Not a scalar at all — a flow sequence or mapping. Every field read through
  // here is a string in the Output Schema, so `title: []`, `description: {}`
  // and the template's own unreplaced `[fill me in]` hold no value: returning
  // their text let them pass as filled in, and made `id: []` resolve
  // `source_id: []` on top of that.
  //
  // A placeholder therefore reports twice, and both reports are wanted:
  // QFAI-RESEARCH-019 names every unfilled key in one finding, and the
  // required-field rules (-004 / -005 / -010 …) each name their own field on
  // their own entry. The per-field rules are the ones that say WHICH source
  // entry is unfilled; -019 is the one that says the pack is still the shipped
  // scaffold. Suppressing either loses a question the other cannot answer.
  return "";
}

/** `parse` the value on its own, or `undefined` when it is not valid YAML. */
function parseScalarText(text: string): unknown {
  try {
    return parseYaml(text) as unknown;
  } catch {
    // A value that does not parse is judged as written rather than silently
    // read as empty: an unparseable field is a defect the schema checks report,
    // not a licence to treat it as filled in.
    return text;
  }
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
