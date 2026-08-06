/**
 * Integration: shipped runner-selector indirection and header-table
 * completeness.
 *
 * Covers the operability half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §5 dimensions 2 and
 * 3): every shipped runner selector reads a repository variable whose default
 * is a public GitHub-hosted label, and every shipped file states the
 * operating facts an adopter needs before the first run.
 *
 * Why the indirection earns a row of its own: a runner label GitHub does not
 * know is NOT rejected. The job is queued until somebody cancels it, so the
 * failure mode of a wrong value is silence rather than a red check — which is
 * why BR-0003-0035 puts the risk on the DEFAULT (public, schedulable by any
 * clone or fork) and the knob on a repository variable the adopter owns.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  collectWorkflowJobs,
  HEADER_PLACEHOLDER_VALUE_RE,
  headerComment,
  isRecord,
  loadShippedWorkflows,
  parseHeaderTable,
} from "../helpers/shippedWorkflowFixtures.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** One shipped file as `[name, body]`, the shape `loadShippedWorkflows` yields. */
type ShippedFile = readonly [string, string];

/**
 * The repository variable every shipped runner selector reads. ONE variable
 * for the whole set, not one per file: an adopter retargets CI with a single
 * knob. Value SSOT is this suite per CLI-WFSET §5.
 */
const RUNNER_VARIABLE = "QFAI_CI_RUNNER";

/**
 * The public GitHub-hosted labels a shipped selector default may name.
 * The list has more than one member on purpose: with a single member the
 * predicate below would collapse into an equality check on one literal, and a
 * planted label would then be rejected for "not that string" rather than for
 * "not a public GitHub-hosted label" — the property BR-0003-0035 states.
 */
const PUBLIC_HOSTED_LABELS: readonly string[] = [
  "ubuntu-latest",
  "ubuntu-24.04",
  "ubuntu-22.04",
  "windows-latest",
  "windows-2022",
  "macos-latest",
  "macos-14",
];

/** The default the shipped set pins today (a member of the list above). */
const SHIPPED_RUNNER_DEFAULT = "ubuntu-latest";

/** The exact selector expression the whole shipped set carries. */
const SHIPPED_SELECTOR = `\${{ vars.${RUNNER_VARIABLE} || '${SHIPPED_RUNNER_DEFAULT}' }}`;

/** The sanctioned selector form: a `vars.` read with a literal default. */
const SELECTOR_FORM_RE = /^\$\{\{\s*vars\.([A-Za-z_][A-Za-z0-9_]*)\s*\|\|\s*'([^']*)'\s*\}\}$/;

/** A `runs-on:` mapping line, for the raw-text accounting scan. */
const RUNS_ON_LINE_RE = /^\s*runs-on\s*:/;

/** The label marking a runner that is not GitHub-hosted-public. */
const SELF_HOSTED_RE = /\bself-hosted\b/;

/** Stable rule ids, so a plant can assert WHICH rule rejected it. */
const RULE_FORM = `runs-on must read the repository variable: \${{ vars.${RUNNER_VARIABLE} || '<public-label>' }}`;
const RULE_PUBLIC_DEFAULT = "the selector default must be a public GitHub-hosted label";
const RULE_SELF_HOSTED = "no self-hosted runner label anywhere in the set";
const RULE_UNACCOUNTED = "every runs-on: line must be one of the parsed job selectors";

interface SelectorViolation {
  /** `<file>:<job>`, `<file>:<line>` or `<file>` — the site named. */
  readonly site: string;
  /** One of the RULE_* ids above. */
  readonly rule: string;
  /** The offending value, for the failure message. */
  readonly detail: string;
}

interface Selector {
  readonly file: string;
  readonly jobId: string;
  /** The raw `runs-on` node: a string in the sanctioned form, or anything. */
  readonly value: unknown;
}

/** Every job's `runs-on` node across the given set, in file/job order. */
function collectSelectors(files: readonly ShippedFile[]): Selector[] {
  const selectors: Selector[] = [];
  for (const [file, body] of files) {
    for (const { jobId, job } of collectWorkflowJobs(parse(body))) {
      selectors.push({ file, jobId, value: job["runs-on"] });
    }
  }
  return selectors;
}

