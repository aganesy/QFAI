/**
 * The declared structural shape of the shipped GitHub Actions workflow set,
 * plus the diff the shape gate runs a workflow tree through.
 *
 * This module is the single VALUE SSOT for that shape. The shipped-workflows
 * contract fixes the closed set of dimensions the shape must pin and
 * deliberately does not restate the values, so the values live here and
 * nowhere else; `shippedWorkflowShapeGate.test.ts` beside it holds the
 * assertions that drive this diff.
 *
 * Deliberately NOT named `*.test.ts`: vitest collects only files whose name
 * ends in `.test.ts`, so this module is imported by the gate suite and never
 * collected as a suite of its own. It therefore contains no assertion.
 *
 * ONE STRUCTURE, TWO READERS. Everything below is expressed as `ShapePin`s: a
 * dimension, a site, the `expected` value, and an observer that reads the tree
 * and renders what is actually there. `SHIPPED_WORKFLOW_SHAPE.dimensions`
 * renders its `pinned` entries from those same pins, so the dimension table
 * cannot drift away from what the diff compares — a pin that answers nothing
 * is a pin the diff compares nothing against.
 *
 * WHICH VALUES LIVE HERE, and which stay with their own row. The contract
 * assigns dimension 5's VALUES to the declared shape (the subcommand, the
 * `--profile` value and the `--fail-on` threshold), and those are the values
 * this row moves out of the ad-hoc asset assertions. For the other dimensions
 * the contract fixes a FORM ("a runner selector in the repository-variable
 * form with a public GitHub-hosted default", "the header block", "an
 * allow-list against the closed sanctioned set"), so the pins below assert the
 * form and leave each exact literal with the sibling suite that already owns it
 * as its own value SSOT — the runner selector literal and the public-label list
 * with the runner row, the header row CONTENT with the header row, the lane
 * condition semantics with the inertness row. Restating those here would
 * reproduce the very duplication this gate exists to remove.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import {
  collectJobSteps,
  collectWorkflowJobs,
  headerComment,
  isRecord,
} from "../helpers/shippedWorkflowFixtures.js";

/** One dimension of the closed set the declared shape must pin. */
export interface ShapeDimension {
  /** The contract's dimension ordinal (1..9). */
  readonly id: number;
  /** The dimension as the contract words it. */
  readonly title: string;
  /**
   * What the shape pins for this dimension — one entry per site, rendered from
   * the same pins the diff consumes. A dimension with no subject in the shipped
   * set today says so in an entry rather than being left out.
   */
  readonly pinned: readonly string[];
}

/** The declared shape: the dimension set, and nothing a caller can mutate. */
export interface DeclaredShape {
  readonly dimensions: readonly ShapeDimension[];
}

/** One divergence between a workflow tree and the declared shape. */
export interface ShapeFinding {
  /** Always `SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE`. */
  readonly code: string;
  /** The dimension ordinal the divergence belongs to (1..9). */
  readonly dimension: number;
  /** `<file>` or `<file>:<job>` — the site named in the report. */
  readonly site: string;
  /** The value the declared shape pins. */
  readonly expected: string;
  /** The value the tree carries instead. */
  readonly actual: string;
}

/** The gate's failure code, per the shipped-workflows contract. */
export const SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE = "R-SHIPPED-WORKFLOW-SHAPE-DRIFT";

/** The site name for a pin whose subject is the set rather than one file. */
const SET_SITE = "<shipped set>";

/** The reserved shipped filename pattern. */
const SHIPPED_FILENAME_RE = /^qfai-[a-z0-9-]+\.yml$/;

/* ------------------------------------------------------------------ *
 * The declared expectations — the VALUES. Everything below derives
 * from them.
 * ------------------------------------------------------------------ */

