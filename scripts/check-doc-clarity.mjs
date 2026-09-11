#!/usr/bin/env node
/**
 * Reject local identifiers that mean nothing outside this repository:
 * issue and pull-request numbers, review-comment references, and the
 * ordinal "wave" labels an earlier review process used. See
 * `.agents/rules/documentation-clarity.md`.
 *
 * Scoped to the prose of a source file and to Markdown, the same surfaces
 * the rule covers. Prose in a source file is its comments, plus the string
 * arguments of a call that prints them — a test title and an operator
 * message are read more often than the comment above them, and a citation
 * there is the same defect in a more visible place. A citation broken by a
 * line wrap is matched across the break, because it matches nothing on
 * either half. Deliberately narrower than the rule's
 * full scope (which also asks for plain wording and no process narration):
 * those are judgment calls a human or an LLM review makes well and a
 * regex makes badly. What a regex makes well is a small set of shapes
 * that never legitimately appear in either surface — a numbered-hash
 * shorthand, a review-tool comment reference, an ordinal wave label —
 * so that is what this checks.
 *
 * Two scopes:
 *   --scope changed (default) — only lines ADDED or MODIFIED versus the
 *     merge-base with `origin/main` fail the run. A repository this size
 *     accumulates a backlog no single change should be blocked on; the
 *     ratchet only asks that a change not add more of it.
 *   --scope all — every tracked file in scope, backlog included. Use this
 *     to audit remaining work, not as a merge gate until the backlog is
 *     clear.
 *
 * Exit codes: 0 clean / 1 violation(s) found / 2 usage or git error.
 */
/* global console */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

/**
 * Whole trees excluded because their tracked content is a historical
 * record — a Change Request decision, a discussion-pack transcript, a
 * dated work-log entry, run evidence — and citing a real review or issue
 * inside a record of what actually happened is not the slop this rule
 * targets. `CHANGELOG.md` is the same case by name: the writing rule
 * itself says PR and issue numbers belong there.
 */
const EXCLUDE_PREFIX = [
  "tmp/",
  "node_modules/",
  "packages/qfai/node_modules/",
  ".qfai/review/",
  ".qfai/review_archive/",
  ".qfai/report/",
  ".qfai/discussion/",
  ".qfai/discussion_archive/",
  ".qfai/decisions/",
  ".qfai/evidence/",
  ".qfai/steering/",
  // Generated mirrors: a finding here would point at the wrong file to
  // edit. The source under packages/qfai/assets/init/** is scanned instead.
  ".qfai/assistant/",
  ".codex/agents/",
  // A symlink to the master in .agents/rules/, so a finding would name a
  // path that cannot be edited. The master is scanned instead.
  ".claude/rules/",
];

/**
 * Files whose subject is the forbidden shapes themselves.
 *
 * `CHANGELOG.md` is one because the writing rule sends issue and pull-request
 * numbers there. The rule document is the other, and for the stronger reason:
 * it is the specification of what this guard rejects, so it has to spell out
 * the very shapes below as its own examples. Excluded by whole file rather
 * than by marker — the marker would name a lane that is not shipped, and the
 * copy under `assets/init/**` goes to projects that do not have it.
 *
 * The cost is that a real citation added elsewhere in one of these files goes
 * unseen. Both are short and are about this rule, so review covers them.
 */
const EXCLUDE_EXACT = new Set([
  "CHANGELOG.md",
  ".agents/rules/documentation-clarity.md",
  "packages/qfai/assets/init/root/.agents/rules/documentation-clarity.md",
]);

/**
 * A spec pack's own delta log (`_policies/10_delta.md`, `spec-NNNN/09_delta.md`
 * or another file ending `_delta.md`) is the same case as `CHANGELOG.md` by
 * function: a record of what changed and why, where a real issue or PR
 * reference is the citation the record exists to keep.
 */
const EXCLUDE_BASENAME_RE = /_delta\.md$/;

const SOURCE_EXTENSIONS = new Set([".ts", ".mts", ".mjs", ".cjs", ".js"]);
const SHELL_EXTENSIONS = new Set([".sh", ".ps1"]);
const MARKDOWN_EXTENSIONS = new Set([".md"]);

/**
 * The forbidden shapes, applied to comment lines in source and to every
 * prose line in Markdown. Kept to identifiers with no legitimate reading
 * in either surface:
 *
 *   - a hash mark directly followed by digits (an issue or PR shorthand) —
 *     excludes a preceding word character or `&` so it does not fire on an
 *     HTML entity or a hex-adjacent token.
 *   - "GH-" or "PR #" or "pull request #" followed by digits.
 *   - the review tool's own comment id: "codex" (optionally followed by
 *     "review") then a token that carries at least one digit — the tool
 *     has used both a numeric id ("r3270307469") and a short alphanumeric
 *     one ("8zqb", "AG08r"). A digit is required so plain phrases such as
 *     "codex agent" or "codex review" alone do not match.
 *   - a "wave" label from a retired review process, numbered either way
 *     round, e.g. an ordinal followed by the word or the word followed by a
 *     bare number.
 *   - a short-code review reference list, "review " followed by two or more
 *     codes joined by a slash.
 *   - a bracketed finding id after the words "review finding" — a bare
 *     number or a letter-prefixed one, e.g. `[86]` or `[E1]`.
 */