/**
 * The parsed half of the predicate: every job selector must be the single
 * string form `${{ vars.<RUNNER_VARIABLE> || '<label>' }}` and the label must
 * be a public GitHub-hosted one. A label array, a runner `group:` mapping, an
 * absent selector and a bare literal are all rejected by the form rule.
 */
function selectorFormViolations(files: readonly ShippedFile[]): SelectorViolation[] {
  const violations: SelectorViolation[] = [];
  for (const { file, jobId, value } of collectSelectors(files)) {
    const site = `${file}:${jobId}`;
    if (typeof value !== "string") {
      violations.push({
        site,
        rule: RULE_FORM,
        detail: value === undefined ? "runs-on is absent" : `runs-on is ${JSON.stringify(value)}`,
      });
      continue;
    }
    const form = SELECTOR_FORM_RE.exec(value.trim());
    if (form === null) {
      violations.push({ site, rule: RULE_FORM, detail: value.trim() });
      continue;
    }
    const variable = form[1] ?? "";
    const fallback = form[2] ?? "";
    if (variable !== RUNNER_VARIABLE) {
      violations.push({ site, rule: RULE_FORM, detail: `reads vars.${variable}` });
    }
    if (!PUBLIC_HOSTED_LABELS.includes(fallback)) {
      violations.push({ site, rule: RULE_PUBLIC_DEFAULT, detail: fallback });
    }
  }
  return violations;
}

/**
 * The raw-text half: no `self-hosted` label anywhere in the executable text,
 * and every `runs-on:` line accounted for by a parsed job selector — so a
 * selector at an unexpected nesting cannot hide a label from the parsed scan.
 * Comment lines are excluded on purpose: header prose legitimately talks
 * ABOUT labels, and a label named in a comment schedules nothing.
 */
function nonPublicLiteralViolations(files: readonly ShippedFile[]): SelectorViolation[] {
  const violations: SelectorViolation[] = [];
  for (const [file, body] of files) {
    const parsedSelectors = collectSelectors([[file, body]]).filter(
      (selector) => selector.value !== undefined,
    ).length;
    let runsOnLines = 0;
    body.split(/\r\n|\r|\n/).forEach((line, index) => {
      if (line.trimStart().startsWith("#")) {
        return;
      }
      if (RUNS_ON_LINE_RE.test(line)) {
        runsOnLines += 1;
      }
      if (SELF_HOSTED_RE.test(line)) {
        violations.push({
          site: `${file}:${index + 1}`,
          rule: RULE_SELF_HOSTED,
          detail: line.trim(),
        });
      }
    });
    if (runsOnLines !== parsedSelectors) {
      violations.push({
        site: file,
        rule: RULE_UNACCOUNTED,
        detail: `${runsOnLines} runs-on: line(s) vs ${parsedSelectors} parsed job selector(s)`,
      });
    }
  }
  return violations;
}

/** The row's whole predicate: both halves, as one violation list. */
function scanRunnerSelectors(files: readonly ShippedFile[]): SelectorViolation[] {
  return [...selectorFormViolations(files), ...nonPublicLiteralViolations(files)];
}

interface PlantedSet {
  /** The file the plant landed in. */
  readonly file: string;
  /** The whole replica set, planted file included. */
  readonly files: ShippedFile[];
}

/**
 * Replaces the first executable `runs-on:` line of the first shipped file
 * with the planted YAML (continuation lines keep their relative indent) and
 * returns an in-memory replica of the whole set. The packaged asset tree is
 * never touched: this predicate's operand is the file bodies, so the replica
 * is the bodies — the sibling topology row copies directories because its
 * predicate reads a directory.
 */