/** How a lane is kept declared but not running until the adopter opts in. */
type LaneInertness =
  /** Gated: the job's `if:` condition names the lane. */
  | { readonly jobId: string; readonly kind: "opt-in" }
  /**
   * Never inert: the file is always on and DELETION is the opt-out. A legal
   * answer to this dimension, not a gap — the validate lane's header says
   * exactly this, so a shape demanding a gate from every lane would read the
   * shipped set as violating its own contract.
   */
  | { readonly jobId: string; readonly kind: "never-inert" };

interface FileExpectation {
  readonly name: string;
  /**
   * Dimension 5. The full operator-facing invocation, held as ONE literal so
   * the value exists in exactly one place; the three pins the gate diffs
   * (subcommand, profile, threshold) are parsed out of it. An empty list means
   * no lane in this file invokes QFAI — dimension 5 has no subject here, which
   * the shape states rather than inventing values for.
   */
  readonly invocations: readonly { readonly jobId: string; readonly invocation: string }[];
  /** Dimension 6, one entry per lane. */
  readonly lanes: readonly LaneInertness[];
}

const SHIPPED_FILE_EXPECTATIONS: readonly FileExpectation[] = [
  {
    name: "qfai-tests.yml",
    invocations: [],
    lanes: ["unit", "component", "integration", "api", "e2e"].map((jobId) => ({
      jobId,
      kind: "opt-in",
    })),
  },
  {
    name: "qfai-validate.yml",
    invocations: [
      { jobId: "validate", invocation: "qfai validate --profile full --fail-on error" },
    ],
    lanes: [{ jobId: "validate", kind: "never-inert" }],
  },
];

/** Dimension 2: the header rows the contract names, by display label. */
const REQUIRED_HEADER_ROWS: readonly string[] = [
  "Covered layer",
  "Runner selector",
  "Inert when",
  "Fail-open behaviour",
];

/**
 * Dimension 7: the closed sanctioned THIRD-PARTY `uses:` set — one entry, the
 * package-manager setup action. GitHub-owned `actions/*` references are
 * first-party and are not what this allow-list bounds.
 */
const SANCTIONED_THIRD_PARTY_USES: readonly string[] = ["pnpm/action-setup"];

/** The `runs-on` form dimension 3 requires: a repository-variable read with a literal default. */
const RUNNER_SELECTOR_FORM_RE = /^\$\{\{\s*vars\.[A-Za-z_][A-Za-z0-9_]*\s*\|\|\s*'([^']*)'\s*\}\}$/;

/** A public GitHub-hosted runner label by naming form (the label LIST is the runner row's SSOT). */
const PUBLIC_HOSTED_LABEL_RE = /^(?:ubuntu|windows|macos)-[a-z0-9.]+$/;

/** A run-body line invoking the QFAI CLI at COMMAND position. */
const QFAI_INVOCATION_RE =
  /^\s*(?:npx\s+|pnpm\s+dlx\s+|pnpm\s+exec\s+|yarn\s+(?:dlx\s+)?)?qfai\s+([a-z][a-z-]*)\b/;

/* ------------------------------------------------------------------ *
 * Tree loading
 * ------------------------------------------------------------------ */

interface WorkflowFile {
  readonly name: string;
  readonly body: string;
  /** The parsed document, or undefined when the file does not parse. */
  readonly doc: unknown;
}

interface WorkflowTree {
  readonly files: readonly WorkflowFile[];
}

/**
 * Loads `<rootDir>/.github/workflows` as the gate's operand. A missing
 * directory, an unreadable entry and an unparsable body are all tolerated and
 * turn into findings downstream: a gate that throws is a gate that reports
 * nothing.
 */
async function loadWorkflowTree(rootDir: string): Promise<WorkflowTree> {
  const dir = path.join(rootDir, ".github", "workflows");
  let names: string[] = [];
  try {
    names = (await readdir(dir)).sort();
  } catch {
    return { files: [] };
  }
  const files: WorkflowFile[] = [];
  for (const name of names) {
    let body: string;
    try {
      body = await readFile(path.join(dir, name), "utf-8");
    } catch {
      continue;
    }
    let doc: unknown;
    try {
      doc = parse(body);
    } catch {
      doc = undefined;
    }
    files.push({ name, body, doc });
  }
  return { files };
}

