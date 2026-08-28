/**
 * `scripts/check-publish-dry-run.mjs` — the pack verification that failed the required status
 * context on every pull request.
 *
 * Found by running the layered CI scaffold for the first time (PR #794). `npm publish --dry-run`
 * exits non-zero when the working version is already on the registry, and that is the NORMAL state
 * of a feature branch: the version in `package.json` is whatever `main` carries, and once that
 * version is released every pull request inherits it. The dry-run still builds the tarball and
 * lists its contents — which is the failure this check exists to catch — and then refuses on
 * publishability, which no pull request is asking about.
 *
 * `build` carries the required status context (`.github/required-status-contexts.json`), so the
 * effect was that the required context could not pass at all while the current version was
 * published.
 *
 * The classification is tested rather than the script, because the script talks to a registry and a
 * test that needs the network to decide a verdict is a test that fails for reasons unrelated to the
 * thing it checks. `classifyDryRun` is the whole decision.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyDryRun,
  verifyTarballIndependently,
} from "../../../../../scripts/check-publish-dry-run.mjs";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");

/** The verbatim tail of the failure observed on PR #794's `build` job. */
const ALREADY_PUBLISHED_STDERR = [
  "npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)",
  "npm error You cannot publish over the previously published versions: 1.10.0.",
  "npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2026-08-20T09_21_44_546Z-debug-0.log",
].join("\n");

// Review finding [06]. `classifyDryRun` is pure and takes the proof as an argument, so the rows
// above can assert the DECISION without a registry. These two assert the proof itself, which needs
// a real `npm pack` — the whole point being that no text a lifecycle script prints can stand in for
// one.
describe("the tarball proof is a separate process and a file on disk", () => {
  it("proves this package's own tarball", { timeout: 300_000 }, () => {
    const proof = verifyTarballIndependently(path.join(REPO_ROOT, "packages", "qfai"));
    expect.soft(proof.ok, `expected a tarball, got: ${proof.reason}`).toBe(true);

    // The reason carries npm's own accounting, which is what makes the tolerance auditable rather
    // than a bare boolean in a log.
    // The reason names what was checked, and that now includes WHICH digest — a proof that only
    // matched a name and a gzip header read the same in the log as one that matched npm's own
    // accounting, which is how the weaker version went unnoticed.
    expect
      .soft(
        proof.reason,
        "the proof must name the tarball, its file count, its size and the digests it verified",
      )
      .toMatch(
        /^`npm pack` built .+\.tgz \([0-9]+ files, [0-9]+ bytes, (?:shasum|integrity)(?:\+(?:shasum|integrity))* verified\)$/,
      );
  });

  it("refuses a directory that packs nothing", { timeout: 300_000 }, () => {
    // The other direction. Without it every assertion above holds for a proof that answers `true`
    // unconditionally — and a tolerance resting on a proof that always agrees is the defect this
    // replaced, wearing a different implementation.
    const proof = verifyTarballIndependently(path.join(REPO_ROOT, "packages"));
    expect
      .soft(
        proof.ok,
        "a directory with no package.json cannot produce a tarball, and must not report one",
      )
      .toBe(false);
    expect.soft(proof.reason, "and the refusal must say why").not.toBe("");
  });
});

