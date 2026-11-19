/**
 * The parts of HTML analysis that need a DOM.
 *
 * They live in one module because the cost below is paid per process, not per
 * function: a second module with its own `import("jsdom")` would carry its own
 * cache and its own chance of being made static by a bundler, for no saving.
 *
 * Split out of `htmlMockParser.ts` under `CR-20260823-0001` (approved 2026-08-23, option 3).
 * `jsdom` costs **910 ms** to require — measured against an 87 ms node baseline, and against its
 * three sibling runtime dependencies at 58, 48 and 47 ms — and it reached the CLI entry through this
 * one function. Every `qfai` invocation paid it, whatever the command, and so did every test that
 * spawns one.
 *
 * Its neighbours in the old module (`extractTokenComments`, `collectVarUsages`) are pure string
 * work, so they stay where they were and stay statically importable. Each caller of this file
 * loads it with a dynamic `import()` from inside an already-async validator; keep it that way, and
 * do not re-export this from `htmlMockParser.ts` — a static edge from there would restore the cost
 * while leaving this comment in place to say it had not.
 */
// Both are TYPE-only, so neither survives compilation and neither is the runtime edge this file
// exists to avoid. The value comes from the `import()` below.
import type * as Jsdom from "jsdom";
import type { JSDOM as JsdomInstance } from "jsdom";

import { collectCssUrlReferences } from "./cssUrlReferences.js";
import {
  collectVarUsages,
  parseRefreshUrl,
  parseSrcsetUrls,
  type HtmlMockParseResult,
} from "./htmlMockParser.js";

type JsdomModule = typeof Jsdom;

/**
 * jsdom, loaded on first use and kept.
 *
 * The dynamic form is inside THIS module rather than only at its one call site, because a bundler is
 * free to inline an awaited import of a module it also bundles — and one did: with the laziness only
 * at the call site, the CJS output went lazy and the ESM output kept a static `from "jsdom"`, so half
 * the cost came back with nothing to show it had. `jsdom` is an external runtime dependency in both
 * outputs, so an `import()` of it stays an `import()`.
 *
 * The check that this still holds is a byte one: neither `dist/index.mjs` nor `dist/cli/index.mjs`
 * may contain `from "jsdom"`.
 */
let jsdomModule: JsdomModule | undefined;
export async function loadJsdom(): Promise<JsdomModule> {
  jsdomModule ??= await import("jsdom");
  return jsdomModule;
}

/** An attribute name a browser may run as an inline event handler, `onclick` and the like. */
const EVENT_HANDLER_ATTRIBUTE_RE = /^on[a-z]+$/i;

/** Anchored, with no nested quantifier, so it runs in time linear in the value it reads. */
const PIXEL_LENGTH_RE = /^(\d+(?:\.\d+)?)px$/;

/**
 * The pixel length a parsed declaration value states, or `null` for anything else.
 *
 * The value arrives lower-cased with `!important` kept apart from it, so only a plain
 * `<number>px` is left to match; a percentage, a `calc()` or a keyword has no fixed size.
 */
function readPixelLength(value: string | undefined): number | null {
  const match = value === undefined ? null : PIXEL_LENGTH_RE.exec(value);
  return match?.[1] === undefined ? null : Number.parseFloat(match[1]);
}

