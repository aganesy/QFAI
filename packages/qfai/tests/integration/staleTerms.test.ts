import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, loadConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";

let root: string;
const specs = ".qfai/spec";
const storyFile = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md`;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-terms-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function staleFindings(staleTerms: string[]) {
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = specs;
  config.paths.contractsDir = `${specs}/03_contract`;
  if (staleTerms.length > 0) config.validation.staleTerms = staleTerms;
  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile: "sdd" },
  );
  return result.issues.filter((item) => item.code === "QFAI-STORY-016");
}

describe("a spec document that states a term the project lists as stale", () => {
  // QFAI:EX-0001-0053-08
  // QFAI:AC-0001-0053-07
  it("warns on the line, and leaves the decision register alone", async () => {
    await put(storyFile, "# US-0001-0001: Mail\n\nMail goes out over smtp.\n");
    await put(
      `${specs}/decisions.md`,
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | Send mail | Rejected: SMTP | DONE |\n",
    );
    const findings = await staleFindings(["SMTP"]);
    expect(findings.map((item) => [item.file, item.loc?.line, item.refs, item.severity])).toEqual([
      [storyFile, 3, ["SMTP"], "warning"],
    ]);
  });

  // QFAI:EX-0001-0053-08
  it("matches a whole word only", async () => {
    await put(storyFile, "# US-0001-0001: Mail\n\nThe smtpd daemon and SMTP_HOST are unrelated.\n");
    expect(await staleFindings(["SMTP"])).toEqual([]);
  });

  // QFAI:EX-0001-0053-08
  it("checks nothing when no term is listed", async () => {
    await put(storyFile, "# US-0001-0001: Mail\n\nMail goes out over SMTP.\n");
    expect(await staleFindings([])).toEqual([]);
  });
});

describe("validation.staleTerms in qfai.config.yaml", () => {
  // QFAI:EX-0001-0053-08
  it("is read as a list of strings, and is unset by default", async () => {
    await put("qfai.config.yaml", "validation:\n  staleTerms:\n    - SMTP\n    - Resend\n");
    const listed = await loadConfig(root);
    expect(listed.issues).toEqual([]);
    expect(listed.config.validation.staleTerms).toEqual(["SMTP", "Resend"]);
    expect(defaultConfig.validation.staleTerms).toBeUndefined();
  });

  // QFAI:EX-0001-0053-08
  it("rejects a value that is not a list of strings", async () => {
    await put("qfai.config.yaml", "validation:\n  staleTerms: SMTP\n");
    const { config, issues } = await loadConfig(root);
    expect(issues.map((item) => item.message)).toEqual([
      expect.stringContaining("validation.staleTerms must be an array of strings"),
    ]);
    expect(config.validation.staleTerms).toBeUndefined();
  });
});