describe("check-publish-dry-run tolerates an already-published version and nothing else", () => {
  it("accepts the already-published failure when a separate pack proved the tarball", () => {
    const verdict = classifyDryRun(
      {
        status: 1,
        stdout: "npm notice total files: 205\nnpm notice version: 1.10.0\n",
        stderr: ALREADY_PUBLISHED_STDERR,
      },
      { ok: true, reason: "`npm pack` built qfai-1.10.0.tgz (207 files, 4321858 bytes)" },
      { ok: true, reason: "the registry confirms qfai@1.10.0 is published" },
    );
    expect.soft(verdict.ok, `expected tolerance, got: ${verdict.reason}`).toBe(true);
    expect
      .soft(verdict.reason, "the tolerance must say what it tolerated")
      .toMatch(/already published/i);
    expect
      .soft(verdict.warnings, "the not-logged-in warning is known noise and must not be surfaced")
      .toEqual([]);
  });

  it("still fails any other non-zero status", () => {
    // The direction that matters: a broken pack, a missing file, a network error. If tolerance were
    // written as "ignore non-zero" rather than "ignore this message", this is the case that would
    // pass silently — and a pack verification that passes over a broken pack verifies nothing.
    const verdict = classifyDryRun(
      {
        status: 1,
        stdout: "",
        stderr: "npm error ENOENT: no such file or directory, open 'package.json'\n",
      },
      { ok: true, reason: "`npm pack` built qfai-1.10.0.tgz (207 files, 4321858 bytes)" },
      { ok: true, reason: "the registry confirms qfai@1.10.0 is published" },
    );
    expect.soft(verdict.ok, "an unrelated failure must stay fatal").toBe(false);
    expect
      .soft(verdict.reason, "and must be reported as a non-zero exit rather than as tolerated")
      .toMatch(/non-zero status/i);
  });

  it("fails a clean exit that produced a real warning", () => {
    const verdict = classifyDryRun({
      status: 0,
      stdout: "npm warn publish npm-shrinkwrap.json will be ignored\n",
      stderr: "",
    });
    expect.soft(verdict.ok, "a real warning is still treated as an error").toBe(false);
    expect
      .soft(verdict.warnings, "and the warning is named so an operator can act on it")
      .toEqual(["npm warn publish npm-shrinkwrap.json will be ignored"]);
  });

  it("fails an already-published run that ALSO produced a real warning", () => {
    // The boundary between the two rules. Tolerating the version must not tolerate everything else
    // that came with it, and this is the case where a careless implementation returns `ok` because
    // it matched the version message and stopped looking.
    const verdict = classifyDryRun(
      {
        status: 1,
        stdout: "npm warn publish npm-shrinkwrap.json will be ignored\n",
        stderr: ALREADY_PUBLISHED_STDERR,
      },
      { ok: true, reason: "`npm pack` built qfai-1.10.0.tgz (207 files, 4321858 bytes)" },
      { ok: true, reason: "the registry confirms qfai@1.10.0 is published" },
    );
    expect.soft(verdict.ok, "a real warning survives the version tolerance").toBe(false);
    expect.soft(verdict.warnings.length, "and is reported").toBe(1);
  });

  it("refuses when the REGISTRY did not confirm the version, however the child described it", () => {
    // The [06] repair hardened one conjunct and left the other reading the same child's text.
    // Two escapes were measured through it: `npm pack` does not run `prepublishOnly` at all, so a
    // `prepublishOnly` printing the registry's sentence and exiting 1 still reached `ok: true`;
    // and a `prepack` can branch on npm's own `npm_command` to behave during `pack` and not
    // during `publish`. Both leave a real tarball and a forged sentence.
    //
    // So the already-published claim is the registry's to make. This row plants exactly that
    // shape — perfect text, real tarball, registry saying no — and requires a refusal.
    const verdict = classifyDryRun(
      {
        status: 1,
        stdout: "npm notice === Tarball Details ===\nnpm notice total files: 205\n",
        stderr: ALREADY_PUBLISHED_STDERR,
      },
      { ok: true, reason: "`npm pack` built qfai-1.10.0.tgz (207 files, 4321858 bytes)" },
      { ok: false, reason: "the registry did not confirm qfai@1.10.0 is published" },
    );
    expect(
      verdict.ok,
      "text the pull request controls must not establish what the registry alone can",
    ).toBe(false);
    expect(verdict.reason).toMatch(/registry/i);
  });

  it("refuses when the child named no already-published failure, however good the proofs", () => {
    // The text is a NECESSARY conjunct, never a sufficient one. Dropping it entirely was tried:
    // the tolerance then accepted ANY non-zero dry-run on a published version, `ENOENT` included,
    // and the row above caught it. The text is what says WHICH failure is being tolerated; the two
    // proofs are what stop a pull request from writing that sentence itself.
    const verdict = classifyDryRun(
      { status: 1, stdout: "", stderr: "npm error something unrecognisable\n" },
      { ok: true, reason: "`npm pack` built qfai-1.10.0.tgz (207 files, 4321858 bytes)" },
      { ok: true, reason: "the registry confirms qfai@1.10.0 is published" },
    );
    expect(verdict.ok, "an unnamed failure is not the tolerated one").toBe(false);
  });
  it("refuses the already-published message when no separate pack proved a tarball", () => {
    // The phrase alone is not evidence that the pack ran. `prepublishOnly`, `prepack` and
    // `prepare` all execute BEFORE npm packs anything, so a lifecycle script printing the
    // registry's sentence and exiting non-zero reproduces the whole tolerated signature with no
    // tarball in existence — and the required `build` context would then go green over a pack
    // that never happened.
    //
    // Review finding [06]: the first repair for this read npm's `=== Tarball Details ===` banner
    // out of the SAME child's output, which the same lifecycle script can print. The stdout here
    // carries that banner deliberately — a row that omitted it would pass against the old
    // implementation too, and prove nothing about what changed.
    const verdict = classifyDryRun({
      status: 1,
      stdout: "npm notice === Tarball Details ===\nnpm notice total files: 205\n",
      stderr: "npm error You cannot publish over the previously published versions: 1.10.0.\n",
    });
    expect.soft(verdict.ok, "text the pack could not have produced is not a pack").toBe(false);
    expect
      .soft(verdict.reason, "and the reason must name the missing evidence")
      .toMatch(/not confirmed out of process/i);
  });

  it("passes a clean run", () => {
    const verdict = classifyDryRun({
      status: 0,
      stdout: "npm notice total files: 205\n",
      stderr: "",
    });
    expect.soft(verdict.ok, "a clean dry-run passes").toBe(true);
    expect.soft(verdict.reason, "and says so plainly").toBe("clean");
  });

  it("treats the two known noise warnings as noise, and only those", () => {
    const verdict = classifyDryRun({
      status: 0,
      stdout: "",
      stderr: [
        "npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)",
        "npm warn publish No .npmignore file found",
      ].join("\n"),
    });
    expect.soft(verdict.ok, "both known-noise lines are filtered").toBe(true);
    expect.soft(verdict.warnings, "and neither is surfaced").toEqual([]);
  });
});

