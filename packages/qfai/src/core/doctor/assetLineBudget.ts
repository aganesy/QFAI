import { createReadStream, type Dirent } from "node:fs";
import { access, lstat, readdir } from "node:fs/promises";
import path from "node:path";

import { ASSISTANT_DIR } from "../paths/assistantPaths.js";

/**
 * Line ceiling for a single assistant asset file.
 *
 * One number for every file, owned at runtime rather than by a test constant:
 * the ceiling is stated in the shipped operating baseline, so a project that
 * only has the published package must still be able to check it. The framework's
 * own asset test imports this constant instead of redeclaring it.
 *
 * The ceiling is a backstop, not the design rule. The design rule is that a
 * skill body stays thin: it states the contract and points at the topic file
 * that carries the detail, under the skill's own `references/`, `templates/` or
 * `examples/` directory.
 *
 * Raised from 500 once, on measurement rather than on the "this file is long"
 * claim this number exists to refuse. Three skill bodies had converged on the
 * old ceiling at 498 / 498 / 500 lines, with 33 / 22 / 16 open changes in
 * flight against them. Two of the three are net neutral, but the middle one is
 * not: eleven of its open changes each carry it past the old ceiling on their
 * own, the widest to 549, and their intended edits together add 161 lines to a
 * body that starts at 498.
 *
 * Splitting does not absorb that. What those bodies still carry is held there
 * by asset tests that require an agent to read a rule where the rule acts, so
 * the movable residue is a few dozen lines. Nor is a net-neutral queue safe at
 * zero headroom: changes land one at a time, and a body at 498 fails on the
 * first one that adds four lines whether or not a later one takes them back.
 *
 * Converging on the limit was itself the signal: a body at the ceiling stops
 * shedding topics and starts packing them into longer lines, and by then the
 * widest line in one of those files ran 6192 characters — so the count had
 * stopped bounding what an agent must read. A line ceiling cannot see that;
 * only a reader can.
 *
 * A file approaching this number is still a signal to move a section out.
 * Raise it again only against evidence of the same kind.
 */
export const ASSISTANT_ASSET_MAX_LINES = 800;

/**
 * Width ceiling for a single line, which is what makes the line ceiling honest.
 *
 * A count of lines bounds reading cost only while a line is a roughly constant
 * unit of reading. It stopped being one: the widest line in the tree runs 9,104
 * characters against a median of 118, and a line that long costs one unit of a
 * budget whose whole purpose is to bound how much an agent must read before it
 * can act. Bodies converging on the line ceiling stopped shedding topics and
 * started packing them, which the count cannot see.
 *
 * 400 is read off the tree rather than chosen: the 90th percentile is 413, so
 * nine files in ten already comply, and the ones that do not are the ones the
 * packing produced. It is also the point below which the width cap would start
 * deciding a different question — reflowed to 300, the largest skill body
 * passes 800 lines and the line ceiling condemns it, which is a split decision
 * and not this one.
 *
 * The two ceilings are read together on purpose. Width alone permits a thin
 * file of a thousand short lines; the count alone permits a packed one. A file
 * has to satisfy both.
 */
export const ASSISTANT_ASSET_MAX_LINE_CHARS = 400;

/** File extensions that count as an authored assistant asset. */
export const ASSISTANT_ASSET_EXTENSIONS: readonly string[] = [".md", ".yml", ".yaml"];

/**
 * Asset files exempt from {@link ASSISTANT_ASSET_MAX_LINES}, with the reason.
 *
 * Keys are POSIX paths relative to the project's `.qfai/` directory. Keep this
 * list short: an exemption claims no split is possible, and "this file is long"
 * is not that claim. Every entry needs a reason a reader can check.
 */
export const LINE_BUDGET_EXEMPT: ReadonlyMap<string, string> = new Map([
  [
    "assistant/manifest/agent-catalog.yml",
    "A roster, not prose: one entry per agent, mirroring `assistant/agents/<id>.md`. " +
      "Its length tracks the number of agents — shipped, or adjusted through " +
      "`qfai-configure` — so there is no topic to move out; splitting it would " +
      "mean splitting the agent roster itself.",
  ],
]);

