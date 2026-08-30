/**
 * Integration: shipped GitHub Actions workflow-set action pinning.
 *
 * Covers the supply-chain pin half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §6): every `uses:`
 * reference in the shipped set is a bare 40-hex commit SHA pin with no
 * floating major / minor / branch reference anywhere, and no test in the
 * suite retains a floating-major expectation for the shipped workflows (the
 * DTC-26 co-change obligation, scanned tree-wide across
 * `packages/qfai/tests` after the class escaped a file-scoped scan once).
 * The readable version relocated into step `name:` values is the second
 * describe's surface. The leakage guard's own behaviour — rejecting a
 * conventional pin-comment trailer on a staged copy while accepting the
 * shipped tree as-is, with the guard script itself unchanged — is the third
 * describe's surface.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  DIGESTED_LANE_INPUTS_REL,
  isRecord,
  loadShippedWorkflows,
  shippedGithubDir,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TESTS_DIR = path.join(packageRoot, "tests");

/**
 * Recursively collects every string value held under a `uses` key anywhere
 * in a parsed workflow document (step-level and job-level references alike).
 * YAML comments never reach the parse tree, so comment mentions of an action
 * are deliberately out of scope here — the comment surface belongs to the
 * version-marker rows.
 */
function collectUsesValues(node: unknown): string[] {
  const values: string[] = [];
  if (Array.isArray(node)) {
    for (const member of node) {
      values.push(...collectUsesValues(member));
    }
    return values;
  }
  if (!isRecord(node)) {
    return values;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "uses" && typeof value === "string") {
      values.push(value);
    } else {
      values.push(...collectUsesValues(value));
    }
  }
  return values;
}

/** The `@`-suffix of a `uses:` reference, or undefined when it has none. */
function refSuffix(usesValue: string): string | undefined {
  const at = usesValue.lastIndexOf("@");
  return at === -1 ? undefined : usesValue.slice(at + 1);
}

const SHA_PIN_RE = /^[0-9a-f]{40}$/;
// Floating forms the TC names: a major tag (v4), a minor tag (v4.1), or a
// branch reference. These are the mutable-pointer shapes; an exact-looking
// tag is still not a SHA pin and is caught by the 40-hex assertion.
const FLOATING_REF_RES: readonly RegExp[] = [/^v[0-9]+$/, /^v[0-9]+\.[0-9]+$/, /^(?:main|master)$/];

