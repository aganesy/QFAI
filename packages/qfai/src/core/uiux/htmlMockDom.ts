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
    dom = new JSDOM(html, { runScripts: "outside-only" });
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

    // Inline dimensions
    const widthMatch = /width\s*:\s*(\d+(?:\.\d+)?)\s*px/i.exec(style);
    const heightMatch = /height\s*:\s*(\d+(?:\.\d+)?)\s*px/i.exec(style);
    if (widthMatch || heightMatch) {
      result.inlineDimensions.push({
        element: el.tagName.toLowerCase(),
        width: widthMatch && widthMatch[1] ? parseFloat(widthMatch[1]) : null,
        height: heightMatch && heightMatch[1] ? parseFloat(heightMatch[1]) : null,
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

/**
 * What one screen holds, counted rather than judged.
 *
 * Each number is reproducible from the capture, so a reviewer citing one is
 * citing an observation. None of them has a threshold: what is too much is
 * relative to what the screen's contract asked for, and that division happens
 * where the contract is read.
 */
export type ScreenElementCounts = {
  /** Elements a user can operate: the denominator for prose, and the count criterion 7 reads against the declared tasks. */
  readonly interactiveControls: number;
  /** Every visible word, excluding script, style and template content. */
  readonly words: number;
  /**
   * Words that are not naming anything: not a control's own text, not a label,
   * legend, option, column header, caption or heading. A page introduction, a
   * line under a field and a tooltip all land here; the text of a button does
   * not.
   */
  readonly explanatoryWords: number;
  /** Deepest element nesting under `body`, as a stand-in for structural complexity. */
  readonly maxDepth: number;
  /** Distinct element names under `body`, as a stand-in for how many kinds of thing the screen uses. */
  readonly distinctElementTypes: number;
  /** Non-empty when the document could not be parsed, in which case every count is zero. */
  readonly parseErrors: readonly string[];
};

/** Elements whose text names something rather than explaining it. */
const NAMING_TAGS = new Set([
  "label",
  "legend",
  "option",
  "optgroup",
  "th",
  "caption",
  "summary",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

/** Elements whose text is never shown to a user. */
const NON_RENDERED_TAGS = new Set(["script", "style", "template", "noscript", "head", "title"]);

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export async function countScreenElements(html: string): Promise<ScreenElementCounts> {
  const empty = {
    interactiveControls: 0,
    words: 0,
    explanatoryWords: 0,
    maxDepth: 0,
    distinctElementTypes: 0,
  };

  const { JSDOM } = await loadJsdom();
  let dom: JsdomInstance;
  try {
    dom = new JSDOM(html);
  } catch (error) {
    return {
      ...empty,
      parseErrors: [`HTML parse error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  // jsdom builds `html`/`head`/`body` for any input it parses, including the
  // empty string, so an empty document is an empty body and counts as zero.
  const body = dom.window.document.body;

  let interactiveControls = 0;
  let words = 0;
  let explanatoryWords = 0;
  let maxDepth = 0;
  const elementTypes = new Set<string>();

  // One walk. `naming` is true once any ancestor names something, because the
  // text of a button inside a label is still the button's name.
  const visit = (el: Element, depth: number, naming: boolean): void => {
    const tag = el.tagName.toLowerCase();
    if (NON_RENDERED_TAGS.has(tag)) return;

    elementTypes.add(tag);
    if (depth > maxDepth) maxDepth = depth;

    const interactive = isInteractiveElement(el);
    if (interactive) interactiveControls += 1;
    const namingHere = naming || interactive || NAMING_TAGS.has(tag);

    for (const node of el.childNodes) {
      if (node.nodeType === dom.window.Node.TEXT_NODE) {
        const count = countWords(node.textContent ?? "");
        words += count;
        if (!namingHere) explanatoryWords += count;
        continue;
      }
      if (node.nodeType === dom.window.Node.ELEMENT_NODE) {
        visit(node as Element, depth + 1, namingHere);
      }
    }
  };
  visit(body, 0, false);

  dom.window.close();
  return {
    interactiveControls,
    words,
    explanatoryWords,
    maxDepth,
    distinctElementTypes: elementTypes.size,
    parseErrors: [],
  };
}

function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  const interactiveTags = new Set(["a", "button", "input", "select", "textarea", "summary"]);
  const interactiveRoles = new Set([
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "tab",
    "menuitem",
  ]);

  const ariaDisabledAttr = el.getAttribute("aria-disabled");
  const isAriaDisabled =
    typeof ariaDisabledAttr === "string" && ariaDisabledAttr.toLowerCase() === "true";
  const disabled = el.hasAttribute("disabled") || isAriaDisabled;
  if (disabled) {
    return false;
  }

  if (interactiveTags.has(tag)) {
    return true;
  }

  const roleAttr = el.getAttribute("role");
  const role = typeof roleAttr === "string" ? roleAttr.toLowerCase() : "";
  if (interactiveRoles.has(role)) {
    return true;
  }

  const tabIndexAttr = el.getAttribute("tabindex");
  const tabIndex = Number.parseInt(typeof tabIndexAttr === "string" ? tabIndexAttr : "", 10);
  return Number.isFinite(tabIndex) && tabIndex >= 0;
}