const PATTERNS = [
  { name: "issue-or-pr-number", re: /(?<![\w&])#\d{2,6}\b(?!["'])/g },
  { name: "gh-issue-number", re: /\bGH-\d+\b/g },
  { name: "pr-or-issue-word", re: /\b(?:PR|pull request|issue|Issue)\s+#?\d{2,6}\b/g },
  { name: "codex-review-id", re: /\bcodex\s+(?:review\s+)?(?=[a-z0-9]*\d)[a-z0-9]{3,12}\b/gi },
  {
    name: "review-wave-label",
    re: /\bwave[\s-]\d+\b|\b\d+(?:st|nd|rd|th)[\s-](?:late-review[\s-])?wave\b/gi,
  },
  { name: "review-shortcode-list", re: /\breview\s+[A-Za-z0-9]{4}(?:\s*\/\s*[A-Za-z0-9-]{4})+/g },
  { name: "review-finding-bracket", re: /\bReview finding \[[A-Za-z]?\d+\]/gi },
];

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf-8", maxBuffer: 128 * 1024 * 1024 });
}

function trackedFiles() {
  const out = git(["ls-files", "-z"]);
  return out.split("\0").filter(Boolean);
}

function inScope(rel) {
  if (EXCLUDE_EXACT.has(rel)) return false;
  if (EXCLUDE_PREFIX.some((p) => rel.startsWith(p))) return false;
  if (EXCLUDE_BASENAME_RE.test(path.basename(rel))) return false;
  const ext = path.extname(rel);
  return SOURCE_EXTENSIONS.has(ext) || SHELL_EXTENSIONS.has(ext) || MARKDOWN_EXTENSIONS.has(ext);
}

/** For source and shell files, only comment lines carry the rule's obligation. */
function isSourceComment(trimmed) {
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

/**
 * A call whose string arguments are prose rather than data.
 *
 * A test title ships in the run output and an operator message ships in the
 * terminal, so both are surfaces a reader meets more often than the comment
 * above them. A citation there is the same defect in a more visible place.
 *
 * Not every string literal. A fragment in an assignment or a fixture is data the
 * program uses, and rewriting it would change behaviour — which is why the scope
 * is the CALL rather than the quote character.
 */
const PROSE_CALL_RE =
  /\b(?:describe|it|test)\s*(?:\.\s*[A-Za-z]+\s*)*\(|\bconsole\s*\.\s*(?:log|info|warn|error|debug|trace)\s*\(|\bnew\s+[A-Za-z_$][\w$]*Error\s*\(/;

/**
 * The window is the call line and the string literals wrapped under it, and
 * nothing else.
 *
 * The body of a test is not prose. `it("name", () => {` opens a bracket that
 * closes many lines later, so a window that ran to the closing bracket would
 * cover every fixture in the case — and a CSS colour in one of them reads as an
 * issue number. Two rules close it: a line joins the window only while it opens
 * with a string literal, and a call line that also opens a callback ends the
 * window where it starts.
 */
const STRING_CONTINUATION_RE = /^(?:\+\s*)?["'`]/;
const CALLBACK_OPENER_RE = /=>|\bfunction\b/;

function isCheckedLine(rel, line, inProseCall) {
  if (MARKDOWN_EXTENSIONS.has(path.extname(rel))) return true;
  const trimmed = line.trim();
  if (SHELL_EXTENSIONS.has(path.extname(rel))) return trimmed.startsWith("#");
  return isSourceComment(trimmed) || inProseCall;
}

/**
 * The prose of a checked line, with the comment marker removed.
 *
 * The marker has to go before two lines are joined: a citation split by a wrap
 * resumes after it, and leaving `//` in the middle of the joined text would put
 * a token between the halves that no pattern expects.
 */
function proseOf(rel, line) {
  const trimmed = line.trim();
  if (MARKDOWN_EXTENSIONS.has(path.extname(rel))) return trimmed;
  if (SHELL_EXTENSIONS.has(path.extname(rel))) return trimmed.replace(/^#+\s*/, "");
  return isSourceComment(trimmed) ? trimmed.replace(/^(?:\/\/+|\/\*+|\*+)\s*/, "") : trimmed;
}

/**
 * A "wave" naming a delivery batch of one tracked change — a
 * change-record id followed by a batch number, in an execution ledger —
 * is a different word than the retired review process's wave label: it
 * names a batch of the CHANGE, not a round of REVIEW. The line carrying a
 * real change-record id is where that distinction is decidable — a
 * review-round citation has no reason to sit on the same line as the id
 * of the change it batches. A row whose batch has not landed yet carries
 * no such id and says so directly instead, in the same column: a
 * parenthesized "deferred" note naming the same batch number.
 */
const CHANGE_ID_RE = /\bCHG-\d{3}\b|\bDR-\d{4}-\d{4}\b|\(wave\s+\d+\s+deferred\)/i;

function findLineHits(rel, line) {
  const hits = [];
  for (const { name, re } of PATTERNS) {
    if (name === "review-wave-label" && CHANGE_ID_RE.test(line)) continue;
    re.lastIndex = 0;
    const m = line.match(re);
    if (m) hits.push({ name, sample: m[0] });
  }
  return hits;
}

/**
 * Line numbers changed by the working tree versus `base`, per file —
 * additions and the new side of modifications, from `git diff -U0`.
 * A file with no entry here was not touched and is skipped entirely
 * under `--scope changed`.
 */
function changedLinesByFile(base) {
  let diff;
  try {
    diff = git(["diff", "--no-color", "-U0", `${base}...HEAD`, "--"]);
  } catch (err) {
    console.error(`check-doc-clarity: git diff against ${base} failed: ${err.message}`);
    process.exit(2);
  }
  const byFile = new Map();
  let current = null;
  let nextLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      current = p === "/dev/null" ? null : p.replace(/^b\//, "");
      continue;
    }
    if (raw.startsWith("@@")) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(raw);
      nextLine = m ? Number(m[1]) : 0;
      continue;
    }
    if (current === null) continue;
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      if (!byFile.has(current)) byFile.set(current, new Set());
      byFile.get(current).add(nextLine);
      nextLine += 1;
    } else if (!raw.startsWith("-")) {
      nextLine += 1;
    }
  }
  return byFile;
}

function mergeBase(ref) {
  try {
    return git(["merge-base", ref, "HEAD"]).trim();
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
const scopeArgIndex = args.indexOf("--scope");
const scope = scopeArgIndex >= 0 ? args[scopeArgIndex + 1] : "changed";
if (scope !== "changed" && scope !== "all") {
  console.error(`check-doc-clarity: unknown --scope "${scope}" (expected "changed" or "all")`);
  process.exit(2);
}

let changed = null;
if (scope === "changed") {
  const base = mergeBase("origin/main") ?? mergeBase("main");
  if (base === null) {
    console.log(
      "check-doc-clarity: no origin/main or main to diff against; checking the whole tree.",
    );
  } else {
    changed = changedLinesByFile(base);
  }
}

const findings = [];
for (const rel of trackedFiles()) {
  if (!inScope(rel)) continue;
  if (changed !== null && !changed.has(rel)) continue;
  const linesInScope = changed?.get(rel) ?? null;
  let text;
  try {
    text = readFileSync(path.join(ROOT, rel), "utf-8");
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  const checked = [];
  let inFence = false;
  let proseWindow = false;
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const inProseCall =
      PROSE_CALL_RE.test(line) || (proseWindow && STRING_CONTINUATION_RE.test(line.trim()));
    proseWindow = inProseCall && !CALLBACK_OPENER_RE.test(line);
    if (!isCheckedLine(rel, line, inProseCall)) return;
    checked.push({ lineNo, prose: proseOf(rel, line), text: line.trim() });
  });

  const inScopeLine = (lineNo) => linesInScope === null || linesInScope.has(lineNo);

  checked.forEach((entry, index) => {
    const own = findLineHits(rel, entry.prose);
    if (inScopeLine(entry.lineNo)) {
      for (const hit of own) {
        findings.push({ file: rel, line: entry.lineNo, ...hit, text: entry.text });
      }
    }
    // The wrapped citation. A reference broken across a line break matches
    // nothing on either half, so each checked line is also matched joined to the
    // next one — reported at the first, which is where the citation starts.
    // Only a pattern that did not already fire on either half alone, so a hit is
    // not counted twice for being inside the window as well as on its own line.
    const next = checked[index + 1];
    if (next === undefined || next.lineNo !== entry.lineNo + 1) return;
    if (!inScopeLine(entry.lineNo) && !inScopeLine(next.lineNo)) return;
    const alone = new Set([
      ...own.map((hit) => hit.name),
      ...findLineHits(rel, next.prose).map((hit) => hit.name),
    ]);
    for (const hit of findLineHits(rel, `${entry.prose} ${next.prose}`)) {
      if (alone.has(hit.name)) continue;
      findings.push({
        file: rel,
        line: entry.lineNo,
        ...hit,
        text: `${entry.text} ⏎ ${next.text}`,
      });
    }
  });
}

if (findings.length === 0) {
  console.log(
    scope === "changed"
      ? "check-doc-clarity: no local identifiers in the changed lines."
      : "check-doc-clarity: no local identifiers found.",
  );
  process.exit(0);
}

for (const f of findings) {
  console.error(`${f.file}:${f.line}: [${f.name}] "${f.sample}" — ${f.text.slice(0, 160)}`);
}
console.error(
  `\ncheck-doc-clarity: ${findings.length} local identifier(s) found. ` +
    "Remove issue/PR/review references from comments and Markdown; see .agents/rules/documentation-clarity.md.",
);
process.exit(1);
