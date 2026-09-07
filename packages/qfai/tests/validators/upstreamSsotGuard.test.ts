/**
 * QFAI-DRIFT-001 — the upstream SSOT ownership rule finally has a detector.
 *
 * `drift-protocol.md` states `Downstream skills must not patch upstream SSOT
 * directly.` as a non-negotiable constraint, and nothing in the package ever
 * noticed when it was broken. These tests drive a real git repository: the
 * validator's whole premise is a base-branch diff, so a mocked file list would
 * assert nothing about the thing that was missing.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateUpstreamSsotGuard } from "../../src/core/validators/upstreamSsotGuard.js";
import { removeTempTree } from "../helpers/tempTree.js";

const tempDirs: string[] = [];

const git = (cwd: string, ...args: string[]): void => {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
};

async function write(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

/** A repo with `base` holding the seeded files and a branch checked out on top. */
async function newRepo(seed: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-guard-"));
  tempDirs.push(root);
  git(root, "init", "--initial-branch=base");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "test");
  for (const [rel, content] of Object.entries(seed)) {
    await write(root, rel, content);
  }
  git(root, "add", "-A");
  git(root, "commit", "-m", "seed");
  git(root, "checkout", "-b", "work");
  return root;
}

/** Commit the given edits onto the working branch. */
async function commitEdits(root: string, edits: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(edits)) {
    await write(root, rel, content);
  }
  git(root, "add", "-A");
  git(root, "commit", "-m", "downstream work");
}

const config = { ...defaultConfig, baseBranch: "base" };

/** An approved CR carrying `sections` — the header is the part every row shares. */
function approvedCr(sections: string[]): string {
  return [
    "# Change Request",
    "",
    "- ID: `CR-20260801-0001`",
    "- Status: `approved`",
    "",
    ...sections,
    "",
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await removeTempTree(dir);
  }
});

