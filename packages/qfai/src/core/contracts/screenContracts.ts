import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import { readSafe } from "../validators/utils.js";
import { analyzeScreenCopy, isMapping, type ScreenCopyFinding } from "./screenCopy.js";

export type CanonicalScreenContract = {
  name: string;
  screenId: string;
  route: string;
  primaryTasks: string[];
  /**
   * True when the source contract authored a `primary_tasks` key on the
   * screen entry (regardless of whether the resulting list is empty).
   * False when the slot is entirely absent. Consumers use this flag to
   * distinguish a deliberate empty-slot violation from a missing slot; both
   * report at `error`, under different rules.
   */
  primaryTasksKeyPresent: boolean;
  sourceRef: string;
  /**
   * Findings raised at parse time when a `primary_tasks` entry violates
   * the closed `{id, label, acceptance}` schema — by not being a mapping,
   * by omitting a required key, or by carrying an extra key. Each entry
   * names the offending task index (1-based), the offending key set, and
   * a brief reason. Empty when every item conforms.
   */
  primaryTaskShapeFindings: PrimaryTaskShapeFinding[];
};

export type PrimaryTaskShapeFinding = {
  /** 1-based index of the offending primary_task item. */
  index: number;
  /** Identifier reported in messages: the entry's `id` when present, otherwise "#<index>". */
  taskRef: string;
  reason: "missing-required-key" | "extra-key" | "not-a-mapping";
  /** Required keys missing from the structured entry (if any). */
  missingKeys: string[];
  /** Extra keys present beyond the closed schema (if any). */
  extraKeys: string[];
};

const REQUIRED_PRIMARY_TASK_KEYS = ["id", "label", "acceptance"] as const;

export async function readUiContractScreenContracts(
  root: string,
  contractsDirRelative = ".qfai/contracts",
): Promise<CanonicalScreenContract[]> {
  // `path.resolve`, not `path.join`, for consistency with `specDirExists`
  // (specsDir) and `readPerSpecScreens` (per-spec contractsDir). This
  // project-wide screen reader runs in parallel with the per-spec reader;
  // `path.join` here would have the two paths produce different discovery
  // results when `qfai.config.yaml` carries an absolute `paths.contractsDir`
  // override — a least-astonishment violation that would silently
  // break certify's per-(spec × screen) gate.
  // Other call sites (lockAbs, designContractReadiness, designToken,
  // uiDefinitionConsistency, designAudit, doctor) still use
  // `path.join` and remain a deferred follow-up. This site is fixed here
  // because it directly partners with `readPerSpecScreens` and would
  // otherwise produce divergent contract-discovery behaviour between CLI
  // paths.
  const uiDir = path.resolve(root, contractsDirRelative, "ui");
  // Accept both `.yaml` and `.yml` extensions. Pre-fix the glob only matched `.yaml`, so repositories
  // that author UI contracts with the `.yml` extension auto-derived
  // an empty screen list and the CLI capture path silently exited 0
  // with a "no screens" warning. Other contract-discovery surfaces in
  // the repo accept both extensions, so harmonising here closes a
  // least-astonishment gap rather than expanding surface.
  const screens: CanonicalScreenContract[] = [];
  for (const { relativePath, parsed } of await readUiContractDocuments(uiDir, root)) {
    const fileScreens = extractUiScreens(parsed).map((screen) => ({
      ...screen,
      sourceRef: `${relativePath}#${screen.screenId}`,
    }));
    screens.push(...fileScreens);
  }

  return screens.filter(
    (screen, index, all) =>
      all.findIndex((candidate) => candidate.screenId === screen.screenId) === index,
  );
}

/**
 * Every UI contract file under `uiDir`, parsed, in the order the walk returns
 * them. A file that cannot be read or does not parse contributes nothing.
 *
 * One walk for the screen reader and for the report of the entries it leaves
 * out, so the two agree on which entry of a repeated `id` is the first.
 */
async function readUiContractDocuments(
  uiDir: string,
  root: string,
): Promise<Array<{ relativePath: string; parsed: unknown }>> {
  // The directory is the walk's `cwd` rather than part of the pattern: a project
  // under `/tmp/build[1]` holds a literal `[`, which a pattern reads as syntax,
  // and the walk then found no contract at all.
  const files = await fg("**/*.{yaml,yml}", { cwd: uiDir, absolute: true });
  const documents: Array<{ relativePath: string; parsed: unknown }> = [];
  for (const filePath of files) {
    const raw = await readSafe(filePath);
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch {
      continue;
    }
    documents.push({ relativePath: toPosix(path.relative(root, filePath)), parsed });
  }
  return documents;
}

