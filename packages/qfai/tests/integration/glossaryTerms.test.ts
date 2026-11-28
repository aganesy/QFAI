import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

let root: string;
const specs = ".qfai/spec";
const glossaryFile = `${specs}/01_policy/glossary.md`;
const storyFile = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md`;
const contractFile = `${specs}/03_contract/cli/cli-0001-sign-in.md`;
const testFile = "tests/sign-in.test.ts";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-glossary-terms-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

function glossary(rows: string[][], contexts?: string[][]): string {
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  let text = `# Glossary\n\n## Terms\n\n| Term | Definition | Avoid | Context |\n| --- | --- | --- | --- |\n${body}\n`;
  if (contexts) {
    const lines = contexts.map((row) => `| ${row.join(" | ")} |`).join("\n");
    text += `\n## Contexts\n\n| Name | Purpose |\n| --- | --- |\n${lines}\n`;
  }
  return text;
}

async function findings(
  profile: ValidationProfile,
  code: string,
  staleTerms: string[] = [],
  deliberationDir?: string,
  options: { flowIds?: string[]; testFileGlobs?: string[] } = {},
) {
  const config = structuredClone(defaultConfig);
  if (deliberationDir) config.paths.deliberationDir = deliberationDir;
  config.paths.specsDir = specs;
  config.paths.contractsDir = `${specs}/03_contract`;
  config.validation.traceability.testFileGlobs = options.testFileGlobs ?? [
    "tests/**/*.test.ts",
    "tests/**/*_test.py",
  ];
  if (staleTerms.length > 0) config.validation.staleTerms = staleTerms;
  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile, ...(options.flowIds ? { flowIds: options.flowIds } : {}) },
  );
  return result.issues.filter((item) => item.code === code);
}

const customer = ["customer", "A person who buys.", "client, account holder", ""];

async function signInTree(): Promise<void> {
  await put(glossaryFile, glossary([customer]));
  await put(storyFile, "# US-0001-0001: Sign in\n\n## User Story\nThe Client signs in.\n");
  await put(contractFile, "# CLI-0001: Sign in\n\nAn account holder may sign in.\n");
  await put(
    `${specs}/decisions.md`,
    "# Decisions\n\n## Decisions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n| DEC-0001 | Name the buyer | Rejected: client |\n",
  );
}

describe("the glossary table and its contexts", () => {
  // QFAI:EX-0001-0317-01
  // QFAI:AC-0001-0317-01
  it("refuses a two-column table and accepts the four columns with a contexts table", async () => {
    await put(
      glossaryFile,
      "# Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| order | A request. |\n",
    );
    const twoColumn = await findings("sdd", "QFAI-DOCSCHEMA-001");
    expect(twoColumn.length).toBeGreaterThan(0);
    expect(twoColumn.every((item) => item.file === glossaryFile)).toBe(true);
    expect(twoColumn.map((item) => item.message).join("\n")).toMatch(/Avoid|Context/);

    await put(
      glossaryFile,
      glossary([["order", "A request.", "", "Billing"]], [["Billing", "Charging for orders."]]),
    );
    expect(await findings("sdd", "QFAI-DOCSCHEMA-001")).toEqual([]);

    await put(
      glossaryFile,
      "# Glossary\n\n## Terms\n\n| Term | Definition | Avoid | Context | Owner |\n| --- | --- | --- | --- | --- |\n| order | A request. |  |  | ops |\n",
    );
    expect((await findings("sdd", "QFAI-DOCSCHEMA-001")).length).toBeGreaterThan(0);
  });

  // QFAI:EX-0001-0317-02
  it("is the shape qfai init writes", async () => {
    const template = await readFile(
      path.join(
        getInitAssetsDir(),
        ".qfai/assistant/skill/qfai-sdd/templates/spec/01_policy/glossary.md",
      ),
      "utf8",
    );
    expect(template.replace(/\r\n/g, "\n")).toContain("| Term | Definition | Avoid | Context |\n");
  });
});

