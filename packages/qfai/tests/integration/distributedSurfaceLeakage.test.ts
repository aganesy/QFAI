/**
 * Integration: distributed surface leakage smoke.
 *
 * Runs `qfai init` into a temp dir and asserts that the resulting
 * filesystem contains zero QFAI-internal spec IDs, internal version
 * markers, internal trace IDs, or schemaVersion fields.
 *
 * Complements scripts/check-no-internal-version-leakage.sh by checking
 * the *output* of init (post-template-copy), not just the source assets.
 *
 * SSOT note (PR #206 review LtfD / Nv4N): the `PATTERNS` array below is
 * one of THREE semantically-equivalent expressions of the same forbidden
 * class set:
 *   1. `packages/qfai/scripts/lint-shipping.ts` `src-comment` rules
 *      (JS RegExp, pre-build, `src/*.ts` JSDoc scan).
 *   2. `packages/qfai/scripts/check-no-internal-version-leakage.sh`
 *      L21..L45 (POSIX ERE, post-build `dist/` scan).
 *   3. This file (JS RegExp, smoke against `qfai init` output).
 *
 * Updating one (e.g. tightening `INTERNAL_VERSION_RE` to a QFAI-context
 * pattern) requires updating ALL THREE in the same PR — Rule of Three
 * has been hit and a single source module is now a reasonable next
 * step, deferred from this PR. See `.agents/rules/distributed-surface.md`
 * "Defenses (4 layers)" for the layered defense overview.
 *
 * The patterns are applied in two dimensions: to file CONTENT and to
 * file NAMES (`scanPathName` below), because `qfai init` copies a path
 * component into the consuming project just as literally as a line.
 * Site 2 carries the same two dimensions.
 */
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-leakage-"));
  tempDirs.push(dir);
  return dir;
}

const PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // "10 and above" as a value, not as a list of digit shapes: any leading
  // zeros, then a non-zero digit and at least one more. Enumerating shapes is
  // what let `spec-9999` and `spec-00100` through different layers of the same
  // SSOT-synced set.
  { name: "internal spec id (spec-0010+)", re: /spec-0*[1-9][0-9]+/gi },
  { name: "internal version marker", re: /\bv[0-9]+\.[0-9]+(?:\.[0-9]+)?\b|\bv1\.x\b/g },
  {
    name: "internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)",
    re: /\bCAP-0(0[1-9][0-9]|[1-9][0-9]{2,})\b|\bDEC-[0-9]{4}-[0-9]{4}\b|\bDR-[0-9]{4}\b|\bQFAI-PROT2-[0-9]+\b|\bOQ-[0-9]{4}-[0-9]{4}\b|\bCHG-[0-9]+\b/g,
  },
  { name: "schemaVersion field", re: /"schemaVersion"|schemaVersion\s*:/g },
];

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".yaml",
  ".yml",
  ".json",
  // The MCP server templates the `web-research` skill ships. A text format the
  // init payload carries but this walk does not open is a distributed surface
  // with no guard over it — the shell guard greps the tree with no extension
  // filter, so the two layers would disagree about what they cover.
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

/**
 * Extensionless text files `qfai init` seeds. `path.extname(".gitkeep")` is
 * `""`, so an extension allowlist alone never reads them — the `.gitkeep`
 * bodies seeded for every assistant layer carry prose and are as much a
 * distributed surface as the `.md` files beside them.
 */
const TEXT_BASENAMES = new Set([".gitkeep", ".gitignore", ".gitattributes"]);

function isScannableTextFile(file: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(file)) || TEXT_BASENAMES.has(path.basename(file));
}

/** One entry of the init output. `isFile` gates the content scan; every
 *  entry's *name* is scanned regardless of what kind it is. */
interface WalkEntry {
  full: string;
  isFile: boolean;
}

/**
 * Every entry `qfai init` writes, not only the regular files.
 *
 * Yielding files alone left two kinds of name unscanned. `init` creates the
 * skill and agent wrappers as **symlinks** (`syncIntegrationWrappers`), which
 * are neither `isFile()` nor `isDirectory()` to `readdir`, so a marker in one
 * of those names reached no matcher at all — and they are copied into the
 * consuming project exactly as named. An **empty** directory was invisible for
 * the same reason: a directory only ever reached the name pass through the
 * relative path of a file inside it.
 *
 * Recursion still follows `isDirectory()` only, which `withFileTypes` reports
 * from `lstat` — so a symlinked directory is scanned by name and not walked
 * through, and the walk cannot cycle.
 */
async function* walk(dir: string): AsyncGenerator<WalkEntry> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    yield { full, isFile: entry.isFile() };
    if (entry.isDirectory()) {
      yield* walk(full);
    }
  }
}

