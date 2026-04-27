/**
 * Package self-containment lint (v1.8.4 Phase 8).
 *
 * Detects shipped templates that reference user-side specific spec / AC /
 * TC / REQ / etc. IDs. Such references break when QFAI is installed into a
 * user repo whose specs / contracts have different IDs.
 *
 * RR root cause class: install-site assumption — the package was previously
 * shipping `.qfai/assistant/skills/.../SKILL.md` with `.qfai/specs/spec-0012/`
 * hardcoded, which silently broke for any user repo not using spec-0012.
 *
 * Exposed two ways:
 *   1. Programmatic — `runLintShipping(pkgRoot)` returns violations.
 *      Used by tests/scripts/lintShipping.test.ts to enforce in CI.
 *   2. CLI — `npx tsx scripts/lint-shipping.ts` for local debugging.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type LintViolation = {
  file: string;
  line: number;
  pattern: string;
  matched: string;
  suggestion: string;
};

type Target = "init-runtime" | "init-doc" | "src";

type PatternRule = {
  name: string;
  re: RegExp;
  suggestion: string;
  /**
   * Which target categories this rule applies to:
   *   - "init-runtime": yaml/yml/json/ts under assets/init/. These ship as
   *     RUNTIME data (parsed by tools / written to disk); a hardcoded ID
   *     here is a real install-site assumption.
   *   - "init-doc": md under assets/init/. These ship as DOCUMENTATION;
   *     a spec-NNNN reference is typically QFAI-internal authority
   *     citation (informational), not install-site assumption.
   *   - "src": ts under src/, compiled to dist/ without comments. Only
   *     real path-form assumptions are flagged here; informational
   *     metadata in error messages is allowed.
   */
  appliesTo: ReadonlyArray<Target>;
};

const PATTERNS: ReadonlyArray<PatternRule> = [
  {
    name: "spec-id-literal",
    re: /\bspec-\d{4}\b/,
    suggestion:
      "Resolve the spec at runtime via `qfai prototyping show-spec` or `resolvePrimaryPrototypingSpec`; do not hardcode spec IDs in runtime data.",
    // Bare spec-NNNN references in markdown docs are typically narrative
    // citations (e.g. "this rule comes from spec-0012") — they are NOT
    // install-site path lookups. Only flag in runtime data + src
    // (still skipped by classifyTarget for src below).
    appliesTo: ["init-runtime"],
  },
  {
    name: "spec-path-literal",
    re: /\.qfai\/specs\/spec-\d{4}\//,
    suggestion:
      "Use a placeholder like `.qfai/specs/<resolved-id>/` and reference via `qfai prototyping show-spec`.",
    // Path-form is ALWAYS a real install-site assumption (the path is
    // expected to resolve on the user's filesystem). Flag everywhere
    // except markdown docs (which use them as illustration only).
    appliesTo: ["init-runtime", "src"],
  },
  {
    name: "composite-id-literal",
    re: /\b(?:AC|TC|REQ|US|BR|EX|SC|DEC)-\d{4}-\d{4}\b/,
    suggestion:
      "Move composite ID references to spec content; shipped runtime data must be ID-agnostic.",
    // Same rationale as spec-id-literal: docs use these as references,
    // not assumptions. Only flag in runtime data.
    appliesTo: ["init-runtime"],
  },
];

const PRAGMA_RE = /qfai-shipping:allow\s+reason="([^"]+)"/;

const TARGET_GLOBS: ReadonlyArray<{ rootRel: string; matchExtensions: ReadonlyArray<string> }> = [
  // Files that ship verbatim into the user repo via `qfai init`.
  { rootRel: "assets/init", matchExtensions: [".md", ".yaml", ".yml", ".json", ".ts"] },
  // Production source. Compiled to dist/ without comments, so JSDoc
  // traceability lines are excluded by content rule below.
  { rootRel: "src", matchExtensions: [".ts"] },
];

/**
 * Directories / files excluded entirely from the scan:
 * - The seed spec template (placeholder name, ships verbatim).
 * - Tests and any *.test.ts file.
 * - Init-asset README files that document the spec ID convention itself.
 */
const EXCLUDED_PATH_PATTERNS: ReadonlyArray<RegExp> = [
  /[\\/]assets[\\/]init[\\/]\.qfai[\\/]specs[\\/]spec-[0-9A-Z]+([\\/]|$)/i,
  /[\\/](?:tests|__tests__)[\\/]/,
  /\.test\.ts$/,
];

/**
 * Lines whose trimmed start indicates a TS comment (single-line `//`,
 * block-open `/*` / `/**`, JSDoc body `*`, block-close `* /`). These are
 * stripped from `dist/` by tsup, so traceability markers in JSDoc do not
 * ship to user repos.
 */
const TS_COMMENT_LINE_RE = /^\s*(?:\/\/|\/\*\*?|\*\/|\*)/;

/**
 * Lines whose trimmed start indicates a YAML comment (`# ...`). YAML
 * comments are NOT runtime data — they're authority citation /
 * documentation embedded in a config file. The user's YAML parser
 * discards them.
 */
const YAML_COMMENT_LINE_RE = /^\s*#/;

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  await walk(root, out);
  return out;
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    if (EXCLUDED_PATH_PATTERNS.some((re) => re.test(full))) continue;
    let s: Awaited<ReturnType<typeof stat>>;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      await walk(full, out);
    } else if (s.isFile()) {
      out.push(full);
    }
  }
}

