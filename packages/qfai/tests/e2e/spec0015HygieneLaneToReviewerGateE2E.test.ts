/**
 * E2E: a workflow-set regression travels from the CI lane into review (spec-0015)
 *
 * `US-0015-0016` is about a hand-off between two components this repository owns separately: a lint
 * lane emits, and the Reviewer Gate ingests. The integration rows beside
 * `tests/integration/validators/hygieneLaneIngestion.test.ts` own the ingestion oracle, and they
 * feed the gate a **hand-written** finding — which means they establish that the gate handles a
 * payload of that shape, not that the shape is the one the lane produces.
 *
 * That gap is the whole of this story. If the lane's report and the gate's reader disagree about a
 * field name, every ingestion row still passes and the reviewer still sees nothing. So this file
 * runs the REAL committed lane over a REAL planted copy of the workflow trees, parses the finding
 * the lane actually wrote to its own stream, and hands that — not a fixture of it — to the gate.
 *
 * The plant lands on a temp copy. Mutating `.github/` or the packaged assets would move the tree
 * every sibling suite reads.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";
import type { Issue } from "../../src/core/types.js";
import { DIGESTED_LANE_INPUTS_REL } from "../helpers/shippedWorkflowFixtures.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/e2e/<this file> -> tests -> packages/qfai -> packages -> repo root
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const LANE = path.join(repoRoot, "scripts", "check-workflow-hygiene.mjs");
const SHIPPED_WORKFLOWS_REL = path.join(
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  ".github",
  "workflows",
);

/** Error class, script-emitted, a catalog member — the control that must still be rejected. */
const CONTROL = "R-PACK-LOCATION-DRIFT";

/** `R-WORKFLOW-HYGIENE-DRIFT: <rule> — <file> job <job>: <detail>` — the lane's own line format. */
const LANE_LINE = /^R-WORKFLOW-HYGIENE-DRIFT: (.+?) — (.+?) job (.+?): (.*)$/;

type LaneFinding = { code: string; rule: string; file: string; job: string; detail: string };

let root: string;
const scratch: string[] = [];

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-wfset-e2e-"));
});

afterEach(async () => {
  const dirs = scratch.splice(0, scratch.length);
  await Promise.allSettled([root, ...dirs].map((dir) => removeTempTree(dir)));
});

/** Both trees the lane's rules cover, staged under one root so the plant is disposable. */

async function stageWorkflowTrees(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-wfset-plant-"));
  scratch.push(dir);
  await cp(path.join(repoRoot, ".github"), path.join(dir, ".github"), { recursive: true });
  await cp(path.join(repoRoot, SHIPPED_WORKFLOWS_REL), path.join(dir, SHIPPED_WORKFLOWS_REL), {
    recursive: true,
  });
  // And everything else the lane's verification-body digest reads — the manifests it resolves
  // package scripts out of, and the script directories whose file contents it hashes. A staged
  // tree without them is one where every declared body resolves to nothing, so the
  // untouched-trees row would report a digest mismatch it was not staged to produce.
  for (const input of DIGESTED_LANE_INPUTS_REL) {
    await mkdir(path.dirname(path.join(dir, input)), { recursive: true });
    await cp(path.join(repoRoot, input), path.join(dir, input), { recursive: true });
  }
  return dir;
}

/** Every finding the committed lane reported over a staged root, parsed from its own output. */
function runLane(dir: string): { exitCode: number; findings: LaneFinding[] } {
  const child = spawnSync(process.execPath, [LANE, "--root", dir], { encoding: "utf-8" });
  const findings: LaneFinding[] = [];
  for (const line of `${child.stdout ?? ""}${child.stderr ?? ""}`.split(/\r?\n/)) {
    const match = LANE_LINE.exec(line.trim());
    if (match === null) continue;
    findings.push({
      code: "R-WORKFLOW-HYGIENE-DRIFT",
      rule: match[1] ?? "",
      file: match[2] ?? "",
      job: match[3] ?? "",
      detail: match[4] ?? "",
    });
  }
  // `?? -1` and not `?? 1`: a lane that could not be spawned must not read as one that reported a
  // violation, or a broken harness would satisfy every assertion below.
  return { exitCode: child.status ?? -1, findings };
}

