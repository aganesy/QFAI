import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { hasRunnableTcCarrier } from "../atddTraceability.js";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  fileAtRevision,
  getChangedFilesAgainstBase,
  mergeBaseRevision,
  withoutPathsGoneAtHead,
} from "../gitChanges.js";
import { parseHeadings } from "../parse/markdown.js";
import { collectSpecEntries } from "../specLayout.js";
import {
  parseAllMarkdownTables,
  parseFirstMarkdownTable,
  type MarkdownTable,
} from "../specPackParsers.js";
import type { Issue } from "../types.js";
import {
  isExecutedEvidenceCommand,
  isFailingEvidenceResult,
  isPassingEvidenceResult,
  redTestManifestHash,
  selectorResolves,
} from "./tddList.js";
import { issue } from "./utils.js";

const BR_AC_FILES = new Set(["04_Business-Rules.md", "03_Acceptance-Criteria.md"]);

const LEDGER_FILE = "16_Traceability-ledger.md";

type LedgerEntry = {
  brAc: string;
  implFile: string;
  testFile: string;
  proof: string;
};

type PlannedEntry = { readonly implFile: string; readonly state: string; readonly ids: string[] };

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * The ledger table is the **first** Markdown table in the file — the contract the
 * shipped `16_Traceability-ledger.md` template declares.
 *
 * Both the format probe and the row reader must agree on that, which is why they
 * take one already-parsed table rather than rescanning the text. Reading every
 * `|` line in the document instead let a supplementary table further down
 * contribute rows: any row whose first cell happened to look like `AC-0001`
 * produced a `QFAI-TRACE-001` error naming whatever its second cell held, even
 * when the real linked implementation had been modified.
 */
function readLedgerTable(content: string): MarkdownTable | null {
  return parseFirstMarkdownTable(content);
}

/**
 * The active table begins with its three binding columns in order. A `Proof`
 * column, when present, is fifth so the test and proof cells cannot be mistaken
 * for another column. Other trailing columns do not affect the check.
 */
function isExpectedLedgerFormat(table: MarkdownTable | null): boolean {
  if (!table) {
    return false;
  }
  const headers = table.headers;
  const proofIndex = headers.indexOf("Proof");
  return (
    headers.length >= 3 &&
    headers[0] === "BR/AC" &&
    headers[1] === "Implementation File" &&
    headers[2] === "Test File" &&
    (proofIndex === -1 || proofIndex === 4)
  );
}

function parseLedger(table: MarkdownTable | null): LedgerEntry[] {
  if (!table) {
    return [];
  }
  const entries: LedgerEntry[] = [];
  for (const cells of table.rows) {
    const brAcCell = cells[0];
    const implCell = cells[1];
    if (!brAcCell) {
      continue;
    }
    if (!/^(?:BR|AC)-\d{4}/.test(brAcCell)) {
      continue;
    }
    const proofIndex = table.headers.findIndex((header) => header.toLowerCase() === "proof");
    entries.push({
      brAc: brAcCell,
      implFile: implCell ?? "",
      testFile: cells[2] ?? "",
      proof: proofIndex === -1 ? "-" : (cells[proofIndex] ?? "-"),
    });
  }
  return entries;
}

function plannedEntries(content: string): PlannedEntry[] {
  const table = parseAllMarkdownTables(content).find(
    ({ headers }) =>
      headers[0] === "Implementation File" &&
      headers[1] === "State today" &&
      headers[2] === "BR / AC it will realize",
  );
  if (!table) return [];
  return table.rows.map((cells) => ({
    implFile: (cells[0] ?? "").replace(/^`|`$/g, ""),
    state: cells[1] ?? "",
    ids: [...(cells[2] ?? "").matchAll(/\b(?:BR|AC)-\d{4}(?:-\d{4})?\b/g)].map(([id]) => id),
  }));
}

function concretePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith("./") &&
    !path.posix.isAbsolute(value) &&
    !path.win32.isAbsolute(value) &&
    !/[\\*?{},;`]/.test(value) &&
    !value.split("/").some((part) => part === "" || part === "." || part === "..")
  );
}

/**
 * The offset and level of every heading outside a fenced code block. A `#`
 * line inside a fence is a code comment, such as a Gherkin `# Source:` line,
 * and does not end a section.
 */
function headingOffsets(text: string): { index: number; level: number }[] {
  const lineStarts = [0];
  for (const match of text.matchAll(/\n/g)) lineStarts.push(match.index + 1);
  return parseHeadings(text).map((heading) => ({
    index: lineStarts[heading.line - 1] ?? text.length,
    level: heading.level,
  }));
}

/** Each ID is compared by its own content, independent of its table position. */
function obligationContent(text: string, kind: "BR" | "AC"): Map<string, string> | null {
  const values = new Map<string, string[]>();
  const column = `${kind}-ID`;
  for (const table of parseAllMarkdownTables(text)) {
    const idIndex = table.headers.indexOf(column);
    if (idIndex === -1) continue;
    for (const cells of table.rows) {
      const id = cells[idIndex] ?? "";
      if (!new RegExp(`^${kind}-\\d{4}(?:-\\d{4})?$`).test(id)) continue;
      const normalized = cells.map((cell) => cell.trim()).join("\u001f");
      const previous = values.get(id) ?? [];
      if (previous.some((part) => part.startsWith("table:"))) return null;
      values.set(id, [...previous, `table:${normalized}`]);
    }
  }
  const normalized = text.replace(/\r\n/g, "\n");
  // A marker is the ID alone or followed by `: title` — `## BR-0001: Title`,
  // `## AC-0001`, and the `# AC-0001` comment that opens a template Gherkin
  // scenario. That comment inside its own `## AC-0001` section labels the
  // criterion the section already holds, so it does not start a second one.
  const markers = [
    ...normalized.matchAll(/^(#{1,6})[ \t]+((?:BR|AC)-\d{4}(?:-\d{4})?)(?::[^\n]*)?[ \t]*$/gm),
  ]
    .filter((marker) => marker[2]?.startsWith(`${kind}-`))
    .filter((marker, index, all) => {
      const enclosing = all[index - 1];
      return !(marker[1] === "#" && enclosing?.[1] !== "#" && enclosing?.[2] === marker[2]);
    });
  const headings = headingOffsets(normalized);
  for (const [index, marker] of markers.entries()) {
    const id = marker[2];
    if (!id) continue;
    const start = marker.index;
    const level = marker[1]?.length ?? 1;
    // A section also stops at the next heading of its own level or higher, so
    // a closing section such as `## Completion Gate` is not read as part of
    // the last criterion, and appending a criterion before it leaves the
    // previous one unchanged.
    const sibling = headings.find((heading) => heading.index > start && heading.level <= level);
    const next = Math.min(
      markers[index + 1]?.index ?? normalized.length,
      sibling?.index ?? normalized.length,
    );
    const section = normalized.slice(start, next);
    const block = (marker[1] === "#" ? section.split(/^```/m)[0] : section)?.trim() ?? "";
    const previous = values.get(id) ?? [];
    if (previous.some((part) => part.startsWith("section:"))) return null;
    values.set(id, [...previous, `section:${block}`]);
  }
  if (values.size === 0) return null;
  return new Map([...values].map(([id, parts]) => [id, parts.sort().join("\n")]));
}

function findChangedSpecDirs(changedFiles: Set<string>, specsRelDir: string): Set<string> {
  const specDirs = new Set<string>();
  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, "/");
    const specsPrefix = specsRelDir.replace(/\\/g, "/");
    if (!normalized.startsWith(specsPrefix + "/")) {
      continue;
    }
    const rest = normalized.slice(specsPrefix.length + 1);
    const parts = rest.split("/");
    const specId = parts[0];
    const fileName = parts[1];
    if (!specId || !fileName) {
      continue;
    }
    if (BR_AC_FILES.has(fileName)) {
      specDirs.add(specId);
    }
  }
  return specDirs;
}

/** Whether `dir` is a directory. A missing path and an unreadable one are both `false`. */
async function directoryExists(dir: string): Promise<boolean> {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

type LayeredSpec = { readonly specId: string; readonly ledgerPath: string };

/**
 * The **layered** spec directories under `specsDir`, sorted so findings come
 * out in a stable order.
 *
 * Layout matters because `16_Traceability-ledger.md` is two different files
 * wearing one name. In the layered layout it is the optional `BR/AC ->
 * Implementation File` table this validator reads. In the legacy `spec-pack`
 * layout it is a **required** nine-column SSOT ledger
 * (`trace_id, obj_id, …, tc_ids`) owned by `QFAI-LEDGER-001` /
 * `E_LEDGER_MISSING_COLUMN`, whose header can never carry `Implementation
 * File` — so enumerating it here would file a bogus `QFAI-TRACE-002` against
 * every valid legacy pack on every `sdd` / `tdd` / `full` run, and fail the run
 * outright under `--strict` / `--fail-on warning`. `collectSpecEntries` is the
 * layout SSOT; anything it does not call `layered` owns a different ledger.
 *
 * A missing / unreadable specs directory is not a traceability finding — the
 * spec-pack validators own that — so it yields none.
 */
/**
 * A finding's spec-directory path, POSIX-separated.
 *
 * `path.join` produced the platform separator here. Nothing shipped wrong —
 * `normalizeIssuePaths` converts `file` before any surface reads it — but a
 * caller that invokes this validator directly sees the raw value, and that is
 * the boundary twenty-eight assertions across the suite state as a POSIX
 * literal. This finding disagreed with all of them, and only where the
 * platform separator is not `/`.
 *
 * The configured directory is normalised too, and its trailing slashes
 * dropped: it comes from `qfai.config.yaml` and may carry either.
 */
function specDirFinding(specsDir: string, specId: string): string {
  return `${specsDir.replace(/\\/g, "/").replace(/\/+$/, "")}/${specId}`;
}

async function listLayeredSpecs(specsDir: string): Promise<LayeredSpec[]> {
  try {
    const entries = await collectSpecEntries(specsDir);
    return entries
      .filter((entry) => entry.layout === "layered")
      .map((entry) => ({
        specId: path.basename(entry.dir),
        ledgerPath: path.join(entry.dir, LEDGER_FILE),
      }))
      .sort((a, b) => a.specId.localeCompare(b.specId));
  } catch {
    return [];
  }
}

/**
 * Spec ids the diff names but the working tree no longer carries as a layered
 * spec — a whole-spec `DELETE`, a rename, or a conversion to the spec-pack
 * layout.
 *
 * The scan enumerates the working tree, so such a spec is otherwise invisible:
 * its ledger is gone with it, and the `QFAI-TRACE-001` pass that used to run
 * off the diff-derived id list silently stops happening. Reading the base
 * branch's copy of the ledger is a different (and much larger) feature — this
 * only refuses to let the check disappear without a word, the same contract
 * `QFAI-TRACE-003` already carries for an unavailable diff.
 *
 * Sorted for a stable finding order; `changedSpecIds` comes out in git's order.
 */
function reportUninspectableSpecIds(
  changedSpecIds: ReadonlySet<string>,
  presentSpecIds: ReadonlySet<string>,
): string[] {
  return [...changedSpecIds].filter((specId) => !presentSpecIds.has(specId)).sort();
}

type LedgerRead =
  | { readonly ok: true; readonly entries: LedgerEntry[]; readonly planned: PlannedEntry[] }
  | { readonly ok: false; readonly issue: Issue };

/**
 * Reads one spec's ledger. Absence is an optional-artifact warning. An adopted
 * ledger that is unreadable or malformed is an error when this branch changes
 * that spec's BR/AC; older untouched ledgers retain their warning.
 */
async function readSpecLedger(
  specId: string,
  ledgerPath: string,
  changed: boolean,
): Promise<LedgerRead> {
  // `stat` before `readFile`, never the other way round. This scan now visits
  // every layered spec instead of only the ones named in the branch diff, and
  // opening a FIFO blocks until a writer appears — one such path anywhere under
  // `specsDir` would hang `qfai validate` indefinitely, even on an empty diff.
  // `stat` never opens the file, and it follows symlinks, so a ledger symlinked
  // to a real file still reads.
  let ledgerStats;
  try {
    ledgerStats = await stat(ledgerPath);
  } catch {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger not found for ${specId}. The BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec. This artifact is optional; to enable the check, create it with /qfai-sdd from .qfai/assistant/skills/qfai-sdd/templates/specs/spec/${LEDGER_FILE}.`,
        "warning",
        ledgerPath,
        "traceability.integrity.ledgerMissing",
      ),
    };
  }

  if (!ledgerStats.isFile()) {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger for ${specId} is not a regular file (FIFO, socket, device or directory). It is not read, and the BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec. Replace it with a Markdown file shaped like .qfai/assistant/skills/qfai-sdd/templates/specs/spec/${LEDGER_FILE}.`,
        changed ? "error" : "warning",
        ledgerPath,
        "traceability.integrity.ledgerNotAFile",
      ),
    };
  }

  let ledgerContent: string;
  try {
    ledgerContent = await readFile(ledgerPath, "utf-8");
  } catch {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger for ${specId} could not be read. The BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec.`,
        changed ? "error" : "warning",
        ledgerPath,
        "traceability.integrity.ledgerUnreadable",
      ),
    };
  }

  const ledgerTable = readLedgerTable(ledgerContent);

  // Format check before parse: a table that fails it is skipped, so parsing
  // it first only built rows nothing reads.
  if (!isExpectedLedgerFormat(ledgerTable)) {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger for ${specId} uses unexpected format. The first Markdown table must begin BR/AC | Implementation File | Test File, with Proof in the fifth column when present. See .qfai/assistant/skills/qfai-sdd/templates/specs/spec/${LEDGER_FILE} for the expected schema.`,
        changed ? "error" : "warning",
        ledgerPath,
        "traceability.integrity.ledgerFormatMismatch",
      ),
    };
  }

  return { ok: true, entries: parseLedger(ledgerTable), planned: plannedEntries(ledgerContent) };
}

async function regularFile(root: string, relative: string): Promise<boolean> {
  if (!concretePath(relative)) return false;
  try {
    return (await stat(path.join(root, relative))).isFile();
  } catch {
    return false;
  }
}

function testCaseReferences(text: string): { id: string; ac: string[]; br: string[] }[] {
  return parseAllMarkdownTables(text)
    .filter((table) => table.headers.includes("TC-ID"))
    .flatMap((table) =>
      table.rows.map((row) => ({
        id: row[table.headers.indexOf("TC-ID")] ?? "",
        ac: (row[table.headers.indexOf("AC-Refs")] ?? "").match(/AC-\d{4}(?:-\d{4})?/g) ?? [],
        br: (row[table.headers.indexOf("BR-Refs")] ?? "").match(/BR-\d{4}(?:-\d{4})?/g) ?? [],
      })),
    );
}

function roundField(section: string, round: number, field: string): string | null {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^- (?:Round ${round}: )?${escaped}(?: \\([^)]*\\))?:[ \\t]*(.+)$`,
    "im",
  );
  return pattern.exec(section)?.[1] ?? null;
}

/** The recorded run must select this result, rather than merely the whole file. */
function commandTargetsProof(command: string, selector: string, proofId: string): boolean {
  const run = command.trim().replace(/^`|`$/g, "");
  if (
    selector.includes("::") &&
    run
      .split(/\s+/)
      .map((arg) => arg.replace(/^["'`]|["'`]$/g, ""))
      .includes(selector)
  ) {
    return true;
  }
  const filters = run.matchAll(
    /(?:^|\s)(?:--testNamePattern|--test-name-pattern|--grep|-t|-k|-run)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s`]+))/gi,
  );
  return [...filters].some((match) => {
    const value = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
    return (
      value.includes(selector) ||
      new RegExp(`(?:^|[^A-Za-z0-9])${proofId}(?:$|[^A-Za-z0-9])`).test(value)
    );
  });
}

/** Resolve one independent ATDD result to the implementation it actually tested. */
async function hasCurrentProof(
  root: string,
  specsDir: string,
  specId: string,
  entry: LedgerEntry,
): Promise<boolean> {
  if (!/^TDD-\d{4}$/.test(entry.proof) || !concretePath(entry.testFile)) return false;
  const specDir = path.join(specsDir, specId);
  const tddPath = path.join(specDir, "tdd", "test-list.md");
  const tcPath = path.join(specDir, "06_Test-Cases.md");
  const evidencePath = path.join(root, ".qfai", "evidence", `atdd-${specId}.md`);
  let tddText: string;
  let tcText: string;
  let evidenceText: string;
  let testText: string;
  let sourceBytes: Buffer;
  try {
    [tddText, tcText, evidenceText, testText, sourceBytes] = await Promise.all([
      readFile(tddPath, "utf-8"),
      readFile(tcPath, "utf-8"),
      readFile(evidencePath, "utf-8"),
      readFile(path.join(root, entry.testFile), "utf-8"),
      readFile(path.join(root, entry.implFile)),
    ]);
  } catch {
    return false;
  }
  const tddTable = parseAllMarkdownTables(tddText).find((table) =>
    table.headers.includes("TDD-ID"),
  );
  if (!tddTable) return false;
  const col = (name: string): number => tddTable.headers.indexOf(name);
  if (["TDD-ID", "TC-Refs", "Test file", "Selector", "Evidence"].some((name) => col(name) < 0)) {
    return false;
  }
  const matching = tddTable.rows.filter((row) => row[col("TDD-ID")] === entry.proof);
  if (matching.length !== 1) return false;
  const row = matching[0] ?? [];
  const selector = row[col("Selector")] ?? "";
  if (
    row[col("Test file")] !== entry.testFile ||
    !selectorResolves(selector, testText) ||
    !(row[col("Evidence")] ?? "").includes(`atdd-${specId}.md#${entry.proof.toLowerCase()}`)
  ) {
    return false;
  }
  const tcIds = new Set((row[col("TC-Refs")] ?? "").match(/TC-\d{4}(?:-\d{4})?/g) ?? []);
  const tcRows = testCaseReferences(tcText);
  const relevantTc = tcRows.filter(({ id }) => tcIds.has(id));
  if (tcIds.size === 0 || relevantTc.length !== tcIds.size) return false;
  const proofTc = relevantTc.find((tc) => {
    const obligationLinked = entry.brAc.startsWith("AC-")
      ? tc.ac.includes(entry.brAc)
      : tc.br.includes(entry.brAc) || (row[col("BR-Ref")] ?? "") === entry.brAc;
    return (
      obligationLinked && hasRunnableTcCarrier(entry.testFile, testText, specId.slice(5), tc.id)
    );
  });
  if (!proofTc) return false;

  const normalized = evidenceText.replace(/\r\n/g, "\n");
  const heading = new RegExp(`^### ${entry.proof}\\s*$`, "m").exec(normalized);
  if (!heading) return false;
  const tail = normalized.slice(heading.index + heading[0].length);
  const next = /^### TDD-\d{4}\s*$/m.exec(tail);
  const section = next ? tail.slice(0, next.index) : tail;
  if (
    !section.includes(`- TDD-ID: ${entry.proof}`) ||
    !section.includes(`- Test file: \`${entry.testFile}\``) ||
    !section.includes(`- Selector: \`${selector}\``) ||
    !section.includes(`- TC-ref: ${proofTc.id}`)
  ) {
    return false;
  }
  const roundMarkers = [...section.matchAll(/^- Round (\d+): /gm)];
  const roundNumbers = roundMarkers.map((marker) => Number(marker[1]));
  if (
    roundNumbers.length === 0 ||
    roundNumbers.some((round, index) => index > 0 && round < (roundNumbers[index - 1] ?? 0))
  ) {
    return false;
  }
  const currentRound = roundNumbers.at(-1);
  const firstCurrent = roundMarkers.find((marker) => Number(marker[1]) === currentRound);
  if (currentRound === undefined || firstCurrent?.index === undefined) return false;
  const current = section.slice(firstCurrent.index);
  const satisfiedBy = /^- Satisfied-by: `([^`]+)`/m.exec(current)?.[1];
  const restoredHash = /Restored SHA-256: `?([a-f0-9]{64})`?/i.exec(current)?.[1];
  const redHash = new RegExp(
    `^- Round ${currentRound}: RED test hash: ([a-f0-9]{64})\\s*$`,
    "im",
  ).exec(current)?.[1];
  const manifest = new RegExp(
    `^- Round ${currentRound}: RED test manifest:\\s*\\n\\s*\`\`\`[^\\n]*\\n([\\s\\S]*?)\\n\\s*\`\`\``,
    "m",
  ).exec(current)?.[1];
  const greenCommand = roundField(current, currentRound, "GREEN command");
  const greenResult = roundField(current, currentRound, "GREEN result");
  const falsifiabilityCommand = roundField(current, currentRound, "Falsifiability command");
  const falsifiabilityResult = roundField(current, currentRound, "Falsifiability result");
  const redCommand = roundField(current, currentRound, "RED command");
  const redResult = roundField(current, currentRound, "RED result");
  const redObserved =
    redCommand !== null &&
    redResult !== null &&
    isExecutedEvidenceCommand(redCommand) &&
    commandTargetsProof(redCommand, selector, entry.proof) &&
    isFailingEvidenceResult(redResult);
  const redFalsified =
    falsifiabilityCommand !== null &&
    falsifiabilityResult !== null &&
    isExecutedEvidenceCommand(falsifiabilityCommand) &&
    commandTargetsProof(falsifiabilityCommand, selector, entry.proof) &&
    isFailingEvidenceResult(falsifiabilityResult);
  const qa =
    roundField(current, currentRound, "qa-gatekeeper") ??
    roundField(current, currentRound, "qa-gatekeeper live mutation review");
  if (
    !satisfiedBy?.startsWith(`${entry.implFile}::`) ||
    restoredHash !== createHash("sha256").update(sourceBytes).digest("hex") ||
    !redHash ||
    !manifest ||
    greenCommand === null ||
    !isExecutedEvidenceCommand(greenCommand) ||
    !commandTargetsProof(greenCommand, selector, entry.proof) ||
    greenResult === null ||
    !isPassingEvidenceResult(greenResult) ||
    (!redObserved && !redFalsified) ||
    qa === null ||
    !/^`?PASS\b/.test(qa) ||
    !manifest.split(/\r?\n/).some((line) => line.trim() === entry.testFile)
  ) {
    return false;
  }
  return (await redTestManifestHash(root, manifest)) === redHash;
}

export type TraceabilityIntegrityOptions = {
  /**
   * Whether to run the history-based `QFAI-TRACE-001` check.
   *
   * `false` for `--profile sdd`. That profile is the completion gate of
   * `/qfai-sdd`, which updates a spec's BR/AC and its ledger and then hands the
   * implementation to `/qfai-implement` — so at the moment the gate runs, the
   * linked implementation files are *supposed* to be untouched. Asking for the
   * diff there would fail the mandatory `--fail-on error` run on exactly the
   * flow the profile exists to certify. `sdd` therefore checks only that the
   * ledger it owns is present and well-shaped (`QFAI-TRACE-002`); drift between
   * a changed BR/AC and its implementation stays with `--profile tdd` / `full`,
   * which gate after the code exists.
   */
  readonly includeImplementationDiff?: boolean;
};

/**
 * Two questions, two gates.
 *
 * Whether a spec carries a ledger is a property of the **working tree**, so
 * `QFAI-TRACE-002` is raised for every spec directory, unconditionally. It used
 * to sit behind the branch diff, which meant a trunk-based repo (`HEAD ==
 * origin/main`), a shallow CI clone or a checkout without the base ref never
 * saw the warning the shipped `/qfai-sdd` docs promise — the artifact was
 * simply never asked for.
 *
 * Whether a BR/AC changed without its linked implementation is a property of
 * the **history**, so `QFAI-TRACE-001` stays behind `changedFiles` and behind
 * `BR_AC_FILES` — and behind {@link TraceabilityIntegrityOptions.includeImplementationDiff},
 * because only a profile that gates *after* implementation may ask it.
 */
export async function validateTraceabilityIntegrity(
  root: string,
  config: QfaiConfig,
  options: TraceabilityIntegrityOptions = {},
): Promise<Issue[]> {
  const includeImplementationDiff = options.includeImplementationDiff ?? true;
  const issues: Issue[] = [];
  const baseBranch = config.baseBranch ?? "origin/main";
  const specsDir = resolvePath(root, config, "specsDir");

  // Two sets from one diff, and the difference between them matters.
  //
  // `changedImplFiles` drops the paths the branch removed: a path that is gone
  // cannot be the implementation this ledger row still points at, and counting
  // it as "modified" let a row that was never updated for the removal pass
  // `QFAI-TRACE-001` in silence — the one case where the ledger is provably
  // stale. Removal, not rename detection: a move too rewritten to score as a
  // rename, and a plain deletion, leave the row equally stale.
  //
  // `changedSpecIds` is derived from the **undropped** set, because a spec
  // deleted whole is a change to that spec. Pruning first left its BR/AC files
  // out, so `changedSpecIds` came back empty and `QFAI-TRACE-003` — which
  // exists to report a spec whose ledger can no longer be read — never fired
  // for the deletion that most needs it.
  let changedImplFiles: Set<string> | null = null;
  let changedFiles: Set<string> | null = null;
  let changedSpecIds = new Set<string>();
  if (includeImplementationDiff) {
    changedFiles = getChangedFilesAgainstBase(root, baseBranch);
    if (changedFiles) {
      changedSpecIds = findChangedSpecDirs(changedFiles, config.paths.specsDir);
      changedImplFiles = withoutPathsGoneAtHead(root, baseBranch, changedFiles);
    } else {
      issues.push(
        issue(
          "QFAI-TRACE-003",
          `Could not diff against "${baseBranch}", so the BR/AC to implementation integrity check (QFAI-TRACE-001) was skipped for every spec. Fetch the base ref (a shallow CI clone does not carry it) or set the top-level baseBranch key in qfai.config.yaml (it is read from the document root, not from under validation). Ledger presence is still checked.`,
          "error",
          undefined,
          "traceability.integrity.diffUnavailable",
        ),
      );
    }
  }

  const layeredSpecs = await listLayeredSpecs(specsDir);
  const presentSpecIds = new Set(layeredSpecs.map((spec) => spec.specId));

  // A configured directory that is not there selects nothing, and every gate
  // keyed on it then evaluates an empty set. That reads in the output exactly
  // like a project whose specs are all clean, which is the one reading a
  // configuration error must not be able to produce.
  //
  // Only where the detection also selected nothing. A branch that deletes its
  // last spec takes the directory with it, and the finding below already says
  // which spec became unreadable — reporting the directory too would name the
  // same gap twice and call a deliberate deletion a misconfiguration.
  if (changedSpecIds.size === 0 && !(await directoryExists(specsDir))) {
    issues.push(
      issue(
        "QFAI-TRACE-003",
        `paths.specsDir is "${config.paths.specsDir}", which is not a directory in this repository, so no spec was read and the BR/AC to implementation integrity check (QFAI-TRACE-001) ran over nothing. Point paths.specsDir at the directory holding the spec directories.`,
        "info",
        config.paths.specsDir,
        "traceability.integrity.specsDirMissing",
      ),
    );
  }

  for (const specId of reportUninspectableSpecIds(changedSpecIds, presentSpecIds)) {
    issues.push(
      issue(
        "QFAI-TRACE-003",
        `Spec ${specId} has BR/AC changes in the diff against "${baseBranch}" but no layered spec directory in the working tree, so its ledger cannot be read and the BR/AC to implementation integrity check (QFAI-TRACE-001) could not run for it. If the spec was deleted on purpose this needs no action; if it was renamed or converted, re-check the implementation links the old ledger carried.`,
        "info",
        specDirFinding(config.paths.specsDir, specId),
        "traceability.integrity.specNotInWorkingTree",
      ),
    );
  }

  const mergeBase =
    changedFiles !== null && changedSpecIds.size > 0 ? mergeBaseRevision(root, baseBranch) : null;
  if (changedFiles !== null && changedSpecIds.size > 0 && mergeBase === null) {
    issues.push(
      issue(
        "QFAI-TRACE-003",
        `Could not resolve the merge base of "${baseBranch}" and HEAD. BR/AC obligations cannot be compared.`,
        "error",
        undefined,
        "traceability.integrity.mergeBaseUnavailable",
      ),
    );
  }

  for (const { specId, ledgerPath } of layeredSpecs) {
    const ledger = await readSpecLedger(specId, ledgerPath, changedSpecIds.has(specId));
    if (!ledger.ok) {
      issues.push(ledger.issue);
      continue;
    }
    if (!changedImplFiles || !changedFiles || !changedSpecIds.has(specId) || !mergeBase) {
      continue;
    }

    const changedIds = new Set<string>();
    let sourceUnavailable = false;
    for (const file of BR_AC_FILES) {
      const relative = `${normalizePath(config.paths.specsDir)}/${specId}/${file}`;
      if (!changedFiles.has(relative)) continue;
      const previous = fileAtRevision(root, mergeBase, relative);
      if (previous.kind === "unavailable") {
        sourceUnavailable = true;
        break;
      }
      let currentText: string;
      try {
        currentText = await readFile(path.join(root, relative), "utf-8");
      } catch {
        sourceUnavailable = true;
        break;
      }
      const kind = file.startsWith("04_") ? "BR" : "AC";
      const before =
        previous.kind === "absent"
          ? new Map<string, string>()
          : obligationContent(previous.content, kind);
      const after = obligationContent(currentText, kind);
      if (!before || !after) {
        sourceUnavailable = true;
        break;
      }
      for (const [id, content] of after) {
        if (before.get(id) !== content) changedIds.add(id);
      }
    }
    if (sourceUnavailable) {
      issues.push(
        issue(
          "QFAI-TRACE-003",
          `Spec ${specId} BR/AC content could not be compared with its merge-base copy.`,
          "error",
          specDirFinding(config.paths.specsDir, specId),
          "traceability.integrity.obligationUnavailable",
        ),
      );
      continue;
    }

    for (const id of changedIds) {
      const active = ledger.entries.filter((entry) => entry.brAc === id);
      const planned = ledger.planned.filter((entry) => entry.ids.includes(id));
      if (active.length === 0 && planned.length === 0) {
        issues.push(
          issue(
            "QFAI-TRACE-001",
            `Spec ${specId} changed ${id} but its ledger has no active or explicit planned binding.`,
            "error",
            ledgerPath,
            "traceability.integrity.bindingMissing",
            [id],
          ),
        );
      }
      const seen = new Set<string>();
      for (const entry of active) {
        const valid = concretePath(entry.implFile) && (await regularFile(root, entry.implFile));
        if (!valid || seen.has(entry.implFile)) {
          issues.push(
            issue(
              "QFAI-TRACE-001",
              `Spec ${specId} ${id} has a missing, invalid or duplicate active implementation binding "${entry.implFile}".`,
              "error",
              entry.implFile || ledgerPath,
              "traceability.integrity.bindingAmbiguous",
              [id],
            ),
          );
          continue;
        }
        seen.add(entry.implFile);
        if (
          !changedImplFiles.has(entry.implFile) &&
          !(await hasCurrentProof(root, specsDir, specId, entry))
        ) {
          issues.push(
            issue(
              "QFAI-TRACE-001",
              `Spec ${specId} ${id} has unchanged implementation "${entry.implFile}" without current independent TDD proof.`,
              "error",
              entry.implFile,
              "traceability.integrity.implNotChanged",
              [id],
            ),
          );
        }
      }
      for (const entry of planned) {
        const exists = await regularFile(root, entry.implFile);
        if (
          !concretePath(entry.implFile) ||
          !["present", "absent"].includes(entry.state) ||
          (entry.state === "present") !== exists ||
          seen.has(entry.implFile)
        ) {
          issues.push(
            issue(
              "QFAI-TRACE-001",
              `Spec ${specId} ${id} has an invalid, stale or duplicate planned implementation binding "${entry.implFile}".`,
              "error",
              entry.implFile || ledgerPath,
              "traceability.integrity.bindingAmbiguous",
              [id],
            ),
          );
        }
        seen.add(entry.implFile);
      }
    }
  }

  return issues;
}
