/**
 * The clauses of `ui-affecting.md` a gate over the checked-out tree evaluates:
 * clause 1 where `Owning module` is declared, clause 2, and clause 3.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { stringify as stringifyYaml } from "yaml";

import {
  declaringEntry,
  readDeclaredUiPaths,
  standsAlone,
  UiAffectingClauses,
  uiPathGlobMatches,
} from "../../src/core/uiAffectingClauses.js";
import { loadConfig } from "../../src/core/config.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function project(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-affecting-"));
  roots.push(root);
  for (const [relative, body] of Object.entries(files)) {
    const file = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf-8");
  }
  return root;
}

/** `qfai.config.yaml` declaring these globs as `uiux.surfacePaths`. */
function surfacePaths(globs: readonly string[]): string {
  return stringifyYaml({ uiux: { surfacePaths: globs } });
}

const CONFIG = "qfai.config.yaml";
const TEST_CASES = ".qfai/specs/spec-0001/06_Test-Cases.md";
const USER_STORIES = ".qfai/specs/spec-0001/02_User-stories.md";

function clauses(root: string): UiAffectingClauses {
  return new UiAffectingClauses(root, ".qfai/spec/03_contract", {
    testCases: path.join(root, TEST_CASES),
    userStories: path.join(root, USER_STORIES),
  });
}

const ROW = { owningModule: "-", testFile: "tests/unit/total.test.ts", obligations: [] };

describe("the declared UI path matching rules", () => {
  // QFAI:EX-0001-0078-07
  it("reads ** as zero or more segments", () => {
    for (const candidate of [
      "src/components",
      "src/components/Button.tsx",
      "src/components/forms/Button.tsx",
    ]) {
      expect(uiPathGlobMatches("src/components/**", candidate), candidate).toBe(true);
    }
    expect(uiPathGlobMatches("**/Button.tsx", "Button.tsx")).toBe(true);
    expect(uiPathGlobMatches("src/**/Button.tsx", "src/Button.tsx")).toBe(true);
  });

  // QFAI:EX-0001-0078-07
  it("keeps * and ? inside one segment", () => {
    expect(uiPathGlobMatches("src/*.tsx", "src/App.tsx")).toBe(true);
    expect(uiPathGlobMatches("src/*.tsx", "src/ui/App.tsx")).toBe(false);
    expect(uiPathGlobMatches("src/?.tsx", "src/A.tsx")).toBe(true);
    expect(uiPathGlobMatches("src/?.tsx", "src/AB.tsx")).toBe(false);
  });

  // QFAI:EX-0001-0078-07
  it("treats a leading dot as ordinary, case as significant, and braces as text", () => {
    expect(uiPathGlobMatches("src/**", "src/.keep")).toBe(true);
    expect(uiPathGlobMatches("src/ui/**", "src/UI/App.tsx")).toBe(false);
    expect(uiPathGlobMatches("src/{a,b}/x.ts", "src/a/x.ts")).toBe(false);
    expect(uiPathGlobMatches("src/{a,b}/x.ts", "src/{a,b}/x.ts")).toBe(true);
  });
});

describe("the declared UI paths", () => {
  // QFAI:EX-0001-0078-05
  it("reads the globs of uiux.surfacePaths", async () => {
    const root = await project({ [CONFIG]: surfacePaths(["src/ui/**", "tests/e2e/**"]) });
    expect(await readDeclaredUiPaths(root)).toEqual({
      kind: "globs",
      globs: ["src/ui/**", "tests/e2e/**"],
    });
  });

  // QFAI:EX-0001-0078-05
  it("declares nothing when the key is absent", async () => {
    const root = await project({ [CONFIG]: "paths:\n  specsDir: .qfai/spec\n" });
    expect(await readDeclaredUiPaths(root)).toEqual({ kind: "undeclared" });
    expect(await readDeclaredUiPaths(await project({}))).toEqual({ kind: "undeclared" });
  });

  // QFAI:EX-0001-0078-05
  it("reads an empty list as a project with no UI surface", async () => {
    const root = await project({ [CONFIG]: surfacePaths([]) });
    expect(await readDeclaredUiPaths(root)).toEqual({ kind: "none" });
  });

  // QFAI:EX-0001-0078-06
  it("reports a value that is not a list of globs and declares nothing", async () => {
    const root = await project({ [CONFIG]: "uiux:\n  surfacePaths: src/ui/**\n" });
    const { issues } = await loadConfig(root);
    expect(issues.map((entry) => entry.message)).toContain(
      "uiux.surfacePaths must be a list of non-empty glob strings.",
    );
    expect(await readDeclaredUiPaths(root)).toEqual({ kind: "undeclared" });
  });
});

