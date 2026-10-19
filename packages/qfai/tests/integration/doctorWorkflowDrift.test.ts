import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const SHIPPED = ["qfai-docs.yml", "qfai-tests.yml", "qfai-validate.yml"] as const;

function packagedPath(name: string): string {
  return path.join(getInitAssetsDir(), "root", ".github", "workflows", name);
}

async function project(installed: Record<string, string>, config = ""): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-drift-"));
  roots.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    `paths:\n  specsDir: .qfai/spec\n${config}`,
    "utf-8",
  );
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  for (const [name, text] of Object.entries(installed)) {
    await writeFile(path.join(root, ".github", "workflows", name), text, "utf-8");
  }
  return root;
}

async function driftFindings(
  root: string,
): Promise<{ id: string; severity: string; message: string; details?: unknown }[]> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter((check) => check.id.startsWith("workflows.drift"));
}

async function configLoadMessage(root: string): Promise<string | undefined> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.find((check) => check.id === "config.load")?.message;
}

/** The digest a `workflow.acceptedDrift` entry records for a file holding `text`. */
function digestOf(text: string): string {
  const lf = text.replace(/\r\n?/g, "\n");
  return `sha256:${createHash("sha256").update(lf, "utf8").digest("hex")}`;
}

const SETUP_NODE = /uses: actions\/setup-node@([^\s#]+)/;

describe("qfai doctor reports a shipped workflow that differs from the shipped text", () => {
  // QFAI:EX-0003-0011-25
  it("warns for an edited workflow, names the shipped file to copy from and changes nothing", async () => {
    // QFAI:AC-0003-0011-11
    const shipped = await readFile(packagedPath("qfai-validate.yml"), "utf-8");
    const edited = `${shipped}# a local edit\n`;
    const root = await project({
      "qfai-docs.yml": await readFile(packagedPath("qfai-docs.yml"), "utf-8"),
      "qfai-validate.yml": edited,
    });

    const found = await driftFindings(root);

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("workflows.drift.qfai-validate");
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain(".github/workflows/qfai-validate.yml");
    expect(found[0]?.message).toContain(packagedPath("qfai-validate.yml"));
    expect(
      await readFile(path.join(root, ".github", "workflows", "qfai-validate.yml"), "utf-8"),
    ).toBe(edited);
  });

  // QFAI:EX-0003-0011-31
  it("counts the lines that differ and names no job for a change outside the jobs", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-validate.yml"), "utf-8");
    const root = await project({ "qfai-validate.yml": `${shipped}# a local edit\n` });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      "in 1 line (1 only in the installed file, 0 only in the shipped copy). Doctor changes nothing.",
    );
    expect(found?.message).not.toContain("jobs that differ");
    expect(found?.message).toContain("that replaces every local change");
  });

  // QFAI:EX-0003-0011-31
  it("names the job whose definition differs", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-docs.yml"), "utf-8");
    const stale = "    timeout-minutes: 15\n";
    expect(shipped).toContain(stale);
    const root = await project({
      "qfai-docs.yml": shipped.replace(stale, "    timeout-minutes: 45\n"),
    });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      "in 2 lines (1 only in the installed file, 1 only in the shipped copy); jobs that differ: checks.",
    );
  });

  // QFAI:EX-0003-0011-31
  it("names every shipped job when the installed file defines none of them", async () => {
    // QFAI:AC-0003-0011-14
    const root = await project({ "qfai-tests.yml": "name: edited\n" });
    const shipped = await readFile(packagedPath("qfai-tests.yml"), "utf-8");
    const afterJobs = shipped.split(/^jobs:\s*$/m)[1] ?? "";
    const names = [...afterJobs.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)]
      .map((match) => match[1] ?? "")
      .sort();
    expect(names.length).toBeGreaterThan(0);

    const [found] = await driftFindings(root);

    expect(found?.id).toBe("workflows.drift.qfai-tests");
    expect(found?.message).toMatch(
      /\(1 only in the installed file, \d+ only in the shipped copy\)/,
    );
    expect(found?.message).toContain(
      `jobs that differ: ${names.join(", ")}. Doctor changes nothing.`,
    );
  });

  // QFAI:EX-0003-0011-31
  it("says the jobs were not compared when the installed file does not parse", async () => {
    // QFAI:AC-0003-0011-14
    const root = await project({ "qfai-tests.yml": "name: [unterminated\n" });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      "; jobs not compared: the installed file does not parse. Doctor",
    );
    expect(found?.message).not.toContain("jobs that differ");
  });

  // QFAI:EX-0003-0011-25
  it("warns once for each edited workflow", async () => {
    // QFAI:AC-0003-0011-11
    const root = await project(Object.fromEntries(SHIPPED.map((name) => [name, "name: edited\n"])));

    const found = await driftFindings(root);

    expect(found.map((check) => check.id)).toEqual([
      "workflows.drift.qfai-docs",
      "workflows.drift.qfai-tests",
      "workflows.drift.qfai-validate",
    ]);
  });

  // QFAI:EX-0003-0011-26
  it("raises nothing for an identical workflow, one with converted line endings, or an absent one", async () => {
    // QFAI:AC-0003-0011-11
    const tests = await readFile(packagedPath("qfai-tests.yml"), "utf-8");
    const root = await project({
      "qfai-docs.yml": await readFile(packagedPath("qfai-docs.yml"), "utf-8"),
      "qfai-tests.yml": tests.replace(/\r?\n/g, "\r\n"),
    });

    expect(await driftFindings(root)).toEqual([]);
  });

  // QFAI:EX-0003-0011-32
  it("names a pinned action whose version differs, with both versions", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-tests.yml"), "utf-8");
    const pinned = SETUP_NODE.exec(shipped)?.[1];
    expect(pinned).toBeDefined();
    const root = await project({
      "qfai-tests.yml": shipped.replace(SETUP_NODE, "uses: actions/setup-node@main"),
    });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      `; pinned actions that differ: actions/setup-node (installed main, shipped ${pinned ?? ""})`,
    );
  });

  // QFAI:EX-0003-0011-32
  it("shows the version comment beside a pin and a bare SHA as it is", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-tests.yml"), "utf-8");
    const pinned = SETUP_NODE.exec(shipped)?.[1] ?? "";
    const root = await project({
      "qfai-tests.yml": shipped.replace(
        SETUP_NODE,
        "uses: actions/setup-node@0123456789abcdef0123456789abcdef01234567 # v4.1.0",
      ),
    });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      `actions/setup-node (installed 0123456789abcdef0123456789abcdef01234567 (v4.1.0), shipped ${pinned})`,
    );
  });

  // QFAI:EX-0003-0011-32
  it("names no pinned action when every pin matches", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-validate.yml"), "utf-8");
    const root = await project({ "qfai-validate.yml": `${shipped}# a local edit\n` });

    const [found] = await driftFindings(root);

    expect(found?.message).not.toContain("pinned actions that differ");
  });
});

