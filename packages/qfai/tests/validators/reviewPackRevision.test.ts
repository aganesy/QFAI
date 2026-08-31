/**
 * QFAI-REVIEW-009 — a review pack says which state it ruled on (#388).
 *
 * `summary.json` recorded `overall_status` and per-reviewer `status`, with no
 * field addressing the state those verdicts describe. The field is optional in
 * the schema — packs written before it exist — but its absence is reported, and
 * a present-but-malformed value is an error like any other.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateReviewArtifacts } from "../../src/core/validators/reviewArtifacts.js";
import { removeTempTree } from "../helpers/tempTree.js";

const tempDirs: string[] = [];

type Summary = Record<string, unknown>;

// A pack written under the current contract declares which one produced it.
// That declaration — not the pack's age, and not its rank among siblings — is
// what holds it to the strict `revision` form.
const baseSummary = (): Summary => ({
  version: "1.0",
  revision_form: "content-hash",
  created_at: "2026-08-01T00:00:00Z",
  target: { kind: "spec", path: ".qfai/specs/spec-0001" },
  overall_status: "PASS",
  roster: [{ reviewer: "completion-reviewer", status: "PASS", feedback_count: 0 }],
});

async function withPack(
  summary: Summary,
): Promise<Awaited<ReturnType<typeof validateReviewArtifacts>>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-rev-"));
  tempDirs.push(root);
  const packDir = path.join(root, ".qfai", "review", "review-20260815000000000");
  await mkdir(packDir, { recursive: true });
  // A `legacy` claim is only believed when the migration record agrees, so the
  // fixture records this pack. Tests about an uncorroborated claim write their
  // own manifest through `withPacks`.
  await writeFile(
    path.join(root, ".qfai", "review", ".legacy-packs"),
    "review-20260815000000000\n",
    "utf-8",
  );
  await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
  await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
  await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  return validateReviewArtifacts(root);
}

async function withPacks(
  packs: readonly (readonly [string, Summary])[],
  legacyManifest?: readonly string[],
): Promise<Awaited<ReturnType<typeof validateReviewArtifacts>>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-rev-"));
  tempDirs.push(root);
  if (legacyManifest !== undefined) {
    await mkdir(path.join(root, ".qfai", "review"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "review", ".legacy-packs"),
      legacyManifest.map((name) => `${name}\n`).join(""),
      "utf-8",
    );
  }
  for (const [stamp, summary] of packs) {
    const packDir = path.join(root, ".qfai", "review", `review-${stamp}`);
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
    await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
    await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  }
  return validateReviewArtifacts(root);
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await removeTempTree(dir);
  }
});

describe("review pack revision", () => {
  it("reports a legacy summary.json with no revision", async () => {
    const issues = await withPack({ ...baseSummary(), revision_form: "legacy" });
    const found = issues.filter((i) => i.code === "QFAI-REVIEW-009");

    expect(found).toHaveLength(1);
    // A warning on a pack that predates the field: the point is to make the
    // omission visible rather than to invalidate history. A pack that declares
    // the current contract gets an error instead — see below.
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.suggested_action).toContain("evidence-revision.md");
    // The remedy has to name the form the reference accepts. It said
    // `working-tree+<porcelain digest>`, which that reference now forbids by
    // name: porcelain gives paths and states, so re-editing the very file
    // under review leaves it identical and a stale verdict reads as fresh.
    expect(found[0]?.suggested_action).toContain("working-tree+<content hash>");
    expect(found[0]?.suggested_action).not.toContain("porcelain");
  });

  it("accepts a git rev", async () => {
    const issues = await withPack({ ...baseSummary(), revision: "55af6834f0" });

    expect(issues.filter((i) => i.code === "QFAI-REVIEW-009")).toEqual([]);
  });

  it("accepts the uncommitted-tree form", async () => {
    const issues = await withPack({
      ...baseSummary(),
      // The content hash the four-step procedure produces: SHA-256, 64 hex.
      revision: "working-tree+" + "a".repeat(64),
    });

    expect(issues.filter((i) => i.code === "QFAI-REVIEW-009")).toEqual([]);
    expect(issues.filter((i) => i.code === "QFAI-REVIEW-007")).toEqual([]);
  });

  it("rejects the porcelain digest the reference forbids", async () => {
    // It reads as a legitimate value while being exactly the digest that does
    // not move when the file under review is edited, so a stale verdict passed
    // the freshness check this field exists for.
    const issues = await withPack({ ...baseSummary(), revision: "working-tree+9f2c1ab" });
    const schema = issues.filter((i) => i.code === "QFAI-REVIEW-007");

    expect(schema).toHaveLength(1);
    expect(schema[0]?.message).toContain("porcelain digest");
  });

  it("reports a pack marked legacy as a warning", async () => {
    // The tree a past verdict described is not reconstructible, so there is no
    // content hash to migrate to — an error would leave `--fail-on error`
    // permanently red for a repository that keeps its packs. Only an explicit
    // `legacy` says so; the marker is written once, from the history.
    const issues = await withPacks(
      [
        [
          "20260101000000000",
          { ...baseSummary(), revision_form: "legacy", revision: "working-tree+9f2c1ab" },
        ],
      ],
      ["review-20260101000000000"],
    );

    expect(issues.filter((i) => i.code === "QFAI-REVIEW-007")).toEqual([]);
    const legacy = issues.filter(
      (i) => i.code === "QFAI-REVIEW-009" && i.message.includes("porcelain digest"),
    );
    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.severity).toBe("warning");
  });

  it("reports a declared pack as an error whatever its age or rank", async () => {
    // Neither rank nor time can decide this. "Newest overall" meant a malformed
    // pack written under the current contract stopped being an error the moment
    // any other spec produced one; a timestamp cutoff misclassifies the hours
    // between the contract shipping and the boundary chosen for it, and the
    // directory stamp carries no timezone at all. Here the malformed pack is
    // both the oldest on disk and stamped well before any plausible cutoff, and
    // it is an error because it says which contract wrote it.
    const issues = await withPacks([
      ["20250101000000000", { ...baseSummary(), revision: "working-tree+9f2c1ab" }],
      ["20260820000000000", { ...baseSummary(), revision: "a".repeat(40) }],
    ]);

    const current = issues.filter(
      (i) => i.code === "QFAI-REVIEW-007" && i.message.includes("porcelain digest"),
    );
    expect(current).toHaveLength(1);
    expect(current[0]?.severity).toBe("error");
    expect(issues.filter((i) => i.code === "QFAI-REVIEW-009")).toEqual([]);
  });

  it("rejects a pack that declares no form at all", async () => {
    // An optional marker makes the strict form opt-in: a producer that omits it
    // downgrades its own check to a warning, and a `working-tree+<porcelain
    // digest>` then passes `--fail-on error` while not moving when the file
    // under review is edited.
    const undeclared = baseSummary();
    delete undeclared.revision_form;
    const issues = await withPack({ ...undeclared, revision: "working-tree+9f2c1ab" });
    const errors = issues.filter((i) => i.code === "QFAI-REVIEW-007");

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((i) => i.severity === "error")).toBe(true);
    expect(errors.some((i) => i.message.includes("revision_form"))).toBe(true);
    // And the malformed value is an error too, not the warning an undeclared
    // pack used to get.
    expect(
      issues.some((i) => i.code === "QFAI-REVIEW-009" && i.message.includes("porcelain digest")),
    ).toBe(false);
  });

  it("rejects a current pack that names no revision at all", async () => {
    // Strictly worse than a malformed one: there is no tree to check and the
    // form check never runs, so a warning made the field optional in practice.
    const issues = await withPack(baseSummary());
    const found = issues.filter((i) => i.rule === "reviewArtifacts.summaryRevision");

    expect(found).toHaveLength(1);
    expect(found[0]?.code).toBe("QFAI-REVIEW-007");
    expect(found[0]?.severity).toBe("error");
  });

  it("keeps a legacy pack's missing revision a warning", async () => {
    const issues = await withPack({ ...baseSummary(), revision_form: "legacy" });
    const found = issues.filter((i) => i.rule === "reviewArtifacts.summaryRevision");

    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("warning");
  });

  it("rejects a legacy claim the migration record does not corroborate", async () => {
    // The field is exactly as writable as the `revision` it excuses, so a
    // current producer with a broken value could downgrade its own finding by
    // typing `legacy`. The migration pass records which packs predate the form.
    const issues = await withPacks([
      [
        "20260101000000000",
        { ...baseSummary(), revision_form: "legacy", revision: "working-tree+9f2c1ab" },
      ],
    ]);

    expect(
      issues.some((i) => i.code === "QFAI-REVIEW-007" && i.message.includes(".legacy-packs")),
    ).toBe(true);
    // And the value it tried to excuse is judged as a current pack's.
    expect(
      issues.some((i) => i.code === "QFAI-REVIEW-007" && i.message.includes("porcelain digest")),
    ).toBe(true);
  });

  it("says nothing about a rev when the root is not a git work tree", async () => {
    // A project that exports its source as a tarball must not fail here.
    const issues = await withPack({ ...baseSummary(), revision: "0".repeat(40) });

    expect(issues.filter((i) => i.rule === "reviewArtifacts.summaryRevisionResolves")).toEqual([]);
  });

  it("reports a git rev that names no commit in this repository", async () => {
    // The form says the value is shaped like an address; this says it is one. A
    // placeholder or a transposed digit passes the regex and names no tree at
    // all, so the verdict it carries cannot be reproduced by anyone.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-rev-git-"));
    tempDirs.push(root);
    for (const args of [
      ["init"],
      ["config", "user.email", "t@example.com"],
      ["config", "user.name", "t"],
    ]) {
      execFileSync("git", args, { cwd: root, stdio: ["ignore", "ignore", "ignore"] });
    }
    const packDir = path.join(root, ".qfai", "review", "review-20260815000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
    await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
    await writeFile(
      path.join(packDir, "summary.json"),
      JSON.stringify({ ...baseSummary(), revision: "0".repeat(40) }, null, 2),
      "utf-8",
    );

    const issues = await validateReviewArtifacts(root);
    const found = issues.filter((i) => i.rule === "reviewArtifacts.summaryRevisionResolves");

    expect(found).toHaveLength(1);
    // A warning: a shallow clone or an unfetched branch answers the same way.
    expect(found[0]?.severity).toBe("warning");
  });

  it("rejects a revision_form it does not define", async () => {
    const issues = await withPack({
      ...baseSummary(),
      revision_form: "porcelain",
      revision: "a".repeat(40),
    });

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
  });

  it("rejects a value that is neither a rev nor a content hash", async () => {
    const issues = await withPack({ ...baseSummary(), revision: "yesterday" });

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
  });

  it("rejects a present-but-empty revision", async () => {
    const issues = await withPack({ ...baseSummary(), revision: "  " });
    const schema = issues.filter((i) => i.code === "QFAI-REVIEW-007");

    expect(schema).toHaveLength(1);
    expect(schema[0]?.message).toContain("revision");
  });

  it("rejects a non-string revision", async () => {
    const issues = await withPack({ ...baseSummary(), revision: 12345 });

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
  });

  it("still reports the missing revision alongside other schema errors", async () => {
    // The two findings are independent; a pack with a broken roster must not
    // hide the fact that it also names no revision.
    const broken = { ...baseSummary(), revision_form: "legacy" };
    delete broken.overall_status;
    const issues = await withPack(broken);

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
    expect(issues.some((i) => i.code === "QFAI-REVIEW-009")).toBe(true);
  });
});