/** The executable (non-comment) lines of a body. */
function executableLines(body: string): string[] {
  return body.split(/\r\n|\r|\n/).filter((line) => !line.trimStart().startsWith("#"));
}

/* ------------------------------------------------------------------ *
 * Pins
 * ------------------------------------------------------------------ */

interface ShapePin {
  readonly dimension: number;
  /** `<file>`, `<file>:<job>` or the set site. */
  readonly site: string;
  /** The declared value: what `pinned` renders and what the diff compares against. */
  readonly expected: string;
  /** Renders what the tree actually carries at this site. */
  readonly observe: (tree: WorkflowTree) => string;
}

const declaredNames = (): string[] => SHIPPED_FILE_EXPECTATIONS.map((file) => file.name);

/**
 * A pin about one file. An ABSENT file observes as accepted on purpose:
 * absence is dimension 1's finding and nobody else's. Without this rule one
 * removed file would light up every per-file dimension at once and
 * per-dimension attribution would be gone.
 */
function filePin(
  dimension: number,
  file: string,
  expected: string,
  observe: (found: WorkflowFile) => string,
): ShapePin {
  return {
    dimension,
    site: file,
    expected,
    observe: (tree) => {
      const found = tree.files.find((candidate) => candidate.name === file);
      if (found === undefined) {
        return expected;
      }
      const violation = observe(found);
      return violation === "" ? expected : violation;
    },
  };
}

/** Dimension 1: the file set is exactly the shipped names, each reserved-pattern shaped. */
function fileSetPins(): ShapePin[] {
  const pins: ShapePin[] = SHIPPED_FILE_EXPECTATIONS.map((file) => {
    const expected = `shipped, with a name matching ${SHIPPED_FILENAME_RE.source}`;
    return {
      dimension: 1,
      site: file.name,
      expected,
      observe: (tree: WorkflowTree): string => {
        if (!tree.files.some((candidate) => candidate.name === file.name)) {
          return "absent from the tree";
        }
        return SHIPPED_FILENAME_RE.test(file.name)
          ? expected
          : "name does not match the reserved pattern";
      },
    };
  });
  const setExpected = "no workflow beyond the shipped set";
  pins.push({
    dimension: 1,
    site: SET_SITE,
    expected: setExpected,
    observe: (tree) => {
      const extra = tree.files
        .map((file) => file.name)
        .filter((name) => !declaredNames().includes(name));
      return extra.length === 0 ? setExpected : `unexpected workflow(s): ${extra.join(", ")}`;
    },
  });
  return pins;
}