interface Hit {
  file: string;
  line: number;
  match: string;
  className: string;
}

/**
 * Name-pass exemption, mirroring `MIGRATION_MEMO_STAMP_SED` in
 * `scripts/check-no-internal-version-leakage.sh`: migration memo file
 * names are version-stamped on purpose (ADR-style citation targets, and
 * `migrationMemoRelativePath()` mints one per `--upgrade-assistant-tree`
 * run). Version class only — spec ids and trace ids in a migration path
 * are still a leak — and names only; memo contents keep the full scan.
 *
 * The exemption rewrites the *sanctioned name* instead of skipping every
 * path that mentions the memo directory: skipping the whole path would
 * also excuse `.../migrations/notes-v2.0-draft.md`,
 * `.../migrations/drafts-v2.0/clean.md`, and same-named directories in
 * an unrelated tree. Only the exact documented shape
 * `.qfai/assistant/process/migrations/v<MAJOR>.<MINOR>.<PATCH>[-*].md`,
 * directly in that directory, loses its stamp.
 */
const MIGRATION_MEMO_STAMP_RE =
  /(^|[/\\])\.qfai[/\\]assistant[/\\]process[/\\]migrations[/\\]v[0-9]+\.[0-9]+\.[0-9]+(-[^/\\]*)?\.md$/;

function stripSanctionedMemoStamp(relativePath: string): string {
  return relativePath.replace(MIGRATION_MEMO_STAMP_RE, (_full, lead: string, tail?: string) =>
    [lead, ".qfai/assistant/process/migrations/MEMO", tail ?? "", ".md"].join(""),
  );
}

/**
 * Scan a relative path for forbidden tokens carried by the *name*.
 * `PATTERNS` above matches line content; a marker encoded in a path
 * component (`v1.4.27-atdd-alignment.md`, `spec-0042-notes.md`, a
 * `DR-0007/` directory) never reaches a content matcher, yet init copies
 * the name verbatim into the consuming project.
 */
function scanPathName(relativePath: string): Hit[] {
  const found: Hit[] = [];
  for (const { name, re } of PATTERNS) {
    if (name === "schemaVersion field") continue;
    const subject =
      name === "internal version marker" ? stripSanctionedMemoStamp(relativePath) : relativePath;
    re.lastIndex = 0;
    const m = re.exec(subject);
    if (m) {
      found.push({ file: relativePath, line: 0, match: m[0], className: name });
    }
  }
  return found;
}