/**
 * Per-file width ceilings for the tree as it stands, which may only shrink.
 *
 * Twenty files carry a line wider than {@link ASSISTANT_ASSET_MAX_LINE_CHARS}.
 * Reflowing them is a separate pass — it rewrites prose across the highest-churn
 * files in the tree — and holding the rule back until then would leave the
 * evasion open in the meantime, which is the state this rule exists to end.
 *
 * So the backlog is recorded instead of waived. **Each entry is that file's
 * widest line today, exactly**, and the asset guard holds it to that: widening
 * the file fails, and narrowing it fails too, naming the lower number to record.
 * A ceiling merely above the real width would let a file improve from 900 to 500
 * and keep the 900, which leaves room to grow back — a licence, not a ratchet.
 *
 * A file absent from this map is held at the real number, so nothing joins the
 * backlog quietly: {@link WIDTH_BACKLOG_SIZE} pins how many entries there are.
 *
 * The same shape the operator-message language rule uses, for the same reason:
 * a backlog nobody can add to is a backlog that goes away.
 */
export const WIDTH_BUDGET_BACKLOG: ReadonlyMap<string, number> = new Map([
  ["assistant/catalog/test-layers.md", 921],
  ["assistant/constitution/references/audited-evidence-hash.md", 1406],
  ["assistant/constitution/shared-skill-delegation-baseline.md", 692],
  ["assistant/constitution/shared-skill-operating-baseline.md", 581],
  ["assistant/skills/qfai-atdd/SKILL.md", 2001],
  ["assistant/skills/qfai-atdd/references/red-provenance.md", 460],
  ["assistant/skills/qfai-configure/SKILL.md", 2284],
  ["assistant/skills/qfai-discussion/SKILL.md", 802],
  ["assistant/skills/qfai-discussion/references/design-md-brand-catalog.md", 533],
  ["assistant/skills/qfai-discussion/templates/01_Context.md", 412],
  ["assistant/skills/qfai-implement/SKILL.md", 9104],
  ["assistant/skills/qfai-implement/references/cross-spec-ownership.md", 616],
  // The rows below this file's cycle table are separated from its delimiter
  // by a blank line, which ends the table — so they render as a paragraph
  // and are measured as one.
  ["assistant/skills/qfai-prototyping/SKILL.md", 899],
  ["assistant/skills/qfai-sdd/SKILL.md", 2460],
  ["assistant/skills/qfai-sdd/references/sdd-phase-checklists.md", 3763],
  ["assistant/skills/qfai-sdd/references/spec-traceability-rules.md", 790],
  ["assistant/skills/qfai-sdd/templates/report/preflight_summary.md", 425],
  ["assistant/skills/qfai-verify/SKILL.md", 950],
  ["assistant/skills/qfai-verify/references/articles.md", 413],
  ["assistant/skills/qfai-verify/references/verify-output-contract.md", 840],
]);

/**
 * How many files are in the backlog. Held by the asset guard so the map can
 * only shrink: adding a file to it moves this number, which a reviewer sees.
 */
export const WIDTH_BACKLOG_SIZE = 20;

/**
 * An opening fence: the marker run, captured so a closer can be checked
 * against it.
 *
 * CommonMark allows up to three leading spaces, and a fence closes only on the
 * SAME marker character at AT LEAST the opening length. Toggling on any fence
 * line ends a four-backtick block early at the first three-backtick sample
 * quoted inside it, and everything after that reads as prose — the same
 * property `core/ids.ts` states for its own mask, and for the same reason.
 */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;

/** A table's delimiter row. It must carry a pipe, or a bare rule would match. */
const TABLE_DELIMITER_RE = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;

/**
 * How much of a line is kept for classification.
 *
 * Bounded so a mis-generated asset of any size still costs a constant buffer.
 * A line longer than this cannot be a delimiter row or a fence, which are the
 * only shapes the classifier reads in full; its width is carried separately.
 */
const CLASSIFY_PREFIX = 4096;

/** What the classifier needs to know about one line. */
type LineShape = {
  /** Width in code points — see {@link countCharacters}. */
  length: number;
  /** The line, truncated to {@link CLASSIFY_PREFIX}. */
  text: string;
};