/** A label reduced to its identity, so a re-cased or re-punctuated row is the same row. */
function normalizeLabel(label: string): string {
  return label
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Values that fill a header row without stating anything. */
const PLACEHOLDER_VALUE_RE = /^(?:[-–—.]+|tbd|todo|n\/?a|none|see above)$/i;

/** The normalized labels of the header-table rows that state something. */
function headerRowLabels(body: string): string[] {
  const labels: string[] = [];
  for (const line of headerComment(body).split(/\r\n|\r|\n/)) {
    const row = line.replace(/^#\s?/, "").trim();
    if (!row.startsWith("|") || !row.endsWith("|") || row.length < 3) {
      continue;
    }
    const cells = row
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    const label = normalizeLabel(cells[0] ?? "");
    const value = cells.slice(1).join(" | ").trim();
    if (label === "" || value === "" || PLACEHOLDER_VALUE_RE.test(value)) {
      continue;
    }
    labels.push(label);
  }
  return labels;
}

/** Dimension 2: every shipped file carries the required header block. */
function headerBlockPins(): ShapePin[] {
  const expected = `header table states: ${REQUIRED_HEADER_ROWS.join(", ")}`;
  return SHIPPED_FILE_EXPECTATIONS.map((file) =>
    filePin(2, file.name, expected, (found) => {
      const present = headerRowLabels(found.body);
      const missing = REQUIRED_HEADER_ROWS.filter((row) => !present.includes(normalizeLabel(row)));
      return missing.length === 0 ? "" : `header table is missing: ${missing.join(", ")}`;
    }),
  );
}

/** The permissions declaration reaching a job: its own block, else the workflow-level one. */
function reachablePermissions(doc: unknown, job: Record<string, unknown>): unknown {
  const own = job["permissions"];
  if (own !== undefined) {
    return own;
  }
  return isRecord(doc) ? doc["permissions"] : undefined;
}

/** Dimension 3: per job — permissions, timeout, and the runner-selector form. */
function jobBoundingPins(): ShapePin[] {
  const expected =
    "every job: a reachable permissions map, timeout-minutes, and runs-on reading a repository variable with a public GitHub-hosted default";
  return SHIPPED_FILE_EXPECTATIONS.map((file) =>
    filePin(3, file.name, expected, (found) => {
      const problems: string[] = [];
      for (const { jobId, job } of collectWorkflowJobs(found.doc)) {
        if (!isRecord(reachablePermissions(found.doc, job))) {
          problems.push(`${jobId}: no reachable permissions map`);
        }
        if (typeof job["timeout-minutes"] !== "number") {
          problems.push(`${jobId}: no timeout-minutes`);
        }
        const runsOn = job["runs-on"];
        const selector =
          typeof runsOn === "string" ? RUNNER_SELECTOR_FORM_RE.exec(runsOn.trim()) : null;
        if (selector === null) {
          problems.push(`${jobId}: runs-on is not the repository-variable form`);
          continue;
        }
        const fallback = selector[1] ?? "";
        if (!PUBLIC_HOSTED_LABEL_RE.test(fallback)) {
          problems.push(
            `${jobId}: runner default "${fallback}" is not a public GitHub-hosted label`,
          );
        }
      }
      return problems.length === 0 ? "" : problems.join("; ");
    }),
  );
}

/** Dimension 4: every job matrix disables fail-fast. */
function matrixPins(): ShapePin[] {
  const expected = "every job matrix sets fail-fast: false";
  return SHIPPED_FILE_EXPECTATIONS.map((file) =>
    filePin(4, file.name, expected, (found) => {
      const problems: string[] = [];
      for (const { jobId, job } of collectWorkflowJobs(found.doc)) {
        const strategy = job["strategy"];
        if (!isRecord(strategy) || !isRecord(strategy["matrix"])) {
          continue;
        }
        if (strategy["fail-fast"] !== false) {
          problems.push(`${jobId}: matrix does not set fail-fast: false`);
        }
      }
      return problems.length === 0 ? "" : problems.join("; ");
    }),
  );
}

interface ParsedInvocation {
  readonly subcommand: string;
  readonly profile: string;
  readonly failOn: string;
}

/**
 * Splits a declared invocation literal into the three values dimension 5 pins.
 * Throws loudly on a malformed literal: the literal is this module's own SSOT
 * entry, so a typo is a developer error that must name itself rather than
 * silently pin fewer than three values.
 */
function parseDeclaredInvocation(invocation: string): ParsedInvocation {
  const match = /^qfai\s+([a-z][a-z-]*)\s+--profile\s+(\S+)\s+--fail-on\s+(\S+)$/.exec(invocation);
  if (match === null) {
    throw new Error(
      `declared invocation "${invocation}" is not "qfai <subcommand> --profile <value> --fail-on <threshold>"`,
    );
  }
  return { subcommand: match[1] ?? "", profile: match[2] ?? "", failOn: match[3] ?? "" };
}

/** What a job's run bodies actually invoke, or undefined when nothing does. */
function observedInvocation(job: Record<string, unknown>): ParsedInvocation | undefined {
  for (const step of collectJobSteps(job)) {
    const run = step["run"];
    if (typeof run !== "string") {
      continue;
    }
    for (const line of executableLines(run)) {
      const command = QFAI_INVOCATION_RE.exec(line);
      if (command === null) {
        continue;
      }
      return {
        subcommand: command[1] ?? "",
        profile: /--profile[ =]+(\S+)/.exec(line)?.[1] ?? "(absent)",
        failOn: /--fail-on[ =]+(\S+)/.exec(line)?.[1] ?? "(absent)",
      };
    }
  }
  return undefined;
}

/** Every job id in a file whose run bodies invoke QFAI. */
function invokingJobIds(found: WorkflowFile): string[] {
  return collectWorkflowJobs(found.doc)
    .filter(({ job }) => observedInvocation(job) !== undefined)
    .map(({ jobId }) => jobId);
}

/** How each dimension-5 attribute renders, for the pin and for the observation alike. */
const INVOCATION_ATTRIBUTES: ReadonlyArray<(parsed: ParsedInvocation) => string> = [
  (parsed) => `qfai ${parsed.subcommand}`,
  (parsed) => `--profile ${parsed.profile}`,
  (parsed) => `--fail-on ${parsed.failOn}`,
];

/**
 * Dimension 5: per lane that invokes QFAI — the subcommand, the `--profile`
 * value and the `--fail-on` threshold, one pin each so a divergence names the
 * attribute that drifted. A file whose lanes invoke nothing carries the
 * "no subject" pin instead, which is falsifiable in the other direction: a lane
 * that starts invoking QFAI without a declared value is reported.
 */
function laneInvocationPins(): ShapePin[] {
  const pins: ShapePin[] = [];
  for (const file of SHIPPED_FILE_EXPECTATIONS) {
    if (file.invocations.length === 0) {
      const expected = "no lane invokes QFAI: dimension 5 has no subject in this file";
      pins.push(
        filePin(5, file.name, expected, (found) => {
          const invoking = invokingJobIds(found);
          return invoking.length === 0 ? "" : `lane(s) invoke QFAI: ${invoking.join(", ")}`;
        }),
      );
      continue;
    }
    for (const { jobId, invocation } of file.invocations) {
      const declared = parseDeclaredInvocation(invocation);
      for (const render of INVOCATION_ATTRIBUTES) {
        const expected = render(declared);
        pins.push({
          dimension: 5,
          site: `${file.name}:${jobId}`,
          expected,
          observe: (tree) => {
            const found = tree.files.find((candidate) => candidate.name === file.name);
            if (found === undefined) {
              return expected;
            }
            const job = collectWorkflowJobs(found.doc).find((entry) => entry.jobId === jobId)?.job;
            const observed = job === undefined ? undefined : observedInvocation(job);
            return observed === undefined ? "no QFAI invocation" : render(observed);
          },
        });
      }
    }
  }
  return pins;
}

/** Dimension 6: per lane, what keeps it declared but not running. */
function laneInertnessPins(): ShapePin[] {
  return SHIPPED_FILE_EXPECTATIONS.map((file) => {
    const gated = file.lanes.filter((lane) => lane.kind === "opt-in").map((lane) => lane.jobId);
    const always = file.lanes
      .filter((lane) => lane.kind === "never-inert")
      .map((lane) => lane.jobId);
    const clauses: string[] = [];
    if (gated.length > 0) {
      clauses.push(
        `inert until opted in — ${gated.join(", ")} each gate on an if: condition naming the lane`,
      );
    }
    if (always.length > 0) {
      clauses.push(
        `never inert, deletion is the opt-out — ${always.join(", ")} declare no gating if:`,
      );
    }
    return filePin(6, file.name, clauses.join("; "), (found) =>
      laneInertnessViolations(file, found).join("; "),
    );
  });
}

/** Which declared lanes of a file fail their inertness answer. */
function laneInertnessViolations(file: FileExpectation, found: WorkflowFile): string[] {
  const jobs = collectWorkflowJobs(found.doc);
  const problems: string[] = [];
  for (const lane of file.lanes) {
    const job = jobs.find((entry) => entry.jobId === lane.jobId)?.job;
    if (job === undefined) {
      problems.push(`${lane.jobId}: lane is not declared`);
      continue;
    }
    const condition = job["if"];
    if (lane.kind === "opt-in") {
      if (typeof condition !== "string") {
        problems.push(`${lane.jobId}: no if: condition`);
      } else if (!condition.includes(lane.jobId)) {
        problems.push(`${lane.jobId}: if: condition does not name the lane`);
      }
      continue;
    }
    if (condition !== undefined) {
      problems.push(`${lane.jobId}: gated on if: ${String(condition)}`);
    }
  }
  return problems;
}

/** Every `owner/repo` a document's `uses:` values reference. */
function collectUsesRepos(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((member) => collectUsesRepos(member));
  }
  if (!isRecord(node)) {
    return [];
  }
  const repos: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "uses" && typeof value === "string") {
      const reference = value.split("@")[0] ?? "";
      const parts = reference.split("/");
      repos.push(`${parts[0] ?? ""}/${parts[1] ?? ""}`);
    } else {
      repos.push(...collectUsesRepos(value));
    }
  }
  return repos;
}

