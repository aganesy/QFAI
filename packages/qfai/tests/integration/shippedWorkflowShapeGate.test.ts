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
  isRecord,
  shippedGithubDir,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";
import type { ShapeFinding } from "./shippedWorkflowShape.js";
import {
  SHAPE_PIN_SEPARATOR,
  SHIPPED_WORKFLOW_SHAPE,
  SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
  diffShippedWorkflowShape,
  renderShapeGateReport,
  writeShapeFindingsForReviewerGate,
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

/**
 * The directory the Reviewer Gate scans for findings.
 *
 * `.qfai/review/**` is where `validateReviewerJustification` looks, and `shipped-workflow-shape`
 * is a sibling of the hygiene lane's `workflow-hygiene` directory rather than a review PACK — the
 * gate reads any `*.json` under the tree, so the name says which lane produced it.
 */
const shapeReviewDir = (): string =>
  path.join(repoRoot, ".qfai", "review", "shipped-workflow-shape");

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
      const planted = `${body}${block}`;
      if (planted === body) {
        throw new Error(`${file} did not take the planted secret block`);
      }
      await writeWorkflow(root, file, planted);
    },
  },
  {
    dimension: 9,
    label: "comment naming a sibling shipped file",
    plant: async (root) => {
      const target = await orchestratorFile(root);
      const sibling = (await workflowNames(root)).find((name) => name !== target);
      if (sibling === undefined) {
        throw new Error("the shipped set has no sibling file to reference");
      }
      const body = await readWorkflow(root, target);
      const planted = `${body}# planted cross-file reference: ${sibling}\n`;
      if (planted === body) {
        throw new Error(`${target} did not take the planted comment reference`);
      }
      await writeWorkflow(root, target, planted);
    },
  },
  {
    dimension: 9,
    // The actual hazard the contract names: an EXECUTABLE local reference. An
    // absent target turns the referencing workflow into a parse error with no
    // repair path under create-only install, and a comment cannot do that — so
    // dimension 9 has to reject the executable form on its own evidence.
    label: "executable local workflow reference to a sibling",
    plant: async (root) => {
      const target = await orchestratorFile(root);
      const sibling = (await workflowNames(root)).find((name) => name !== target);
      if (sibling === undefined) {
        throw new Error("the shipped set has no sibling file to reference");
      }
      const body = await readWorkflow(root, target);
      let planted = false;
      const result = mapExecutableLines(body, (line) => {
        const match = /^(\s*(?:- )?uses:\s*)[^\s@]+@\S+$/.exec(line);
        if (planted || match === null) {
          return line;
        }
        planted = true;
        return `${match[1] ?? ""}./.github/workflows/${sibling}`;
      });
      if (!planted) {
        throw new Error(`${target} carries no executable uses: reference to redirect`);
      }
      await writeWorkflow(root, target, result);
    },
  },
  {
    dimension: 1,
    // Dimension 1 owns diagnosis, not just membership: an unparsable shipped
    // file must be named as unparsable rather than surfacing as "no QFAI
    // invocation" or "lane is not declared" somewhere downstream.
    label: "shipped file that no longer parses",
    plant: async (root) => {
      const file = await orchestratorFile(root);
      const body = await readWorkflow(root, file);
      const planted = `${body}broken: [unclosed\n`;
      if (planted === body) {
        throw new Error(`${file} did not take the planted parse error`);
      }
      await writeWorkflow(root, file, planted);
    },
  },
];

/**
 * Values that name a pin's site and answer nothing. A closed deny-list, because
 * the structural coupling between `pinned` and the diff cannot by itself tell a
 * real expectation from a filler one.
 */
