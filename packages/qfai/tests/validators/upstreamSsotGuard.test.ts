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
  // The EOL case below needs the CRLF bytes to reach the blob. Git for Windows
  // installs `core.autocrlf=true` globally, which would renormalise them away
  // and turn that test into a tautology.
  git(root, "config", "core.autocrlf", "false");
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

  it("ignores a protected file whose only change is its line endings", async () => {
    // `drift-protocol.md#line-endings-in-the-artifacts-under-review` tells the
    // reviewer that an all-lines-changed diff is not evidence of drift. If the
    // detector still reported the path, the operator would owe a Change
    // Request for a change carrying no content, and nothing but reverting the
    // line endings could discharge it.
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\nSELECT 2;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\r\nSELECT 2;\r\n",
    });

    // Guard the premise: the CRLF really did land in the committed blob.
    const named = execFileSync("git", ["diff", "--name-only", "base..HEAD"], {
      cwd: root,
      encoding: "utf-8",
    });
    expect(named).toContain(".qfai/contracts/db/CON-DB-0007.sql");

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("still flags a protected file whose diff counts no changed lines", async () => {
    // An added empty contract counts `0 0` in `--numstat`, exactly like the
    // EOL-only case above. The detector must separate the two by the patch
    // itself, not by the line counts, or "add the file, fill it next commit"
    // would walk straight past the guard.
    const root = await newRepo({ "src/app.ts": "export const a = 1;\n" });
    await commitEdits(root, { ".qfai/contracts/db/CON-DB-0009.sql": "" });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues.map((i) => i.file)).toEqual([".qfai/contracts/db/CON-DB-0009.sql"]);
  });

  it("ignores ordinary source and test changes", async () => {
    const root = await newRepo({ "src/app.ts": "export const a = 1;\n" });
    await commitEdits(root, {
      "src/app.ts": "export const a = 2;\n",
      "tests/app.test.ts": "// new\n",
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
  });

  it("is silenced by an approved Change Request naming the path", async () => {
    const root = await newRepo({ ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n" });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": [
        "# Change Request",
        "",
        "- ID: `CR-20260801-0001`",
        "- Status: `approved`",
        "",
        "## Proposed change",
        "",
        "Rename the shadowing local in `.qfai/contracts/db/CON-DB-0007.sql`.",
      ].join("\n"),
    });

    await expect(validateUpstreamSsotGuard(root, config)).resolves.toEqual([]);
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

  it("is not silenced by an approved CR that names a different path", async () => {
    const root = await newRepo({
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 1;\n",
      ".qfai/contracts/db/CON-DB-0008.sql": "SELECT 1;\n",
    });
    await commitEdits(root, {
      ".qfai/contracts/db/CON-DB-0007.sql": "SELECT 2;\n",
      ".qfai/contracts/db/CON-DB-0008.sql": "SELECT 2;\n",
      ".qfai/decisions/CR-20260801-0001-fix-contract.md": [
        "- ID: `CR-20260801-0001`",
        "- Status: `approved`",
        "",
        "Approved for `.qfai/contracts/db/CON-DB-0007.sql` only.",
      ].join("\n"),
    });

    const issues = await validateUpstreamSsotGuard(root, config);

    expect(issues.map((i) => i.file)).toEqual([".qfai/contracts/db/CON-DB-0008.sql"]);
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