/** Dimension 7: third-party `uses:` references stay inside the sanctioned set. */
function thirdPartyUsesPins(): ShapePin[] {
  const expected = `third-party uses: limited to the sanctioned set (${SANCTIONED_THIRD_PARTY_USES.join(
    ", ",
  )}); GitHub-owned actions/* are first-party`;
  return SHIPPED_FILE_EXPECTATIONS.map((file) =>
    filePin(7, file.name, expected, (found) => {
      const unsanctioned = collectUsesRepos(found.doc).filter(
        (repo) => !repo.startsWith("actions/") && !SANCTIONED_THIRD_PARTY_USES.includes(repo),
      );
      return unsanctioned.length === 0
        ? ""
        : `unsanctioned third-party uses: ${[...new Set(unsanctioned)].join(", ")}`;
    }),
  );
}

/** Occurrences of a mapping key anywhere in a parsed tree. */
function countKeyOccurrences(node: unknown, key: string): number {
  if (Array.isArray(node)) {
    return node.reduce((count: number, member) => count + countKeyOccurrences(member, key), 0);
  }
  if (!isRecord(node)) {
    return 0;
  }
  let count = 0;
  for (const [candidate, value] of Object.entries(node)) {
    if (candidate === key) {
      count += 1;
    }
    count += countKeyOccurrences(value, key);
  }
  return count;
}

