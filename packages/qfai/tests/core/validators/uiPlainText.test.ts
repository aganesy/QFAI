/**
 * Every plain text in UI source states why it is there.
 *
 * The check reads the current prototype pages and the files `uiux.surfacePaths`
 * selects, and fails each literal text outside the exempt elements that no
 * `qfai-text` comment justifies.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../../src/core/config.js";
import type { Issue } from "../../../src/core/types.js";
import { validateProject } from "../../../src/core/validate.js";
import { validateUiPlainText } from "../../../src/core/validators/uiPlainText.js";

const roots: string[] = [];
const packageRequire = createRequire(import.meta.url);
const realTypescript = (): unknown => packageRequire("typescript");

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plain-text-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

function configWith(surfacePaths: string[]): QfaiConfig {
  const config = defaultConfig;
  return { ...config, uiux: { ...config.uiux, surfacePaths } };
}

async function run(
  files: Readonly<Record<string, string>>,
  surfacePaths: string[] = ["src/**"],
): Promise<Issue[]> {
  const root = await projectWith(files);
  return validateUiPlainText(root, configWith(surfacePaths), { loadTypescript: realTypescript });
}

const codes = (issues: Issue[]): string[] => issues.map((found) => found.code);
const REASON = "<!-- qfai-text: why=Orders sync once a night; without=Users expect live totals -->";
const JSX_REASON =
  "{/* qfai-text: why=Orders sync once a night; without=Users expect live totals */}";
const page = (body: string): string =>
  `<!doctype html>\n<html>\n<head><title>Orders</title></head>\n<body>\n${body}\n</body>\n</html>\n`;