/**
 * Line width, counted in code points.
 *
 * `String.prototype.length` counts UTF-16 code units, so a line of 300 emoji
 * measures 600 there and 300 under an iteration that yields code points. Both
 * measuring paths route through this: a file that failed one ceiling and passed
 * the other would make two guards disagree about one rule.
 */
function countCharacters(text: string): number {
  let count = 0;
  for (const _character of text) {
    count += 1;
  }
  return count;
}

/**
 * The widest line a width ceiling can speak about, over a stream of lines.
 *
 * Two shapes are skipped, and both for the same reason: they cannot be made
 * narrower by the author, so measuring them would report a defect with no fix.
 *
 * | skipped        | why                                                       |
 * | -------------- | --------------------------------------------------------- |
 * | a table row    | markdown gives it no continuation, so it cannot wrap      |
 * | a fenced block | its content is a command, a diagram or a sample, verbatim |
 *
 * A table row is also read differently — cells scanned against a header, not a
 * sentence read left to right — so it is not the unit the ceiling is about.
 *
 * **A table is found by its delimiter row, not by a leading pipe.** That pipe
 * is optional in markdown, so keying on it measures the rows of a table written
 * without one and exempts any prose line that happens to start with a pipe —
 * neither of which is what the contract above says. A run of pipe-carrying
 * lines anchored by a delimiter row is the table, and deciding the first of
 * them needs the line after it, so the scanner defers by one.
 */
class WidthScanner {
  private widest = 0;
  private fence: { marker: string; length: number } | undefined;
  private pending: LineShape | undefined;
  private inTable = false;

  /**
   * Offers one line.
   *
   * `length` is passed separately by the streaming feeder, which counts the
   * whole line while retaining only its first {@link CLASSIFY_PREFIX}
   * characters.
   */
  push(text: string, length?: number): void {
    const shape: LineShape = {
      length: length ?? countCharacters(text),
      text: text.length > CLASSIFY_PREFIX ? text.slice(0, CLASSIFY_PREFIX) : text,
    };
    if (this.pending !== undefined) {
      this.settle(this.pending, shape);
    }
    this.pending = shape;
  }

  /** The widest measured line, after settling the one still held back. */
  finish(): number {
    if (this.pending !== undefined) {
      this.settle(this.pending, undefined);
      this.pending = undefined;
    }
    return this.widest;
  }

  /** Decides one line, with the line after it when there is one. */
  private settle(line: LineShape, next: LineShape | undefined): void {
    if (this.fence !== undefined) {
      if (this.closesFence(line.text)) {
        this.fence = undefined;
      }
      return;
    }
    const opening = FENCE_OPEN_RE.exec(line.text)?.[1];
    if (opening !== undefined) {
      this.fence = { marker: opening.slice(0, 1), length: opening.length };
      return;
    }
    if (this.isTableRow(line, next)) {
      return;
    }
    this.inTable = false;
    this.widest = Math.max(this.widest, line.length);
  }

  private closesFence(text: string): boolean {
    const fence = this.fence;
    if (fence === undefined) {
      return false;
    }
    // Same character, at least as long, and nothing after it: CommonMark
    // forbids an info string on a closing fence.
    const marker = fence.marker === "~" ? "~" : "`";
    return new RegExp(`^ {0,3}${marker}{${String(fence.length)},}[ \\t]*$`).test(text);
  }

  /**
   * A row of the table a delimiter row anchors.
   *
   * Either the run is open already and this line still carries a pipe, or this
   * line is the header the next line delimits.
   */
  private isTableRow(line: LineShape, next: LineShape | undefined): boolean {
    const hasPipe = line.text.includes("|");
    if (this.inTable && hasPipe) {
      return true;
    }
    if (hasPipe && next !== undefined && TABLE_DELIMITER_RE.test(next.text)) {
      this.inTable = true;
      return true;
    }
    return false;
  }
}

/**
 * Counts lines the way every budget assertion does.
 *
 * `split(/\r?\n/)` — not a blank-line-skipping counter. A markdown file is
 * substantially blank lines by volume, and undercounting them lets a file sit
 * ~20% over the ceiling while reporting as compliant.
 */
