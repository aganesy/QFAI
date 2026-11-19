/**
 * An inline event handler is read from the attributes of the parsed elements,
 * so a handler a browser would run is found wherever the mock puts it, and text
 * or a comment that only spells one out raises nothing.
 */

import { describe, expect, it } from "vitest";

import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";

describe("HTML mock inline event handlers", () => {
  it("finds no handler in text, a comment or an escaped code sample", async () => {
    const result = await parseHtmlMock(
      [
        "<p>Set onclick = handler to run it on a tap.</p>",
        '<!-- <button onclick="save()">Save</button> -->',
        "<pre><code>&lt;a onmouseover=&quot;x()&quot;&gt;</code></pre>",
        "<textarea>onchange=update()</textarea>",
      ].join("\n"),
    );
    expect(result.eventHandlers).toEqual([]);
  });

  it("finds a handler on an element, in a template and in an iframe srcdoc", async () => {
    const result = await parseHtmlMock(
      [
        '<button ONCLICK="save()">Save</button>',
        '<template><div onmouseover="x()"></div></template>',
        `<iframe srcdoc="<b onload='y()'>x</b>"></iframe>`,
        '<svg><rect onfocus="z()"></rect></svg>',
      ].join("\n"),
    );
    expect(result.eventHandlers).toEqual(["onclick", "onmouseover", "onload", "onfocus"]);
  });
});