function plantFirstSelector(files: readonly ShippedFile[], planted: string): PlantedSet {
  const replica: ShippedFile[] = files.map(([name, body]) => [name, body]);
  const target = replica[0];
  if (target === undefined) {
    throw new Error("the shipped set is empty — there is nothing to plant into");
  }
  const [file, body] = target;
  const lines = body.split("\n");
  const index = lines.findIndex(
    (line) => !line.trimStart().startsWith("#") && RUNS_ON_LINE_RE.test(line),
  );
  if (index === -1) {
    throw new Error(`${file} declares no runs-on: line to plant into`);
  }
  const indent = /^\s*/.exec(lines[index] ?? "")?.[0] ?? "";
  lines.splice(index, 1, ...planted.split("\n").map((line) => `${indent}${line}`));
  replica[0] = [file, lines.join("\n")];
  return { file, files: replica };
}

interface SelectorPlant {
  readonly label: string;
  /** YAML replacing the target `runs-on:` line, relatively indented. */
  readonly planted: string;
  /** The rule the plant must be rejected BY, not merely rejected under. */
  readonly expectedRule: string;
}

/**
 * The organization-private shapes an adopter's fork cannot schedule. Every
 * one of them is silently queued forever by GitHub rather than rejected,
 * which is why the suite has to reject them instead.
 */
const PRIVATE_LABEL_PLANTS: readonly SelectorPlant[] = [
  {
    label: "bare organization-private label literal",
    planted: "runs-on: ubuntu-latest-8core-acme",
    expectedRule: RULE_FORM,
  },
  {
    label: "variable form defaulting to an organization-private label",
    planted: `runs-on: \${{ vars.${RUNNER_VARIABLE} || 'acme-linux-large' }}`,
    expectedRule: RULE_PUBLIC_DEFAULT,
  },
  {
    label: "self-hosted label array",
    planted: "runs-on: [self-hosted, linux, acme-large]",
    expectedRule: RULE_SELF_HOSTED,
  },
  {
    label: "organization runner group",
    planted: "runs-on:\n  group: acme-runners",
    expectedRule: RULE_FORM,
  },
];