export function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

/**
 * The widest measurable line, from content already in hand.
 *
 * The in-memory feeder for {@link WidthScanner}, standing to the streamed one
 * as {@link countLines} stands to its twin. Both feed the same scanner, so a
 * caller with the text and a caller with a path cannot disagree about which
 * lines are measured or how wide they are.
 */
export function widestMeasurableLine(content: string): number {
  const scanner = new WidthScanner();
  for (const line of content.split(/\r?\n/)) {
    scanner.push(line);
  }
  return scanner.finish();
}

type AssetMeasurement = { lines: number; widest: number };

/**
 * Measures a file without holding it in memory.
 *
 * Streamed, so a mis-generated asset of any size costs a bounded buffer rather
 * than the whole file plus a per-line array — doctor has to survive the
 * malformed tree it is being asked to diagnose. At most
 * {@link CLASSIFY_PREFIX} characters of any one line are retained, its width is
 * counted as it goes, and the scanner holds one line at a time.
 *
 * Decoded as text rather than scanned as bytes, because the width is a count of
 * characters. These files carry em dashes and Japanese, and a byte count would
 * report a compliant line as three times its width.
 */
async function measureFile(absolute: string): Promise<AssetMeasurement> {
  const stream = createReadStream(absolute, { encoding: "utf-8" });
  const scanner = new WidthScanner();
  let lines = 1;
  let head = "";
  let width = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: string | Buffer) => {
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
        for (const character of text) {
          if (character === "\n") {
            lines += 1;
            scanner.push(head, width);
            head = "";
            width = 0;
            continue;
          }
          // `\r` is a line terminator here, not content: `countLines` splits on
          // `\r?\n`, so counting it would make every line of a CRLF file one
          // character wider than the same file with LF endings.
          if (character === "\r") {
            continue;
          }
          width += 1;
          if (head.length < CLASSIFY_PREFIX) {
            head += character;
          }
        }
      });
      stream.on("error", reject);
      stream.on("end", resolve);
    });
  } finally {
    stream.destroy();
  }
  scanner.push(head, width);
  return { lines, widest: scanner.finish() };
}

export type OversizedAssistantAsset = { path: string; lines: number };

/**
 * An asset whose widest line exceeds what it is allowed.
 *
 * `allowed` travels with the finding because it is not one number: a file in
 * {@link WIDTH_BUDGET_BACKLOG} is held at its own recorded ceiling, and a reader
 * has to see which of the two it failed.
 */
export type WideLineAssistantAsset = { path: string; widest: number; allowed: number };

/** An asset skipped by {@link LINE_BUDGET_EXEMPT}, carried with its reason. */
export type ExemptAssistantAsset = { path: string; reason: string };

export type AssistantAssetBudgetStatus =
  | "ok"
  | "over_budget"
  | "incomplete"
  | "skipped_missing_assistant";

export type AssistantAssetBudgetReport = {
  status: AssistantAssetBudgetStatus;
  assistantDir: string;
  maxLines: number;
  maxLineChars: number;
  /** Number of asset files measured (unreadable files excluded). */
  scanned: number;
  oversized: OversizedAssistantAsset[];
  /** Assets whose widest measurable line exceeds the ceiling that applies to them. */
  wideLines: WideLineAssistantAsset[];
  /**
   * Paths excused from the LINE ceiling, each with the reason from
   * {@link LINE_BUDGET_EXEMPT}. They are still measured for width: the reason an
   * exemption states is about a file's length, never about how wide one line
   * may be. The shipped baseline promises the reader
   * sees *why* a file was not measured, so the reason travels with the path
   * instead of living only in this module's source.
   */
  exempt: ExemptAssistantAsset[];
  /** Files that could not be read; reported rather than silently passed. */
  unreadable: string[];
  /**
   * Paths whose contents were never measured: a directory that could not be
   * listed, or an entry whose type could not be determined at all — the latter
   * may be a directory, so it is reported rather than assumed to be neither.
   */
  unscannable: string[];
};

