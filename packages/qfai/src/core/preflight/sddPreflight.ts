import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";

const REQ_ID_RE = /\bREQ-\d{4}\b/g;
const REQUIRE_TIMESTAMP_RE = /require-(\d{17})/i;
const IMPORT_LITE_FILE_RE = /^import-lite-(\d{17})\.md$/i;

export type SddPreflightSource =
  | "require-index"
  | "import-lite-evidence"
  | "import-lite-bootstrap";

export type ImportLiteMinimumInput = {
  urls?: string[];
  paths?: string[];
  excerpt?: string;
};

export type RunSddPreflightOptions = {
  minimumInput?: ImportLiteMinimumInput;
  assumptions?: string[];
  now?: Date;
};

export type SddPreflightResult = {
  source: SddPreflightSource;
  selectedInputPath: string;
  importedReqCount: number | null;
  openQuestions: string[];
  preflightSummaryPath: string;
  importLiteEvidencePath?: string;
};

export async function runSddPreflight(
  root: string,
  config: QfaiConfig,
  options: RunSddPreflightOptions = {},
): Promise<SddPreflightResult> {
  const requireRoot = resolvePath(root, config, "requireDir");
  const reportRoot = resolvePath(root, config, "outDir");
  const evidenceRoot = path.join(path.dirname(requireRoot), "evidence");
  const summaryPath = path.join(reportRoot, "preflight_summary.md");

  await mkdir(reportRoot, { recursive: true });
  await mkdir(evidenceRoot, { recursive: true });

  const latestRequireIndex = await findLatestRequireIndex(requireRoot);
  const latestImportLiteEvidence =
    await findLatestImportLiteEvidence(evidenceRoot);
  const openQuestions = [...(options.assumptions ?? [])];

  if (latestRequireIndex) {
    const reqText = await readSafe(latestRequireIndex);
    const reqCount = countReqIds(reqText);
    await writeFile(
      summaryPath,
      `${buildPreflightSummary({
        source: "require-index",
        selectedInputPath: latestRequireIndex,
        importedReqCount: reqCount,
        openQuestions,
      })}\n`,
      "utf-8",
    );
    return {
      source: "require-index",
      selectedInputPath: latestRequireIndex,
      importedReqCount: reqCount,
      openQuestions,
      preflightSummaryPath: summaryPath,
    };
  }

  if (latestImportLiteEvidence) {
    await writeFile(
      summaryPath,
      `${buildPreflightSummary({
        source: "import-lite-evidence",
        selectedInputPath: latestImportLiteEvidence,
        importedReqCount: null,
        openQuestions,
      })}\n`,
      "utf-8",
    );
    return {
      source: "import-lite-evidence",
      selectedInputPath: latestImportLiteEvidence,
      importedReqCount: null,
      openQuestions,
      preflightSummaryPath: summaryPath,
    };
  }

  const minimumInput = normalizeMinimumInput(options.minimumInput);
  if (minimumInput.urls.length === 0 && minimumInput.paths.length === 0) {
    openQuestions.push(
      "Minimum preflight input is missing (provide URL, local path, or pasted excerpt).",
    );
  }

  const timestamp = formatTokyoTimestamp(options.now ?? new Date());
  const importLiteEvidencePath = path.join(
    evidenceRoot,
    `import-lite-${timestamp}.md`,
  );
  await writeFile(
    importLiteEvidencePath,
    `${buildImportLiteEvidence({
      timestamp,
      minimumInput,
      assumptions: openQuestions,
    })}\n`,
    "utf-8",
  );
  await writeFile(
    summaryPath,
    `${buildPreflightSummary({
      source: "import-lite-bootstrap",
      selectedInputPath: importLiteEvidencePath,
      importedReqCount: null,
      openQuestions,
    })}\n`,
    "utf-8",
  );

  return {
    source: "import-lite-bootstrap",
    selectedInputPath: importLiteEvidencePath,
    importedReqCount: null,
    openQuestions,
    preflightSummaryPath: summaryPath,
    importLiteEvidencePath,
  };
}

async function findLatestRequireIndex(
  requireRoot: string,
): Promise<string | null> {
  const files = await collectFiles(requireRoot, {
    extensions: [".md"],
  });
  const targets = files.filter(
    (filePath) =>
      path.basename(filePath).toLowerCase() === "02_requirement-index.md",
  );
  if (targets.length === 0) {
    return null;
  }
  const sorted = targets.sort((left, right) =>
    compareDesc(
      extractTimestampFromRequirePath(left),
      extractTimestampFromRequirePath(right),
      left,
      right,
    ),
  );
  return sorted[0] ?? null;
}

async function findLatestImportLiteEvidence(
  evidenceRoot: string,
): Promise<string | null> {
  let files: string[] = [];
  try {
    const entries = await readdir(evidenceRoot, { withFileTypes: true });
    files = entries
      .filter((entry) => entry.isFile() && IMPORT_LITE_FILE_RE.test(entry.name))
      .map((entry) => path.join(evidenceRoot, entry.name));
  } catch {
    return null;
  }
  if (files.length === 0) {
    return null;
  }
  files.sort((left, right) => {
    const leftMatch = IMPORT_LITE_FILE_RE.exec(path.basename(left));
    const rightMatch = IMPORT_LITE_FILE_RE.exec(path.basename(right));
    const leftStamp = leftMatch?.[1] ?? "";
    const rightStamp = rightMatch?.[1] ?? "";
    return compareDesc(leftStamp, rightStamp, left, right);
  });
  return files[0] ?? null;
}