/** The `id` of every `screens[]` entry a parsed contract holds that has one. */
function screenIdsOf(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object" || !("screens" in parsed)) return [];
  const screens = parsed.screens;
  if (!Array.isArray(screens)) return [];
  return screens.flatMap((entry: unknown) =>
    entry && typeof entry === "object" && "id" in entry && typeof entry.id === "string"
      ? [entry.id.trim()].filter((id) => id.length > 0)
      : [],
  );
}

/**
 * The spec a UI contract file belongs to by its name, or `null` for a file
 * read project-wide: `spec-0001.yaml`, `0001.yaml`, `ui-0001.yaml`,
 * `ui-0001-<part>.yaml` and anything under `spec-0001/`.
 */
function specScopeOf(pathInUiDir: string): string | null {
  const match =
    /^spec-(\d+)\/.+\.yaml$/u.exec(pathInUiDir) ??
    /^(?:spec-|ui-)?(\d+)\.yaml$/u.exec(pathInUiDir) ??
    /^ui-(\d+)-[^/]+\.yaml$/u.exec(pathInUiDir);
  return match?.[1] ?? null;
}

/** The keys of an entry whose reading the project-wide screen list keeps. */
const SCREEN_READING_KEYS = ["title", "route", "primary_tasks"] as const;

type ScreenReading = Record<(typeof SCREEN_READING_KEYS)[number], string>;

/** What the project-wide screen list reads from an entry, by the key each part comes from. */
function readingOf(entry: object): ScreenReading {
  const [screen] = extractUiScreens({ screens: [entry] });
  return {
    title: screen?.name ?? "",
    route: screen?.route ?? "",
    primary_tasks: JSON.stringify([
      screen?.primaryTasks,
      screen?.primaryTasksKeyPresent,
      screen?.primaryTaskShapeFindings,
    ]),
  };
}

/** `value` with every path separator written as `/`. */
function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

/** Why a `screens[]` entry is not among the screens the reader returns. */
export type UnreadScreenEntryReason =
  | "not-a-list"
  | "not-a-mapping"
  | "missing-id"
  | "missing-route"
  | "repeated-id"
  | "definition-shadowed";

export type UnreadScreenEntry = {
  /** The contract file, repository-relative. */
  file: string;
  /** The entry's index in that file's `screens` list, from 0, or none where `screens` is not a list. */
  index?: number;
  reason: UnreadScreenEntryReason;
  /** The entry's `id`, where it has one. */
  screenId?: string;
  /**
   * For a repeated `id`, the entry that is read in its place; for a shadowed
   * definition, the entry the project-wide screen list keeps.
   */
  readInstead?: { file: string; index: number };
  /** For a missing route, whether another entry of the same contract has this `id`. */
  idShared?: boolean;
  /** For a repeated `id`, whether the entry has no route either. */
  routeMissing?: boolean;
  /** For a shadowed definition, the keys it states differently from the entry kept. */
  differingKeys?: string[];
};

/**
 * Every `screens[]` entry `readUiContractScreenContracts` leaves out, and why.
 *
 * The reader keeps the first entry for each `id` and drops an entry with no
 * `id` or no `route`, for every consumer at once. That keeps one reading of a
 * contract, and leaves whatever a dropped entry states checked by nothing, so
 * the dropped entries are named here instead of passing in silence.
 */
