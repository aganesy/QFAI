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
import { describe, expect, it } from "vitest";

import { classifyDryRun } from "../../../../../scripts/check-publish-dry-run.mjs";

/** The verbatim tail of the failure observed on PR #794's `build` job. */
const ALREADY_PUBLISHED_STDERR = [
  "npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)",
  "npm error You cannot publish over the previously published versions: 1.10.0.",
  "npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2026-08-20T09_21_44_546Z-debug-0.log",
].join("\n");

describe("check-publish-dry-run tolerates an already-published version and nothing else", () => {
  it("accepts the already-published failure, because the pack still built", () => {
    const verdict = classifyDryRun({
      status: 1,
      stdout: "npm notice total files: 205\nnpm notice version: 1.10.0\n",
      stderr: ALREADY_PUBLISHED_STDERR,
    });
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
    const verdict = classifyDryRun({
      status: 1,
      stdout: "",
      stderr: "npm error ENOENT: no such file or directory, open 'package.json'\n",
    });
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
    const verdict = classifyDryRun({
      status: 1,
      stdout: "npm warn publish npm-shrinkwrap.json will be ignored\n",
      stderr: ALREADY_PUBLISHED_STDERR,
    });
    expect.soft(verdict.ok, "a real warning survives the version tolerance").toBe(false);
    expect.soft(verdict.warnings.length, "and is reported").toBe(1);
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
