/**
 * Package self-containment lint.
 *
 * Detects shipped templates that hardcode internal spec / AC / TC / REQ
 * IDs. Such references break when QFAI is installed into a user repo
 * whose specs / contracts have different IDs.
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

type Target = "init-runtime" | "init-doc" | "src" | "src-comment";

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
   *   - "src-comment": JSDoc / `//` comment lines in src/*.ts. tsup
   *     STRIPS comments from `dist/*.js` but RETAINS them in
   *     `dist/*.d.ts`, so internal spec-IDs and version markers in
   *     JSDoc DO ship to user repos as part of the type declarations.
   *     This category mirrors the regex set in
   *     `scripts/check-no-internal-version-leakage.sh` so the same
   *     leakage classes (spec-0010+, internal `vN.M[.P]`, internal
   *     trace IDs) are caught at lint time on source instead of only
   *     after a build (PR #206 review Ntbp option B).
   */
  appliesTo: ReadonlyArray<Target>;
};

/** The rule's own flags, plus `g`. Never a bare `"g"` — see the call sites. */
function withGlobal(flags: string): string {
  return flags.includes("g") ? flags : `${flags}g`;
}

const PATTERNS: ReadonlyArray<PatternRule> = [
  {
    name: "spec-id-literal",
    re: /\bspec-\d{4}\b/,
    suggestion:
      "Resolve the spec at runtime via `qfai prototyping show-spec` or `resolvePrimaryPrototypingSpec`; do not hardcode spec IDs in runtime data.",
    // Bare spec-NNNN references in markdown docs are typically narrative
    // citations — they are NOT install-site path lookups. Only flag in
    // runtime data + src (still skipped by classifyTarget for src below).
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
  // PR #206 review Ntbp / NwM- / Nv2- / Nv_Q: catch internal-ID and
  // internal-version leakage in src JSDoc BEFORE it ships via
  // `dist/*.d.ts`. tsup strips comments from `.js` outputs but RETAINS
  // them in `.d.ts` declarations, so JSDoc is part of the distributed
  // surface even though it looks like an internal comment.
  //
  // SSOT-sync (Nv4N): the regex set below MUST stay in lock-step with
  // - `scripts/check-no-internal-version-leakage.sh` L21..L45 (POSIX
  //   ERE, post-build dist/ scan)
  // - `tests/integration/distributedSurfaceLeakage.test.ts:54` (JS
  //   RegExp, smoke against `qfai init` output)
  // The three sites carry the same forbidden classes. Updating one
  // (e.g. tightening `INTERNAL_VERSION_RE` to a QFAI-context regex)
  // requires updating all three. Cross-reference comments at the other
  // two sites point back here.
  //
  // Coverage limitation (Nv8u): `TS_COMMENT_LINE_RE` matches lines
  // whose first non-whitespace character is a comment marker. Trailing
  // `//` (e.g. `const x = 1; // spec-0042`) and inline block comments
  // (`const x = 1; /* spec-0042 */`) are NOT detected and would slip
  // through this lint. They are caught post-build by
  // `check-no-internal-version-leakage.sh`. Documented as a known
  // limitation rather than a tokenizer-grade fix; in practice JSDoc
  // is written in leading-comment-line blocks for declarations.
  {
    name: "internal-spec-id-jsdoc-leak",
    // No word boundaries: the post-build guard and the smoke test have none
    // either, and a trailing `\b` made `spec-9999suffix` invisible here while
    // both of them caught the `spec-9999` inside it — the same distributed
    // content passing one layer of an SSOT-synced set and failing another.
    re: /spec-0*[1-9][0-9]+/i,
    suggestion:
      "Internal spec IDs (spec-0010+) MUST NOT appear in src/ comments — tsup keeps JSDoc in dist/*.d.ts. Use a generic descriptor (e.g. 'the SDD skill business rules') and keep ID-level traceability in `.qfai/specs/` or test files.",
    appliesTo: ["src-comment"],
  },
  {
    // PR #206 review NzSK: scope mirrors `INTERNAL_SPEC_RE` — only
    // spec-0010+ paths are forbidden; spec-0001..0009 sample-tier
    // paths in src JSDoc are tolerated (matches the leakage script
    // and smoke test, which both implicitly cover paths via the
    // spec-id regex applied to file content).
    name: "internal-spec-path-jsdoc-leak",
    re: /\.qfai\/specs\/spec-0*[1-9][0-9]+\//i,
    suggestion:
      "Internal spec paths (spec-0010+) MUST NOT appear in src/ JSDoc — they ship via dist/*.d.ts. Reference test files (under tests/, not shipped) or use a generic descriptor.",
    appliesTo: ["src-comment"],
  },
  {
    name: "internal-version-marker-jsdoc-leak",
    re: /\bv[0-9]+\.[0-9]+(?:\.[0-9]+)?\b|\bv1\.x\b/,
    suggestion:
      "Internal version markers (vN.M / vN.M.P / v1.x) MUST NOT appear in src/ JSDoc — `INTERNAL_VERSION_RE` in the leakage script forbids them in dist/. If you need to cite a third-party library version, use a `qfai-shipping:allow reason=...` pragma on the preceding line.",
    appliesTo: ["src-comment"],
  },
  {
    name: "internal-cap-id-jsdoc-leak",
    re: /\bCAP-0(?:0[1-9][0-9]|[1-9][0-9]{2,})\b/,
    suggestion:
      "Internal capability IDs (CAP-0010+) MUST NOT appear in src/ JSDoc — tsup keeps JSDoc in dist/*.d.ts.",
    appliesTo: ["src-comment"],
  },
  {
    name: "internal-dec-id-jsdoc-leak",
    re: /\bDEC-\d{4}-\d{4}\b/,
    suggestion:
      "Internal decision IDs (DEC-NNNN-NNNN) MUST NOT appear in src/ JSDoc — tsup keeps JSDoc in dist/*.d.ts.",
    appliesTo: ["src-comment"],
  },
  {
    name: "internal-dr-id-jsdoc-leak",
    re: /\bDR-\d{4}\b/,
    suggestion:
      "Internal design-rationale IDs (DR-NNNN) MUST NOT appear in src/ JSDoc — tsup keeps JSDoc in dist/*.d.ts.",
    appliesTo: ["src-comment"],
  },
  {
    name: "internal-prot2-id-jsdoc-leak",
    re: /\bQFAI-PROT2-\d+\b/,
    suggestion:
      "The retired QFAI-PROT2-NNN trace prefix MUST NOT appear in src/ JSDoc — it is in the leakage script forbidden list.",
    appliesTo: ["src-comment"],
  },
  {
    // PR #208 11th late-review wave (codex r3265386185, LOW): catch
    // internal open-question IDs (OQ-NNNN-NNNN) at the same pre-build
    // layer that already catches DEC / DR / CAP / spec internal IDs.
    // OQ entries live in `.qfai/specs/spec-NNNN/08_Open-questions.md`
    // and are part of the authoring traceability surface — they must
    // not appear in shipped JSDoc / dist/*.d.ts.
    name: "internal-oq-id-jsdoc-leak",
    re: /\bOQ-\d{4}-\d{4}\b/,
    suggestion:
      "Internal open-question IDs (OQ-NNNN-NNNN) MUST NOT appear in src/ JSDoc — tsup keeps JSDoc in dist/*.d.ts.",
    appliesTo: ["src-comment"],
  },
  {
    // Cross-spec change IDs (`CHG-NNN`) come from `_policies/10_delta.md`
    // and only resolve inside this repository. They belong to the same
    // authoring-traceability surface as DEC / DR / OQ, so they get the
    // same pre-build treatment.
    name: "internal-chg-id-jsdoc-leak",
    re: /\bCHG-\d+\b/,
    suggestion:
      "Internal cross-spec change IDs (CHG-NNN) MUST NOT appear in src/ comments — tsup keeps them in dist/. Describe the change instead (e.g. 'the 4-layer assistant-tree recut') and keep ID-level traceability in `.qfai/specs/`.",
    appliesTo: ["src-comment"],
  },
  {
    name: "internal-schema-version-jsdoc-leak",
    re: /"schemaVersion"|schemaVersion\s*:/,
    suggestion:
      "The `schemaVersion` field is forbidden in distributed surfaces (artifacts use `package.json#version` only). Do not document it in src/ JSDoc.",
    appliesTo: ["src-comment"],
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
 * - Tests and any *.test.ts file.
 */
const EXCLUDED_PATH_PATTERNS: ReadonlyArray<RegExp> = [
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
  // src/*.ts files get a SECOND set of rules that run ON comment lines
  // (the inverse of the comment-skip below). These catch JSDoc leakage
  // into dist/*.d.ts (PR #206 review Ntbp).
  const srcCommentRules =
    targetCategory === "src"
      ? PATTERNS.filter((rule) => rule.appliesTo.includes("src-comment"))
      : [];

  if (/^assets\/init\/\.qfai\/specs\/spec-XXXX\//.test(relPath)) {
    violations.push({
      file: relPath,
      line: 1,
      pattern: "spec-path-literal",
      matched: "assets/init/.qfai/specs/spec-XXXX/",
      suggestion: "Do not ship seed spec placeholder directories via `qfai init`.",
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    // Pragma escape: this line and the line immediately after are exempt.
    if (PRAGMA_RE.test(line)) continue;
    if (i > 0 && PRAGMA_RE.test(lines[i - 1] ?? "")) continue;
    // TS source files: `dist/*.js` strips comments at build time, but
    // `dist/*.d.ts` RETAINS them. Run the dedicated `src-comment`
    // rules on JSDoc lines so internal-spec-id leakage is caught at
    // source, not only post-build by the leakage shell script.
    if (isTs && TS_COMMENT_LINE_RE.test(line)) {
      for (const rule of srcCommentRules) {
        // `rule.re.flags`, not a bare `"g"`: dropping them lost the `i` on the
        // spec-id rules, so `SPEC-9999` in JSDoc passed here while the
        // post-build guard and the smoke test — both case-insensitive — caught
        // it. The same distributed content, three answers.
        const globalRe = new RegExp(rule.re.source, withGlobal(rule.re.flags));
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
      continue;
    }
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
