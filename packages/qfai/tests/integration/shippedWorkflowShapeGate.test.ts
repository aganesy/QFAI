/**
 * Integration: the shipped GitHub Actions workflow-set structural contract
 * gate.
 *
 * Covers the gate half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §5): ONE declared
 * shape, whose values live in exactly one module (`shippedWorkflowShape.ts`
 * beside this file), diffed against a workflow tree and reporting
 * `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` with the drifted value and the expected
 * one. The gate's operand is a TREE, so every plant below lands on a temp
 * COPY of the shipped set — the packaged assets are never mutated.
 *
 * Relationship to the sibling shipped-workflow suites, disclosed: each of
 * them owns the DEEP oracle for one property — runner-selector indirection
 * and header-table completeness (`shippedWorkflowRunners`), bounding and
 * credential hygiene (`shippedWorkflows`), SHA pins and leakage-guard breadth
 * (`shippedWorkflowPins`), cross-file references and the `.github`
 * child allow-list (`shippedWorkflowTopology`), lane inertness evaluated as a
 * condition (`shippedWorkflowInertness`), change detection and verdict
 * (`shippedWorkflowDetection`), portability of the setup/install column
 * (`shippedWorkflowPortability`) and the ownership / provenance flow
 * (`shippedWorkflowOwnership`). This file owns the DECLARED SHAPE and its
 * diff — that all nine contract dimensions are pinned in one place, and that
 * each one is actually diffed rather than merely declared. It re-implements
 * no sibling oracle and contradicts none.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { cp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  collectWorkflowJobs,
  shippedGithubDir,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";
import type { ShapeFinding } from "./shippedWorkflowShape.js";
import {
  SHIPPED_WORKFLOW_SHAPE,
  SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
  diffShippedWorkflowShape,
  renderShapeGateReport,
  shapeValueLiterals,
} from "./shippedWorkflowShape.js";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const TESTS_DIR = path.join(packageRoot, "tests");

/** The one module the shape's values are allowed to live in, tests-relative. */
const SHAPE_MODULE_REL = "integration/shippedWorkflowShape.ts";

/** The contract file whose §5 fixes the dimension set and forbids restating values. */
const CONTRACT_PATH = path.join(repoRoot, ".qfai", "contracts", "cli", "shipped-workflows.md");

/** The owning spec pack, scanned for value restatements. */
const SPEC_DIR = path.join(repoRoot, ".qfai", "specs", "spec-0003");

/**
 * The contract's dimension ordinals — a CLOSED set of nine. The ordinals are
 * the contract's own (§5 items 1-9), not shape values; the shape supplies what
 * each one pins.
 */
const CONTRACT_DIMENSION_IDS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * The dimensions whose subject is a shipped FILE (file set, header block,
 * per-job bounding, lane invocation, lane inertness). Every shipped file must
 * be named in each of them, so a file cannot be silently dropped from one —
 * including the two honest "no ordinary value here" answers this set carries
 * today (see the ruling notes in the describe below).
 */
const PER_FILE_DIMENSION_IDS: readonly number[] = [1, 2, 3, 5, 6];

/** The dimension the lane invocation (subcommand / profile / threshold) is. */
const DIMENSION_LANE_INVOCATION = 5;

/** Divergent values the plants write. Never the pinned ones — those are SSOT. */
const PLANTED_PROFILE = "fast";
const PLANTED_THRESHOLD = "warning";
const PLANTED_ACTION = "acme-probe/not-sanctioned";

const newTempDir = useTempDirPool("qfai-wfshape-");

/** The packaged root whose `.github/workflows` is the real shipped set. */
const shippedRootDir = (): string => path.dirname(shippedGithubDir());

const workflowsDirOf = (root: string): string => path.join(root, ".github", "workflows");

/** Copies the REAL shipped `.github/` tree into a fresh temp root. */
async function copyShippedRootToTemp(): Promise<string> {
  const root = await newTempDir();
  await cp(shippedGithubDir(), path.join(root, ".github"), { recursive: true });
  return root;
}

async function workflowNames(root: string): Promise<string[]> {
  return (await readdir(workflowsDirOf(root))).sort();
}

async function readWorkflow(root: string, name: string): Promise<string> {
  return await readFile(path.join(workflowsDirOf(root), name), "utf-8");
}

async function writeWorkflow(root: string, name: string, body: string): Promise<void> {
  await writeFile(path.join(workflowsDirOf(root), name), body, "utf-8");
}