function extractTimestampFromRequirePath(filePath: string): string {
  const normalized = filePath.split(path.sep).join("/");
  const match = REQUIRE_TIMESTAMP_RE.exec(normalized);
  return match?.[1] ?? "";
}

function compareDesc(
  leftStamp: string,
  rightStamp: string,
  leftPath: string,
  rightPath: string,
): number {
  if (leftStamp !== rightStamp) {
    return rightStamp.localeCompare(leftStamp);
  }
  return rightPath.localeCompare(leftPath);
}

function normalizeMinimumInput(
  value: ImportLiteMinimumInput | undefined,
): Required<ImportLiteMinimumInput> {
  return {
    urls: normalizeTextList(value?.urls),
    paths: normalizeTextList(value?.paths),
    excerpt: (value?.excerpt ?? "").trim(),
  };
}

function normalizeTextList(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function countReqIds(text: string): number {
  const matcher = new RegExp(REQ_ID_RE.source, REQ_ID_RE.flags);
  return Array.from(text.matchAll(matcher)).length;
}

function buildImportLiteEvidence(input: {
  timestamp: string;
  minimumInput: Required<ImportLiteMinimumInput>;
  assumptions: string[];
}): string {
  const urls = input.minimumInput.urls.map((url) => `- ${url}`);
  const paths = input.minimumInput.paths.map((filePath) => `- ${filePath}`);
  const assumptions =
    input.assumptions.length > 0
      ? input.assumptions.map((item) => `- ${item}`)
      : ["- none"];

  return [
    `# Evidence: import-lite (${input.timestamp})`,
    "",
    "## Metadata",
    "",
    `- ts: ${input.timestamp}`,
    "- author: AI",
    "- entrypoint: import-lite",
    "",
    "## Sources",
    "",
    "- URLs:",
    ...ensureNonEmptyList(urls),
    "- Local paths:",
    ...ensureNonEmptyList(paths),
    "",
    "## User provided excerpt",
    "",
    "```text",
    input.minimumInput.excerpt.length > 0
      ? input.minimumInput.excerpt
      : "<none provided>",
    "```",
    "",
    "## Assumptions",
    "",
    ...assumptions,
  ].join("\n");
}

function buildPreflightSummary(input: {
  source: SddPreflightSource;
  selectedInputPath: string;
  importedReqCount: number | null;
  openQuestions: string[];
}): string {
  const selectedSource = resolveSourceLabel(input.source);
  const selectionReason = resolveSelectionReason(input.source);
  const reqCount =
    input.importedReqCount === null ? "unknown" : `${input.importedReqCount}`;
  const openQuestions =
    input.openQuestions.length > 0
      ? input.openQuestions.map((item) => `- ${item}`)
      : ["- none"];

  return [
    "# Preflight Summary",
    "",
    "## Input source selected",
    "",
    `- Selected source: ${selectedSource}`,
    `- Input file: ${input.selectedInputPath}`,
    `- Selection reason: ${selectionReason}`,
    "",
    "## Requirement intake",
    "",
    `- Imported REQ count: ${reqCount}`,
    `- Source references captured: ${input.source === "require-index" ? "yes" : "unknown"}`,
    "",
    "## Open Questions (OQ)",
    "",
    ...openQuestions,
    "",
    "## Next generation scope",
    "",
    "- Shared scope plan (`_shared`): align objective/initiative/capabilities/business flow.",
    "- Spec scope plan (`spec-XXXX`): generate user stories -> AC -> BR -> examples -> test-cases.",
    "",
    "## Notes",
    "",
    "- This report is preflight output and is review-exempt.",
  ].join("\n");
}

function resolveSourceLabel(source: SddPreflightSource): string {
  if (source === "require-index") {
    return "require-index";
  }
  return "import-lite-evidence";
}

function resolveSelectionReason(source: SddPreflightSource): string {
  if (source === "require-index") {
    return "latest requirement index detected.";
  }
  if (source === "import-lite-evidence") {
    return "require index missing; latest import-lite evidence detected.";
  }
  return "require index/evidence missing; import-lite evidence was bootstrapped from minimum input.";
}

function ensureNonEmptyList(lines: string[]): string[] {
  if (lines.length === 0) {
    return ["- none"];
  }
  return lines;
}

function formatTokyoTimestamp(now: Date): string {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const tokyo = new Date(utcMs + 9 * 60 * 60_000);
  const yyyy = `${tokyo.getFullYear()}`;
  const mm = `${tokyo.getMonth() + 1}`.padStart(2, "0");
  const dd = `${tokyo.getDate()}`.padStart(2, "0");
  const hh = `${tokyo.getHours()}`.padStart(2, "0");
  const min = `${tokyo.getMinutes()}`.padStart(2, "0");
  const ss = `${tokyo.getSeconds()}`.padStart(2, "0");
  const ms = `${tokyo.getMilliseconds()}`.padStart(3, "0");
  return `${yyyy}${mm}${dd}${hh}${min}${ss}${ms}`;
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