const OURS = "name: ours\n";
/** The SHA-256 of `OURS`, written out so the digest is not only checked against itself. */
const OURS_DIGEST = "sha256:d7bbcd55840ed6edd5e0c7305b786ec5ab712ba4cd652d3ecb3bc48b06e7d12a";

function acceptedDocs(digest: string, reason = "We run our own docs lane."): string {
  return `workflow:\n  acceptedDrift:\n    - file: qfai-docs.yml\n      digest: ${digest}\n      reason: ${reason}\n`;
}

describe("qfai doctor reads an accepted drift from qfai.config.yaml", () => {
  // QFAI:EX-0003-0011-33
  it("reports an accepted workflow whose digest matches as info with its reason and still warns for the others", async () => {
    // QFAI:AC-0003-0011-15
    const root = await project(
      { "qfai-docs.yml": OURS, "qfai-tests.yml": "name: edited\n" },
      acceptedDocs(digestOf(OURS)),
    );

    const found = await driftFindings(root);

    expect(found.map((check) => [check.id, check.severity])).toEqual([
      ["workflows.drift.qfai-docs", "info"],
      ["workflows.drift.qfai-tests", "warning"],
    ]);
    expect(found[0]?.message).toContain(".github/workflows/qfai-docs.yml");
    expect(found[0]?.message).toContain("workflow.acceptedDrift");
    expect(found[0]?.message).toContain(digestOf(OURS));
    expect(found[0]?.message).toContain("We run our own docs lane.");
    expect(await configLoadMessage(root)).toBe("Loaded and normalized with 0 issues");
  });

  // QFAI:EX-0003-0011-34
  it("rejects an entry with no or a malformed digest, no or an empty reason, or a name outside the shipped set, and accepts nothing", async () => {
    // QFAI:AC-0003-0011-15
    const digest = `      digest: ${digestOf(OURS)}\n`;
    for (const entry of [
      `    - file: qfai-docs.yml\n${digest}`,
      `    - file: qfai-docs.yml\n${digest}      reason: "  "\n`,
      "    - file: qfai-docs.yml\n      reason: Ours.\n",
      `    - file: qfai-docs.yml\n${digest.replace("sha256:", "")}      reason: Ours.\n`,
      `    - file: qfai-docs.yml\n      digest: ${OURS_DIGEST.toUpperCase().replace("SHA256:", "sha256:")}\n      reason: Ours.\n`,
      `    - file: qfai-orphan.yml\n${digest}      reason: Ours.\n`,
      `    - file: qfai-docs.yml\n${digest}      reason: Ours.\n    - file: qfai-docs.yml\n${digest}      reason: Again.\n`,
      "    - qfai-docs.yml\n",
    ]) {
      const root = await project(
        { "qfai-docs.yml": OURS },
        `workflow:\n  acceptedDrift:\n${entry}`,
      );

      const found = await driftFindings(root);

      expect(
        found.map((check) => check.severity),
        entry,
      ).toEqual(["warning"]);
      expect(await configLoadMessage(root), entry).toContain("workflow.acceptedDrift");
    }
  });

  // QFAI:EX-0003-0011-35
  it("prints the current digest of a differing file, the same for LF and CRLF line endings", async () => {
    // QFAI:AC-0003-0011-15
    const root = await project({
      "qfai-docs.yml": OURS,
      "qfai-tests.yml": "name: ours\r\non: push\r\n",
    });

    const [docs, tests] = await driftFindings(root);

    expect(docs?.message).toContain(`Its current digest is ${OURS_DIGEST}.`);
    expect(docs?.details).toMatchObject({ digest: OURS_DIGEST });
    expect(tests?.message).toContain(
      `Its current digest is ${digestOf("name: ours\non: push\n")}.`,
    );
  });

  // QFAI:EX-0003-0011-36
  it("warns again for an accepted file whose digest no longer matches, naming both digests", async () => {
    // QFAI:AC-0003-0011-15
    const edited = "name: ours, edited again\n";
    const root = await project({ "qfai-docs.yml": edited }, acceptedDocs(digestOf(OURS)));

    const found = await driftFindings(root);

    expect(found.map((check) => [check.id, check.severity])).toEqual([
      ["workflows.drift.qfai-docs", "warning"],
    ]);
    expect(found[0]?.message).toContain(
      `changed since workflow.acceptedDrift accepted it: the entry records ${digestOf(OURS)}. It differs`,
    );
    expect(found[0]?.message).toContain(`Its current digest is ${digestOf(edited)}.`);
    expect(found[0]?.message).toContain("put that digest in its workflow.acceptedDrift entry");
    expect(await configLoadMessage(root)).toBe("Loaded and normalized with 0 issues");
  });
});
