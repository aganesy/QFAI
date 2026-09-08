/**
 * One path, two document shapes.
 *
 * A spec pack's `01_Spec.md` specifies something while its spec is live, and
 * records why the spec went away once it is not. The two are different
 * documents at the same path: a retired pack cannot carry a consumer view or an
 * applicable NFR for something that no longer exists, and admitting that shape
 * into the live schema would weaken the contract for every pack that still
 * specifies something.
 *
 * A manifest entry's `when:` predicate routes between them. These cases drive
 * the real checker over sandboxes, because the thing under test is the
 * selection — which entry claims which file — and that is only observable from
 * the outside.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const CHECKER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/scripts/check-mdschema.mjs",
);

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-routing-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/specs\n",
    "utf-8",
  );
  return root;
}

async function write(root: string, relative: string, body: string): Promise<void> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/** A `01_Spec.md` that still specifies something. */
function liveSpec(): string {
  return [
    "# 01 Spec",
    "",
    "- Spec: spec-0001",
    "- Status: active",
    "",
    "## Consumer View",
    "",
    "- Primary SSOT for execution: `spec-0001/01_Spec.md`",
    "",
    "## Scope",
    "",
    "- In: the thing",
    "- Out: everything else",
    "",
    "## Applicable NFR",
    "",
    "- NFR: none",
    "",
    "## Applicable Policy",
    "",
    "- Policy: none",
    "",
    "## Evidence Summary",
    "",
    "- Evidence: none",
    "",
    "## Relevant Requirements",
    "",
    "- REQ: REQ-0001",
    "",
    "## Entry points",
    "",
    "- US range in this spec: US-0001..",
    "",
  ].join("\n");
}

/** A `01_Spec.md` for a spec that has stopped applying. */
function retiredSpec(status = "superseded"): string {
  return [
    "# 01 Spec",
    "",
    "- Spec: spec-0002",
    `- Status: ${status}`,
    "- Superseded-by: spec-0003",
    "",
    "## Retirement",
    "",
    "- Reason: the capability moved to another pack",
    "- Obligations: spec-0003 carries them",
    "",
  ].join("\n");
}

/** Runs the checker over `root` and returns its combined output and exit code. */
function check(root: string): { status: number; output: string } {
  const result = spawnSync(
    process.execPath,
    [CHECKER, "--root", root, "--scope", "all", "--summary"],
    {
      encoding: "utf-8",
    },
  );
  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("routing one path to two schemas", () => {
  it("checks a retired pack against the retired schema, and passes", async () => {
    const root = await newRoot();
    await write(root, ".qfai/specs/spec-0002/01_Spec.md", retiredSpec());

    const { status, output } = check(root);

    expect(output).toContain("spec-overview-retired (1 file(s))");
    expect(output).toContain("spec-overview (0 file(s))");
    expect(status).toBe(0);
  });

  it("checks a live pack against the live schema, and passes", async () => {
    const root = await newRoot();
    await write(root, ".qfai/specs/spec-0001/01_Spec.md", liveSpec());

    const { status, output } = check(root);

    expect(output).toContain("spec-overview (1 file(s))");
    expect(output).toContain("spec-overview-retired (0 file(s))");
    expect(status).toBe(0);
  });

  it("sends each pack to its own schema when both are present", async () => {
    const root = await newRoot();
    await write(root, ".qfai/specs/spec-0001/01_Spec.md", liveSpec());
    await write(root, ".qfai/specs/spec-0002/01_Spec.md", retiredSpec());

    const { status, output } = check(root);

    expect(output).toContain("spec-overview (1 file(s))");
    expect(output).toContain("spec-overview-retired (1 file(s))");
    expect(status).toBe(0);
  });

  it("routes every terminal status, not only the first", async () => {
    for (const status of ["superseded", "deprecated", "removed"]) {
      const root = await newRoot();
      await write(root, ".qfai/specs/spec-0002/01_Spec.md", retiredSpec(status));

      expect(check(root).output, status).toContain("spec-overview-retired (1 file(s))");
    }
  });
});

describe("what the retired schema still asks for", () => {
  it("reports a retired pack that records no reason for the retirement", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/specs/spec-0002/01_Spec.md",
      ["# 01 Spec", "", "- Spec: spec-0002", "- Status: superseded", ""].join("\n"),
    );

    const { status, output } = check(root);

    expect(status).not.toBe(0);
    expect(output).toContain("spec-overview-retired");
  });

  it("reports a retired pack whose Retirement section is empty", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/specs/spec-0002/01_Spec.md",
      ["# 01 Spec", "", "- Status: superseded", "", "## Retirement", "", ""].join("\n"),
    );

    expect(check(root).status).not.toBe(0);
  });
});

describe("what the live schema still asks for", () => {
  it("reports a live pack with no consumer view, as before", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/specs/spec-0001/01_Spec.md",
      liveSpec().replace("## Consumer View", "## Something Else"),
    );

    const { status, output } = check(root);

    expect(status).not.toBe(0);
    expect(output).toContain("spec-overview");
  });

  it("does not accept a live pack that only carries a Retirement section", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/specs/spec-0001/01_Spec.md",
      ["# 01 Spec", "", "- Status: active", "", "## Retirement", "", "- Reason: none", ""].join(
        "\n",
      ),
    );

    expect(check(root).status).not.toBe(0);
  });
});
