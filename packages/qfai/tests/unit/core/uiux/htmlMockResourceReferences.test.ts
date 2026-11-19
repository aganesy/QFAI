/**
 * Every HTML and CSS form a mock can name a resource in is read, so an external
 * URL, a local file and an unsafe scheme are caught whichever form carries them.
 * Each case holds one form; a form the parser skipped leaves its URL in no list.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig } from "../../../core/legacyLayoutConfig.js";
import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";
import { validateHtmlMock } from "../../../../src/core/validators/htmlMock.js";

const EXTERNAL = "https://cdn.example.com/asset";

const HTML_FORMS: readonly (readonly [string, string])[] = [
  ["href", `<a href="${EXTERNAL}">x</a>`],
  ["src", `<img src="${EXTERNAL}" alt="">`],
  ["action", `<form action="${EXTERNAL}"></form>`],
  ["formaction", `<form><button formaction="${EXTERNAL}">Go</button></form>`],
  ["poster", `<video poster="${EXTERNAL}"></video>`],
  ["background", `<table background="${EXTERNAL}"></table>`],
  ["manifest", `<html manifest="${EXTERNAL}"><body></body></html>`],
  ["object data", `<object data="${EXTERNAL}"></object>`],
  ["ping", `<a href="#top" ping="#a ${EXTERNAL}">x</a>`],
  ["srcset", `<img alt="" srcset="small.png#local 1x, ${EXTERNAL} 2x">`],
  ["source srcset", `<picture><source srcset="${EXTERNAL} 600w"></picture>`],
  ["imagesrcset", `<link rel="preload" as="image" imagesrcset="${EXTERNAL} 1x">`],
  ["meta refresh", `<meta http-equiv="Refresh" content="0; URL='${EXTERNAL}'">`],
  ["svg href", `<svg><image href="${EXTERNAL}"></image></svg>`],
  ["svg xlink:href", `<svg><use xlink:href="${EXTERNAL}"></use></svg>`],
  ["svg presentation url()", `<svg><rect fill="url(${EXTERNAL}#paint)"></rect></svg>`],
  ["iframe srcdoc", `<iframe srcdoc="<img src='${EXTERNAL}'>"></iframe>`],
  ["template content", `<template><img src="${EXTERNAL}" alt=""></template>`],
];

const CSS_FORMS: readonly (readonly [string, string])[] = [
  ["unquoted url()", `background: url(${EXTERNAL})`],
  ["double-quoted url()", `background: url("${EXTERNAL}")`],
  ["single-quoted url()", `background: url( '${EXTERNAL}' )`],
  ["upper-case URL()", `background: URL(${EXTERNAL})`],
  ["escaped url()", `background: url(https\\3a //cdn.example.com/asset)`],
  ["escaped function name", `background: \\75rl(${EXTERNAL})`],
  ["src()", `background: src("${EXTERNAL}")`],
  ["image-set() string", `background: image-set("${EXTERNAL}" 1x, "#x" 2x)`],
  [
    "-webkit-image-set() with type()",
    `background: -webkit-image-set("${EXTERNAL}" type("image/avif") 1x)`,
  ],
];

describe("HTML mock resource references", () => {
  for (const [form, html] of HTML_FORMS) {
    // QFAI:EX-0001-0039-58
    it(`reads the ${form} form`, async () => {
      const result = await parseHtmlMock(html);
      expect(result.externalUrls.some((url) => url.startsWith(EXTERNAL))).toBe(true);
    });
  }

  for (const [form, declaration] of CSS_FORMS) {
    // QFAI:EX-0001-0039-58
    it(`reads the ${form} form in a style attribute and in a stylesheet`, async () => {
      const attribute = declaration.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const inline = await parseHtmlMock(`<div style="${attribute}"></div>`);
      const sheet = await parseHtmlMock(`<style>.x { ${declaration}; }</style>`);
      expect(inline.externalUrls).toContain(EXTERNAL);
      expect(sheet.externalUrls).toContain(EXTERNAL);
    });
  }

  // QFAI:EX-0001-0039-58
  it("reads both forms of @import in a stylesheet", async () => {
    const result = await parseHtmlMock(
      `<style>@import "${EXTERNAL}/a.css"; @import url('${EXTERNAL}/b.css') screen;</style>`,
    );
    expect([...result.externalUrls].sort()).toEqual([`${EXTERNAL}/a.css`, `${EXTERNAL}/b.css`]);
  });

  // QFAI:EX-0001-0039-58
  it("files a local file and an unsafe scheme the new forms carry", async () => {
    const result = await parseHtmlMock(
      [
        '<img alt="" srcset="./hero.png 1x, data:image/png;base64,AAAA 2x">',
        "<div style=\"background: url('../bg.jpg')\"></div>",
        '<style>.a { background: url("data:text/html,<b>x</b>"); }</style>',
        '<video poster="javascript:alert(1)"></video>',
      ].join("\n"),
    );
    expect(result.localRefs).toEqual(["./hero.png", "../bg.jpg"]);
    expect(result.unsafeUrls).toEqual(["data:text/html,<b>x</b>", "javascript:alert(1)"]);
    expect(result.externalUrls).toEqual([]);
  });

  // QFAI:EX-0001-0039-58
  it("leaves alone what names no resource", async () => {
    const result = await parseHtmlMock(
      [
        "<style>/* background: url(https://cdn.example.com/commented) */",
        "@namespace svg url(http://www.w3.org/2000/svg);",
        ".a { background: url(#grad); }</style>",
        '<svg><rect fill="url(#grad)"></rect></svg>',
        '<div data-src="https://cdn.example.com/data-attr" fill="url(https://cdn.example.com/html-fill)"></div>',
        '<blockquote cite="https://cdn.example.com/quote">q</blockquote>',
        '<meta http-equiv="refresh" content="30">',
        '<div style="background: url()"></div>',
      ].join("\n"),
    );
    expect(result.externalUrls).toEqual([]);
    expect(result.localRefs).toEqual([]);
    expect(result.unsafeUrls).toEqual([]);
  });

  // QFAI:EX-0001-0039-58
  it("opens no comment at a /* inside an unquoted url() or a string", async () => {
    const result = await parseHtmlMock(
      [
        "<style>.a { background: url(https://cdn.example.com/*); }",
        '.b::after { content: "/*"; background: url("https://cdn.example.com/after"); }</style>',
      ].join("\n"),
    );
    expect(result.externalUrls).toEqual([
      "https://cdn.example.com/*",
      "https://cdn.example.com/after",
    ]);
  });

  // QFAI:EX-0001-0039-58
  it("reads the first 50 non-empty srcdoc documents of a mock", async () => {
    const blank = '<iframe srcdoc="  "></iframe>'.repeat(5);
    const frames = Array.from(
      { length: 60 },
      (_, n) => `<iframe srcdoc="<img src='${EXTERNAL}/${n}'>"></iframe>`,
    ).join("");
    const result = await parseHtmlMock(blank + frames);
    expect(result.externalUrls).toHaveLength(50);
    expect(result.externalUrls.at(-1)).toBe(`${EXTERNAL}/49`);
    expect(result.parseErrors).toEqual(["iframe srcdoc documents past the first 50 were not read"]);
  });

  // QFAI:EX-0001-0039-58
  it("reports a srcdoc nested deeper than 8 levels instead of passing it", async () => {
    let html = `<img src='${EXTERNAL}/deep'>`;
    for (let level = 0; level < 10; level++) {
      const attribute = html.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      html = `<iframe srcdoc="${attribute}"></iframe>`;
    }
    const result = await parseHtmlMock(html);
    expect(result.externalUrls).toEqual([]);
    expect(result.parseErrors).toEqual(["iframe srcdoc nested deeper than 8 levels was not read"]);
  });

  // QFAI:EX-0001-0039-58
  it("reads a reference under nested templates, and never passes one it cannot read", async () => {
    const nested = await parseHtmlMock(`${"<template>".repeat(200)}<img src="${EXTERNAL}" alt="">`);
    expect(nested.externalUrls).toEqual([EXTERNAL]);

    // Deep enough that the DOM library itself may run out of stack in a worker
    // thread: the mock then reports a parse error, and either way it cannot pass.
    const deep = await parseHtmlMock(`${"<template>".repeat(5_000)}<img src="${EXTERNAL}" alt="">`);
    const outcome = deep.parseErrors.length > 0 ? "parse error" : deep.externalUrls;
    expect([[EXTERNAL], "parse error"]).toContainEqual(outcome);
  });

  // QFAI:EX-0001-0039-58
  it("opens no function after a hash or a number, and honours escapes in a bad url()", async () => {
    const result = await parseHtmlMock(
      [
        `<div style="background: #url(${EXTERNAL}/hash)"></div>`,
        `<div style="margin: 1url(${EXTERNAL}/number)"></div>`,
        `<div style="background: url(a b\\) url(${EXTERNAL}/bad)"></div>`,
        `<div style="background: url(${EXTERNAL}/after-bad)"></div>`,
        '<div style="background: url(x.png\\"></div>',
      ].join("\n"),
    );
    expect(result.externalUrls).toEqual([`${EXTERNAL}/after-bad`]);
    // The trailing backslash is an escape standing for U+FFFD, so the URL ends in it.
    expect(result.localRefs).toEqual([`x.png${String.fromCodePoint(0xfffd)}`]);
  });

  // QFAI:EX-0001-0039-58
  it("reads hostile CSS and srcset in linear time", async () => {
    const escapes = `<div style="background:url(${"\\a".repeat(200)}"></div>`;
    const imageSets = `<style>${".x{background:image-set(".repeat(20_000)}</style>`;
    const commas = `<img alt="" srcset="a${",".repeat(200_000)}b,">`;
    const started = performance.now();
    await parseHtmlMock(escapes);
    await parseHtmlMock(imageSets);
    await parseHtmlMock(commas);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe("qfai validate on a mock naming a resource from CSS", () => {
  let root: string | undefined;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = undefined;
  });

  // QFAI:EX-0001-0039-58
  it("raises QFAI-MOCK-002 for a stylesheet url() and QFAI-MOCK-010 for a srcset file", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-mock-refs-"));
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });
    // A bare fence, so the block is collected once: under a screen-mock heading the
    // fence and the heading's section would each be read as a block.
    const md = [
      "```html",
      `<style>.hero { background: url("${EXTERNAL}/hero.png"); }</style>`,
      '<img alt="" srcset="./hero@2x.png 2x">',
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "web", legacyLayoutConfig);

    expect(
      issues
        .filter((item) => item.code === "QFAI-MOCK-002")
        .map((item) => [item.severity, item.message]),
    ).toEqual([["error", `External URL reference in HTML Mock: ${EXTERNAL}/hero.png`]]);
    expect(
      issues
        .filter((item) => item.code === "QFAI-MOCK-010")
        .map((item) => [item.severity, item.message]),
    ).toEqual([["error", "Local file reference in HTML Mock: ./hero@2x.png"]]);
  });
});
