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
    const order = ["needs this text", "write the reason", "delete", "replace", "move"].map((word) =>
      fix.indexOf(word),
    );
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Moving copy out of the markup clears the finding without a reason, so the
    // fix says that is not one.
    expect(fix).toContain(
      "Moving the text into a constant, a prop or an attribute value is not a fix",
    );
  });
});

// QFAI:EX-0001-0297-02
describe("plain text in JSX and in sample data fails", () => {
  it("reports a nested JSX text and a sentence in a prototype table cell", async () => {
    const issues = await run({
      "src/Tip.tsx":
        "export const Tip = () => (\n  <div>\n    <span>Tip: drag rows to reorder</span>\n  </div>\n);\n",
      ".qfai/prototype/final/index.html": page(
        "<table><tr><td>Ships once the payment clears.</td></tr></table>",
      ),
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

// QFAI:EX-0001-0297-15
describe("a file reason clears every text the file gives no reason of its own", () => {
  it("clears a file's texts once, and fails a malformed one at its line", async () => {
    const issues = await run({
      "src/Help.tsx":
        "/* qfai-text-file: why=This help page explains each billing term; without=Users misread their invoice */\nexport const Help = () => (\n  <div>\n    <p>Credits expire after a year.</p>\n    <p>Refunds return to the card used.</p>\n  </div>\n);\n",
      "src/notes.html":
        "<!-- qfai-text-file: why=Release notes are read as text; without=Users miss what changed -->\n<p>Exports now include tax.</p>\n<!-- qfai-text: why=a; without=a -->\n<p>Totals update nightly.</p>\n",
      "src/Broken.tsx":
        "\n/* qfai-text-file: why=Needed */\nexport const B = () => <p>Credits expire after a year.</p>;\n",
      "src/Plain.tsx": "export const P = () => <p>Credits expire after a year.</p>;\n",
      // A JSX child comment and a multi-line HTML comment count; the defect is at the opener.
      "src/Child.tsx":
        "export const C = () => (\n  <div>\n    {/* qfai-text-file: why=Each term needs its definition; without=Users misread the bill */}\n    <p>Credits expire after a year.</p>\n  </div>\n);\n",
      "src/broken.html": "<!--\n  qfai-text-file: why=Needed\n-->\n<p>Totals update nightly.</p>\n",
      // A line comment and a mention inside other text are not file reasons.
      "src/Line.tsx":
        "// qfai-text-file: why=Each term needs its definition; without=Users misread the bill\nexport const L = () => <p>Credits expire after a year.</p>;\n",
      ".qfai/prototype/final/index.html": page(
        "<!-- qfai-text-file: why=Every screen explains itself; without=Users are lost -->\n<p>Manage all your orders easily.</p>",
      ),
    });
    // A text's own reason is still checked, and a file without a file reason is unchanged.
    const found = issues.map((each) => `${each.file}:${each.loc?.line} ${each.code}`).sort();
    // A prototype page holds every screen, so its file reason is not read.
    expect(found).toEqual([
      ".qfai/prototype/final/index.html:6 QFAI-UITEXT-001",
      "src/Broken.tsx:2 QFAI-UITEXT-002",
      "src/Broken.tsx:3 QFAI-UITEXT-001",
      "src/Line.tsx:2 QFAI-UITEXT-001",
      "src/Plain.tsx:1 QFAI-UITEXT-001",
      "src/broken.html:1 QFAI-UITEXT-002",
      "src/broken.html:4 QFAI-UITEXT-001",
      "src/notes.html:4 QFAI-UITEXT-002",
    ]);
    const fileDefect = issues.find(
      (each) => each.file === "src/Broken.tsx" && each.loc?.line === 2,
    );
    expect(fileDefect?.message).toContain("`qfai-text-file`");
  });
});

// QFAI:EX-0001-0297-06
describe("a reason counts only for the text or the element it stands before", () => {
  it("ignores a reason before an exempt element or before a sibling element", async () => {
    const issues = await run({
      ".qfai/prototype/final/index.html": page(
        `${REASON}\n<button>Save</button>\n<p>Totals update nightly.</p>\n${REASON}\n<p>Exports include tax.</p>\n<p>Refunds take a week.</p>`,
      ),
    });
    expect(issues.map((found) => [found.code, found.loc?.line])).toEqual([
      ["QFAI-UITEXT-001", 7],
      ["QFAI-UITEXT-001", 10],
    ]);
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
        'export const D = () => (\n  <div>\n    <Card>Welcome back!</Card>\n    <p>{"Your changes are saved."}</p>\n  </div>\n);\n',
      ".qfai/prototype/final/index.html": page("<p>{draft}</p>"),
    });
    expect(codes(issues)).toEqual(["QFAI-UITEXT-001", "QFAI-UITEXT-001", "QFAI-UITEXT-001"]);
    const messages = issues.map((found) => found.message).join("\n");
    expect(messages).toContain("Welcome back!");
    expect(messages).toContain("Your changes are saved.");
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

// QFAI:EX-0001-0297-14
describe("a component whose name ends in the word Link or Button is exempt", () => {
  it("exempts link and button components in every format, and checks other last words", async () => {
    const issues = await run({
      "src/a.tsx":
        'export const A = () => (\n  <div>\n    <ButtonLink href="/jobs">Find jobs</ButtonLink>\n    <NavLink to="/">Home</NavLink>\n    <UI.SubmitButton>Send</UI.SubmitButton>\n    <HTMLButton>Open</HTMLButton>\n  </div>\n);\n',
      "src/b.vue":
        '<template>\n  <ButtonLink to="/jobs">Find jobs</ButtonLink>\n  <router-link to="/">Home</router-link>\n  <navLink to="/">Help</navLink>\n  <LaBel>Name</LaBel>\n</template>\n',
      "src/b.svelte": '<ButtonLink href="/jobs">Find jobs</ButtonLink>\n',
      "src/b.html":
        '<RouterLink to="/">Home</RouterLink>\n<NuxtLink to="/">Jobs</NuxtLink>\n<nav-link>Help</nav-link>\n',
      "src/c.tsx":
        "export const C = () => (\n  <div>\n    <ButtonGroup>Pick one</ButtonGroup>\n    <Unlink>Detach</Unlink>\n  </div>\n);\n",
    });
    expect(issues.map((found) => [found.code, found.file, found.loc?.line])).toEqual([
      ["QFAI-UITEXT-001", "src/c.tsx", 3],
      ["QFAI-UITEXT-001", "src/c.tsx", 4],
    ]);
  });
});

// QFAI:EX-0001-0297-18
describe("uiText.elements reads a project component as the element it renders", () => {
  // The unmapped component is a `Card`, not a data cell: a short value in a `TableCell` is a data
  // value and exempt on its own, so it would not show that an unmapped component is still checked.
  const files = {
    "src/a.tsx":
      'export const A = () => (\n  <div>\n    <TableHead>Order</TableHead>\n    <UI.CardTitle>Recent orders</UI.CardTitle>\n    <NavItem href="/">Home</NavItem>\n    <StatusRegion>Saved</StatusRegion>\n    <Ui.Banner>Welcome</Ui.Banner>\n    <Card>Ships once paid.</Card>\n    <header>Plain</header>\n  </div>\n);\n',
    "src/b.vue":
      "<template>\n  <TableHead>Order</TableHead>\n  <table-head>Total</table-head>\n  <StatusRegion>Saved</StatusRegion>\n  <Card>Ships once paid.</Card>\n  <header>Plain</header>\n</template>\n",
    "src/c.svelte":
      "<CardTitle>Recent orders</CardTitle>\n<Ui.Banner>Welcome</Ui.Banner>\n<Banner>Hello</Banner>\n",
    "src/d.jsx":
      "export const D = () => (\n  <div>\n    <TableHead>Order</TableHead>\n    <Header>Top</Header>\n    <Card>Ships once paid.</Card>\n  </div>\n);\n",
    "src/e.html":
      "<table-head>Total</table-head>\n<TableHead>Order</TableHead>\n<header>Plain</header>\n",
  };

  it("exempts a mapped component by its whole name or last segment, and checks the rest", async () => {
    const root = await projectWith(files);
    const config: QfaiConfig = {
      ...configWith(["src/**"]),
      uiText: {
        elements: {
          TableHead: "th",
          CardTitle: "h3",
          NavItem: "a",
          StatusRegion: "status",
          "Ui.Banner": "alert",
          Header: "h2",
        },
      },
    };
    const issues = await validateUiPlainText(root, config, { loadTypescript: realTypescript });
    expect(issues.map((found) => [found.code, found.file, found.loc?.line])).toEqual([
      ["QFAI-UITEXT-001", "src/a.tsx", 8],
      ["QFAI-UITEXT-001", "src/a.tsx", 9],
      ["QFAI-UITEXT-001", "src/b.vue", 5],
      ["QFAI-UITEXT-001", "src/b.vue", 6],
      ["QFAI-UITEXT-001", "src/c.svelte", 3],
      ["QFAI-UITEXT-001", "src/d.jsx", 5],
      ["QFAI-UITEXT-001", "src/e.html", 2],
      ["QFAI-UITEXT-001", "src/e.html", 3],
    ]);
  });

  it("reads every text of the same files as plain text when the map is absent", async () => {
    const issues = await run(files);
    expect(codes(issues)).toEqual(Array.from({ length: 21 }, () => "QFAI-UITEXT-001"));
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

// QFAI:EX-0001-0297-16
describe("a data value is not plain text", () => {
  it("exempts a short non-sentence in a data cell and as an expression literal", async () => {
    const issues = await run({
      "src/a.html":
        "<table><tr><td>ORD-1042</td><td>-</td><td>\u3042\u308a</td><td>1.5 kg</td></tr></table>\n<dl><dd>2026-11-15</dd></dl>\n",
      "src/b.tsx":
        "export const B = ({ ok }: { ok: boolean }) => (\n  <div>\n    <table><tbody><tr><td>{'-'}</td><td>{ok ? '\u3042\u308a' : '\u306a\u3057'}</td><td><span>Paid</span></td></tr></tbody></table>\n    <TableCell>Paid</TableCell>\n    <p>{\"Saved\"}</p>\n    <p>{`3 items`}</p>\n  </div>\n);\n",
      "src/c.vue": "<template>\n  <table><tr><td>\u6e08</td></tr></table>\n</template>\n",
      "src/d.svelte":
        "<table><tr><td>-</td><td>{total}</td></tr></table>\n<dl><dd>\u6e08</dd></dl>\n",
    });
    expect(issues).toEqual([]);
  });

  it("still checks a sentence or a long text in a cell, and a sentence literal", async () => {
    const issues = await run({
      "src/a.html": [
        "<table><tr>",
        "<td>Ships once the payment clears.</td>",
        // A Japanese sentence that ends in U+3002.
        "<td>\u652f\u6255\u3044\u5f8c\u306b\u767a\u9001\u3057\u307e\u3059\u3002</td>",
        "<td>Pending approval from the finance team</td>",
        "<td>Paid! Thanks</td>",
        "</tr></table>",
        "<p>ORD-1042</p>",
      ].join("\n"),
      "src/b.tsx":
        'export const B = () => (\n  <div>\n    <p>{"Your changes are saved."}</p>\n    <td>{"Sent? Check your inbox"}</td>\n  </div>\n);\n',
    });
    expect(issues.map((found) => [found.code, found.file, found.loc?.line])).toEqual([
      ["QFAI-UITEXT-001", "src/a.html", 2],
      ["QFAI-UITEXT-001", "src/a.html", 3],
      ["QFAI-UITEXT-001", "src/a.html", 4],
      ["QFAI-UITEXT-001", "src/a.html", 5],
      ["QFAI-UITEXT-001", "src/a.html", 7],
      ["QFAI-UITEXT-001", "src/b.tsx", 3],
      ["QFAI-UITEXT-001", "src/b.tsx", 4],
    ]);
  });

  it("judges a cell by its whole text, so a sentence a nested element splits is still read", async () => {
    const issues = await run({
      "src/a.html": [
        "<table><tr>",
        "<td>Ships in <b>3</b> days once paid</td>",
        "<td>Order <b>ORD-1042</b></td>",
        "</tr></table>",
      ].join("\n"),
      "src/b.tsx": [
        "export const B = () => (",
        "  <tr>",
        "    <td>Ships in <b>3</b> days once paid</td>",
        '    <td>{"Ships in "}<b>3</b>{" days once paid"}</td>',
        "    <td>Order <b>ORD-1042</b></td>",
        "  </tr>",
        ");",
      ].join("\n"),
    });
    expect(issues.map((found) => [found.file, found.loc?.line])).toEqual([
      ["src/a.html", 2],
      ["src/a.html", 2],
      ["src/a.html", 2],
      ["src/b.tsx", 3],
      ["src/b.tsx", 3],
      ["src/b.tsx", 3],
      ["src/b.tsx", 4],
      ["src/b.tsx", 4],
      ["src/b.tsx", 4],
    ]);
  });

  it("leaves the text of a button, a link or a status out of a cell's whole text", async () => {
    const issues = await run({
      "src/a.html": [
        "<table><tr>",
        "<td><span>Pending</span> <button>Approve request</button></td>",
        '<td><span role="status">Awaiting the finance review</span> <a href="/orders/1042">Open the order</a> <span>Due</span></td>',
        "</tr></table>",
      ].join("\n"),
      "src/b.tsx": [
        "export const B = () => (",
        "  <tr>",
        "    <td><span>Pending</span> <button>Approve request</button></td>",
        '    <td><span role="status">Awaiting the finance review</span> <Link href="/">Open the order</Link> {"Due"}</td>',
        "  </tr>",
        ");",
      ].join("\n"),
    });
    expect(issues).toEqual([]);
  });

  it("reads a data cell the same way under a uiText.elements map", async () => {
    const root = await projectWith({
      "src/a.tsx": [
        "export const A = () => (",
        "  <tr>",
        "    <td><StatusBadge>Paid in full after the finance review</StatusBadge></td>",
        "    <TableCell>ORD-1042</TableCell>",
        "    <TableCell>Ships once paid.</TableCell>",
        "  </tr>",
        ");",
      ].join("\n"),
    });
    const config: QfaiConfig = {
      ...configWith(["src/**"]),
      uiText: { elements: { StatusBadge: "status" } },
    };
    const issues = await validateUiPlainText(root, config, { loadTypescript: realTypescript });
    expect(issues.map((found) => [found.code, found.file, found.loc?.line])).toEqual([
      ["QFAI-UITEXT-001", "src/a.tsx", 5],
    ]);
  });
});

// QFAI:EX-0001-0297-17
describe("one reason covers every plain text inside an element", () => {
  it("clears a sentence split by a link, a table and a list with one reason each", async () => {
    const issues = await run({
      "src/a.html": [
        "<div>",
        "<h2>Orders</h2>",
        REASON,
        '<p>Check the <a href="/orders">order page</a> for the status of each line.</p>',
        `<table>${REASON}<tr><td>Ships once the payment clears.</td><td>Refunds take a week.</td></tr></table>`,
        REASON,
        "<ul>",
        "  <li>Exports include tax.</li>",
        "  <li><p>Totals update nightly.</p></li>",
        "</ul>",
        "</div>",
      ].join("\n"),
      "src/B.tsx": `export const B = () => (\n  <div>\n    <h2>Orders</h2>\n    ${JSX_REASON}\n    <p>Check the <Link href="/orders">order page</Link> for the status of each line.</p>\n    ${JSX_REASON}\n    <ul>\n      <li>Exports include tax.</li>\n      <li>Totals update nightly.</li>\n    </ul>\n  </div>\n);\n`,
      "src/C.jsx":
        "export const C = ({ rows }) => (/* qfai-text: why=Orders sync once a night; without=Users expect live totals */ <section>\n  <p>Totals update nightly.</p>\n  {rows.map((row) => <div key={row}>Exports include tax.</div>)}\n</section>);\n",
      "src/d.vue": `<template>\n  <div>\n    <h2>Orders</h2>\n    ${REASON}\n    <p>Check the <RouterLink to="/orders">order page</RouterLink> for each line.</p>\n  </div>\n</template>\n`,
      // A first-child comment that text follows covers its whole element.
      "src/e.html": `<p>${REASON} Check the <a href="/orders">order page</a> for each line.</p>\n`,
      "src/F.tsx": `export const F = () => (\n  <div>\n    <p>${JSX_REASON}Check the <Link href="/orders">order page</Link> for each line.</p>\n  </div>\n);\n`,
    });
    expect(issues).toEqual([]);
  });

  it("lets a first-child comment before an element cover that element only", async () => {
    const issues = await run({
      "src/a.html": `<section>${REASON}\n<p>Exports include tax.</p>\n<p>Refunds take a week.</p>\n</section>\n`,
      "src/B.tsx": `export const B = () => (\n  <div>\n    ${JSX_REASON}\n    <p>Exports include tax.</p>\n    <p>Refunds take a week.</p>\n  </div>\n);\n`,
    });
    expect(issues.map((found) => `${found.file}:${found.loc?.line} ${found.code}`)).toEqual([
      "src/B.tsx:5 QFAI-UITEXT-001",
      "src/a.html:3 QFAI-UITEXT-001",
    ]);
  });

  it("stops at a component's top-level fragment, as markup stops at body", async () => {
    const issues = await run({
      "src/A.tsx": `export const A = () => (\n  <>\n    ${JSX_REASON}\n    Totals update nightly.\n    <p>Refunds take a week.</p>\n  </>\n);\n`,
      "src/B.tsx":
        "export const B = () => (/* qfai-text: why=Orders sync once a night; without=Users expect live totals */ <>\n  <p>Exports include tax.</p>\n</>);\n",
    });
    expect(issues.map((found) => `${found.file}:${found.loc?.line} ${found.code}`)).toEqual([
      "src/A.tsx:5 QFAI-UITEXT-001",
      "src/B.tsx:2 QFAI-UITEXT-001",
    ]);
  });

  it("does not let a comment at the top of a file cover it, and reports a malformed one once", async () => {
    const issues = await run({
      "src/a.html": `${REASON}\n<p>Exports include tax.</p>\n<p>Totals update nightly.</p>\n`,
      "src/b.html":
        "<div>\n<h2>Orders</h2>\n<!-- qfai-text: why=Needed -->\n<ul>\n  <li>Exports include tax.</li>\n  <li>Totals update nightly.</li>\n</ul>\n<p>Refunds take a week.</p>\n</div>\n",
    });
    expect(issues.map((found) => `${found.file}:${found.loc?.line} ${found.code}`)).toEqual([
      "src/a.html:3 QFAI-UITEXT-001",
      "src/b.html:5 QFAI-UITEXT-002",
      "src/b.html:8 QFAI-UITEXT-001",
    ]);
  });
});