async function writeReviewerReport(findings: readonly unknown[]): Promise<void> {
  const dir = path.join(root, ".qfai", "review", "review-20260822000000000");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "reviewer-completion.json"),
    JSON.stringify({ findings }, null, 2),
    "utf-8",
  );
}

async function gateIssues(): Promise<Issue[]> {
  const { config } = await loadConfig(root);
  return validateReviewerJustification(root, config);
}

// QFAI:SPEC-0015:US-0015-0016
describe(
  "E2E: a hygiene regression the lane emits reaches a reviewer with its site intact (US-0015-0016)",
  { timeout: 120000 },
  () => {
    it("carries the lane's own file, job and rule through the gate, and demands no justification", async () => {
      const dir = await stageWorkflowTrees();
      const target = path.join(dir, SHIPPED_WORKFLOWS_REL, "qfai-validate.yml");
      const body = await readFile(target, "utf-8");
      // A real violation of a real rule, and one the lane's shipped-scope half owns: an
      // unsanctioned third-party owner, pinned to a valid 40-hex commit so it fails the allow-list
      // rule rather than the pin rule.
      const planted = body.replace(
        /uses: pnpm\/action-setup@[0-9a-f]{40}/,
        "uses: someone-else/action-setup@0123456789abcdef0123456789abcdef01234567",
      );
      expect(planted, "the plant displaced nothing — the lane would report a clean tree").not.toBe(
        body,
      );
      await writeFile(target, planted, "utf-8");

      const lane = runLane(dir);
      expect(lane.exitCode, "the planted tree did not fail the lane").toBe(1);
      const emitted = lane.findings.find((finding) => finding.detail.includes("someone-else"));
      expect(emitted, "the lane reported no finding naming the planted reference").toBeDefined();
      if (emitted === undefined) return;

      // The hand-off. Every field is the lane's own string — nothing here is re-derived, which is
      // the property that makes this an end-to-end check and not a second fixture.
      await writeReviewerReport([
        {
          code: emitted.code,
          file: emitted.file,
          job: emitted.job,
          rule: emitted.rule,
        },
        // Same report, same run: an error-class catalog member with an empty justification. If the
        // ingestion above were a blanket relaxation rather than a two-code exemption, this stops
        // being rejected and the row fails.
        { code: CONTROL, justification: "" },
      ]);

      const issues = await gateIssues();
      const surfaced = issues.filter((entry) => entry.code === emitted.code);
      expect(surfaced, "the gate did not surface the lane's finding at all").toHaveLength(1);
      expect(
        surfaced[0]?.severity,
        "an ingested deferred-registration code keeps the error class the lane emits it with; " +
          "`BR-0015-0017` defers rejecting it for an empty justification, not its severity",
      ).toBe("error");

      const message = surfaced[0]?.message ?? "";
      expect(message, "the file the lane named did not survive ingestion").toContain(emitted.file);
      expect(message, "the job the lane named did not survive ingestion").toContain(emitted.job);
      expect(message, "the rule the lane named did not survive ingestion").toContain(emitted.rule);
      // The shipped file is what the lane pointed at, spelled as the shipped path. A reviewer sent
      // to `.github/workflows/qfai-validate.yml` is being sent to a file this repository does not
      // have.
      expect(emitted.file, "the lane reported the shipped violation at the wrong path").toContain(
        "assets/init/root/.github/workflows",
      );

      const control = issues.filter((entry) => entry.code === CONTROL);
      expect(control, "the negative control was not rejected in the same run").toHaveLength(1);
      expect(control[0]?.severity).toBe("error");
    });

    it("surfaces nothing when the lane found nothing", async () => {
      // The control for the row above: it plants, runs and asserts a chain of three components, and
      // every link of it would also be satisfied by a gate that emitted its advisory unconditionally.
      const lane = runLane(await stageWorkflowTrees());
      expect(lane.exitCode, "the untouched trees do not pass the lane").toBe(0);
      expect(lane.findings, "the untouched trees produced a finding").toEqual([]);

      await writeReviewerReport([]);
      expect(await gateIssues()).toEqual([]);
    });
  },
);