describe("a rejected synonym in the story tree", () => {
  // QFAI:EX-0001-0317-03
  // QFAI:AC-0001-0317-02
  it("is an error on the line, outside the glossary and the registers", async () => {
    await signInTree();
    const found = await findings("sdd", "QFAI-STORY-022");
    expect(
      found
        .map((item) => [item.file, item.loc?.line, item.refs, item.severity])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toEqual([
      [storyFile, 4, ["client", "customer"], "error"],
      [contractFile, 3, ["account holder", "customer"], "error"],
    ]);
  });

  // QFAI:EX-0001-0317-04
  it("checks nothing for an empty Avoid cell and leaves stale terms a warning", async () => {
    await signInTree();
    await put(glossaryFile, glossary([["customer", "A person who buys.", "", ""]]));
    expect(await findings("sdd", "QFAI-STORY-022", ["client"])).toEqual([]);
    const stale = await findings("sdd", "QFAI-STORY-016", ["client"]);
    expect(stale.map((item) => [item.file, item.severity])).toEqual([[storyFile, "warning"]]);
  });
});

describe("a rejected synonym in a test title", () => {
  // QFAI:EX-0001-0317-05
  // QFAI:AC-0001-0317-03
  it("is an error at the title in verify, and comments and bodies are not read", async () => {
    await put(glossaryFile, glossary([customer]));
    await put(
      testFile,
      [
        'import { describe, it } from "vitest";',
        'describe("client sign-in", () => {',
        '  it.skip("signs a customer in", () => {',
        "    // client",
        '    const who = "client";',
        "  });",
        "});",
        "",
      ].join("\n"),
    );
    const verify = await findings("verify", "QFAI-STORY-022");
    expect(verify.map((item) => [item.file, item.loc?.line, item.refs])).toEqual([
      [testFile, 2, ["client", "customer"]],
    ]);
    expect(await findings("sdd", "QFAI-STORY-022")).toEqual([]);
  });
});

describe("the context of a glossary row", () => {
  // QFAI:EX-0001-0317-06
  // QFAI:AC-0001-0317-04
  it("is an error when the contexts table does not declare it", async () => {
    await put(
      glossaryFile,
      glossary(
        [
          ["order", "A request to pay.", "", "Billing"],
          ["order", "A parcel to send.", "", "Shipping"],
          ["parcel", "A box.", "", ""],
        ],
        [["Billing", "Charging for orders."]],
      ),
    );
    const found = await findings("sdd", "QFAI-STORY-023");
    expect(found.map((item) => [item.file, item.refs, item.severity])).toEqual([
      [glossaryFile, ["order", "Shipping"], "error"],
    ]);
  });
});

describe("what the story-tree check leaves alone", () => {
  // QFAI:EX-0001-0317-07
  it("skips deliberation records, code spans and a word inside a glossary term", async () => {
    await signInTree();
    await put(
      glossaryFile,
      glossary([
        customer,
        ["account holder", "A person with an account.", "", ""],
        ["user", "x", "account", ""],
      ]),
    );
    await put(`${specs}/records/20261127000000-names.md`, "# Record\n\nWe rejected client.\n");
    await put(
      storyFile,
      "# US-0001-0001: Sign in\n\n## User Story\nThe `client` flag. The account holder signs.\n",
    );
    await put(contractFile, "# CLI-0001: Sign in\n\nNothing here.\n");
    expect(await findings("sdd", "QFAI-STORY-022", [], `${specs}/records`)).toEqual([]);
  });

  // QFAI:EX-0001-0317-08
  it("runs in sdd, verify and full only", async () => {
    await signInTree();
    const profiles: ValidationProfile[] = [
      "discussion",
      "sdd",
      "prototyping",
      "saas-package",
      "atdd",
      "tdd",
      "drift",
      "verify",
      "full",
    ];
    const raised: string[] = [];
    for (const profile of profiles) {
      if ((await findings(profile, "QFAI-STORY-022")).length > 0) raised.push(profile);
    }
    expect(raised).toEqual(["sdd", "verify", "full"]);
  });
});

describe("test titles the check does not read", () => {
  // QFAI:EX-0001-0317-09
  it("reads a modified call, and leaves each tables and other languages alone", async () => {
    await put(glossaryFile, glossary([customer]));
    await put(
      "tests/a.test.ts",
      'it.only("client a", () => {});\nit.each([1])("client %s", () => {});\n',
    );
    await put("tests/a_test.py", "def test_client():\n    pass\n");
    const found = await findings("verify", "QFAI-STORY-022");
    expect(found.map((item) => [item.file, item.loc?.line])).toEqual([["tests/a.test.ts", 1]]);
  });
});

describe("the scope and the edges of the check", () => {
  // QFAI:EX-0001-0317-10
  it("raises neither code under --flow for a flow that holds none of the documents", async () => {
    await signInTree();
    await put(
      `${specs}/02_business-flow/business-flow-0002/business-flow.md`,
      "# BF-0002: Other\n",
    );
    await put(testFile, 'describe("client sign-in", () => {});\n');
    await put(
      glossaryFile,
      glossary([customer, ["order", "A request.", "", "Shipping"]], [["Billing", "Charging."]]),
    );
    expect(await findings("verify", "QFAI-STORY-022")).not.toEqual([]);
    expect(await findings("verify", "QFAI-STORY-023")).not.toEqual([]);
    const scoped = { flowIds: ["BF-0002"] };
    expect(await findings("verify", "QFAI-STORY-022", [], undefined, scoped)).toEqual([]);
    expect(await findings("verify", "QFAI-STORY-023", [], undefined, scoped)).toEqual([]);
  });

  // QFAI:EX-0001-0317-11
  it("finds a phrase across a line break at its first line, and a word in both lists raises both", async () => {
    await signInTree();
    await put(
      contractFile,
      "# CLI-0001: Sign in\n\nAn account\nholder may sign in.\n<!-- client -->\n",
    );
    const synonyms = await findings("sdd", "QFAI-STORY-022", ["client"]);
    expect(
      synonyms
        .map((item) => [item.file, item.loc?.line, item.refs?.[0]])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toEqual([
      [storyFile, 4, "client"],
      [contractFile, 3, "account holder"],
    ]);
    const stale = await findings("sdd", "QFAI-STORY-016", ["client"]);
    expect(stale.map((item) => item.file)).toContain(storyFile);
  });

  it("leaves a failed test scan to the obligations pass instead of throwing", async () => {
    await put(glossaryFile, glossary([customer]));
    const scanFailures = await findings("verify", "QFAI-SCAN-002", [], undefined, {
      testFileGlobs: ["tests/\u0000/*.test.ts"],
    });
    expect(scanFailures.length).toBeGreaterThan(0);
  });
});

describe("a rejected word that holds a glossary term", () => {
  // QFAI:EX-0001-0317-12
  it("is still reported, while the term alone is not", async () => {
    await put(glossaryFile, glossary([["user", "A person who signs in.", "end user", ""]]));
    await put(
      storyFile,
      "# US-0001-0001: Sign in\n\n## User Story\nThe end user signs in. A user leaves.\n",
    );
    const found = await findings("sdd", "QFAI-STORY-022");
    expect(found.map((item) => [item.file, item.loc?.line, item.refs])).toEqual([
      [storyFile, 4, ["end user", "user"]],
    ]);
  });
});

describe("what the review found the check misread", () => {
  // QFAI:EX-0001-0317-13
  it("masks a double-backtick code span that holds a single backtick", async () => {
    await signInTree();
    await put(
      storyFile,
      "# US-0001-0001: Sign in\n\n## User Story\nThe ``client `flag` setting`` stays.\n",
    );
    await put(contractFile, "# CLI-0001: Sign in\n\nNothing here.\n");
    expect(await findings("sdd", "QFAI-STORY-022")).toEqual([]);
  });

  // QFAI:EX-0001-0317-14
  it("reads a title literal past a leading comment, decodes escapes, and leaves an expression alone", async () => {
    await put(glossaryFile, glossary([customer]));
    await put(
      "tests/a.test.ts",
      [
        'it("client".replace("client", "customer"), () => {});',
        'it(/* title */ "client a", () => {});',
        'it("clien\\u0074 b", () => {});',
        "",
      ].join("\n"),
    );
    const found = await findings("verify", "QFAI-STORY-022");
    expect(found.map((item) => [item.file, item.loc?.line])).toEqual([
      ["tests/a.test.ts", 2],
      ["tests/a.test.ts", 3],
    ]);
  });
});