const PLACEHOLDER_PIN_VALUES: readonly string[] = ["pinned", "ok", "n/a", "-", "tbd", "none"];

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
  // A statement ends at `;` or at a blank line — NOT at `{` or `}`. Treating a
  // brace as a boundary let an object literal escape the scan entirely:
  // `expect(finding).toEqual({` ends in `{`, so the backward walk stopped there
  // and never reached the `expect(` on the same line.
  const isBoundary = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed === "" || trimmed.endsWith(";");
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
    const shipped = await diffShippedWorkflowShape(shippedRootDir());

    // …and the findings go where the Reviewer Gate reads them, BEFORE the assertion below can end
    // the test.
    //
    // `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` sits in `DEFERRED_CATALOG_REGISTRATION_CODES` beside
    // `R-WORKFLOW-HYGIENE-DRIFT`, and the gate is required to ingest BOTH. The hygiene lane grew a
    // producer; this code had none anywhere in the repository — it appeared only in the catalog and
    // in tests — so shape drift reddened `lint:workflow-shape` and reached no reviewer. This gate is
    // that lane (`packages/qfai/package.json#lint:workflow-shape` runs exactly this file), so it is
    // the producer.
    //
    // Written on every run, including a clean one: an empty `findings` array is the statement that
    // the lane ran and found nothing, and a missing file then means it did not run — two different
    // facts that have to stay distinguishable. It also overwrites a stale artifact rather than
    // leaving one to be read as current.
    // `repoRoot` as the boundary, so every component from the checkout down is checked as a real
    // directory rather than only the leaf. `.qfai/review/**` is gitignored but not unwritable, and
    // this producer runs on an untrusted checkout in the `build` bridge.
    await writeShapeFindingsForReviewerGate(shapeReviewDir(), shipped, repoRoot);

    assertShapeGateAccepts(shipped);

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
    // Distinct dimensions, because a dimension may carry more than one plant
    // (dimension 9's comment and executable forms, dimension 1's membership and
    // diagnosis forms).
    expect(
      [...new Set(DIMENSION_PLANTS.map((plant) => plant.dimension))].sort((a, b) => a - b),
    ).toEqual(CONTRACT_DIMENSION_IDS);

    for (const dimension of SHIPPED_WORKFLOW_SHAPE.dimensions) {
      expect
        .soft(dimension.title.trim(), `dimension ${dimension.id} carries no title`)
        .not.toEqual("");
      expect
        .soft(
          dimension.pinned.length,
          `dimension ${dimension.id} pins nothing — declared but empty is omitted`,
        )
        .toBeGreaterThanOrEqual(1);

      // Every pin's VALUE half must answer its dimension. The structural
      // coupling between `pinned` and the diff guarantees the two lists agree;
      // it cannot tell a real expectation from filler, so the value is judged
      // against a closed placeholder deny-list and a minimum-informativeness
      // rule. `<site> — pinned` names the file and states nothing.
      for (const entry of dimension.pinned) {
        const separator = entry.indexOf(SHAPE_PIN_SEPARATOR);
        const value = (
          separator === -1 ? entry : entry.slice(separator + SHAPE_PIN_SEPARATOR.length)
        ).trim();
        expect
          .soft(value, `dimension ${dimension.id} carries an empty pin ("${entry}")`)
          .not.toEqual("");
        expect
          .soft(
            PLACEHOLDER_PIN_VALUES.includes(value.toLowerCase()),
            `dimension ${dimension.id} pin "${entry}" states a placeholder, not an expectation`,
          )
          .toBe(false);
        expect
          .soft(
            value.includes(" ") || value.includes(":"),
            `dimension ${dimension.id} pin "${entry}" is too terse to be an expectation`,
          )
          .toBe(true);
      }
    }

    // Per-file dimensions name every shipped file, so no file can be dropped
    // from one — this is where the dimension 5 and dimension 6 rulings bite.
    const names = await workflowNames(shippedRootDir());
    for (const id of PER_FILE_DIMENSION_IDS) {
      const dimension = SHIPPED_WORKFLOW_SHAPE.dimensions.find((entry) => entry.id === id);
      const pins = (dimension?.pinned ?? []).join("\n");
      for (const name of names) {
        expect.soft(pins, `dimension ${id} states nothing about ${name}`).toContain(name);
      }
    }

    // Falsifiability AND specificity. A dimension the shape names but the diff
    // never reports is decoration; a dimension the diff reports on ANY byte
    // difference is worse, because a catch-all satisfies a bare "≥1 finding for
    // dimension N" loop for all nine at once while analysing nothing. Each
    // plant therefore has to light its own dimension and leave the other eight
    // dark. No plant is allowed cross-talk: the per-file observers treat an
    // absent file — and an unparsable one — as accepted (both are dimension 1's
    // finding and nobody else's), and each plant mutates only what its own
    // dimension reads. Soft assertions, so one dead leg reports every other
    // leg's verdict in the same run instead of hiding behind the first failure.
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
      expect
        .soft(
          own.length,
          `dimension ${plant.dimension} is declared but not diffed: the planted ${plant.label} produced ${JSON.stringify(findings)}`,
        )
        .toBeGreaterThanOrEqual(1);
      expect
        .soft(
          findings.filter((finding) => finding.dimension !== plant.dimension),
          `the planted ${plant.label} was reported outside dimension ${plant.dimension} — an indiscriminate diff cannot attribute drift to a dimension`,
        )
        .toEqual([]);

      // Each reported expectation must be one the dimension PINS. The
      // containment is structural by construction (`pinned` renders these same
      // pins), so it is the informativeness rules above — not this line — that
      // reject a filler pin; this line is what keeps the two lists ONE list, so
      // a future refactor cannot let the table and the diff diverge.
      const pins = (
        SHIPPED_WORKFLOW_SHAPE.dimensions.find((entry) => entry.id === plant.dimension)?.pinned ??
        []
      ).join("\n");
      for (const finding of own) {
        expect
          .soft(
            finding.expected.trim(),
            `dimension ${plant.dimension} reported an empty expectation`,
          )
          .not.toEqual("");
        expect.soft(finding.expected).not.toEqual(finding.actual);
        expect
          .soft(
            pins,
            `dimension ${plant.dimension} reported the expectation "${finding.expected}" that its own pins do not state`,
          )
          .toContain(finding.expected);
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

    // The three positions are matched on NORMALISED prose — emphasis markers
    // dropped, whitespace collapsed, lowercased — and on the shortest phrase
    // that still identifies each position. A verbatim pin would red this lane
    // for a re-wrap or a bolding change, which is a non-defect; what must not
    // change silently is the contract's stated position itself.
    const normalizedContract = contract.replace(/[*_`]/g, "").replace(/\s+/g, " ").toLowerCase();
    for (const position of [
      "values are ssot in the test suite",
      "does not restate them",
      "closed set of dimensions",
    ]) {
      expect
        .soft(
          normalizedContract,
          `the contract no longer states "${position}" — the one-place obligation would rest on this suite alone`,
        )
        .toContain(position);
    }
  });
});

/** The package script that runs this gate, and the root aggregate entry that names it. */
const GATE_PACKAGE_SCRIPT = "lint:workflow-shape";
const GATE_ROOT_INVOCATION = `pnpm -C packages/qfai ${GATE_PACKAGE_SCRIPT}`;

/** The established precedent this wiring copies: a vitest run already inside the lint aggregate. */
const PRECEDENT_PACKAGE_SCRIPT = "lint:shipping";
const PRECEDENT_ROOT_INVOCATION = `pnpm -C packages/qfai ${PRECEDENT_PACKAGE_SCRIPT}`;

/** The release-only aggregate's whole-suite entry, through which it runs this gate transitively. */
const RELEASE_TRANSITIVE_ENTRY = "pnpm -C packages/qfai test";

/** This file, package-relative — the operand the gate's package script must name. */
const GATE_TEST_REL = "tests/integration/shippedWorkflowShapeGate.test.ts";

/** The subsumed asset assertions' test-case reference, registered on the shape-gate side. */
const SUBSUMED_ANNOTATION = "QFAI:SPEC-0003:TC-0003-0049";

/** The `scripts` block of a package manifest, string entries only. */
async function readScripts(packageJsonPath: string): Promise<Record<string, string>> {
  const parsed: unknown = JSON.parse(await readFile(packageJsonPath, "utf-8"));
  const scripts = isRecord(parsed) ? parsed["scripts"] : undefined;
  if (!isRecord(scripts)) {
    throw new Error(`${packageJsonPath} declares no scripts block`);
  }
  const entries: Record<string, string> = {};
  for (const [name, value] of Object.entries(scripts)) {
    if (typeof value === "string") {
      entries[name] = value;
    }
  }
  return entries;
}

describe("TC-0003-0050 (TDD-0050): gate is wired into the lint aggregate and not the release-only aggregate", () => {
  // One it() per TC-0003-0050 verify bullet.
  //
  // RULING 124 — "does not appear in `ci:gate`" is the NAMED invocation, and
  // this suite asserts that reading explicitly rather than assuming it.
  // `ci:gate` already contains `pnpm -C packages/qfai test`, which runs the
  // whole package suite and therefore executes this very gate transitively, so
  // a literal-absence reading is unsatisfiable by ANY edit to `ci:lint`. What
  // the contract's placement rule protects is that the gate can red a pull
  // request: `ci:gate` is release-only, so a divergence caught only there
  // arrives too late. That property is delivered by the NAMED `ci:lint` entry
  // and is not defeated by the transitive execution — so it2 asserts the named
  // absence, and asserts the transitive entry's PRESENCE as well, so the
  // reading is visible instead of implied.
  //
  // RULING 125 — the wiring form is established precedent, not a new one.
  // `pnpm -C packages/qfai lint:shipping` is already a `vitest run <file>`
  // entry inside `ci:lint`, so a vitest invocation there is not a novel mixed
  // aggregate. it1 asserts the precedent alongside the new entry, so "we
  // followed the existing form" is a checked fact. It also settles the shape
  // module's home: vitest is the invoker, so the module stays in the tests
  // tree beside this file and needs no build step.
  //   QFAI:SPEC-0003:TC-0003-0050

  it("the gate's invocation path appears in pnpm ci:lint, in the form the existing vitest lane already uses", async () => {
    const rootScripts = await readScripts(path.join(repoRoot, "package.json"));
    const ciLint = rootScripts["ci:lint"] ?? "";
    expect(ciLint, "the root manifest declares no ci:lint script").not.toEqual("");
    expect(
      ciLint,
      `ci:lint must name the gate's invocation path (${GATE_ROOT_INVOCATION}) — the lint aggregate is what pull requests run`,
    ).toContain(GATE_ROOT_INVOCATION);

    // The path is complete, not just a name: the package script it names must
    // be a vitest run of THIS file.
    const packageScripts = await readScripts(path.join(packageRoot, "package.json"));
    const gateScript = packageScripts[GATE_PACKAGE_SCRIPT] ?? "";
    expect(gateScript, `packages/qfai declares no ${GATE_PACKAGE_SCRIPT} script`).not.toEqual("");
    expect(gateScript).toContain("vitest run");
    expect(gateScript).toContain(GATE_TEST_REL);
    expect(
      path.resolve(packageRoot, GATE_TEST_REL),
      "the wired path does not resolve to this suite",
    ).toEqual(fileURLToPath(import.meta.url));

    // Ruling 125 made falsifiable: the precedent it copies is really there.
    expect(ciLint, "the precedent vitest lane is no longer in ci:lint").toContain(
      PRECEDENT_ROOT_INVOCATION,
    );
    expect(packageScripts[PRECEDENT_PACKAGE_SCRIPT] ?? "").toContain("vitest run");
  });

  it("the gate's invocation path does not appear in pnpm ci:gate, which only the release workflow runs", async () => {
    const rootScripts = await readScripts(path.join(repoRoot, "package.json"));
    const ciGate = rootScripts["ci:gate"] ?? "";
    const ciLint = rootScripts["ci:lint"] ?? "";
    expect(ciGate, "the root manifest declares no ci:gate script").not.toEqual("");

    for (const named of [GATE_ROOT_INVOCATION, GATE_PACKAGE_SCRIPT, GATE_TEST_REL]) {
      expect
        .soft(
          ciGate,
          `ci:gate names the gate ("${named}") — a divergence caught only in the release-only aggregate arrives after the pull request is already green`,
        )
        .not.toContain(named);
    }

    // Ruling 124's premise, asserted rather than assumed: the release aggregate
    // does run this gate transitively through the whole-suite entry. The named
    // absence above is therefore the only satisfiable reading, and the property
    // the rule protects lives in the lint aggregate.
    expect(
      ciGate,
      "ci:gate no longer runs the package suite — ruling 124's premise would need revisiting",
    ).toContain(RELEASE_TRANSITIVE_ENTRY);
    expect(ciLint).toContain(GATE_ROOT_INVOCATION);
    expect(ciLint).not.toContain(RELEASE_TRANSITIVE_ENTRY);
  });

  it("the subsumed asset assertions' test-case reference stays registered on the expected-shape side", async () => {
    // Registered as an ANNOTATION, which is what the traceability scan reads:
    // a comment line, not this assertion's own string literal. Scanning only
    // comment lines is what keeps the check from proving itself.
    const gateSource = await readFile(fileURLToPath(import.meta.url), "utf-8");
    const annotatedComments = gateSource.split(/\r\n|\r|\n/).filter((line) => {
      const trimmed = line.trimStart();
      return (
        (trimmed.startsWith("//") || trimmed.startsWith("*")) && line.includes(SUBSUMED_ANNOTATION)
      );
    });
    expect(
      annotatedComments.length,
      `the subsumed reference ${SUBSUMED_ANNOTATION} is not registered in a comment on the shape-gate side`,
    ).toBeGreaterThanOrEqual(1);

    // And registered where the repository's traceability registry reads it.
    const registry = await readFile(
      path.join(repoRoot, "tests", "integration", "qfai-traceability.md"),
      "utf-8",
    );
    expect(registry).toContain(`- ${SUBSUMED_ANNOTATION}`);

    // Neither carrier lost its own test-case annotation, and each still points
    // at the gate that subsumed its dimension-5 assertion — "not deleted"
    // means the trail from the old site to the new oracle survives too.
    const carriers: ReadonlyArray<{ rel: string; annotation: string }> = [
      { rel: "tests/assets/assets.test.ts", annotation: "TC-0003 (static)" },
      { rel: "tests/cli/init.test.ts", annotation: "TC-0003-0001 (alias)" },
    ];
    for (const carrier of carriers) {
      const source = await readFile(path.join(packageRoot, carrier.rel), "utf-8");
      expect
        .soft(source, `${carrier.rel} lost its ${carrier.annotation} annotation`)
        .toContain(carrier.annotation);
      expect
        .soft(source, `${carrier.rel} no longer points at the gate that subsumed its assertion`)
        .toContain(GATE_TEST_REL.split("/").pop() ?? GATE_TEST_REL);
    }
  });
});
