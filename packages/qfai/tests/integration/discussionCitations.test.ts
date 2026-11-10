// QFAI:AC-0001-0241-01
// QFAI:AC-0001-0241-02
// QFAI:AC-0001-0241-03

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { validateDiscussionCitations } from "../../src/core/validators/discussionCitations.js";

const LATEST = ".qfai/discussion/discussion-20260102000000000";
const OLDER = ".qfai/discussion/discussion-20260101000000000";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-citations-"));
  const tenLines = Array.from({ length: 10 }, (_, index) => `line ${index + 1}`);
  await put("src/a.ts", `${tenLines.join("\n")}\n`);
  await put("src/crlf.ts", `${tenLines.join("\r\n")}\r\n`);
  await put("src/cr.ts", `${tenLines.join("\r")}\r`);
  await put("README.md", "# Readme\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(relative: string, text: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

async function citationErrors(pack: string, dir = LATEST) {
  await put(`${dir}/04_Sources.md`, pack);
  return validateDiscussionCitations(root, defaultConfig);
}

describe("discussion-pack citations", () => {
  // QFAI:EX-0001-0241-01
  it("reports a code span citing a file the project does not have", async () => {
    const findings = await citationErrors("# Sources\n\nRead in `src/missing.ts:3`.\n");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code: "QFAI-DPACK-012", severity: "error" });
    expect(findings[0]?.file).toBe(path.join(root, LATEST, "04_Sources.md"));
    expect(findings[0]?.message).toBe(
      "Line 3 cites src/missing.ts:3, which names no file under the project root.",
    );
  });

  // QFAI:EX-0001-0241-02
  it("reports a quoted research summary locator citing a missing file", async () => {
    const findings = await citationErrors(
      '```yaml\nresearch_summary:\n  sources:\n    - id: SRC-0001\n      locator: "src/missing.ts:3"\n```\n',
    );
    expect(findings.map((found) => found.code)).toEqual(["QFAI-DPACK-012"]);
  });

  // QFAI:EX-0001-0241-03
  it("reports a path that leaves the project root", async () => {
    const findings = await citationErrors("See `../outside/a.ts:1`.\n");
    expect(findings.map((found) => found.code)).toEqual(["QFAI-DPACK-012"]);
  });

  // QFAI:EX-0001-0241-04
  it("reports a path whose letter case differs from the file's, on every platform", async () => {
    const findings = await citationErrors("See `Src/A.ts:1`.\n");
    expect(findings.map((found) => found.code)).toEqual(["QFAI-DPACK-012"]);
  });

  // QFAI:EX-0001-0241-05
  it("reports line 11 of a 10-line file that ends with a newline", async () => {
    const findings = await citationErrors("See `src/a.ts:11`.\n");
    expect(findings[0]?.message).toBe(
      "Line 1 cites src/a.ts:11, which is past the end of the file, which has 10 lines.",
    );
  });

  // QFAI:EX-0001-0241-06
  it("reports a range that ends past the file", async () => {
    const findings = await citationErrors("See `src/a.ts:10-11`.\n");
    expect(findings.map((found) => found.code)).toEqual(["QFAI-DPACK-012"]);
  });

  // QFAI:EX-0001-0241-07
  it("reports line 0", async () => {
    const findings = await citationErrors("See `src/a.ts:0`.\n");
    expect(findings[0]?.message).toContain("names no line of the file");
  });

  // QFAI:EX-0001-0241-08
  it("accepts lines inside a file, a CRLF file and a file at the project root", async () => {
    const findings = await citationErrors(
      "See `src/a.ts:3`, `src/a.ts:2-10`, `src\\a.ts:4`, `src/crlf.ts:2-10`, `src/cr.ts:10` and `README.md:1`.\n",
    );
    expect(findings).toEqual([]);
  });

  // QFAI:EX-0001-0241-09
  it("ignores a URL, a path with no line, a column, prose and a fenced example", async () => {
    const findings = await citationErrors(
      [
        "See `http://localhost:8080/src/missing.ts:3`, `src/missing.ts`, `src/a.ts:3:7`.",
        "Prose names src/missing.ts:3 without a code span.",
        "```text",
        "`src/missing.ts:3`",
        "```",
        "",
      ].join("\n"),
    );
    expect(findings).toEqual([]);
  });

  it("does not read an address or a version string as a citation", async () => {
    expect(await citationErrors("Served on `127.0.0.1:8080`; see `v2.1:3` and `1.2:3`.\n")).toEqual(
      [],
    );
  });

  // QFAI:EX-0001-0241-10
  it("does not read a pack older than the latest", async () => {
    await put(`${OLDER}/04_Sources.md`, "See `src/missing.ts:3`.\n");
    const findings = await citationErrors("See `src/a.ts:3`.\n");
    expect(findings).toEqual([]);
  });

  // QFAI:EX-0001-0241-11
  it("is raised by the discussion profile and not by verify", async () => {
    await put(".qfai/spec/02_business-flow/business-flows.md", "# Business Flows\n");
    await put(`${LATEST}/04_Sources.md`, "See `src/missing.ts:3`.\n");
    const codes = async (profile: "discussion" | "verify") =>
      (await validateProject(root, undefined, { profile })).issues
        .map((found) => found.code)
        .filter((code) => code === "QFAI-DPACK-012");
    expect(await codes("discussion")).toEqual(["QFAI-DPACK-012"]);
    expect(await codes("verify")).toEqual([]);
  });

  it("raises nothing without a discussion pack", async () => {
    expect(await validateDiscussionCitations(root, defaultConfig)).toEqual([]);
  });
});