describe("distributed surface leakage smoke", { timeout: 90000 }, () => {
  it("qfai init output contains no internal IDs or version markers", async () => {
    const tmpDir = await newTempDir();
    await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

    const hits: Hit[] = [];
    const nameHits: Hit[] = [];
    const visitedRelative: string[] = [];
    const scannedRelative: string[] = [];
    for await (const { full: file, isFile } of walk(tmpDir)) {
      const relative = path.relative(tmpDir, file);
      visitedRelative.push(relative);
      nameHits.push(...scanPathName(relative));
      // Name scanned above for every entry; only a regular file has content —
      // and `isScannableTextFile` decides which of those bodies are text,
      // extensionless `.gitkeep` / `.gitignore` / `.gitattributes` included.
      if (!isFile) continue;
      if (!isScannableTextFile(file)) continue;
      scannedRelative.push(relative);
      const stats = await stat(file);
      if (stats.size > 1_000_000) continue;
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n");
      const isPackageJson = path.basename(file) === "package.json";
      for (const { name, re } of PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? "";
          if (isPackageJson && name === "internal version marker" && /"version"\s*:/.test(line)) {
            continue;
          }
          if (isPackageJson && name === "schemaVersion field") {
            continue;
          }
          re.lastIndex = 0;
          const m = re.exec(line);
          if (m) {
            hits.push({
              file: path.relative(tmpDir, file),
              line: i + 1,
              match: m[0],
              className: name,
            });
          }
        }
      }
    }

    if (hits.length > 0) {
      const report = hits
        .slice(0, 30)
        .map((h) => `  [${h.className}] ${h.file}:${h.line} -> ${h.match}`)
        .join("\n");
      throw new Error(
        `Distributed surface leakage detected in qfai init output (${hits.length} hits):\n${report}\n\n` +
          "Fix: remove the internal identifier from the originating asset under packages/qfai/assets/init/.",
      );
    }
    expect(hits).toEqual([]);

    if (nameHits.length > 0) {
      const report = nameHits
        .slice(0, 30)
        .map((h) => `  [${h.className}] ${h.file}`)
        .join("\n");
      throw new Error(
        `Distributed surface leakage detected in qfai init FILE NAMES (${nameHits.length} hits):\n${report}\n\n` +
          "Fix: rename the originating asset under packages/qfai/assets/init/ so the identifier is not part of its path.",
      );
    }
    expect(nameHits).toEqual([]);

    // TC-1.5.1: DESIGN.md must be in the walked file list (guard against
    // accidental rename / exclusion of the root brand SSOT).
    expect(visitedRelative).toContain("DESIGN.md");

    // The walk must actually reach the symlinked wrappers, or the name pass
    // above proves nothing about the names `syncIntegrationWrappers` mints.
    // Directories have to be in the list too: an empty one is otherwise
    // reachable by no path at all.
    const walked = new Set(visitedRelative.map((entry) => entry.split(path.sep).join("/")));
    expect(walked).toContain(".qfai/assistant/skills");
    const symlinked = [...walked].filter((entry) =>
      /^\.(claude|codex|github|agents)\/skills\//.test(entry),
    );
    expect(
      symlinked.length,
      "the walk must reach the skill wrappers init creates as symlinks",
    ).toBeGreaterThan(0);

    // The MCP server templates the `web-research` skill ships are TOML — a text
    // format the init payload did not carry until they moved into it, and one
    // this pass would have walked past unread. A shipped text file the content
    // scan skips is a distributed surface with no guard over it, and the shell
    // guard greps the tree with no extension filter at all, so the two layers
    // would have disagreed about what they cover with nothing saying so.
    //
    // Pinned on the SCANNED list rather than the walked one: walking a file
    // proves nothing about whether its bytes were read, which is the whole
    // distinction `isScannableTextFile` draws.
    expect(
      scannedRelative.filter((rel) => rel.endsWith(".toml")),
      "the init payload ships .toml, so the content scan has to open it",
    ).not.toEqual([]);
  });

  // The walk above only proves that today's tree happens to be clean —
  // which is exactly the state a content-only scan also reported. Pin the
  // name matcher itself on synthetic paths so the dimension stays alive.
  it("name pass flags path-borne tokens and honours the migration-memo exemption", () => {
    const classNames = (relative: string): string[] =>
      scanPathName(relative).map((h) => h.className);

    expect(classNames(path.join(".qfai", "assistant", "notes-v2.0-draft.md"))).toEqual([
      "internal version marker",
    ]);
    expect(classNames(path.join(".qfai", "specs", "spec-0042-notes.md"))).toEqual([
      "internal spec id (spec-0010+)",
    ]);
    expect(classNames(path.join(".qfai", "DR-0007", "notes.md"))).toEqual([
      "internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)",
    ]);

    const memoDir = path.join(".qfai", "assistant", "process", "migrations");
    expect(classNames(path.join(memoDir, "v1.4.27-atdd-alignment.md"))).toEqual([]);
    // The exemption is scoped to the version class only.
    expect(classNames(path.join(memoDir, "spec-0042-recut.md"))).toEqual([
      "internal spec id (spec-0010+)",
    ]);
    // ...and to the sanctioned name shape only: a file that merely sits in
    // the memo directory, a nested directory, or the same fragment in
    // another tree all keep the version scan.
    expect(classNames(path.join(memoDir, "notes-v2.0-draft.md"))).toEqual([
      "internal version marker",
    ]);
    expect(classNames(path.join(memoDir, "drafts-v2.0", "clean.md"))).toEqual([
      "internal version marker",
    ]);
    expect(
      classNames(path.join("docs", "assistant", "process", "migrations", "v2.0.0-notes.md")),
    ).toEqual(["internal version marker"]);
    expect(classNames(path.join(".qfai", "assistant", "steering", "test-layers.md"))).toEqual([]);
  });

  // TC-1.5.2: standalone DESIGN.md template scan against all 4 PATTERNS.
  it("DESIGN.md template alone has zero matches across all 4 forbidden patterns", async () => {
    const designMdPath = path.join(getInitAssetsDir(), "root", "DESIGN.md");
    const content = await readFile(designMdPath, "utf-8");
    const lines = content.split("\n");
    const hits: Array<{ pattern: string; line: number; match: string }> = [];
    for (const { name, re } of PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) {
          hits.push({ pattern: name, line: i + 1, match: m[0] });
        }
      }
    }
    if (hits.length > 0) {
      const report = hits
        .map((h) => `  [${h.pattern}] DESIGN.md:${h.line} -> ${h.match}`)
        .join("\n");
      throw new Error(
        `DESIGN.md template contains forbidden tokens (${hits.length} hits):\n${report}`,
      );
    }
    expect(hits).toEqual([]);
  });
});