/**
 * Applies `transform` to the EXECUTABLE lines only. Load-bearing for the
 * plants: the shipped header prose quotes the lane invocation, so a body-wide
 * substitution would rewrite a comment and leave the executable value intact —
 * a plant that plants nothing.
 */
function mapExecutableLines(body: string, transform: (line: string) => string): string {
  return body
    .split("\n")
    .map((line) => (line.trimStart().startsWith("#") ? line : transform(line)))
    .join("\n");
}

/**
 * The copied file that invokes the QFAI CLI — dimension 5's only subject
 * today. Selected STRUCTURALLY (an executable line carrying the profile flag)
 * so this suite restates no shape value: the file names live in the shape.
 */
async function qfaiInvokingFile(root: string): Promise<string> {
  for (const name of await workflowNames(root)) {
    const executable = (await readWorkflow(root, name))
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"));
    if (executable.some((line) => /\bqfai\s+[a-z][a-z-]*\s+--profile\b/.test(line))) {
      return name;
    }
  }
  throw new Error(`no workflow under ${workflowsDirOf(root)} invokes the QFAI CLI`);
}

/** The copied file declaring more than one job — the lane orchestrator. */
async function orchestratorFile(root: string): Promise<string> {
  for (const name of await workflowNames(root)) {
    const doc: unknown = parse(await readWorkflow(root, name));
    if (collectWorkflowJobs(doc).length > 1) {
      return name;
    }
  }
  throw new Error(`no workflow under ${workflowsDirOf(root)} declares more than one job`);
}

/**
 * TC-0003-0049's own plant: the invoking lane's `--profile` value and
 * `--fail-on` threshold both diverge from the declared shape. Returns the file
 * the plant landed in.
 */
async function plantProfileAndThresholdDivergence(root: string): Promise<string> {
  const file = await qfaiInvokingFile(root);
  const body = await readWorkflow(root, file);
  const planted = mapExecutableLines(body, (line) =>
    line
      .replace(/--profile[ \t]+[A-Za-z0-9][A-Za-z0-9-]*/, `--profile ${PLANTED_PROFILE}`)
      .replace(/--fail-on[ \t]+[A-Za-z0-9][A-Za-z0-9-]*/, `--fail-on ${PLANTED_THRESHOLD}`),
  );
  if (planted === body) {
    throw new Error(`${file} carries no executable --profile / --fail-on pair to plant into`);
  }
  await writeWorkflow(root, file, planted);
  return file;
}

/** One dimension's falsifying plant: what breaking THAT dimension looks like. */
interface DimensionPlant {
  readonly dimension: number;
  readonly label: string;
  readonly plant: (root: string) => Promise<void>;
}

/**
 * One plant per contract dimension. Each mutates a temp copy in the narrowest
 * way that breaks its own dimension, and every plant selects its target file
 * structurally (never by name), so the table restates no shape value.
 */