/** Dimension 8: no secret declaration, context reference or inheritance. */
function zeroSecretPins(): ShapePin[] {
  const expected =
    "no secrets: declaration, no secrets. context reference and no secrets: inherit anywhere in the file";
  return SHIPPED_FILE_EXPECTATIONS.map((file) =>
    filePin(8, file.name, expected, (found) => {
      const problems: string[] = [];
      found.body.split(/\r?\n/).forEach((line, index) => {
        if (/\bsecrets\s*\./.test(line)) {
          problems.push(`line ${index + 1}: secret context reference`);
        }
        if (/\bsecrets\s*:/.test(line)) {
          problems.push(`line ${index + 1}: secrets declaration or inheritance`);
        }
      });
      const keys = countKeyOccurrences(found.doc, "secrets");
      if (keys !== 0) {
        problems.push(`${keys} secrets mapping key(s) in the parsed tree`);
      }
      return problems.length === 0 ? "" : problems.join("; ");
    }),
  );
}

/** Dimension 9: no shipped file references another shipped file. */
function crossReferencePins(): ShapePin[] {
  const expected = "references no other shipped file";
  return SHIPPED_FILE_EXPECTATIONS.map((file) =>
    filePin(9, file.name, expected, (found) => {
      const problems = declaredNames()
        .filter((other) => other !== file.name && found.body.includes(other))
        .map((other) => `references sibling shipped file ${other}`);
      if (found.body.includes("./.github/workflows/")) {
        problems.push("carries a local workflow reference (./.github/workflows/ form)");
      }
      return problems.length === 0 ? "" : problems.join("; ");
    }),
  );
}