describe("TC-0003-0041 (TDD-0041): planted organization-private label literal is rejected", () => {
  // One it() per TC-0003-0041 verify bullet. Scope notes, disclosed:
  // - The TC's Setup is a REPLICA of the shipped set ("配布 set の複製"), so
  //   no plant ever touches the packaged tree. The predicate's operand is the
  //   file bodies, so the replica is the bodies.
  // - it1's differential baseline (the unplanted set scans clean)
  //   deliberately overlaps it2: a rejection is only evidence when the
  //   unplanted operand is accepted, and "exit 1" is asserted literally —
  //   the same assertion the clean set passes must THROW on each replica.
  // - it3 is BORN GREEN, disclosed: the shipped set never carried a
  //   non-public label, so its zero-count bullet already held before this
  //   row's change. Its in-test control (the same raw scan over a planted
  //   replica) is what makes the zero earned rather than vacuous.
  // - The suite's constants are self-consistent by assertion below, so the
  //   pinned default cannot drift out of the public label set.

  it("every planted organization-private label shape is rejected, and the unplanted replica is not", async () => {
    const files = await loadShippedWorkflows();
    // Non-vacuity: the plants are measured against the real multi-file set.
    expect(files.length, "the shipped set must have two or more files").toBeGreaterThanOrEqual(2);

    // Differential baseline: the operand every plant below is measured
    // against. Without this, a rejection proves nothing.
    expect(scanRunnerSelectors(files)).toEqual([]);

    for (const plant of PRIVATE_LABEL_PLANTS) {
      const replica = plantFirstSelector(files, plant.planted);
      const violations = scanRunnerSelectors(replica.files);
      const matching = violations.filter(
        (violation) =>
          violation.rule === plant.expectedRule && violation.site.startsWith(replica.file),
      );
      expect(
        matching.length,
        `the planted ${plant.label} in ${replica.file} was not rejected by "${plant.expectedRule}" (violations: ${JSON.stringify(violations)})`,
      ).toBeGreaterThanOrEqual(1);
      // The TC's "exit 1": the gate assertion the clean set passes must FAIL
      // on the planted replica, which is what turns a rejection into a red
      // run rather than a logged remark.
      expect(() => {
        expect(scanRunnerSelectors(replica.files)).toEqual([]);
      }, `the planted ${plant.label} left the row's gate assertion green`).toThrow();
    }
  });

  it("every selector in the clean set reads the repository variable and defaults to a public GitHub-hosted label", async () => {
    // Suite self-consistency: the pinned default is a public label, so the
    // two constants cannot drift apart.
    expect(PUBLIC_HOSTED_LABELS).toContain(SHIPPED_RUNNER_DEFAULT);

    const files = await loadShippedWorkflows();
    const selectors = collectSelectors(files);
    // Non-vacuity: the set declares jobs to select runners for.
    expect(
      selectors.length,
      "no shipped job declares runs-on — this row would have no subject",
    ).toBeGreaterThanOrEqual(1);

    expect(selectorFormViolations(files)).toEqual([]);

    // No job is scheduled off an implicit default, and the whole set reads
    // one variable with one public default (declared-shape value SSOT).
    expect(
      selectors
        .filter((selector) => selector.value === undefined)
        .map((selector) => `${selector.file}:${selector.jobId}`),
    ).toEqual([]);
    const distinct = [
      ...new Set(
        selectors.map((selector) =>
          typeof selector.value === "string" ? selector.value.trim() : "",
        ),
      ),
    ].sort();
    expect(distinct, "the clean set's runner selectors").toEqual([SHIPPED_SELECTOR]);
  });

  it("no non-public runner label literal appears anywhere in the set", async () => {
    const files = await loadShippedWorkflows();
    expect(nonPublicLiteralViolations(files)).toEqual([]);

    // Control for the zero above (this it is born green, disclosed): the
    // same raw scan over a replica carrying a self-hosted label array must
    // fire, so the zero is a fact about the shipped bytes, not about the
    // scan.
    const planted = plantFirstSelector(files, "runs-on: [self-hosted, linux, acme-large]");
    expect(nonPublicLiteralViolations(planted.files).map((violation) => violation.rule)).toContain(
      RULE_SELF_HOSTED,
    );

    // Accounting half, stated non-vacuously: there are selector lines to
    // account for, and every one of them is a parsed job selector.
    expect(collectSelectors(files).length).toBeGreaterThanOrEqual(1);
    expect(
      nonPublicLiteralViolations(files).filter((violation) => violation.rule === RULE_UNACCOUNTED),
    ).toEqual([]);
  });
});

/** One header-table field the contract requires, with its obligations. */
interface RequiredHeaderField {
  /** Normalized row label (see `normalizeHeaderLabel`). */
  readonly label: string;
  /** Human-readable name, for violation messages. */
  readonly title: string;
  /**
   * AND of ORs: every group must be satisfied by at least one member
   * appearing (case-insensitively) in the row's value. An empty list means
   * the row's content is file-specific prose and only its presence and
   * non-emptiness are contractual.
   */
  readonly requires: ReadonlyArray<readonly string[]>;
}

/**
 * The closed field list BR-0003-0036 / CLI-WFSET §5 dimension 2 require of
 * every shipped header. Value SSOT is this suite; neither the spec nor the
 * contract restates it.
 */
const REQUIRED_HEADER_FIELDS: readonly RequiredHeaderField[] = [
  { label: "covered layer", title: "Covered layer", requires: [] },
  {
    label: "runner selector",
    title: "Runner selector",
    requires: [[`vars.${RUNNER_VARIABLE}`], PUBLIC_HOSTED_LABELS],
  },
  {
    label: "wrong runner value",
    title: "Wrong runner value",
    requires: [["fail fast"], ["queue", "queued", "queues"], ["indefinite", "forever"]],
  },
  {
    label: "packagemanager precondition",
    title: "`packageManager` precondition",
    requires: [["packageManager"], ["package.json"]],
  },
  { label: "inert when", title: "Inert when", requires: [] },
  { label: "fail open behaviour", title: "Fail-open behaviour", requires: [["warning"]] },
];