const DIMENSION_PLANTS: readonly DimensionPlant[] = [
  {
    dimension: 1,
    label: "shipped name missing from the tree",
    plant: async (root) => {
      await rm(path.join(workflowsDirOf(root), await orchestratorFile(root)));
    },
  },
  {
    dimension: 2,
    label: "leading header comment block stripped",
    plant: async (root) => {
      const file = await qfaiInvokingFile(root);
      const lines = (await readWorkflow(root, file)).split("\n");
      let index = 0;
      while (index < lines.length && (lines[index] ?? "").startsWith("#")) {
        index += 1;
      }
      if (index === 0) {
        throw new Error(`${file} carries no leading header block to strip`);
      }
      await writeWorkflow(root, file, lines.slice(index).join("\n"));
    },
  },
  {
    dimension: 3,
    label: "every job timeout removed",
    plant: async (root) => {
      const file = await orchestratorFile(root);
      const body = await readWorkflow(root, file);
      const planted = body
        .split("\n")
        .filter((line) => !/^\s*timeout-minutes\s*:/.test(line))
        .join("\n");
      if (planted === body) {
        throw new Error(`${file} declares no timeout-minutes line to remove`);
      }
      await writeWorkflow(root, file, planted);
    },
  },
  {
    dimension: 4,
    label: "matrix without fail-fast: false",
    plant: async (root) => {
      const file = await orchestratorFile(root);
      const body = await readWorkflow(root, file);
      let planted = false;
      const lines = body.split("\n").flatMap((line) => {
        const indent = /^(\s*)timeout-minutes\s*:/.exec(line)?.[1];
        if (planted || indent === undefined) {
          return [line];
        }
        planted = true;
        return [
          line,
          `${indent}strategy:`,
          `${indent}  matrix:`,
          `${indent}    leg: [alpha, beta]`,
        ];
      });
      if (!planted) {
        throw new Error(`${file} offers no job to attach a matrix to`);
      }
      await writeWorkflow(root, file, lines.join("\n"));
    },
  },
  {
    dimension: DIMENSION_LANE_INVOCATION,
    label: "divergent profile value and fail-on threshold",
    plant: async (root) => {
      await plantProfileAndThresholdDivergence(root);
    },
  },
  {
    dimension: 6,
    label: "every lane condition removed",
    plant: async (root) => {
      const file = await orchestratorFile(root);
      const body = await readWorkflow(root, file);
      const planted = body
        .split("\n")
        .filter((line) => !/^\s*if\s*:/.test(line))
        .join("\n");
      if (planted === body) {
        throw new Error(`${file} declares no if: condition to remove`);
      }
      await writeWorkflow(root, file, planted);
    },
  },
  {
    dimension: 7,
    label: "unsanctioned third-party action",
    plant: async (root) => {
      const file = await qfaiInvokingFile(root);
      const body = await readWorkflow(root, file);
      let planted = false;
      const result = mapExecutableLines(body, (line) => {
        const match = /^(\s*(?:- )?uses:\s*)[^\s@]+(@\S+)$/.exec(line);
        if (planted || match === null) {
          return line;
        }
        planted = true;
        return `${match[1] ?? ""}${PLANTED_ACTION}${match[2] ?? ""}`;
      });
      if (!planted) {
        throw new Error(`${file} carries no executable uses: reference to rewrite`);
      }
      await writeWorkflow(root, file, result);
    },
  },
  {
    dimension: 8,
    label: "workflow-level secret reference",
    plant: async (root) => {
      const file = await orchestratorFile(root);
      const body = await readWorkflow(root, file);
      const block = ["env:", "  QFAI_PLANTED_TOKEN: ${{ secrets.GITHUB_TOKEN }}", ""].join("\n");
      await writeWorkflow(root, file, `${body}${block}`);
    },
  },
  {
    dimension: 9,
    label: "reference to a sibling shipped file",
    plant: async (root) => {
      const target = await orchestratorFile(root);
      const sibling = (await workflowNames(root)).find((name) => name !== target);
      if (sibling === undefined) {
        throw new Error("the shipped set has no sibling file to reference");
      }
      const body = await readWorkflow(root, target);
      await writeWorkflow(root, target, `${body}# planted cross-file reference: ${sibling}\n`);
    },
  },
];

/** How far the statement window below may walk in either direction. */
const STATEMENT_WINDOW = 12;

/**
 * The source statement enclosing `lines[index]`, as one string. Load-bearing
 * for the one-place scan: a needle can sit alone on a line inside a multi-line
 * `expect(...)` call, and prettier re-wraps long assertion lines on every
 * format run, so a single-line window would silently re-open the hole the scan
 * exists to close. Walks back to the previous statement boundary and forward to
 * this statement's end, bounded so no input makes the walk unbounded.
 */
function enclosingStatement(lines: readonly string[], index: number): string {
  const isBoundary = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed === "" || /[;{}]$/.test(trimmed);
  };
  let start = index;
  while (start > 0 && index - start < STATEMENT_WINDOW && !isBoundary(lines[start - 1] ?? "")) {
    start -= 1;
  }
  let end = index;
  while (
    end < lines.length - 1 &&
    end - index < STATEMENT_WINDOW &&
    !isBoundary(lines[end] ?? "")
  ) {
    end += 1;
  }
  return lines.slice(start, end + 1).join("\n");
}

/**
 * The gate's OWN verdict assertion: zero findings, with the rendered report as
 * the failure message. Passing is the gate's exit 0; throwing is its exit 1,
 * and the thrown message is what the lane prints.
 */
function assertShapeGateAccepts(findings: readonly ShapeFinding[]): void {
  expect(findings, renderShapeGateReport(findings)).toEqual([]);
}