describe("an id occurring verbatim", () => {
  it("occurs where it stands on its own, not inside a longer identifier", () => {
    expect(standsAlone("the home screen", "home")).toBe(true);
    expect(standsAlone("the homepage", "home")).toBe(false);
    expect(standsAlone("covers TC-00010", "TC-0001")).toBe(false);
  });

  it("finds the table row and the section that declare an obligation", () => {
    const document = [
      "# 06 Test Cases",
      "",
      "| TC-ID | Level | Steps |",
      "| --- | --- | --- |",
      "| TC-0001 | L2 | open home |",
      "| TC-0002 | L2 | open cart |",
      "",
      "## TC-0001: detail",
      "",
      "Renders the checkout-button.",
      "",
      "## TC-0002: other",
    ].join("\n");
    const entry = declaringEntry(document, "TC-0001");
    expect(entry).toContain("open home");
    expect(entry).toContain("checkout-button");
    expect(entry).not.toContain("open cart");
    expect(entry).not.toContain("other");
  });
});

describe("the first clause that holds", () => {
  it("clause 2: the Test file matches a declared UI path", async () => {
    const root = await project({ [CONFIG]: surfacePaths(["tests/e2e/**"]) });
    expect(
      await clauses(root).firstHolding({ ...ROW, testFile: "tests/e2e/home.spec.ts" }),
    ).toEqual({ clause: 2, because: "Test file tests/e2e/home.spec.ts matches tests/e2e/**" });
    expect(await clauses(root).firstHolding(ROW)).toBeNull();
  });

  it("clause 1: a declared Owning module, read verbatim and as a dotted module", async () => {
    const root = await project({
      [CONFIG]: surfacePaths(["src/components/**"]),
      "src/components/Card.tsx": "export {};\n",
      "app.config.ts": "export {};\n",
    });
    expect(
      await clauses(root).firstHolding({ ...ROW, owningModule: "src.components.Card" }),
    ).toEqual({
      clause: 1,
      because: "Owning module src.components.Card matches src/components/**",
    });
    // `app/config/ts` names nothing in the tree, so the dotted reading is dropped.
    const appRoot = await project({ [CONFIG]: surfacePaths(["app/**"]), "app.config.ts": "" });
    expect(
      await clauses(appRoot).firstHolding({ ...ROW, owningModule: "app.config.ts" }),
    ).toBeNull();
  });

  it("does not evaluate clause 1 on a row that declares no Owning module", async () => {
    const root = await project({ [CONFIG]: surfacePaths(["src/components/**"]) });
    expect(await clauses(root).firstHolding({ ...ROW, owningModule: "-" })).toBeNull();
  });

  it("clause 3, direction a: a UI contract names the obligation", async () => {
    const root = await project({
      ".qfai/spec/03_contract/ui/home.yaml":
        "screens:\n  - id: home\n    route: /\n    notes: TC-0001\n",
    });
    expect(await clauses(root).firstHolding({ ...ROW, obligations: ["TC-0001"] })).toEqual({
      clause: 3,
      because: "TC-0001 occurs in .qfai/spec/03_contract/ui/home.yaml",
    });
  });

  it("clause 3, direction b: the obligation's entry names a UI contract id", async () => {
    const root = await project({
      ".qfai/spec/03_contract/ui/home.yaml": [
        "screens:",
        "  - id: home",
        "    route: /",
        "    elements:",
        "      - id: checkout-button",
        "",
      ].join("\n"),
      [TEST_CASES]: "| TC-ID | Steps |\n| --- | --- |\n| TC-0001 | press checkout-button |\n",
      [USER_STORIES]: "## US-0001: pay\n\nAs a buyer I press checkout-button.\n",
    });
    expect(await clauses(root).firstHolding({ ...ROW, obligations: ["TC-0001"] })).toEqual({
      clause: 3,
      because: `checkout-button from .qfai/spec/03_contract/ui/home.yaml occurs in the entry for TC-0001 in ${TEST_CASES}`,
    });
    expect((await clauses(root).firstHolding({ ...ROW, obligations: ["US-0001"] }))?.clause).toBe(
      3,
    );
  });

  it("finds no link where neither side names the other", async () => {
    const root = await project({
      [CONFIG]: surfacePaths([]),
      ".qfai/spec/03_contract/ui/home.yaml": "screens:\n  - id: home\n    route: /\n",
      [TEST_CASES]: "| TC-ID | Steps |\n| --- | --- |\n| TC-0001 | add totals |\n",
    });
    expect(
      await clauses(root).firstHolding({
        owningModule: "src/components/Total.ts",
        testFile: "tests/e2e/total.spec.ts",
        obligations: ["TC-0001"],
      }),
    ).toBeNull();
  });
});