/** The label subsets each verify bullet of TC-0003-0042 owns. */
const VARIABLE_FIELD_LABELS: readonly string[] = ["runner selector"];
const FAILURE_MODE_FIELD_LABELS: readonly string[] = ["wrong runner value"];
const OPERATING_FIELD_LABELS: readonly string[] = [
  "packagemanager precondition",
  "covered layer",
  "inert when",
  "fail open behaviour",
];

/**
 * Judges the requested fields of one file's header table: present exactly
 * once, not a placeholder, and carrying every required content group.
 */
function headerFieldViolations(file: string, header: string, labels: readonly string[]): string[] {
  const table = parseHeaderTable(header);
  const violations: string[] = [];
  for (const label of labels) {
    const field = REQUIRED_HEADER_FIELDS.find((candidate) => candidate.label === label);
    if (field === undefined) {
      throw new Error(`no required header field is declared for label "${label}"`);
    }
    const values = table.get(label);
    if (values === undefined) {
      violations.push(`${file}: header table has no "${field.title}" row`);
      continue;
    }
    if (values.length !== 1) {
      violations.push(
        `${file}: header table declares "${field.title}" ${values.length} times (ambiguous)`,
      );
      continue;
    }
    const value = values[0] ?? "";
    if (value === "" || HEADER_PLACEHOLDER_VALUE_RE.test(value)) {
      violations.push(`${file}: header table "${field.title}" row states nothing ("${value}")`);
      continue;
    }
    const haystack = value.toLowerCase();
    for (const group of field.requires) {
      if (!group.some((needle) => haystack.includes(needle.toLowerCase()))) {
        violations.push(
          `${file}: header table "${field.title}" row does not state ${group.join(" / ")} (value: "${value}")`,
        );
      }
    }
  }
  return violations;
}

/**
 * Prose forms of a Node support-floor claim: a qualifier before the version
 * ("requires Node 18") or after it ("18+", "18 or newer"). The explicit
 * `>=X.Y.Z` citation form is deliberately NOT matched here — TDD-0029 owns it
 * (`shippedWorkflows.test.ts`, "no shipped comment line claims a Node support
 * floor the package's engines field does not declare"), which judges every
 * comment line of the set against `package.json#engines.node`. This row owns
 * the prose forms that regex is blind to, so the two oracles complement each
 * other instead of duplicating.
 */
const FLOOR_CLAIM_PATTERNS: readonly RegExp[] = [
  /(?:minimum|minimal|at least|requires?|needs?|supports?)\s+(?:node(?:\.js)?\s*)?v?([0-9]+(?:\.[0-9]+){0,2})\b/gi,
  /\b([0-9]+(?:\.[0-9]+){0,2})\s*(?:\+|or\s+(?:newer|later|above|higher|greater))/gi,
];

/** Every distinct version a prose floor claim in `text` names, sorted. */
function collectFloorClaims(text: string): string[] {
  const claims = new Set<string>();
  for (const pattern of FLOOR_CLAIM_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const version = match[1];
      if (version !== undefined) {
        claims.add(version);
      }
    }
  }
  return [...claims].sort();
}

