/**
 * The one part of HTML-mock parsing that needs a DOM.
 *
 * Split out of `htmlMockParser.ts` under `CR-20260823-0001` (approved 2026-08-23, option 3).
 * `jsdom` costs **910 ms** to require — measured against an 87 ms node baseline, and against its
 * three sibling runtime dependencies at 58, 48 and 47 ms — and it reached the CLI entry through this
 * one function. Every `qfai` invocation paid it, whatever the command, and so did every test that
 * spawns one.
 *
 * Its neighbours in the old module (`extractTokenComments`, `collectVarUsages`) are pure string
 * work, so they stay where they were and stay statically importable. The only caller of this file
 * loads it with a dynamic `import()` from inside an already-async validator; keep it that way, and
 * do not re-export this from `htmlMockParser.ts` — a static edge from there would restore the cost
 * while leaving this comment in place to say it had not.
 */
// Both are TYPE-only, so neither survives compilation and neither is the runtime edge this file
// exists to avoid. The value comes from the `import()` below.
import type * as Jsdom from "jsdom";
import type { JSDOM as JsdomInstance } from "jsdom";

import { collectVarUsages, type HtmlMockParseResult } from "./htmlMockParser.js";

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
async function jsdom(): Promise<JsdomModule> {
  jsdomModule ??= await import("jsdom");
  return jsdomModule;
}

const EVENT_HANDLER_RE = /\s(on[a-z]+)\s*=/gi;

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

  const { JSDOM } = await jsdom();
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

  // URL references (strictly from href/src/action attributes)
  for (const el of allElements) {
    for (const attr of ["href", "src", "action"] as const) {
      const rawUrl = el.getAttribute(attr)?.trim();
      if (!rawUrl) continue;

      if (/^(https?:)?\/\//i.test(rawUrl)) {
        result.externalUrls.push(rawUrl);
        continue;
      }

      if (
        /^javascript:/i.test(rawUrl) ||
        (/^data:/i.test(rawUrl) &&
          !/^data:image\/(png|jpe?g|gif|webp|avif|bmp|ico|tiff?)[;,]/i.test(rawUrl))
      ) {
        result.unsafeUrls.push(rawUrl);
        continue;
      }

      if (/^data:image\/(png|jpe?g|gif|webp|avif|bmp|ico|tiff?)[;,]/i.test(rawUrl)) {
        continue;
      }

      if (/^(#|mailto:|tel:)/i.test(rawUrl)) {
        continue;
      }

      if (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl)) {
        result.externalUrls.push(rawUrl);
        continue;
      }

      result.localRefs.push(rawUrl);
    }
  }

  // Inline event handlers
  for (const match of html.matchAll(EVENT_HANDLER_RE)) {
    if (match[1]) {
      result.eventHandlers.push(match[1].toLowerCase());
    }
  }

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