describe("TC-0003-0049 (TDD-0049): planted profile and threshold divergence makes the gate exit 1", () => {
  // One it() per TC-0003-0049 verify bullet.
  //
  // RECORDED DEVIATION FROM THE TC'S ACTION (delivery-planner ruling for this
  // row, same class of substitution accepted for TC-0003-0034 and
  // TC-0003-0051). The TC says to run `pnpm ci:lint` planted and clean. That
  // is unrealizable in-suite for two independent reasons: (a) the planted half
  // would have to mutate the REAL distributed assets, which no suite may do,
  // and (b) the aggregate is a minutes-long chain of unrelated lanes, so its
  // exit code would not be this gate's exit code. The adopted shape drives
  // `diffShippedWorkflowShape()` directly over planted temp copies and clean
  // trees, and realizes "exit 1" as the gate's own verdict assertion failing
  // (`assertShapeGateAccepts` above) — the substitute proves a STRONGER fact
  // than the literal Action: it names which dimension diverged, with the
  // expected and the drifted value, instead of only a non-zero status. The
  // static `pnpm ci:lint` placement pin (and the wiring itself) is TDD-0050's
  // row; nothing here asserts the lane registry.
  //
  // RULINGS APPLIED, disclosed because they decide what the shape may say:
  // - Dimension 6 ("what makes each lane inert") accepts "never inert;
  //   deletion is the opt-out" as a LEGAL value. The validate lane's header
  //   answers exactly that and TDD-0042 shipped it, so a shape that demanded
  //   an opt-in condition from every lane would read the shipped set as
  //   violating its own contract. it2's clean acceptance is where that holds,
  //   and it3's per-file coverage is what stops the shape from ducking the
  //   question by omitting the file.
  // - Dimension 5 has NO subject in the orchestrator: its five lanes are echo
  //   placeholders and invoke no QFAI subcommand. The shape says so instead of
  //   inventing values, which is again it3's per-file coverage.
  //
  // SUBSUMED HERE (DTC-26), with the moved assertions' test-case reference
  // registered on this row: the ad-hoc dimension-5 string assertions that used
  // to sit in `tests/assets/assets.test.ts` and `tests/cli/init.test.ts` —
  // annotated there as "TC-0003 (static) — workflow template exists in init
  // tree" — now have exactly one oracle, the declared shape's dimension-5 pins.
  // The contract names only the asset suite; the init suite carried the same
  // literal, which is why it4's scan is tree-wide. The reference is registered
  // in THIS file rather than in the shape module because the traceability scan
  // reads only `*.test.ts` / `*.spec.ts`, so an annotation in the shape module
  // would be invisible to it.
  //   QFAI:SPEC-0003:TC-0003-0049

  it("planted profile and threshold divergence is reported as shape drift with the drifted and expected values, and the gate's verdict assertion fails (exit 1)", async () => {
    // Differential baseline: a rejection is only evidence when the unplanted
    // operand is accepted. Deliberate overlap with it2, which owns the bullet.
    const cleanRoot = await copyShippedRootToTemp();
    expect(await diffShippedWorkflowShape(cleanRoot)).toEqual([]);

    const plantedRoot = await copyShippedRootToTemp();
    const plantedFile = await plantProfileAndThresholdDivergence(plantedRoot);
    const findings = await diffShippedWorkflowShape(plantedRoot);

    const laneFindings = findings.filter(
      (finding) =>
        finding.dimension === DIMENSION_LANE_INVOCATION && finding.site.startsWith(plantedFile),
    );
    expect(
      laneFindings.length,
      `the planted profile value and fail-on threshold in ${plantedFile} produced no lane-invocation drift (findings: ${JSON.stringify(findings)})`,
    ).toBeGreaterThanOrEqual(2);
    expect([...new Set(laneFindings.map((finding) => finding.code))]).toEqual([
      SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
    ]);

    // The report is what the lane prints: the failure code, the site, both
    // drifted values and — taken from the SSOT, never restated here — both
    // expected values.
    const report = renderShapeGateReport(findings);
    expect(report).toContain(SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE);
    expect(report).toContain(plantedFile);
    expect(report).toContain(`--profile ${PLANTED_PROFILE}`);
    expect(report).toContain(`--fail-on ${PLANTED_THRESHOLD}`);
    for (const finding of laneFindings) {
      expect(finding.expected).not.toEqual(finding.actual);
      expect(report).toContain(finding.expected);
      expect(
        shapeValueLiterals().some((literal) => literal.includes(finding.expected)),
        `the expected value "${finding.expected}" is not one the declared shape owns`,
      ).toBe(true);
    }

    // The TC's "exit 1": the verdict assertion that passes on a clean tree
    // must FAIL here, and its message must carry the failure code — that is
    // what turns a divergence into a red lane rather than a logged remark.
    expect(() => {
      assertShapeGateAccepts(findings);
    }, "the planted divergence left the gate's verdict assertion green").toThrow(
      SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
    );
  });

  it("the clean shipped tree and a clean copy of it are both accepted (exit 0), and an emptied tree is not", async () => {
    // The packaged tree is the shipped set the TC's clean half speaks about.
    assertShapeGateAccepts(await diffShippedWorkflowShape(shippedRootDir()));

    const cleanCopy = await copyShippedRootToTemp();
    assertShapeGateAccepts(await diffShippedWorkflowShape(cleanCopy));
    // Non-vacuity: what was accepted is the real multi-file set, not an empty
    // directory. Acceptance also encodes both rulings above — the never-inert
    // lane and the lane set with no QFAI invocation are LEGAL, or this clean
    // run could not be green.
    expect(
      (await workflowNames(cleanCopy)).length,
      "the accepted tree must carry two or more shipped files",
    ).toBeGreaterThanOrEqual(2);

    // Control for the exit 0 above: the gate is not a no-op. A tree whose
    // workflows directory has been emptied must be rejected, so acceptance is
    // a fact about the tree rather than about the diff.
    const emptied = await copyShippedRootToTemp();
    for (const name of await workflowNames(emptied)) {
      await rm(path.join(workflowsDirOf(emptied), name));
    }
    const emptyFindings = await diffShippedWorkflowShape(emptied);
    expect(
      emptyFindings.length,
      "an emptied workflows directory produced no finding — the gate accepts anything",
    ).toBeGreaterThanOrEqual(1);
    expect(() => {
      assertShapeGateAccepts(emptyFindings);
    }).toThrow();
  });

  it("the declared shape pins all nine contract dimensions, and every one of them is actually diffed", async () => {
    const declaredIds = SHIPPED_WORKFLOW_SHAPE.dimensions
      .map((dimension) => dimension.id)
      .sort((left, right) => left - right);
    expect(
      declaredIds,
      "the declared shape must pin the contract's closed set of nine dimensions — one missing is a contract violation",
    ).toEqual(CONTRACT_DIMENSION_IDS);

    // Suite self-consistency: the falsifying plants cover the same closed set.
    expect([...DIMENSION_PLANTS].map((plant) => plant.dimension).sort((a, b) => a - b)).toEqual(
      CONTRACT_DIMENSION_IDS,
    );

    for (const dimension of SHIPPED_WORKFLOW_SHAPE.dimensions) {
      expect(dimension.title.trim(), `dimension ${dimension.id} carries no title`).not.toEqual("");
      expect(
        dimension.pinned.length,
        `dimension ${dimension.id} pins nothing — declared but empty is omitted`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        dimension.pinned.filter((entry) => entry.trim() === ""),
        `dimension ${dimension.id} carries an empty pin`,
      ).toEqual([]);
    }

    // Per-file dimensions name every shipped file, so no file can be dropped
    // from one — this is where the dimension 5 and dimension 6 rulings bite.
    const names = await workflowNames(shippedRootDir());
    for (const id of PER_FILE_DIMENSION_IDS) {
      const dimension = SHIPPED_WORKFLOW_SHAPE.dimensions.find((entry) => entry.id === id);
      const pins = (dimension?.pinned ?? []).join("\n");
      for (const name of names) {
        expect(pins, `dimension ${id} states nothing about ${name}`).toContain(name);
      }
    }

    // Falsifiability AND specificity. A dimension the shape names but the diff
    // never reports is decoration; a dimension the diff reports on ANY byte
    // difference is worse, because a catch-all satisfies a bare "≥1 finding for
    // dimension N" loop for all nine at once while analysing nothing. Each
    // plant therefore has to light its own dimension and leave the other eight
    // dark. No plant is allowed cross-talk: the per-file observers treat an
    // absent file as accepted (absence is dimension 1's finding and nobody
    // else's), and each plant mutates only what its own dimension reads.
    expect(await diffShippedWorkflowShape(await copyShippedRootToTemp())).toEqual([]);
    for (const plant of DIMENSION_PLANTS) {
      const root = await copyShippedRootToTemp();
      await plant.plant(root);
      const findings = await diffShippedWorkflowShape(root);
      const own = findings.filter(
        (finding) =>
          finding.dimension === plant.dimension &&
          finding.code === SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
      );
      expect(
        own.length,
        `dimension ${plant.dimension} is declared but not diffed: the planted ${plant.label} produced ${JSON.stringify(findings)}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        findings.filter((finding) => finding.dimension !== plant.dimension),
        `the planted ${plant.label} was reported outside dimension ${plant.dimension} — an indiscriminate diff cannot attribute drift to a dimension`,
      ).toEqual([]);

      // Each reported expectation must be one the dimension PINS, which is what
      // forces `pinned` to be rendered from the same structured expectations the
      // diff consumes. A pin that merely mentions a filename answers nothing and
      // cannot contain the expectation a finding carries.
      const pins = (
        SHIPPED_WORKFLOW_SHAPE.dimensions.find((entry) => entry.id === plant.dimension)?.pinned ??
        []
      ).join("\n");
      for (const finding of own) {
        expect(
          finding.expected.trim(),
          `dimension ${plant.dimension} reported an empty expectation`,
        ).not.toEqual("");
        expect(finding.expected).not.toEqual(finding.actual);
        expect(
          pins,
          `dimension ${plant.dimension} reported the expectation "${finding.expected}" that its own pins do not state`,
        ).toContain(finding.expected);
      }
    }
  });

  it("the shape's values live in one place: no second test module asserts them and neither the spec nor the contract restates them", async () => {
    const needles = shapeValueLiterals();
    expect(
      needles.length,
      "the declared shape exposes no value literal, so the one-place scan would be vacuous",
    ).toBeGreaterThanOrEqual(1);

    // Tests side. The shape module DECLARES the literals; no other test module
    // may ASSERT them, because a second oracle is exactly the drift class the
    // contract's DTC-5 records. Two deliberate scoping rules: the needle-bearing
    // line itself may be a comment (a comment states nothing that can go red —
    // the same reason the runner suite excludes comment lines from its label
    // scan), and the `expect(` lookup runs over the needle's whole ENCLOSING
    // STATEMENT, so a needle wrapped onto its own line by prettier is still
    // caught.
    const declaring: string[] = [];
    const asserting: string[] = [];
    for (const filePath of (await fg(["**/*.ts"], { cwd: TESTS_DIR, absolute: true })).sort()) {
      const relative = path.relative(TESTS_DIR, filePath).split(path.sep).join("/");
      const lines = (await readFile(filePath, "utf-8")).split(/\r?\n/);
      lines.forEach((line, index) => {
        if (!needles.some((needle) => line.includes(needle))) {
          return;
        }
        if (relative === SHAPE_MODULE_REL) {
          declaring.push(`${relative}:${index + 1}`);
          return;
        }
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
          return;
        }
        if (!enclosingStatement(lines, index).includes("expect(")) {
          return;
        }
        asserting.push(`${relative}:${index + 1}: ${trimmed}`);
      });
    }
    expect(
      declaring.length,
      `${SHAPE_MODULE_REL} declares none of the literals it is the SSOT for`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      asserting,
      "a second test module asserts the declared shape's values — the gate subsumes and replaces those assertions rather than running alongside them",
    ).toEqual([]);

    // Spec side: the spec names the DIMENSIONS, never the values.
    const specRestatements: string[] = [];
    for (const filePath of (await fg(["**/*.md"], { cwd: SPEC_DIR, absolute: true })).sort()) {
      const relative = path.relative(SPEC_DIR, filePath).split(path.sep).join("/");
      const source = await readFile(filePath, "utf-8");
      source.split(/\r?\n/).forEach((line, index) => {
        if (needles.some((needle) => line.includes(needle))) {
          specRestatements.push(`${relative}:${index + 1}`);
        }
      });
    }
    expect(specRestatements, "the spec restates a declared-shape value").toEqual([]);

    // Contract side: no restatement, and the non-restatement is the contract's
    // own stated position rather than an accident of today's wording.
    const contract = await readFile(CONTRACT_PATH, "utf-8");
    const contractRestatements = needles.filter((needle) => contract.includes(needle));
    expect(contractRestatements, "the contract restates a declared-shape value").toEqual([]);
    expect(contract).toContain("The **values** are SSOT in the test suite");
    expect(contract).toContain("This contract does not restate them");
    expect(contract).toContain("**closed set of dimensions** the declared shape must pin");
  });
});
