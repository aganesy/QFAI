import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

interface SurfaceHit {
  file: string;
  line: number;
  match: string;
  className: string;
}

/** Shared boundary oracle for the three independently implemented guards. */
export const STORY_ID_BOUNDARIES: ReadonlyArray<[string, string]> = [
  ["DEC-0009", "DEC-0010"],
  ["OQ-0009", "OQ-0010"],
  ["BF-0009", "BF-0010"],
  ["US-0009-0009", "US-0009-0010"],
  ["AC-0009-0009-09", "AC-0009-0009-10"],
  ["EX-0009-0009-09", "EX-0009-0010-09"],
  ["BR-0009", "BR-0010"],
  ["DEC-0001", "DEC-0000"],
  ["US-0001-0001", "US-0010-0001"],
  ["AC-0001-0001-01", "AC-0010-0001-01"],
  ["AC-0001-0001-01", "AC-0001-0010-01"],
  ["AC-0001-0001-01", "AC-0001-0001-00"],
  ["EX-0001-0001-01", "EX-0010-0001-01"],
  ["EX-0001-0001-01", "EX-0001-0001-00"],
];

export const STORY_ID_TRAILING_HYPHEN_BOUNDARIES: ReadonlyArray<[string, string]> = [
  ["DEC-0009-", "DEC-0010-"],
  ["OQ-0009-", "OQ-0010-"],
  ["BF-0009-", "BF-0010-"],
  ["BR-0009-", "BR-0010-"],
];

const PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // Ten and above is a numeric property. Preserve the case-insensitive
  // spelling that the post-build guard applies to paths and content.
  { name: "internal spec id (spec-0010+)", re: /spec-0*[1-9][0-9]+/gi },
  { name: "internal version marker", re: /\bv[0-9]+\.[0-9]+(?:\.[0-9]+)?\b|\bv1\.x\b/g },
  {
    name: "internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)",
    re: /\bCAP-0*[1-9][0-9]+\b|\bDEC-[0-9]{4}-[0-9]{4}\b|\bDR-[0-9]{4}\b|\bQFAI-PROT2-[0-9]+\b|\bOQ-[0-9]{4}-[0-9]{4}\b|\bCHG-[0-9]+\b/g,
  },
  {
    name: "internal story id",
    re: /\b(?:DEC|OQ|BF|BR)-(?:0000|00[1-9][0-9]|0[1-9][0-9]{2}|[1-9][0-9]{3})\b(?!-[0-9])|\bUS-(?:(?:0000|00[1-9][0-9]|0[1-9][0-9]{2}|[1-9][0-9]{3})-[0-9]{4}|[0-9]{4}-(?:0000|00[1-9][0-9]|0[1-9][0-9]{2}|[1-9][0-9]{3}))\b|\b(?:AC|EX)-(?:(?:0000|00[1-9][0-9]|0[1-9][0-9]{2}|[1-9][0-9]{3})-[0-9]{4}-[0-9]{2}|[0-9]{4}-(?:0000|00[1-9][0-9]|0[1-9][0-9]{2}|[1-9][0-9]{3})-[0-9]{2}|[0-9]{4}-[0-9]{4}-(?:00|[1-9][0-9]))\b/g,
  },
  { name: "schemaVersion field", re: /"schemaVersion"|schemaVersion\s*:/g },
];

// The shell guard scans every packed byte. The smoke scan reads known text
// formats and extensionless init files; names of every entry are scanned.
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".yaml",
  ".yml",
  ".json",
  ".toml",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".sh",
  ".ps1",
  ".html",
  ".css",
  ".txt",
]);
const TEXT_BASENAMES = new Set([".gitkeep", ".gitignore", ".gitattributes"]);
// Only the sanctioned migration memo basename loses its version stamp in
// the name pass. Its body and all other path segments still receive scanning.
const MIGRATION_MEMO_STAMP_RE =
  /(^|[/\\])\.qfai[/\\]assistant[/\\]process[/\\]migrations[/\\]v[0-9]+\.[0-9]+\.[0-9]+(-[^/\\]*)?\.md$/;

function isScannableTextFile(file: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(file)) || TEXT_BASENAMES.has(path.basename(file));
}

function stripSanctionedMemoStamp(relativePath: string): string {
  return relativePath.replace(MIGRATION_MEMO_STAMP_RE, (_full, lead: string, tail?: string) =>
    [lead, ".qfai/assistant/process/migrations/MEMO", tail ?? "", ".md"].join(""),
  );
}

function scanPathName(relativePath: string): SurfaceHit[] {
  const found: SurfaceHit[] = [];
  for (const { name, re } of PATTERNS) {
    if (name === "schemaVersion field") continue;
    const subject =
      name === "internal version marker" ? stripSanctionedMemoStamp(relativePath) : relativePath;
    re.lastIndex = 0;
    const match = re.exec(subject);
    if (match) {
      found.push({ file: relativePath, line: 0, match: match[0], className: name });
    }
  }
  return found;
}

interface SurfaceScan {
  hits: SurfaceHit[];
  nameHits: SurfaceHit[];
  visitedRelative: string[];
  scannedRelative: string[];
}

// Directory and symlink names are yielded too. Recurse only into real
// directories so a symlink cannot create a cycle.
async function* walk(dir: string): AsyncGenerator<{ full: string; isFile: boolean }> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    yield { full, isFile: entry.isFile() };
    if (entry.isDirectory()) yield* walk(full);
  }
}

export async function scanDistributedSurface(root: string): Promise<SurfaceScan> {
  const result: SurfaceScan = {
    hits: [],
    nameHits: [],
    visitedRelative: [],
    scannedRelative: [],
  };
  for await (const { full, isFile } of walk(root)) {
    const relative = path.relative(root, full);
    result.visitedRelative.push(relative);
    result.nameHits.push(...scanPathName(relative));
    if (!isFile || !isScannableTextFile(full)) continue;
    result.scannedRelative.push(relative);
    const stats = await stat(full);
    if (stats.size > 1_000_000) continue;
    const content = await readFile(full, "utf-8");
    const lines = content.split("\n");
    const isPackageJson = path.basename(full) === "package.json";
    for (const { name, re } of PATTERNS) {
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        if (isPackageJson && name === "internal version marker" && /"version"\s*:/.test(line)) {
          continue;
        }
        if (isPackageJson && name === "schemaVersion field") continue;
        re.lastIndex = 0;
        const match = re.exec(line);
        if (match) {
          result.hits.push({
            file: relative,
            line: index + 1,
            match: match[0],
            className: name,
          });
        }
      }
    }
  }
  return result;
}