/**
 * Rewrites the platform's separators to `/` — and only the platform's.
 *
 * A blanket `replace(/[\\/]+/g, "/")` is wrong off Windows: POSIX treats a
 * backslash as an ordinary filename character, so an authored asset literally
 * named `manifest\agent-catalog.yml` directly under `assistant/` would be
 * reported as `assistant/manifest/agent-catalog.yml`, collide with the
 * {@link LINE_BUDGET_EXEMPT} key and go unmeasured at any length. On Windows
 * both separators are real separators, so both still collapse there.
 */
function toPosixSegments(relative: string): string {
  return path.sep === "\\" ? relative.replace(/[\\/]+/g, "/") : relative.replace(/\/+/g, "/");
}

function toQfaiRelativePath(assistantDir: string, absolute: string): string {
  const assistantName = path.basename(ASSISTANT_DIR);
  if (path.resolve(absolute) === path.resolve(assistantDir)) {
    return assistantName;
  }
  return `${assistantName}/${toPosixSegments(path.relative(assistantDir, absolute))}`;
}

type AssistantAssetScan = {
  files: string[];
  /**
   * Paths the walk could not descend into or classify: a directory whose
   * listing failed (permission, or removed mid-scan), or an entry whose type
   * neither `readdir` nor `lstat` could report.
   */
  unscannable: string[];
};

/**
 * True when `readdir` reported no type for the entry.
 *
 * `withFileTypes: true` fills the type from the directory entry only when the
 * filesystem supplies one. NFS, several FUSE mounts and other network
 * filesystems answer `DT_UNKNOWN`, and then *every* predicate on the Dirent is
 * false — an ordinary file and an ordinary directory both look like "neither".
 * A walk that only asks `isFile()` / `isDirectory()` drops them silently, so a
 * whole subtree of oversized assets goes unmeasured while the report still says
 * `ok`. Such an entry has to be resolved with a `lstat` instead.
 */
function hasUnknownType(entry: Dirent): boolean {
  return !(
    entry.isFile() ||
    entry.isDirectory() ||
    entry.isSymbolicLink() ||
    entry.isBlockDevice() ||
    entry.isCharacterDevice() ||
    entry.isFIFO() ||
    entry.isSocket()
  );
}

/**
 * Walks the assistant tree without the repository-wide default ignore list.
 *
 * The baseline promises that *every* `.qfai/assistant/**` asset is measured, so
 * this cannot reuse `collectFiles`: that walker always drops directories named
 * `node_modules` / `.git` / `dist` / `.pnpm` / `tmp` / `.mcp-tools`, which would
 * silently exempt e.g. `skills/<id>/references/tmp/*.md` from the ceiling.
 *
 * A directory that cannot be listed is recorded instead of thrown: doctor is a
 * diagnostic and must still print its other checks when one subtree is locked
 * or is removed while the scan runs. Symlinked directories are not followed —
 * neither `Dirent.isDirectory()` nor `lstat().isDirectory()` is true for a link
 * — so the walk stays inside the real assistant tree.
 */
async function scanAssistantAssets(assistantDir: string): Promise<AssistantAssetScan> {
  const files: string[] = [];
  const unscannable: string[] = [];

  const visit = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      unscannable.push(toQfaiRelativePath(assistantDir, dir));
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (hasUnknownType(entry)) {
        // `lstat`, not `stat`: resolving the type must not start following
        // links the typed path deliberately leaves alone.
        try {
          const stats = await lstat(absolute);
          isDirectory = stats.isDirectory();
          isFile = stats.isFile();
        } catch {
          // Unknown and unresolvable — it may be a directory full of assets,
          // so record it as unmeasured instead of dropping it.
          unscannable.push(toQfaiRelativePath(assistantDir, absolute));
          continue;
        }
      }
      if (isDirectory) {
        await visit(absolute);
        continue;
      }
      if (!isFile) {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (ASSISTANT_ASSET_EXTENSIONS.includes(ext)) {
        files.push(absolute);
      }
    }
  };

  await visit(assistantDir);
  return { files: files.sort(), unscannable: unscannable.sort() };
}