/** The `>=X.Y.Z` floor `package.json#engines.node` declares, read at run time. */
async function declaredNodeFloor(): Promise<string> {
  const raw = await readFile(path.join(packageRoot, "package.json"), "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const engines = isRecord(parsed) ? parsed["engines"] : undefined;
  const node = isRecord(engines) ? engines["node"] : undefined;
  if (typeof node !== "string") {
    throw new Error("package.json#engines.node is missing — the floor oracle has no baseline");
  }
  const floor = /^>=\s*([0-9]+(?:\.[0-9]+){0,2})$/.exec(node.trim())?.[1];
  if (floor === undefined) {
    throw new Error(`package engines.node "${node}" declares no >=X.Y.Z floor`);
  }
  return floor;
}

describe("TC-0003-0042 (TDD-0042): each shipped header table is complete and claims no undeclared Node floor", () => {
  // One it() per TC-0003-0042 verify bullet. Scope notes, disclosed:
  // - The required-field list above is the closed set BR-0003-0036 names, and
  //   it is value SSOT here per CLI-WFSET §5. Extra rows are allowed (a file
  //   may document more); a DUPLICATED required row is not, because two
  //   answers to one question is not a complete statement.
  // - Content obligations are per field and deliberately narrow: the rows
  //   whose content is contractual (the variable and its default, the
  //   queue-forever failure mode, the `packageManager` precondition, the
  //   warning that accompanies a fail-open) carry keyword groups; the rows
  //   whose content is file-specific prose (covered layer, inertness) are
  //   judged present, single and non-placeholder. The inertness CONDITION
  //   itself is TDD-0036/0037's oracle — this row requires the header to
  //   state one, not to restate its semantics.
  // - it4 owns the PROSE floor-claim forms only; the explicit `>=X.Y.Z`
  //   citation form stays TDD-0029's oracle (see FLOOR_CLAIM_PATTERNS). Its
  //   in-test controls make the zero-claim result non-vacuous: the detector
  //   is shown to fire on three planted prose claims and to stay silent on
  //   the shipped fall-open literal, which is a fallback choice and not a
  //   support-floor claim.

  it("every shipped header table names the repository variable it reads and that variable's default", async () => {
    const files = await loadShippedWorkflows();
    // Non-vacuity: every shipped file is judged, and there are two or more.
    expect(files.length, "the shipped set must have two or more files").toBeGreaterThanOrEqual(2);
    const violations: string[] = [];
    for (const [name, body] of files) {
      violations.push(...headerFieldViolations(name, headerComment(body), VARIABLE_FIELD_LABELS));
    }
    expect(violations).toEqual([]);
  });

  it("every shipped header table states the wrong-value failure mode: no fail fast, the job queues indefinitely", async () => {
    const files = await loadShippedWorkflows();
    expect(files.length).toBeGreaterThanOrEqual(2);
    const violations: string[] = [];
    for (const [name, body] of files) {
      violations.push(
        ...headerFieldViolations(name, headerComment(body), FAILURE_MODE_FIELD_LABELS),
      );
    }
    expect(violations).toEqual([]);
  });

  it("every shipped header table states the packageManager precondition, the covered layer, the inertness condition and the fail-open behaviour", async () => {
    const files = await loadShippedWorkflows();
    expect(files.length).toBeGreaterThanOrEqual(2);
    const violations: string[] = [];
    for (const [name, body] of files) {
      violations.push(...headerFieldViolations(name, headerComment(body), OPERATING_FIELD_LABELS));
    }
    expect(violations).toEqual([]);
  });

  it("no shipped header claims a Node support floor the package's engines field does not declare", async () => {
    const floor = await declaredNodeFloor();
    const files = await loadShippedWorkflows();
    const violations: string[] = [];
    for (const [name, body] of files) {
      for (const claimed of collectFloorClaims(headerComment(body))) {
        if (claimed !== floor) {
          violations.push(
            `${name}: header claims Node support floor "${claimed}" but package engines.node declares ">=${floor}"`,
          );
        }
      }
    }
    expect(violations).toEqual([]);

    // Controls for the zero above: the detector fires on the prose forms a
    // header could regress into, and stays silent on the shipped fall-open
    // literal (a fallback choice, not a support-floor claim). Without these
    // the zero could be a fact about the detector instead of the headers.
    expect(collectFloorClaims("# Requires Node 18 or newer to run.")).toEqual(["18"]);
    expect(collectFloorClaims("# Works on Node 18+.")).toEqual(["18"]);
    expect(collectFloorClaims("# minimum Node 18.17.0")).toEqual(["18.17.0"]);
    expect(collectFloorClaims("# uses Node 20 (the documented fallback)")).toEqual([]);
    // And a prose claim naming the declared floor is not a violation, so the
    // oracle judges the CLAIM against engines rather than banning numbers.
    expect(collectFloorClaims(`# Requires Node ${floor} or newer.`)).toEqual([floor]);
  });
});