describe("validateUpstreamSsotGuard", () => {
  it("flags a contract edited downstream", async () => {
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, { ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n" });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-DRIFT-001");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe(".qfai/contracts/db/CON-DB-0007.sql");
    // The finding must route to STOP + Change Request, not to "fix it and move
    // on" — an agent that trips this needs the protocol, not a lint hint.
    expect(issues[0]?.suggested_action).toContain(".qfai/assistant/constitution/drift-protocol.md");
    expect(issues[0]?.suggested_action).toContain("Change Request");
  });

  it("flags a spec-pack SSOT file edited downstream", async () => {
    const root = await newRepo({ ".qfai/specs/spec-0001/04_Business-Rules.md": "# BR\n" });
    await commitEdits(root, {
      ".qfai/specs/spec-0001/04_Business-Rules.md": "# BR\n\n- BR-0001\n",
    });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues.map((i) => i.file)).toEqual([".qfai/specs/spec-0001/04_Business-Rules.md"]);
  });

  it("flags a `_policies` edit anywhere under the directory", async () => {
    const root = await newRepo({ ".qfai/specs/_policies/03_Capabilities.md": "# caps\n" });
    await commitEdits(root, { ".qfai/specs/_policies/03_Capabilities.md": "# caps\n\n- one\n" });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues).toHaveLength(1);
  });

  it("leaves the downstream execution ledger alone", async () => {
    // `tdd/test-list.md` is the ledger `qfai-implement` writes on every cycle.
    // Flagging it would make the guard fire on its own stage's normal work.
    const root = await newRepo({ ".qfai/specs/spec-0001/tdd/test-list.md": "# list\n" });
    await commitEdits(root, {
      ".qfai/specs/spec-0001/tdd/test-list.md": "# list\n\n| TDD-0001 |\n",
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("ignores ordinary source and test changes", async () => {
    const root = await newRepo({ "src/app.ts": "export const a = 1;\n" });
    await commitEdits(root, {
      "src/app.ts": "export const a = 2;\n",
      "tests/app.test.ts": "// new\n",
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("is silenced by an approved Change Request declaring the path in `## Impact scope`", async () => {
    // The section is the CR's declaration of what it covers, and a declaration
    // is what an exemption rests on. This row was written against
    // `## Proposed change`, which is prose: the exemption used to be a
    // substring match over the whole body, so any section did (#1121).
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": approvedCr([
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("accepts the bare filename, the other spelling an author reaches for", async () => {
    // The template's own `## Impact scope` asks for `Contracts: <CON-*>` and
    // `Schema: <paths>`, so "name it by file" is what the section invites. The
    // issue's author wrote a CR this way, approved it, and the four errors did
    // not move.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": approvedCr([
        "## Impact scope",
        "",
        "- Contracts: `CON-DB-0007.sql`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("does NOT accept a contract ID, which names a declaration and not a file", async () => {
    // The deliberate limit. Resolving `CON-DB-0007` to a path would make the
    // exemption depend on parsing every contract; the remediation says which
    // spellings work instead.
    const root = await newRepo({ ".qfai/contracts/db/db-0007-leases.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/db-0007-leases.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": approvedCr([
        "## Impact scope",
        "",
        "- Contracts: `CON-DB-0007`",
      ]),
    });

    const issues = await validateUpstreamSsotGuard(root, config);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.suggested_action).toContain("## Impact scope");
  });

  it("is NOT silenced by a prohibition, which used to read as a permission", async () => {
    // The sharpest form of the defect: a CR that FORBIDS the edit granted it
    // the moment `Status` reached `approved`, because the guard asked only
    // whether the path appeared somewhere in the body (#1121).
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-other.md": approvedCr([
        "## Context",
        "",
        "DO NOT edit `.qfai/contracts/db/CON-DB-0007.sql` — the index belongs to",
        "another contract's owner.",
        "",
        "## Impact scope",
        "",
        "- Contracts: `none`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("is NOT silenced by the `## Reproduction` block a defect CR must carry", async () => {
    // `#when-drift-is-detected` step 2 makes a reproduction REQUIRED for a
    // defect-class CR, and a reproduction quotes the path it is about. So the
    // blob match had every defect CR authorising the edit it was reporting.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-defect.md": approvedCr([
        "## Reproduction",
        "",
        "```console",
        "$ npx qfai validate --profile tdd",
        "… .qfai/contracts/db/CON-DB-0007.sql",
        "```",
        "",
        "## Impact scope",
        "",
        "- Specs: `spec-0004`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("does not let one approved CR exempt a path another one owns", async () => {
    // The blob was repository-wide, so an approved CR about `spec-0004` that
    // quoted an unrelated contract silenced that contract's finding too.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-unrelated.md": approvedCr([
        "## Impact scope",
        "",
        "- Specs: `spec-0004`",
        "- Contracts: `.qfai/contracts/api/api-0001-rules.yaml`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("stops the section at the next heading", async () => {
    // Without a boundary the "section" would run to end of file and the change
    // would be no change at all.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-after.md": approvedCr([
        "## Impact scope",
        "",
        "- Specs: `spec-0004`",
        "",
        "## Resolution",
        "",
        "Reran the owner skill over `.qfai/contracts/db/CON-DB-0007.sql`.",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("does not let a neighbouring artifact's name authorise the file", async () => {
    // `includes` was true for `<path>2` and `<path>.bak`, so a scope naming a
    // sibling authorised the file it was named after.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-neighbour.md": approvedCr([
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql.bak`, `CON-DB-00071.sql`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("is NOT silenced by an open Change Request that DECLARES the path", async () => {
    // The only shape that can tell the approval check from its absence. The
    // row below puts the path in prose, so after the match moved to
    // `## Impact scope` it declared nothing either way and passed whether or
    // not `CR_APPROVED_RE` ran at all — found by mutating the check away.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0002-pending.md": [
        "# Change Request",
        "",
        "- ID: `CR-20260801-0002`",
        "- Status: `open`",
        "",
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql`",
        "",
      ].join("\n"),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("is NOT silenced by an open Change Request", async () => {
    // "A CR at `Status: open` authorises nothing" —
    // `references/change-request-reset.md`. The retroactive-CR bypass observed
    // in the field is exactly this case.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": [
        "- ID: `CR-20260801-0001`",
        "- Status: `open`",
        "",
        "Touches `.qfai/contracts/db/CON-DB-0007.sql`.",
      ].join("\n"),
    });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues).toHaveLength(1);
  });

  it("is not silenced by an approved CR whose scope declares a different path", async () => {
    // The per-path half of the scoping: one CR, two edits, one declared. The
    // CR used to name the exempt path in a bare prose line, which authorised
    // nothing once the match moved to the declared section — so the row
    // reported both files and stopped measuring the contrast it exists for.
    const root = await newRepo({
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n",
      ".qfai/contracts/db/CON-DB-0008.sql": "SELECT 1;\n",
    });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/contracts/db/CON-DB-0008.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": approvedCr([
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql`",
      ]),
    });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues.map((i) => i.file)).toEqual([".qfai/contracts/db/CON-DB-0008.sql"]);
  });

  it("honours a SECOND `## Impact scope`, the append-on-rerun shape", async () => {
    // Repeating an H2 on each re-run is an established shape here —
    // `QFAI-TRIAGE-008`'s own remedy tells authors that placing several
    // `## Triage` sections means all of them are checked. Reading only the
    // first ignored a later declaration and reported an edit that WAS
    // declared as undeclared (#1139).
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-second-pass.md": approvedCr([
        "## Impact scope",
        "",
        "- Specs: `spec-0004`",
        "",
        "## Resolution",
        "",
        "First pass done.",
        "",
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("does NOT let a fenced example authorise the path it illustrates", async () => {
    // The serious half. For `## Triage` an unmasked fence produced a false
    // POSITIVE; for an exemption it is inverted — the CR's EXAMPLE grants what
    // it names while the real scope declares nothing. That is #1121's own
    // headline, "a prohibition reads as a permission", by another route.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-illustrated.md": approvedCr([
        "## Context",
        "",
        "Declare the edited paths like this:",
        "",
        "```md",
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql`",
        "```",
        "",
        "## Impact scope",
        "",
        "- Contracts: `none`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("does NOT let an HTML comment authorise a path either", async () => {
    // The template is full of instructional HTML comments, so the same sample
    // can arrive without a fence around it.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-commented.md": approvedCr([
        "## Impact scope",
        "",
        "<!--",
        "Name each edited file, e.g. `.qfai/contracts/db/CON-DB-0007.sql`",
        "-->",
        "",
        "- Contracts: `none`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toHaveLength(1);
  });

  it("still exempts a real declaration that sits beside a fenced sample", async () => {
    // The direction masking could break: a CR may legitimately show the format
    // AND declare a path, and the declaration must survive.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-both.md": approvedCr([
        "## Context",
        "",
        "```md",
        "- Contracts: `.qfai/contracts/api/api-0001-rules.yaml`",
        "```",
        "",
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/CON-DB-0007.sql`",
      ]),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("does not attribute a file `base` changed to this branch", async () => {
    // `..` answers "how do these two trees differ", which includes everything
    // `base` gained after the branch left it. The finding says "modified ON
    // THIS BRANCH", and for such a file that sentence is false — so the error
    // count grew as `origin/main` advanced, on a branch whose review cycle the
    // gate itself makes slow. Gate item 12's step 4 is
    // `qfai validate --fail-on error`, which made the gate a function of
    // wall-clock time rather than of the tree (#1149).
    const root = await newRepo({
      ".qfai/contracts/db/branch-owned.sql": "SELECT 1;\n",
      ".qfai/contracts/api/main-owned.yaml": "openapi: 3.0.0\n",
    });
    // The branch touches its own contract, declared by an approved CR.
    await commitEdits(root, {
      ".qfai/contracts/db/branch-owned.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-branch.md": approvedCr([
        "## Impact scope",
        "",
        "- Contracts: `.qfai/contracts/db/branch-owned.sql`",
      ]),
    });
    // `base` advances on a different contract while the branch sits.
    git(root, "checkout", "base");
    await write(root, ".qfai/contracts/api/main-owned.yaml", "openapi: 3.1.0\n");
    git(root, "add", "-A");
    git(root, "commit", "-m", "base advances");
    git(root, "checkout", "work");

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("still reports a file the branch changed after `base` advanced", async () => {
    // The direction a three-dot diff could break: moving `base` must not stop
    // the rule seeing what the branch actually did.
    const root = await newRepo({
      ".qfai/contracts/db/branch-owned.sql": "SELECT 1;\n",
      ".qfai/contracts/api/main-owned.yaml": "openapi: 3.0.0\n",
    });
    await commitEdits(root, { ".qfai/contracts/db/branch-owned.sql": "SELECT 2;\n" });
    git(root, "checkout", "base");
    await write(root, ".qfai/contracts/api/main-owned.yaml", "openapi: 3.1.0\n");
    git(root, "add", "-A");
    git(root, "commit", "-m", "base advances");
    git(root, "checkout", "work");

    const issues = await validateUpstreamSsotGuard(root, config);
    expect(issues.map((i) => i.file)).toEqual([".qfai/contracts/db/branch-owned.sql"]);
  });

  it("stays quiet outside a git checkout", async () => {
    // `qfai validate` must remain usable in a tarball export; a hard failure
    // here would be a worse regression than the gap it closes.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-guard-nogit-"));
    tempDirs.push(root);
    await write(root, ".qfai/contracts/db/CON-DB-0007.sql", "SELECT 1;\n");

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("reports one finding per changed protected file", async () => {
    const root = await newRepo({
      ".qfai/contracts/db/a.sql": "1\n",
      ".qfai/contracts/api/b.yaml": "a: 1\n",
      ".qfai/specs/spec-0001/09_delta.md": "# delta\n",
    });
    await commitEdits(root, {
      ".qfai/contracts/db/a.sql": "2\n",
      ".qfai/contracts/api/b.yaml": "a: 2\n",
      ".qfai/specs/spec-0001/09_delta.md": "# delta\n\n- CL-0001\n",
    });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues.map((i) => i.file).sort()).toEqual([
      ".qfai/contracts/api/b.yaml",
      ".qfai/contracts/db/a.sql",
      ".qfai/specs/spec-0001/09_delta.md",
    ]);
  });
});