/** Reads a Node `errno` code off an unknown rejection without asserting a type. */
function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Classifies the presence probe on the assistant tree.
 *
 * Only "the path is not there" means the tree has not been created. A probe
 * that fails for any other reason — `EACCES`/`EPERM` on `.qfai` itself, or an
 * I/O error — measured nothing, and reporting that as `skipped_missing_assistant`
 * would answer a permission fault with "run 'qfai init'" and quietly certify an
 * unmeasured tree. Those are reported as unprobeable instead.
 */
function classifyAssistantProbe(error: unknown): "missing" | "unprobeable" {
  const code = errorCode(error);
  return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unprobeable";
}

/**
 * Measures every `.qfai/assistant/**` asset against {@link ASSISTANT_ASSET_MAX_LINES}.
 *
 * Returns `skipped_missing_assistant` when the tree has not been created yet,
 * so a project that has not run init is not reported as a failure, and
 * `incomplete` when nothing was over budget but some path could not be measured
 * — an unmeasured asset must not be reported as compliant.
 */
export async function checkAssistantAssetLineBudget(
  root: string,
): Promise<AssistantAssetBudgetReport> {
  const assistantDir = path.resolve(root, ASSISTANT_DIR);
  const empty = {
    assistantDir,
    maxLines: ASSISTANT_ASSET_MAX_LINES,
    maxLineChars: ASSISTANT_ASSET_MAX_LINE_CHARS,
    scanned: 0,
    oversized: [],
    wideLines: [],
    exempt: [],
    unreadable: [],
  };
  let probe: "present" | "missing" | "unprobeable" = "present";
  try {
    await access(assistantDir);
  } catch (error) {
    probe = classifyAssistantProbe(error);
  }
  if (probe === "missing") {
    return { status: "skipped_missing_assistant", ...empty, unscannable: [] };
  }
  if (probe === "unprobeable") {
    return {
      status: "incomplete",
      ...empty,
      unscannable: [toQfaiRelativePath(assistantDir, assistantDir)],
    };
  }

  const scan = await scanAssistantAssets(assistantDir);

  const oversized: OversizedAssistantAsset[] = [];
  const wideLines: WideLineAssistantAsset[] = [];
  const exempt: ExemptAssistantAsset[] = [];
  const unreadable: string[] = [];
  let scanned = 0;

  for (const absolute of scan.files) {
    const relPath = toQfaiRelativePath(assistantDir, absolute);
    const exemptReason = LINE_BUDGET_EXEMPT.get(relPath);
    if (exemptReason !== undefined) {
      exempt.push({ path: relPath, reason: exemptReason });
    }
    let measured: AssetMeasurement;
    try {
      measured = await measureFile(absolute);
    } catch {
      // An unreadable asset cannot be measured. Surfacing it beats counting it
      // as compliant, which would let a permission error hide an overrun.
      unreadable.push(relPath);
      continue;
    }
    scanned += 1;
    // The exemption is from the LINE ceiling only, and its reason says why: a
    // roster's length tracks the number of agents, so there is no topic to move
    // out. Nothing in that reason is about how wide a line may be, and a file
    // excused from both would be the one place the width rule does not reach.
    if (exemptReason === undefined && measured.lines > ASSISTANT_ASSET_MAX_LINES) {
      oversized.push({ path: relPath, lines: measured.lines });
    }
    const allowed = WIDTH_BUDGET_BACKLOG.get(relPath) ?? ASSISTANT_ASSET_MAX_LINE_CHARS;
    if (measured.widest > allowed) {
      wideLines.push({ path: relPath, widest: measured.widest, allowed });
    }
  }

  const incomplete = unreadable.length > 0 || scan.unscannable.length > 0;
  const overBudget = oversized.length > 0 || wideLines.length > 0;
  const status: AssistantAssetBudgetStatus = overBudget
    ? "over_budget"
    : incomplete
      ? "incomplete"
      : "ok";

  return {
    status,
    assistantDir,
    maxLines: ASSISTANT_ASSET_MAX_LINES,
    maxLineChars: ASSISTANT_ASSET_MAX_LINE_CHARS,
    scanned,
    oversized,
    wideLines,
    exempt,
    unreadable,
    unscannable: scan.unscannable,
  };
}