// QFAI:EX-0001-0297-01
describe("a plain text without a reason fails", () => {
  it("names the file, the line and the first 40 code points, with the remedies in order", async () => {
    const body = "<main>\n\n<p>Manage all your orders easily in one place.</p>\n</main>";
    const issues = await run({ ".qfai/prototype/final/index.html": page(body) }, []);
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001"]);
    const [found] = issues;
    expect(found?.severity).toBe("error");
    expect(found?.file).toBe(".qfai/prototype/final/index.html");
    expect(found?.loc?.line).toBe(7);
    expect(found?.message).toContain("Manage all your orders easily in one pla");
    expect(found?.message).not.toContain("in one place");
    const fix = found?.suggested_action ?? "";
    const order = ["Delete", "Replace", "Move", "write"].map((word) => fix.indexOf(word));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

// QFAI:EX-0001-0297-02
describe("plain text in JSX and in sample data fails", () => {
  it("reports a nested JSX text and a prototype table cell", async () => {
    const issues = await run({
      "src/Tip.tsx":
        "export const Tip = () => (\n  <div>\n    <span>Tip: drag rows to reorder</span>\n  </div>\n);\n",
      ".qfai/prototype/final/index.html": page("<table><tr><td>ORD-1042</td></tr></table>"),
    });
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001", "QFAI-UITEXT-001"]);
    expect(issues.map((found) => found.file).sort()).toEqual([
      ".qfai/prototype/final/index.html",
      "src/Tip.tsx",
    ]);
    expect(issues.find((found) => found.file === "src/Tip.tsx")?.loc?.line).toBe(3);
  });
});

// QFAI:EX-0001-0297-03
describe("the check runs only in the profiles that read UI source", () => {
  it("raises nothing in sdd and tdd, and an error in prototyping and full", async () => {
    const root = await projectWith({
      ".qfai/prototype/final/index.html": page("<p>Manage all your orders.</p>"),
    });
    const uitext = async (profile: "sdd" | "tdd" | "prototyping" | "full"): Promise<string[]> => {
      const result = await validateProject(root, undefined, { profile });
      return codes(result.issues).filter((code) => code.startsWith("QFAI-UITEXT-"));
    };
    expect(await uitext("sdd")).toEqual([]);
    expect(await uitext("tdd")).toEqual([]);
    expect(await uitext("prototyping")).toEqual(["QFAI-UITEXT-001"]);
    expect(await uitext("full")).toEqual(["QFAI-UITEXT-001"]);
  });
});

// QFAI:EX-0001-0297-04
describe("a reason before the text or its parent clears it", () => {
  it("accepts every placement the rule names", async () => {
    const issues = await run({
      ".qfai/prototype/final/index.html": page(
        `${REASON}\n<p>Totals update nightly.</p>\n<p>${REASON} Totals update nightly.</p>`,
      ),
      "src/A.tsx": `export const A = () => (\n  <div>\n    ${JSX_REASON}\n    <p>Totals update nightly.</p>\n  </div>\n);\n`,
      "src/B.jsx":
        "export function B() {\n  return (/* qfai-text: why=Orders sync once a night; without=Users expect live totals */ <p>Totals update nightly.</p>);\n}\n",
    });
    expect(issues).toEqual([]);
  });
});

// QFAI:EX-0001-0297-05
describe("a reason that leaves out what is asked fails", () => {
  it("names each defect and raises no 001 for the text", async () => {
    const bodies = [
      ["why=Needed", "without"],
      ["why=; without=x", "empty"],
      ["why=Sync is slow; without=sync  is slow", "same"],
      ["why=a; without=b; note=c", "note"],
      ["why=a; why=b; without=c", "repeat"],
      ["why=a; b; without=c", "="],
    ] as const;
    const body = bodies.map(
      ([text]) => `<!-- qfai-text: ${text} -->\n<p>Totals update nightly.</p>`,
    );
    const issues = await run({ ".qfai/prototype/final/index.html": page(body.join("\n")) });
    expect(codes(issues)).toEqual(bodies.map(() => "QFAI-UITEXT-002"));
    bodies.forEach(([, word], index) => {
      expect(issues[index]?.message.toLowerCase()).toContain(word.toLowerCase());
    });
  });
});

// QFAI:EX-0001-0297-06
describe("a reason counts only before the text or its parent", () => {
  it("ignores a reason before an exempt element and one two levels up", async () => {
    const issues = await run({
      ".qfai/prototype/final/index.html": page(
        `${REASON}\n<button>Save</button>\n${REASON}\n<div>\n<p>Totals update nightly.</p>\n</div>`,
      ),
    });
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001"]);
    expect(issues[0]?.message).toContain("Totals update nightly.");
  });
});

// QFAI:EX-0001-0297-07
describe("text that names, labels or reports is not checked in HTML", () => {
  it("raises nothing for exempt elements, attributes, whitespace and scripts", async () => {
    const body = [
      "<h2>Orders</h2>",
      '<label for="q">Search</label><input id="q" aria-label="Search orders">',
      "<button><span>Save</span></button>",
      '<a href="#help">Help</a>',
      "<table><tr><th>Number</th></tr></table>",
      "<select><option>All</option></select>",
      '<div role="alert">Could not save. Try again.</div>',
      "   ",
      "<script>const label = 'not text';</script>",
    ].join("\n");
    expect(await run({ ".qfai/prototype/final/index.html": page(body) })).toEqual([]);
  });
});

// QFAI:EX-0001-0297-08
describe("text that names or labels is not checked in components", () => {
  it("raises nothing for expressions and exempt components in Vue, Svelte and JSX", async () => {
    const issues = await run({
      "src/a.vue":
        '<script setup>\nconst count = 1;\n</script>\n<template>\n  <p>{{ count }}</p>\n  <Button>Save</Button>\n  <RouterLink to="/">Home</RouterLink>\n</template>\n<style>\np { color: red; }\n</style>\n',
      "src/b.svelte":
        "<script>\n  let count = 1;\n</script>\n<p>{count}</p>\n<Icon />\n<h1>Orders</h1>\n",
      "src/c.tsx":
        'export const C = ({ count }: { count: number }) => (\n  <div>\n    <p>{count}</p>\n    <Dialog.Title>Delete</Dialog.Title>\n    <Link href="/">Home</Link>\n  </div>\n);\n',
    });
    expect(issues).toEqual([]);
  });
});

// QFAI:EX-0001-0297-09
describe("literal text in a component or in HTML braces is plain text", () => {
  it("reports a component that matches no exempt element, a string child and HTML braces", async () => {
    const issues = await run({
      "src/d.tsx":
        'export const D = () => (\n  <div>\n    <Card>Welcome back!</Card>\n    <p>{"Saved"}</p>\n  </div>\n);\n',
      ".qfai/prototype/final/index.html": page("<p>{draft}</p>"),
    });
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001", "QFAI-UITEXT-001", "QFAI-UITEXT-001"]);
    const messages = issues.map((found) => found.message).join("\n");
    expect(messages).toContain("Welcome back!");
    expect(messages).toContain("Saved");
    expect(messages).toContain("{draft}");
  });

  it("does not let a self-closing component in Svelte swallow the text after it", async () => {
    const issues = await run({ "src/e.svelte": "<Icon />\n<p>Totals update nightly.</p>\n" });
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001"]);
  });
});

// QFAI:EX-0001-0297-10
describe("the files read are the current prototype and the declared surface", () => {
  it("reads the last iteration, the final page and the selected components only", async () => {
    const text = "<p>Totals update nightly.</p>";
    const issues = await run(
      {
        ".qfai/prototype/iter-01/index.html": page(text),
        ".qfai/prototype/iter-02/index.html": page(text),
        ".qfai/prototype/final/index.html": page(text),
        "src/ui/a.vue": `<template>\n  ${text}\n</template>\n`,
        "src/ui/b.svelte": `${text}\n`,
        "src/ui/c.ts": `export const c = "${text}";\n`,
        "src/ui/d.css": "p { color: red; }\n",
        "src/ui/e.test.tsx": `export const E = () => ${text};\n`,
      },
      ["src/ui/**"],
    );
    expect(issues.map((found) => found.file).sort()).toEqual([
      ".qfai/prototype/final/index.html",
      ".qfai/prototype/iter-02/index.html",
      "src/ui/a.vue",
      "src/ui/b.svelte",
    ]);
  });
});

// QFAI:EX-0001-0297-11
describe("a project with no UI source raises nothing", () => {
  it("reads nothing when no glob is declared and no prototype exists", async () => {
    expect(await run({ "src/a.tsx": "export const A = () => <p>Hi</p>;\n" }, [])).toEqual([]);
  });
});

// QFAI:EX-0001-0297-12
describe("JSX needs the TypeScript compiler the project installs", () => {
  it("raises one 003 for the unread files and still reads HTML", async () => {
    const root = await projectWith({
      "src/a.tsx": "export const A = () => <p>Hi there</p>;\n",
      "src/b.tsx": "export const B = () => <p>Hello</p>;\n",
      ".qfai/prototype/final/index.html": page("<p>Totals update nightly.</p>"),
    });
    for (const loadTypescript of [
      (): unknown => {
        throw new Error("Cannot find module 'typescript'");
      },
      (): unknown => ({ version: "0.0.0" }),
    ]) {
      const issues = await validateUiPlainText(root, configWith(["src/**"]), { loadTypescript });
      expect(codes(issues).sort()).toEqual(["QFAI-UITEXT-001", "QFAI-UITEXT-003"]);
      const missing = issues.find((found) => found.code === "QFAI-UITEXT-003");
      expect(missing?.severity).toBe("error");
      expect(missing?.file).toBe("qfai.config.yaml");
      expect(missing?.message).toContain("typescript");
      expect(missing?.message).toContain("2");
    }
  });
});

// QFAI:EX-0001-0297-04
describe("a reason is read in every format and at the right line", () => {
  it("accepts a reason before the first element of a Vue, Svelte or fragment HTML file", async () => {
    const issues = await run({
      "src/a.vue": `<template>\n  ${REASON}\n  <p>Totals update nightly.</p>\n</template>\n`,
      "src/b.svelte": `${REASON}\n<p>Totals update nightly.</p>\n`,
      "src/c.html": `${REASON}\n<p>Totals update nightly.</p>\n`,
    });
    expect(issues).toEqual([]);
  });

  it("ignores a reason followed by another comment before a JSX element", async () => {
    const issues = await run({
      "src/a.jsx":
        "export const A = () => (/* qfai-text: why=a b; without=c d */ /* other */ <p>Totals update nightly.</p>);\n",
    });
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001"]);
  });
});

// QFAI:EX-0001-0297-02
describe("plain text is found wherever the source holds it", () => {
  it("reports a JSX text on its own line at that line, and text in nested templates", async () => {
    const issues = await run({
      "src/a.tsx": "export const A = () => (\n  <p>\n    Totals update nightly.\n  </p>\n);\n",
      "src/b.vue":
        "<script setup>\nconst t = '<template>x</template>';\n</script>\n<template>\n  <template v-if=\"ok\">\n    <p>Slot text</p>\n  </template>\n</template>\n",
      ".qfai/prototype/final/index.html": page("<template><p>Cloned text</p></template>"),
    });
    expect(issues.map((found) => [found.file, found.loc?.line])).toEqual([
      [".qfai/prototype/final/index.html", 5],
      ["src/a.tsx", 3],
      ["src/b.vue", 6],
    ]);
  });

  it("does not exempt data-role, and blanks a balanced brace after an unmatched one", async () => {
    const issues = await run({
      "src/a.tsx": 'export const A = () => <div data-role="status">Hidden copy</div>;\n',
      "src/b.svelte": "<p>Press { to open</p>\n<p>Second {x}</p>\n",
    });
    expect(issues.map((found) => found.message).join("\n")).toContain("Hidden copy");
    expect(issues.map((found) => found.message).join("\n")).not.toContain("{x}");
  });
});

// QFAI:EX-0001-0297-08
describe("exempt components keep their name in every format", () => {
  it("exempts Link in Vue and Svelte and a role given as an expression in JSX", async () => {
    const issues = await run({
      "src/a.vue": '<template>\n  <Link href="/">Home</Link>\n</template>\n',
      "src/b.svelte": '<Link href="/">Home</Link>\n',
      "src/c.tsx": 'export const C = () => <div role={"alert"}>Could not save</div>;\n',
      "src/d.tsx": "export const D = () => <p>&nbsp;</p>;\n",
    });
    expect(issues).toEqual([]);
  });
});

// QFAI:EX-0001-0297-12
describe("the default loader resolves typescript from the project root", () => {
  it("raises 003 when the project installs no typescript", async () => {
    const root = await projectWith({ "src/a.tsx": "export const A = () => <p>Hi</p>;\n" });
    const issues = await validateUiPlainText(root, configWith(["src/**"]));
    expect(codes(issues)).toEqual(["QFAI-UITEXT-003"]);
  });
});