describe("TC-0003-0030 (TDD-0030): every shipped uses value is a 40-hex SHA pin", () => {
  it("every uses: value in every shipped workflow is pinned to a 40-hex commit SHA", async () => {
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const usesValue of collectUsesValues(parse(body))) {
        const suffix = refSuffix(usesValue);
        if (suffix === undefined || !SHA_PIN_RE.test(suffix)) {
          violations.push(`${name}: uses: ${usesValue} is not pinned to a 40-hex commit SHA`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("zero floating major / minor / branch references across the shipped set", async () => {
    const floating: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const usesValue of collectUsesValues(parse(body))) {
        const suffix = refSuffix(usesValue) ?? "";
        if (FLOATING_REF_RES.some((re) => re.test(suffix))) {
          floating.push(`${name}: uses: ${usesValue} is a floating reference`);
        }
      }
    }
    expect(floating).toEqual([]);
  });

  it("DTC-26 co-change: no test in the suite expects a floating-major reference for the shipped workflows", async () => {
    // The obligation, not a line pin: once the shipped set is SHA-pinned,
    // any surviving floating-major expectation (`@v<digits>`) would demand
    // the un-pinned form back and turn the pin change red elsewhere. The
    // scan covers the WHOLE tests tree, not just assets.test.ts: the class
    // escaped a file-scoped scan once (tests/cli/init.test.ts carried the
    // same floating expectations as assets.test.ts and stayed red on the
    // pinned tree until this scan was widened).
    const testFiles = (await fg(["**/*.ts"], { cwd: TESTS_DIR, absolute: true })).sort();
    const offending: string[] = [];
    for (const filePath of testFiles) {
      const source = await readFile(filePath, "utf-8");
      const relative = path.relative(TESTS_DIR, filePath).split(path.sep).join("/");
      source.split(/\r?\n/).forEach((line, index) => {
        if (/@v[0-9]/.test(line)) {
          offending.push(`${relative}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offending).toEqual([]);
  });
});

describe("TC-0003-0031 (TDD-0031): readable version lives in the step name without a leading letter", () => {
  // The readable form: digits-dot-digits(-dot-digits). This pattern asserts
  // version PRESENCE in each pinned step's name and nothing more — it can
  // match inside a leading-v string too (e.g. the "4.0" substring of
  // "v4.4.0"). The leading-v PROHIBITION is deliberately not this oracle's
  // job: it is enforced by the guard-pattern zero-match it below, per
  // TC-0003-0031 bullet 3 / CLI-WFSET §6 (presence and leading-v live in
  // separate oracles by the TC's own split).
  const READABLE_VERSION_RE = /\b[0-9]+\.[0-9]+(\.[0-9]+)?\b/;

  // The leakage guard's version regex, mirrored LITERALLY from
  // packages/qfai/scripts/check-no-internal-version-leakage.sh; the
  // tree-wide it below asserts the mirror is still in sync with the guard
  // before judging with it ("guard と同じ pattern" is the TC's requirement).
  const GUARD_VERSION_RE_SOURCE = String.raw`\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b|\bv1\.x\b`;
  const guardVersionRe = (): RegExp => new RegExp(GUARD_VERSION_RE_SOURCE);
  const GUARD_SCRIPT_PATH = path.join(
    packageRoot,
    "scripts",
    "check-no-internal-version-leakage.sh",
  );

  type PinnedStep = { uses: string; name: string | undefined };

  /** Collects every step whose `uses:` suffix is a 40-hex SHA pin. */
  function collectPinnedSteps(doc: unknown): PinnedStep[] {
    const pinned: PinnedStep[] = [];
    if (!isRecord(doc)) {
      return pinned;
    }
    const jobs = doc["jobs"];
    if (!isRecord(jobs)) {
      return pinned;
    }
    for (const job of Object.values(jobs)) {
      if (!isRecord(job)) {
        continue;
      }
      const steps = job["steps"];
      if (!Array.isArray(steps)) {
        continue;
      }
      for (const step of steps) {
        if (!isRecord(step)) {
          continue;
        }
        const uses = step["uses"];
        if (typeof uses !== "string") {
          continue;
        }
        const suffix = refSuffix(uses);
        if (suffix !== undefined && SHA_PIN_RE.test(suffix)) {
          const stepName = step["name"];
          pinned.push({ uses, name: typeof stepName === "string" ? stepName : undefined });
        }
      }
    }
    return pinned;
  }

  it("every SHA-pinned step's name carries a readable version without a leading letter", async () => {
    const missing: string[] = [];
    let pinnedStepCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const step of collectPinnedSteps(parse(body))) {
        pinnedStepCount += 1;
        if (step.name === undefined) {
          missing.push(`${name}: pinned step (uses: ${step.uses}) has no name`);
        } else if (!READABLE_VERSION_RE.test(step.name)) {
          missing.push(`${name}: pinned step name "${step.name}" carries no readable version`);
        }
      }
    }
    // Non-vacuity guard: the shipped set carries pinned steps today; zero
    // collected would mean this oracle stopped observing anything.
    expect(pinnedStepCount).toBeGreaterThanOrEqual(1);
    expect(missing).toEqual([]);
  });

  it("comment lines across the shipped set carry zero guard-pattern version markers", async () => {
    const offending: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      body.split(/\r?\n/).forEach((line, index) => {
        if (!line.trimStart().startsWith("#")) {
          return;
        }
        if (guardVersionRe().test(line)) {
          offending.push(`${name}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offending).toEqual([]);
  });

  it("the guard pattern matches zero times across the whole shipped tree", async () => {
    // SSOT sync first: judging "with the same pattern as the guard" is only
    // honest while the mirrored literal IS the guard's literal.
    const guardScript = await readFile(GUARD_SCRIPT_PATH, "utf-8");
    expect(guardScript).toContain(`INTERNAL_VERSION_RE='${GUARD_VERSION_RE_SOURCE}'`);

    const hits: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      body.split(/\r?\n/).forEach((line, index) => {
        if (guardVersionRe().test(line)) {
          hits.push(`${name}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});

describe("TC-0003-0033 (TDD-0033): leakage guard exits 1 on a planted conventional pin trailer, guard diff is empty", () => {
  // Realizes TC-0003-0033 (AC-0003-0028; BR-0003-0027 "guard breadth is
  // invariant", NFR-C0005). Bullet mapping:
  //   - Verify bullet 1 ("planted exit 1, clean exit 0") is the first two
  //     it()s. The REAL committed guard is spawned against a temp-staged
  //     package fixture — planted trailers live only on temp copies, never
  //     on the shipped tree or the guard's own inputs.
  //   - Verify bullet 2 ("guard script diff is 0 lines — no narrowing, no
  //     new pragma, no allow-list entry") is the third it(). The guard
  //     script is edit-forbidden for this change (DR-0003-0008), so the
  //     empty diff is realized as content pins on the committed script.
  //     The INTERNAL_VERSION_RE literal itself is already byte-pinned by
  //     TDD-0031's SSOT-sync assertion earlier in this file (it runs in
  //     every whole-file run); the third it() pins the complementary
  //     surfaces and deliberately does not duplicate that pin.
  //   - Verify bullet 3 (the pre-build lint-shipping YAML rule detecting
  //     own-line trailers before comment-line skipping) was split off to
  //     TDD-0056 and is NOT covered by this describe.
  const newTempDir = useTempDirPool("qfai-pins-leakage-");

  const GUARD_SCRIPT_PATH = path.join(
    packageRoot,
    "scripts",
    "check-no-internal-version-leakage.sh",
  );

  // The conventional pin-comment form the contract rejects (the trailing
  // `# v<X.Y.Z>` after a pinned uses: value). Carries a dot so it matches
  // the guard's version pattern, and no at-sign so the DTC-26 tree-wide
  // test scan in the first describe stays clean over this file.
  const PLANTED_TRAILER = "# v6.1.0";

  type GuardRun = { status: number | null; stdout: string; stderr: string };

  /**
   * Spawns the committed guard script with cwd inside the fixture so its
   * auto-ROOT detection falls through to ROOT="." (the proven pattern from
   * tests/scripts/checkNoInternalVersionLeakage.test.ts).
   */
  function runGuard(cwd: string): GuardRun {
    const child = spawnSync("bash", [GUARD_SCRIPT_PATH], { cwd, encoding: "utf-8" });
    if (child.error) {
      // Fail loudly if bash itself could not be spawned — a null status
      // would otherwise read as a confusing assertion diff.
      throw child.error;
    }
    return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
  }

  /**
   * Stages a minimal package the guard can scan end-to-end: a package.json
   * whose files[] lists only "assets", plus a copy of the REAL shipped
   * `.github/` tree at its packaged location under assets/. The guard
   * derives its scan set from files[], so it scans exactly this copy.
   */
  async function stageShippedPackageFixture(): Promise<{ dir: string; workflowsDir: string }> {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "qfai-leakage-fixture", version: "0.0.0", files: ["assets"] }),
      "utf-8",
    );
    const githubDest = path.join(dir, "assets", "init", "root", ".github");
    await cp(shippedGithubDir(), githubDest, { recursive: true });
    return { dir, workflowsDir: path.join(githubDest, "workflows") };
  }

  /**
   * Appends the planted trailer to the first `uses:` line of the first
   * staged workflow that has one and returns that file's name. Throws when
   * no staged workflow carries a `uses:` line — the plant would be vacuous
   * and the guard run would prove nothing.
   */
  async function plantPinTrailer(workflowsDir: string): Promise<string> {
    for (const name of (await readdir(workflowsDir)).sort()) {
      const filePath = path.join(workflowsDir, name);
      const body = await readFile(filePath, "utf-8");
      const planted = body.replace(/^([ \t]*(?:- )?uses:[^\r\n]*)/m, `$1 ${PLANTED_TRAILER}`);
      if (planted !== body) {
        await writeFile(filePath, planted, "utf-8");
        return name;
      }
    }
    throw new Error(`no staged workflow under ${workflowsDir} carries a uses: line to plant on`);
  }

  it("exits 1 on a staged copy carrying a conventional pin trailer on a uses: line, naming the file", async () => {
    const { dir, workflowsDir } = await stageShippedPackageFixture();
    const plantedFile = await plantPinTrailer(workflowsDir);
    const run = runGuard(dir);
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/FAIL: internal spec id, version marker, or trace id leaked/);
    // The guard's grep -rn hit output names the offending file and echoes
    // the planted line itself.
    expect(run.stderr).toContain(plantedFile);
    expect(run.stderr).toContain(PLANTED_TRAILER);
  });

  it("exits 0 on the clean staged copy — the version-bearing step names ship through the guard as-is", async () => {
    const { dir, workflowsDir } = await stageShippedPackageFixture();
    // Non-vacuity: this clean pass is only proof that the readable
    // step-name versions clear the guard while the staged tree demonstrably
    // carries at least one such name (e.g. "... actions/checkout 4.4.0").
    let versionBearingNames = 0;
    for (const name of (await readdir(workflowsDir)).sort()) {
      const body = await readFile(path.join(workflowsDir, name), "utf-8");
      for (const line of body.split(/\r?\n/)) {
        if (/^[ \t]*(?:- )?name:.*\b[0-9]+\.[0-9]+\.[0-9]+\b/.test(line)) {
          versionBearingNames += 1;
        }
      }
    }
    expect(versionBearingNames).toBeGreaterThanOrEqual(1);
    const run = runGuard(dir);
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/^OK: no internal spec ids/m);
  });

  it("guard-diff-is-empty: the committed script keeps its unfiltered scan line and gains no pragma / allow-list / exclusion handling", async () => {
    const script = await readFile(GUARD_SCRIPT_PATH, "utf-8");
    // The one scan pipeline every distributed surface goes through, pinned
    // byte-for-byte: all three pattern classes feed a single recursive grep
    // with no inverted-grep filter, no exclusion flag and no pragma layer
    // in between. (The INTERNAL_VERSION_RE literal feeding it is byte-pinned
    // by TDD-0031's SSOT-sync assertion above — referenced, not repeated.)
    expect(script).toContain(
      'hits=$(grep -rnE "$INTERNAL_SPEC_RE|$INTERNAL_VERSION_RE|$INTERNAL_ID_RE" "$target" 2>/dev/null || true)',
    );
    // No pragma support of any spelling has been added to the guard (the
    // `qfai-shipping:allow` pragma exists only in the pre-build src-comment
    // lint, a different layer; the guard stays pragma-blind).
    expect(script).not.toMatch(/pragma/i);
    // No allow-list handling and no grep path-exclusion or path-inclusion
    // flags anywhere in the script.
    expect(script).not.toMatch(/allow[-_]?list/i);
    expect(script).not.toMatch(/--exclude|--include/);
    // The only inverted grep in the whole script is the pre-existing
    // schemaVersion carve-out for package.json — nothing new filters
    // version-marker hits out of the FAIL path.
    expect(script.match(/grep -v/g) ?? []).toHaveLength(1);
    expect(script).toContain(String.raw`| grep -vE 'package\.json' || true`);
  });
});

describe("TC-0003-0032 (TDD-0032): the shipped third-party allow-list rejects an unsanctioned owner", () => {
  // Realizes TC-0003-0032 (AC-0003-0027, EX-0003-0029). The rule under test is
  // `shipped-third-party` in the workflow-hygiene lane: every third-party
  // `uses:` owner in the SHIPPED set must be a member of a closed sanctioned
  // list. Both Verify bullets are here, and the second is the one that gives
  // the row its value — a count-of-zero implementation would redden on the
  // clean tree, which is why the clean leg is not a formality.
  //
  // The lane is spawned against a temp COPY. Its own docblock requires that:
  // planting into `.github/` or into the packaged assets would mutate the
  // tree every other suite reads.
  const newTempDir = useTempDirPool("qfai-pins-thirdparty-");

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
  /** The file carrying the one sanctioned third-party reference today. */
  const THIRD_PARTY_FILE = "qfai-validate.yml";
  const UNSANCTIONED_OWNER = "someone-else";

  type LaneRun = { exitCode: number; output: string };

  /**
   * Runs the lane over a staged root.
   *
   * `?? -1` and not `?? 1`: a lane that could not be spawned at all must stay
   * distinguishable from one that reported a violation, or a broken harness
   * reads as a passing rejection.
   */
  function runLane(root: string): LaneRun {
    const child = spawnSync(process.execPath, [LANE, "--root", root], { encoding: "utf-8" });
    return {
      exitCode: child.status ?? -1,
      output: `${child.stdout ?? ""}${child.stderr ?? ""}`,
    };
  }

  /** Both trees the lane's structural rules cover, staged under one root. */
  async function stageTree(): Promise<string> {
    const dir = await newTempDir();
    await cp(path.join(repoRoot, ".github"), path.join(dir, ".github"), { recursive: true });
    await cp(path.join(repoRoot, SHIPPED_WORKFLOWS_REL), path.join(dir, SHIPPED_WORKFLOWS_REL), {
      recursive: true,
    });
    // And everything else the lane's verification-body digest reads; without it every declared
    // body resolves to nothing and the untouched-set row below reports a digest mismatch it was
    // not staged to produce.
    for (const input of DIGESTED_LANE_INPUTS_REL) {
      await mkdir(path.dirname(path.join(dir, input)), { recursive: true });
      await cp(path.join(repoRoot, input), path.join(dir, input), { recursive: true });
    }
    return dir;
  }

  /** Only the lane's own findings, so an unrelated diagnostic cannot satisfy a `toContain`. */
  function findingsOf(output: string): string {
    return output
      .split(/\r?\n/)
      .filter((line) => line.startsWith("R-WORKFLOW-HYGIENE-DRIFT:"))
      .join("\n");
  }

  /** The third-party owners the untouched shipped set references, first-party excluded. */
  async function shippedThirdPartyOwners(): Promise<string[]> {
    const owners = new Set<string>();
    for (const [, body] of await loadShippedWorkflows()) {
      for (const match of body.matchAll(/^\s*(?:- )?uses:\s*([^@\s]+)@/gm)) {
        const owner = (match[1] ?? "").split("/")[0] ?? "";
        if (owner !== "" && !owner.startsWith(".") && !["actions", "github"].includes(owner)) {
          owners.add(owner);
        }
      }
    }
    return [...owners].sort();
  }

  it("exits 1 on a planted unsanctioned owner, naming both the reference and the allow-list", async () => {
    const dir = await stageTree();
    const target = path.join(dir, SHIPPED_WORKFLOWS_REL, THIRD_PARTY_FILE);
    const body = await readFile(target, "utf-8");
    // The plant keeps a valid 40-hex suffix on purpose: it must fail the
    // third-party rule and not the pin rule, or this row would pass while
    // the allow-list did nothing.
    const planted = body.replace(
      /uses: pnpm\/action-setup@[0-9a-f]{40}/,
      `uses: ${UNSANCTIONED_OWNER}/action-setup@0123456789abcdef0123456789abcdef01234567`,
    );
    expect(planted, "the plant found no sanctioned reference to displace").not.toBe(body);
    await writeFile(target, planted, "utf-8");

    const run = runLane(dir);
    expect(run.exitCode, "an unsanctioned third-party owner must fail the lane").toBe(1);

    const findings = findingsOf(run.output);
    expect(findings, "the finding does not name the offending reference").toContain(
      UNSANCTIONED_OWNER,
    );
    expect(findings, "the finding does not render the sanctioned set").toContain("pnpm");
    expect(findings, "the plant tripped the pin rule instead of the allow-list").not.toContain(
      "action-pin",
    );
  });

  it("exits 0 on the untouched set, which still carries a sanctioned third-party reference", async () => {
    // Non-vacuity first: without a third-party reference in the shipped set,
    // the clean leg below would pass against a rule that never evaluates.
    expect(
      await shippedThirdPartyOwners(),
      "the shipped set references no third party, so the clean leg proves nothing",
    ).toEqual(["pnpm"]);

    const run = runLane(await stageTree());
    // A count-of-zero implementation reddens here. That is the whole point of
    // the leg: it falsifies the reading the allow-list exists to replace.
    expect(run.exitCode, "the untouched shipped set must pass the lane").toBe(0);
    expect(findingsOf(run.output)).toBe("");
  });
});