function isTargetFile(absolutePath: string, pkgRoot: string): boolean {
  for (const target of TARGET_GLOBS) {
    const targetRoot = path.join(pkgRoot, target.rootRel);
    if (absolutePath === targetRoot || absolutePath.startsWith(targetRoot + path.sep)) {
      const ext = path.extname(absolutePath);
      if (target.matchExtensions.includes(ext)) return true;
    }
  }
  return false;
}

function classifyTarget(absolutePath: string, pkgRoot: string): Target | null {
  const initRoot = path.join(pkgRoot, "assets", "init");
  const srcRoot = path.join(pkgRoot, "src");
  const ext = path.extname(absolutePath).toLowerCase();
  if (absolutePath === initRoot || absolutePath.startsWith(initRoot + path.sep)) {
    // Markdown under init/ is documentation; everything else is runtime data.
    return ext === ".md" ? "init-doc" : "init-runtime";
  }
  if (absolutePath === srcRoot || absolutePath.startsWith(srcRoot + path.sep)) {
    return "src";
  }
  return null;
}

async function lintFile(absolutePath: string, pkgRoot: string): Promise<LintViolation[]> {
  const violations: LintViolation[] = [];
  const targetCategory = classifyTarget(absolutePath, pkgRoot);
  if (targetCategory === null) return violations;

  let body: string;
  try {
    body = await readFile(absolutePath, "utf-8");
  } catch {
    return violations;
  }
  const isTs = absolutePath.endsWith(".ts");
  const lines = body.split(/\r?\n/);
  const relPath = path.relative(pkgRoot, absolutePath).replace(/\\/g, "/");
  const applicableRules = PATTERNS.filter((rule) => rule.appliesTo.includes(targetCategory));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    // Pragma escape: this line and the line immediately after are exempt.
    if (PRAGMA_RE.test(line)) continue;
    if (i > 0 && PRAGMA_RE.test(lines[i - 1] ?? "")) continue;
    // TS source files: comment lines are stripped from dist/ at build time
    // and therefore do not ship to user repos.
    if (isTs && TS_COMMENT_LINE_RE.test(line)) continue;
    // YAML files: comment lines are not runtime data; the parser ignores
    // them. References inside `# ...` are authority citation, not
    // install-site assumptions.
    const isYaml = absolutePath.endsWith(".yaml") || absolutePath.endsWith(".yml");
    if (isYaml && YAML_COMMENT_LINE_RE.test(line)) continue;

    for (const rule of applicableRules) {
      // Find all matches per line — a single line may contain multiple IDs
      // (e.g. "Implements TC-0012-0290 and AC-0012-0175.").
      const globalRe = new RegExp(rule.re.source, "g");
      let match: RegExpExecArray | null;
      while ((match = globalRe.exec(line)) !== null) {
        violations.push({
          file: relPath,
          line: i + 1,
          pattern: rule.name,
          matched: match[0],
          suggestion: rule.suggestion,
        });
      }
    }
  }
  return violations;
}

export async function runLintShipping(
  pkgRoot: string,
): Promise<{ violations: LintViolation[]; scannedFileCount: number }> {
  const allFiles: string[] = [];
  for (const target of TARGET_GLOBS) {
    const absolute = path.join(pkgRoot, target.rootRel);
    allFiles.push(...(await listFiles(absolute)));
  }
  const targetFiles = allFiles.filter((f) => isTargetFile(f, pkgRoot));

  const violations: LintViolation[] = [];
  for (const file of targetFiles) {
    violations.push(...(await lintFile(file, pkgRoot)));
  }

  return { violations, scannedFileCount: targetFiles.length };
}

export function formatViolations(violations: ReadonlyArray<LintViolation>): string {
  const lines: string[] = [];
  for (const v of violations) {
    lines.push(`  ${v.file}:${v.line}  [${v.pattern}]  '${v.matched}'`);
    lines.push(`    fix: ${v.suggestion}`);
  }
  return lines.join("\n");
}

// ─── CLI entry point ───────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __isCli = process.argv[1] === __filename;

if (__isCli) {
  const pkgRoot = path.resolve(path.dirname(__filename), "..");
  runLintShipping(pkgRoot)
    .then(({ violations, scannedFileCount }) => {
      if (violations.length === 0) {
        process.stdout.write(
          `lint-shipping: clean (no spec/AC/TC/REQ literals in shipped templates) — ${scannedFileCount} files scanned\n`,
        );
        process.exit(0);
      }
      process.stderr.write(`lint-shipping: ${violations.length} violation(s) detected\n\n`);
      process.stderr.write(`${formatViolations(violations)}\n\n`);
      process.stderr.write(
        "If you intentionally need to reference an ID, add an inline pragma above the line:\n" +
          '  Markdown: <!-- qfai-shipping:allow reason="<concrete reason>" -->\n' +
          '  YAML:     # qfai-shipping:allow reason="<concrete reason>"\n' +
          '  TS:       // qfai-shipping:allow reason="<concrete reason>"\n',
      );
      process.exit(2);
    })
    .catch((err: unknown) => {
      process.stderr.write(`lint-shipping: unexpected error: ${String(err)}\n`);
      process.exit(2);
    });
}