export async function parseHtmlMock(html: string): Promise<HtmlMockParseResult> {
  const result: HtmlMockParseResult = {
    externalUrls: [],
    localRefs: [],
    unsafeUrls: [],
    eventHandlers: [],
    varUsages: [],
    stateAttributes: [],
    breakpointAttributes: [],
    inlineDimensions: [],
    colorPairs: [],
    scriptTags: 0,
    parseErrors: [],
  };

  const { JSDOM } = await loadJsdom();
  let dom: JsdomInstance;
  try {
    dom = new JSDOM(html);
  } catch (error) {
    result.parseErrors.push(
      `HTML parse error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  const doc = dom.window.document;
  const allElements = doc.querySelectorAll("*");

  const srcdocBudget: SrcdocBudget = { remaining: MAX_SRCDOC_DOCUMENTS, unread: new Set() };
  for (const rawUrl of collectResourceReferences(
    dom,
    JSDOM,
    0,
    srcdocBudget,
    result.eventHandlers,
  )) {
    classifyReference(rawUrl, result);
  }
  result.parseErrors.push(...srcdocBudget.unread);

  // Script tags
  result.scriptTags = doc.querySelectorAll("script").length;

  const dimensionProbe = doc.createElement("div");

  // Var usages from inline styles
  for (const el of allElements) {
    const style = el.getAttribute("style") ?? "";
    if (!style) continue;

    for (const usage of collectVarUsages(style)) {
      result.varUsages.push({
        property: "inline-style",
        tokenName: usage.tokenName,
        fallback: usage.fallback,
      });
    }

    // Inline dimensions, read from parsed declarations so that `min-width` or `border-width` is
    // never taken for `width`. jsdom drops a declaration whose property name is not lower-case,
    // while CSS property names are case-insensitive, so the attribute is lower-cased and parsed
    // on one detached element. Only the pixel values of `width` and `height` are read from it,
    // and lower-casing cannot change those. The detached element also gives every element,
    // MathML included, the same reading.
    dimensionProbe.style.cssText = style.toLowerCase();
    const width = readPixelLength(dimensionProbe.style.getPropertyValue("width"));
    const height = readPixelLength(dimensionProbe.style.getPropertyValue("height"));
    if (width !== null || height !== null) {
      result.inlineDimensions.push({
        element: el.tagName.toLowerCase(),
        width,
        height,
        interactive: isInteractiveElement(el),
      });
    }

    // Color pairs
    const colorMatch = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    const bgMatch = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style);
    if (colorMatch && bgMatch) {
      const color = colorMatch[1];
      const backgroundColor = bgMatch[1];
      if (!color || !backgroundColor) {
        continue;
      }
      result.colorPairs.push({
        element: el.tagName.toLowerCase(),
        color: color.trim(),
        backgroundColor: backgroundColor.trim(),
      });
    }

    // State attributes
    const state = el.getAttribute("data-state");
    if (state) result.stateAttributes.push(state);

    // Breakpoint attributes
    const bp = el.getAttribute("data-breakpoint");
    if (bp) result.breakpointAttributes.push(bp);
  }

  // Also extract var usages from style tags
  const styleTags = doc.querySelectorAll("style");
  for (const styleTag of styleTags) {
    const css = styleTag.textContent;
    for (const usage of collectVarUsages(css)) {
      result.varUsages.push({
        property: "stylesheet",
        tokenName: usage.tokenName,
        fallback: usage.fallback,
      });
    }
  }

  dom.window.close();
  return result;
}

/** Attributes whose whole value is one URL a browser loads or navigates to. */
const URL_ATTRIBUTES = [
  "href",
  "xlink:href",
  "src",
  "action",
  "formaction",
  "poster",
  "background",
  "manifest",
] as const;

/** Attributes holding a list of image candidates. */
const SRCSET_ATTRIBUTES = ["srcset", "imagesrcset"] as const;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** SVG presentation attributes that take a CSS `url()`. */
const CSS_URL_ATTRIBUTES = [
  "fill",
  "stroke",
  "filter",
  "mask",
  "clip-path",
  "marker-start",
  "marker-mid",
  "marker-end",
  "cursor",
] as const;

/**
 * How many `srcdoc` documents deep the reference walk follows.
 *
 * Shortcut: a mock nesting frames deeper than this has its deepest `srcdoc`
 * left unread. Each level escapes the one inside it again, so a real mock stops
 * at one or two; raise the ceiling if a mock is ever found going further.
 */
const MAX_SRCDOC_DEPTH = 8;

/**
 * How many non-empty `srcdoc` documents one mock has read.
 *
 * Shortcut: each one costs a DOM of its own, a few milliseconds, so a mock with
 * thousands of frames would hold the run for minutes. The frames past this count
 * are left unread. A screen mock holds a handful at most; raise the ceiling if a
 * real one is found holding more.
 */
const MAX_SRCDOC_DOCUMENTS = 50;

/**
 * What is left of the `srcdoc` documents one mock may read, and why any went unread.
 *
 * A frame past either ceiling is reported rather than passed over, so a mock
 * cannot hide a reference behind the limits.
 */
type SrcdocBudget = { remaining: number; unread: Set<string> };

const SRCDOC_TOO_DEEP = `iframe srcdoc nested deeper than ${MAX_SRCDOC_DEPTH} levels was not read`;
const SRCDOC_TOO_MANY = `iframe srcdoc documents past the first ${MAX_SRCDOC_DOCUMENTS} were not read`;

/**
 * Every element of a tree, including the content of each `template`, in document order.
 *
 * An explicit stack of iterators, not recursion: templates nest without limit,
 * and one generator frame per level overflows the call stack.
 */
function* elementsOf(root: ParentNode, window: JsdomInstance["window"]): Generator<Element> {
  const pending: Iterator<Element>[] = [root.querySelectorAll("*")[Symbol.iterator]()];
  while (pending.length > 0) {
    const step = pending[pending.length - 1]?.next();
    if (!step || step.done === true) {
      pending.pop();
      continue;
    }
    const el = step.value;
    yield el;
    if (el instanceof window.HTMLTemplateElement) {
      pending.push(el.content.querySelectorAll("*")[Symbol.iterator]());
    }
  }
}

/**
 * Every resource reference a parsed mock holds, raw and in document order.
 *
 * Read from each URL attribute, `ping`, `srcset` and `imagesrcset`, the `data` of
 * an `<object>`, the target of a `<meta http-equiv="refresh">`, the CSS of each
 * `style` attribute, `<style>` element and SVG presentation attribute, and the
 * document each `<iframe srcdoc>` holds. `data-*` and other attributes that name
 * no resource are not read.
 *
 * The same walk files the name of each inline event handler attribute into
 * `eventHandlers`, so a handler is read from the elements a browser would build,
 * and text or a comment that only spells one out is not.
 */
function collectResourceReferences(
  dom: JsdomInstance,
  JSDOM: JsdomModule["JSDOM"],
  depth: number,
  srcdocBudget: SrcdocBudget,
  eventHandlers: string[],
): string[] {
  const refs: string[] = [];
  // One push per value: spreading a list of unbounded length into `push` can exceed the stack.
  const add = (values: readonly string[]): void => {
    for (const value of values) refs.push(value);
  };
  for (const el of elementsOf(dom.window.document, dom.window)) {
    const tag = el.tagName.toLowerCase();

    for (const name of el.getAttributeNames()) {
      if (EVENT_HANDLER_ATTRIBUTE_RE.test(name)) eventHandlers.push(name.toLowerCase());
    }
    for (const attr of URL_ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (value !== null) refs.push(value);
    }
    if (tag === "object") {
      const data = el.getAttribute("data");
      if (data !== null) refs.push(data);
    }
    const ping = el.getAttribute("ping");
    if (ping !== null) add(ping.split(/[\t\n\f\r ]+/));
    for (const attr of SRCSET_ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (value !== null) add(parseSrcsetUrls(value));
    }
    if (tag === "meta" && el.getAttribute("http-equiv")?.trim().toLowerCase() === "refresh") {
      const target = parseRefreshUrl(el.getAttribute("content") ?? "");
      if (target !== null) refs.push(target);
    }

    add(collectCssUrlReferences(el.getAttribute("style")));
    if (el.namespaceURI === SVG_NAMESPACE) {
      for (const attr of CSS_URL_ATTRIBUTES) {
        add(collectCssUrlReferences(el.getAttribute(attr)));
      }
    }
    if (tag === "style") {
      add(collectCssUrlReferences(el.textContent));
    }

    const srcdoc = tag === "iframe" ? el.getAttribute("srcdoc") : null;
    if (!srcdoc?.trim()) continue;
    if (depth >= MAX_SRCDOC_DEPTH) {
      srcdocBudget.unread.add(SRCDOC_TOO_DEEP);
      continue;
    }
    if (srcdocBudget.remaining <= 0) {
      srcdocBudget.unread.add(SRCDOC_TOO_MANY);
      continue;
    }
    srcdocBudget.remaining -= 1;
    const inner = new JSDOM(srcdoc);
    try {
      add(collectResourceReferences(inner, JSDOM, depth + 1, srcdocBudget, eventHandlers));
    } finally {
      inner.window.close();
    }
  }
  return refs;
}

const ALLOWED_DATA_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|ico|tiff?)[;,]/i;

/** Files one raw reference as external, unsafe or local, or lets it pass. */
function classifyReference(raw: string, result: HtmlMockParseResult): void {
  const rawUrl = raw.trim();
  if (!rawUrl) return;

  if (/^(https?:)?\/\//i.test(rawUrl)) {
    result.externalUrls.push(rawUrl);
    return;
  }

  if (
    /^javascript:/i.test(rawUrl) ||
    (/^data:/i.test(rawUrl) && !ALLOWED_DATA_IMAGE_RE.test(rawUrl))
  ) {
    result.unsafeUrls.push(rawUrl);
    return;
  }

  if (ALLOWED_DATA_IMAGE_RE.test(rawUrl) || /^(#|mailto:|tel:)/i.test(rawUrl)) {
    return;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl)) {
    result.externalUrls.push(rawUrl);
    return;
  }

  result.localRefs.push(rawUrl);
}

/** Tags this checker classifies as an interactive control unless disabled. */
const INTERACTIVE_TAGS: ReadonlySet<string> = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
]);

/** Roles that make this checker classify any element as an interactive control unless disabled. */
const INTERACTIVE_ROLES: ReadonlySet<string> = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "tab",
  "menuitem",
]);

function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();

  const ariaDisabledAttr = el.getAttribute("aria-disabled");
  const isAriaDisabled =
    typeof ariaDisabledAttr === "string" && ariaDisabledAttr.toLowerCase() === "true";
  const disabled = el.hasAttribute("disabled") || isAriaDisabled;
  if (disabled) {
    return false;
  }

  if (INTERACTIVE_TAGS.has(tag)) {
    return true;
  }

  const roleAttr = el.getAttribute("role");
  const role = typeof roleAttr === "string" ? roleAttr.toLowerCase() : "";
  if (INTERACTIVE_ROLES.has(role)) {
    return true;
  }

  const tabIndexAttr = el.getAttribute("tabindex");
  const tabIndex = Number.parseInt(typeof tabIndexAttr === "string" ? tabIndexAttr : "", 10);
  return Number.isFinite(tabIndex) && tabIndex >= 0;
}