describe("the npm it proves anything with is the toolchain's, not the one on PATH", () => {
  // Review finding [98]. This guard runs through a `pnpm` script, so its PATH begins with
  // `node_modules/.bin` — a directory a pull request fills by adding a dependency. A workspace
  // package declaring an `npm` bin replaced every call here with a program that exits 0, and the
  // independent tarball and registry proofs never ran. The reviewer measured it: a fake `npm`
  // first on PATH made the whole script exit 0 with no output.

  it("resolves npm beside the running Node and never through PATH", () => {
    const source = readFileSync(
      path.join(REPO_ROOT, "scripts", "check-publish-dry-run.mjs"),
      "utf-8",
    );

    expect(source, "the CLI must be resolved from the running Node's own installation").toMatch(
      /process\.execPath[\s\S]{0,400}?npm-cli\.js/,
    );
    expect(
      source,
      "and spawned as a script under that Node, so no PATH lookup happens at all",
    ).toMatch(/spawnSync\(process\.execPath, \[npmCliPath\(\)/);
    // The thing that was forgeable, asserted absent: a bare program name reaches PATH.
    expect(source, "no call may name `npm` as a program for the shell to find").not.toMatch(
      /spawnSync\(\s*["']npm["']/,
    );
  });

  it("refuses rather than falling back when no npm sits beside that Node", () => {
    // A fallback to PATH is the resolution that was forgeable, so there is none: an unexpected
    // toolchain layout is a refusal with both candidate paths named.
    const source = readFileSync(
      path.join(REPO_ROOT, "scripts", "check-publish-dry-run.mjs"),
      "utf-8",
    );
    const start = source.indexOf("function npmCliPath() {");
    expect(start, "the resolver must exist to be checked").toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("\n}\n", start));
    expect(body, "an unresolvable toolchain throws").toMatch(/throw new Error\(/);
    // ONE return, and it is the resolved candidate. Measured: a plant that added `return "npm"`
    // above the throw left both assertions below satisfied — the throw was still there, unreached,
    // and the row passed over a resolver that had gone back to PATH.
    const returns = body.match(/\breturn\b/g) ?? [];
    expect(
      returns,
      "a second return is a fallback, and a fallback to PATH is the resolution that was forgeable",
    ).toHaveLength(1);
    expect(body, "and the one return is the resolved candidate").toMatch(
      /return path\.resolve\(candidate\);/,
    );
    expect(
      body,
      "and the message names what it looked for, because a refusal nobody can act on is a crash",
    ).toMatch(/candidates\.join/);
  });
});