export async function findUnreadUiScreenEntries(
  root: string,
  contractsDirRelative = ".qfai/contracts",
): Promise<UnreadScreenEntry[]> {
  const uiDir = path.resolve(root, contractsDirRelative, "ui");
  const unread: UnreadScreenEntry[] = [];
  const firstById = new Map<string, { file: string; index: number }>();
  // The project-wide screen list keeps one entry per `id` across every
  // contract. The prototyping loop captures from it and the design audit reads it.
  const firstAnywhere = new Map<string, { file: string; index: number; reading: ScreenReading }>();
  const documents = (await readUiContractDocuments(uiDir, root)).map((document) => ({
    ...document,
    scope: specScopeOf(toPosix(path.relative(uiDir, path.resolve(root, document.relativePath)))),
  }));
  // Every `id` each contract uses, readable entry or not: an entry missing its
  // route whose `id` another entry also has collides as soon as it gets one.
  const idUses = new Map<string, number>();
  for (const { parsed, scope } of documents) {
    for (const screenId of screenIdsOf(parsed)) {
      const key = JSON.stringify([scope, screenId]);
      idUses.set(key, (idUses.get(key) ?? 0) + 1);
    }
  }
  for (const { relativePath, parsed, scope } of documents) {
    if (!parsed || typeof parsed !== "object" || !("screens" in parsed)) continue;
    const screens = parsed.screens;
    // An empty `screens:` states nothing. A mapping or a scalar in its place
    // holds screens nothing reads.
    if (screens === null || screens === undefined) continue;
    if (!Array.isArray(screens)) {
      unread.push({ file: relativePath, reason: "not-a-list" });
      continue;
    }
    screens.forEach((entry: unknown, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        unread.push({ file: relativePath, index, reason: "not-a-mapping" });
        return;
      }
      const screenId = "id" in entry && typeof entry.id === "string" ? entry.id.trim() : "";
      const route = "route" in entry && typeof entry.route === "string" ? entry.route.trim() : "";
      if (!screenId) {
        unread.push({ file: relativePath, index, reason: "missing-id" });
        return;
      }
      // One `id` per contract scope: each spec's own contract is read on its
      // own, so a second spec reusing `home` there is a screen of that spec.
      const key = JSON.stringify([scope, screenId]);
      const first = firstById.get(key);
      // A repeat is named before a missing route: given a route, the entry is
      // still the second for its `id` and still not read.
      if (!route && first === undefined) {
        unread.push({
          file: relativePath,
          index,
          reason: "missing-route",
          screenId,
          idShared: (idUses.get(key) ?? 0) > 1,
        });
        return;
      }
      if (first === undefined) {
        firstById.set(key, { file: relativePath, index });
        // Another spec's contract may reuse the `id` for its own screen, which
        // certification reads. The project-wide list keeps the first entry's
        // reading only, so a reuse must state the screen the same way to be read.
        const reading = readingOf(entry);
        const anywhere = firstAnywhere.get(screenId);
        if (anywhere === undefined) {
          firstAnywhere.set(screenId, { file: relativePath, index, reading });
          return;
        }
        const differingKeys = SCREEN_READING_KEYS.filter(
          (readingKey) => anywhere.reading[readingKey] !== reading[readingKey],
        );
        if (differingKeys.length > 0) {
          unread.push({
            file: relativePath,
            index,
            reason: "definition-shadowed",
            screenId,
            readInstead: { file: anywhere.file, index: anywhere.index },
            differingKeys,
          });
        }
        return;
      }
      unread.push({
        file: relativePath,
        index,
        reason: "repeated-id",
        screenId,
        readInstead: first,
        routeMissing: !route,
      });
    });
  }
  return unread;
}

export type UiScreenCopyFinding = ScreenCopyFinding & {
  /** The contract file, repository-relative. */
  file: string;
  /** The entry's index in that file's `screens` list, from 0. */
  index: number;
  screenId: string;
};

/**
 * What each screen of every UI contract states wrongly about its `supplements`
 * and `structure`.
 *
 * It covers the entries the screen reader reads: those with an `id` and a
 * `route`, and the first entry for an `id` in its contract scope. The others
 * are reported once, by `findUnreadUiScreenEntries`, and not again here.
 */
export async function findUiScreenCopyFindings(
  root: string,
  contractsDirRelative = ".qfai/contracts",
): Promise<UiScreenCopyFinding[]> {
  const uiDir = path.resolve(root, contractsDirRelative, "ui");
  const found: UiScreenCopyFinding[] = [];
  const seen = new Set<string>();
  for (const { relativePath, parsed } of await readUiContractDocuments(uiDir, root)) {
    if (!isMapping(parsed) || !Array.isArray(parsed.screens)) continue;
    const scope = specScopeOf(toPosix(path.relative(uiDir, path.resolve(root, relativePath))));
    parsed.screens.forEach((entry: unknown, index) => {
      if (!isMapping(entry)) return;
      const screenId = typeof entry.id === "string" ? entry.id.trim() : "";
      const route = typeof entry.route === "string" ? entry.route.trim() : "";
      const key = JSON.stringify([scope, screenId]);
      if (!screenId || !route || seen.has(key)) return;
      seen.add(key);
      for (const finding of analyzeScreenCopy(entry)) {
        found.push({ ...finding, file: relativePath, index, screenId });
      }
    });
  }
  return found;
}