/** The closed dimension set: the contract's ordinal, its wording, and its pins. */
const DIMENSIONS: ReadonlyArray<{
  readonly id: number;
  readonly title: string;
  readonly pins: () => ShapePin[];
}> = [
  {
    id: 1,
    title: "The file set — exactly the shipped names, each matching the reserved pattern",
    pins: fileSetPins,
  },
  { id: 2, title: "Per file: the required header block", pins: headerBlockPins },
  {
    id: 3,
    title:
      "Per job: a reachable permissions block, timeout-minutes, and a runner selector in the repository-variable form with a public GitHub-hosted default",
    pins: jobBoundingPins,
  },
  { id: 4, title: "Per matrix: fail-fast: false", pins: matrixPins },
  {
    id: 5,
    title:
      "Per lane that invokes QFAI: the subcommand, the --profile value and the --fail-on threshold",
    pins: laneInvocationPins,
  },
  { id: 6, title: "Per lane: what makes it inert", pins: laneInertnessPins },
  {
    id: 7,
    title: "The third-party uses: set, as an allow-list against the closed sanctioned set",
    pins: thirdPartyUsesPins,
  },
  {
    id: 8,
    title:
      "Zero secret declarations, secret-context references and secret-inheritance uses across the set",
    pins: zeroSecretPins,
  },
  { id: 9, title: "No shipped file references another shipped file", pins: crossReferencePins },
];

/** Every pin, in dimension order: the diff's operand list and the shape's own table. */
const SHAPE_PINS: readonly ShapePin[] = DIMENSIONS.flatMap((dimension) => dimension.pins());

/**
 * The declared shape. `pinned` is rendered from `SHAPE_PINS`, the same list
 * `diffShippedWorkflowShape` walks, so a dimension can only claim to pin what
 * the diff actually compares.
 */
export const SHIPPED_WORKFLOW_SHAPE: DeclaredShape = {
  dimensions: DIMENSIONS.map(({ id, title }) => ({
    id,
    title,
    pinned: SHAPE_PINS.filter((pin) => pin.dimension === id).map(
      (pin) => `${pin.site} — ${pin.expected}`,
    ),
  })),
};

/**
 * The value literals this shape owns that a second surface could restate — the
 * needle set for the "one place only" scan. Only the dimension-5 invocations
 * qualify: they are the values the contract assigns to the shape, and they are
 * specific enough for a scan to mean something (a bare word like `error` says
 * nothing on its own).
 */
export function shapeValueLiterals(): readonly string[] {
  return SHIPPED_FILE_EXPECTATIONS.flatMap((file) =>
    file.invocations.map((entry) => entry.invocation),
  );
}

/**
 * Diffs the workflow tree under `<rootDir>/.github/workflows` against the
 * declared shape and returns one finding per divergence (empty = accepted).
 */
export async function diffShippedWorkflowShape(rootDir: string): Promise<ShapeFinding[]> {
  const tree = await loadWorkflowTree(rootDir);
  const findings: ShapeFinding[] = [];
  for (const pin of SHAPE_PINS) {
    const actual = pin.observe(tree);
    if (actual !== pin.expected) {
      findings.push({
        code: SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
        dimension: pin.dimension,
        site: pin.site,
        expected: pin.expected,
        actual,
      });
    }
  }
  return findings;
}

/**
 * Renders findings as the text the gate prints when it rejects a tree: the
 * failure code, the dimension, the site, the expected value and the drifted
 * value. Empty string for an accepted tree, so the gate's own assertion can
 * compare against it directly.
 */
export function renderShapeGateReport(findings: readonly ShapeFinding[]): string {
  return findings
    .map(
      (finding) =>
        `${finding.code} dimension ${finding.dimension} at ${finding.site}\n` +
        `  expected: ${finding.expected}\n` +
        `  actual:   ${finding.actual}`,
    )
    .join("\n");
}