/**
 * Extract the canonical screen records from a parsed UI contract YAML
 * value. Returns each record with `sourceRef` left as an empty string;
 * callers are responsible for attaching a real `sourceRef` (typically
 * `<rel-path>#<screenId>`).
 *
 * Exported so per-contract readers reuse the same
 * shape parser as the project-wide `readUiContractScreenContracts`
 * function. Pre-export the same id/route/title/primary_tasks extraction
 * logic was duplicated at two call sites; any future schema additions
 * (e.g. a new `elements:` block surfacing to the canonical contract)
 * would not have propagated to the CLI reader. Single SSOT now.
 */
export function extractUiScreens(parsed: unknown): CanonicalScreenContract[] {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  const screens = (parsed as Record<string, unknown>).screens;
  if (!Array.isArray(screens)) {
    return [];
  }

  return screens.flatMap((screen) => {
    if (!screen || typeof screen !== "object") {
      return [];
    }

    const record = screen as Record<string, unknown>;
    const screenId = typeof record.id === "string" ? record.id.trim() : "";
    const route = typeof record.route === "string" ? record.route.trim() : "";
    if (!screenId || !route) {
      return [];
    }

    const name =
      typeof record.title === "string" && record.title.trim().length > 0
        ? record.title.trim()
        : screenId;
    const primaryTasksKeyPresent = Object.prototype.hasOwnProperty.call(record, "primary_tasks");
    const { primaryTasks, primaryTaskShapeFindings } = extractPrimaryTasks(record.primary_tasks);

    return [
      {
        name,
        screenId,
        route,
        primaryTasks,
        primaryTasksKeyPresent,
        sourceRef: "",
        primaryTaskShapeFindings,
      },
    ];
  });
}

function extractPrimaryTasks(value: unknown): {
  primaryTasks: string[];
  primaryTaskShapeFindings: PrimaryTaskShapeFinding[];
} {
  if (!Array.isArray(value)) {
    return { primaryTasks: [], primaryTaskShapeFindings: [] };
  }
  const entries: unknown[] = value;
  const primaryTasks: string[] = [];
  const findings: PrimaryTaskShapeFinding[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry: unknown = entries[index];
    const taskNumber = index + 1;
    if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      const presentKeys = Object.keys(record);
      const missingKeys = REQUIRED_PRIMARY_TASK_KEYS.filter((key) => {
        const v = record[key];
        return typeof v !== "string" || v.trim().length === 0;
      });
      const extraKeys = presentKeys.filter(
        (key) =>
          !REQUIRED_PRIMARY_TASK_KEYS.includes(key as (typeof REQUIRED_PRIMARY_TASK_KEYS)[number]),
      );
      const idValue = typeof record.id === "string" ? record.id.trim() : "";
      const taskRef = idValue.length > 0 ? idValue : `#${taskNumber}`;
      if (missingKeys.length > 0) {
        findings.push({
          index: taskNumber,
          taskRef,
          reason: "missing-required-key",
          missingKeys,
          extraKeys,
        });
      } else if (extraKeys.length > 0) {
        findings.push({
          index: taskNumber,
          taskRef,
          reason: "extra-key",
          missingKeys: [],
          extraKeys,
        });
      } else {
        // Conforms to the closed schema. The label is what the band and
        // count checks read.
        const label = typeof record.label === "string" ? record.label.trim() : "";
        if (label.length > 0) {
          primaryTasks.push(label);
        }
      }
      continue;
    }
    // A plain string or any other non-mapping value — surface as a shape
    // finding so the audit lane can reject it.
    findings.push({
      index: taskNumber,
      taskRef: `#${taskNumber}`,
      reason: "not-a-mapping",
      missingKeys: [],
      extraKeys: [],
    });
  }
  return { primaryTasks, primaryTaskShapeFindings: findings };
}
