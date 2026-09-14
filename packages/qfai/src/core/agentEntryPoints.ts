/** Agent-loaded instructions retain project text and gain template-owned rules and review guidance. */

/**
 * Files an agent reads on its own: Codex loads `AGENTS.md`, Claude Code loads
 * `CLAUDE.md`. Copilot's instruction file is generated whole by
 * `syncIntegrationWrappers`, so it needs no managed section.
 */
export const AGENT_ENTRY_POINT_FILES = ["AGENTS.md", "CLAUDE.md"] as const;

export type AgentEntryPointFile = (typeof AGENT_ENTRY_POINT_FILES)[number];

export const QFAI_AGENT_RULES_BEGIN = "<!-- qfai:cross-ai-rules:start -->";
export const QFAI_AGENT_RULES_END = "<!-- qfai:cross-ai-rules:end -->";

/** Repo-relative `.agents/rules/*.md` paths cited by a piece of markdown. */
const RULE_MASTER_RE = /\.agents\/rules\/[A-Za-z0-9._-]+\.md/g;

export function citedRuleMasters(text: string): readonly string[] {
  return [...new Set(text.match(RULE_MASTER_RE) ?? [])];
}

/**
 * The managed section of `template`, both markers included, or `null` when the
 * template carries no complete pair.
 *
 * Returning `null` rather than guessing a region keeps a hand-edited template
 * from having an arbitrary slice of itself appended to a user's file.
 */
export function extractManagedRulesSection(template: string): string | null {
  const start = template.indexOf(QFAI_AGENT_RULES_BEGIN);
  if (start === -1) {
    return null;
  }
  const endAt = template.indexOf(QFAI_AGENT_RULES_END, start + QFAI_AGENT_RULES_BEGIN.length);
  if (endAt === -1) {
    return null;
  }
  return template.slice(start, endAt + QFAI_AGENT_RULES_END.length);
}

/**
 * Whether `existing` still has to gain `section`.
 *
 * Two ways to already be connected, and both are honoured:
 *
 * - the begin marker is present, so a previous run wrote the section and
 *   whatever the project did to it since is its own business — a second append
 *   would duplicate the heading and re-assert bullets the project may have
 *   deliberately trimmed;
 * - every master the section cites is already named somewhere in the file, so
 *   the project wired the rules in by hand and the agent reads them today.
 *
 * A section citing nothing is a broken template rather than a reason to append:
 * it would add a heading and connect no rule.
 */
export function needsManagedRulesSection(existing: string, section: string): boolean {
  if (managedSection(existing).begin !== -1) {
    return false;
  }
  const masters = citedRuleMasters(section);
  if (masters.length === 0) {
    return false;
  }
  const cited = new Set(citedRuleMastersOutsideCode(existing));
  return !masters.every((master) => cited.has(master));
}

/**
 * Whether `existing` opens a managed section and never closes it.
 *
 * The pair is what marks the region as qfai's. With the begin marker alone the
 * file reads as connected, so nothing appends the section, and there is no
 * region to insert a citation into either — the file falls between the two
 * paths and is skipped in silence. A run that says so is what lets the project
 * restore the marker; a run that does not leaves the rule uncited, and the next
 * run has no reason to look at the file again.
 */
export function hasUnclosedRulesSection(existing: string): boolean {
  const { begin, end } = managedSection(existing);
  return begin !== -1 && end === -1;
}

/**
 * Masters this run wrote into `.agents/rules/`, from the create-only copy's
 * report.
 *
 * A master the copy wrote did not exist in this project before the run, so no
 * section in it can ever have cited that master. That is what separates the two
 * reasons a citation can be absent — never shipped, or deliberately removed —
 * without recording anything: the second kind has its file on disk already, so
 * the copy skips it and it is not in this list.
 *
 * The separation holds while the master is on disk. A project that deleted the
 * bullet **and** the file gets both back, because the same run writes the file
 * again — the opt-out was never durable for the file either, and a rule present
 * in the tree and cited nowhere is the state this exists to end. Recording which
 * masters a run wrote is what would tell the two apart; no run records it yet.
 */
export function newlyWrittenRuleMasters(
  copiedPaths: readonly string[],
  destRoot: string,
): readonly string[] {
  const prefix = `${destRoot.replace(/[\\/]+$/, "")}/`;
  const cited = new Set<string>();
  for (const copied of copiedPaths) {
    const relative = copied.replace(/\\/g, "/").replace(prefix.replace(/\\/g, "/"), "");
    for (const master of citedRuleMasters(relative)) cited.add(master);
  }
  return [...cited].sort();
}

/** The heading the generated instruction file puts its rule list under. */
export const CROSS_AI_RULES_HEADING = "## Cross-AI rules (master)";

/**
 * `existing` with a bullet added for every master it does not already cite,
 * inserted after the last rule bullet in the file.
 *
 * For a file the run generates whole rather than delimits: Copilot's instruction
 * file is written once and skipped afterwards, so without this a newly shipped
 * rule reached Codex and Claude and not the third agent this repository says
 * loads it.
 *
 * With no rule bullet left, the heading is the insertion point. Returning
 * unchanged there would leave the rule uncited for good, because the wrapper
 * sync skips an existing file and nothing else writes one.
 */
export function addRuleCitationsToList(
  existing: string,
  section: string,
  masters: readonly string[],
): string {
  const bullets = pendingBullets(existing, section, masters);
  if (bullets.length === 0) return existing;

  // Split on the separator alone, so a file whose endings are mixed keeps every
  // one of them: a CR left on the line is part of that line, and joining on the
  // same separator restores the document exactly.
  const lines = existing.split("\n");
  const open = outsideFences(lines);
  let insertAfter = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (isRuleBullet(lines, open, index)) insertAfter = index;
  }
  if (insertAfter === -1) {
    // Every bullet deleted. The heading is the one place left that a reader
    // reads as the rule list, so the bullets go under it as their own block.
    const heading = lines.findIndex(
      (line, index) => open[index] === true && plainLine(line).startsWith(CROSS_AI_RULES_HEADING),
    );
    if (heading === -1) return existing;
    const end = terminatorOf(lines[heading]);
    lines.splice(heading + 1, 0, end, ...bullets.map((bullet) => `${bullet}${end}`));
    return lines.join("\n");
  }

  const at = endOfListItem(lines, open, insertAfter);
  const end = terminatorOf(lines[insertAfter]);
  lines.splice(at, 0, ...bullets.map((bullet) => `${bullet}${end}`));
  return lines.join("\n");
}

/**
 * The masters a document cites where a reader would follow the citation.
 *
 * A path inside a fenced block is an example of a citation rather than one, and
 * a file whose only mentions are examples cites nothing — it is a file the
 * managed section still has to reach.
 */
export function citedRuleMastersOutsideCode(text: string): readonly string[] {
  // A trailing CR is left on the line: neither the fence test nor the citation
  // pattern is anchored at the end, so splitting on the separator alone is
  // enough and keeps one spelling of it here.
  const lines = text.split("\n");
  const open = outsideFences(lines);
  const cited = new Set<string>();
  for (const [index, line] of lines.entries()) {
    if (open[index] !== true) continue;
    for (const master of citedRuleMasters(line)) cited.add(master);
  }
  return [...cited];
}

/**
 * A line with its Markdown container prefix and line terminator removed.
 *
 * A fence inside a block quote opens with `> ~~~`, and a scan anchored at the
 * start of the line never sees it — so an example inside one reads as live
 * content. A trailing CR is stripped for the same reason: what follows is a
 * test of the line's own text, not of how it happened to end.
 */
function plainLine(line: string | undefined): string {
  return (line ?? "").replace(/\r$/, "").replace(/^[ \t]{0,3}(?:> ?)+/, "");
}

/**
 * A line as a fence scanner reads it: containers removed, marker and all.
 *
 * A fence can open as a list item's content — `- ```markdown` — and a scan that
 * leaves the marker in place never sees it, so the example inside reads as
 * live. The bullet scan cannot share this: it needs the marker it strips here.
 */
function fenceLine(line: string | undefined): string {
  return plainLine(line).replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/, "");
}

/**
 * What a line sits inside, as far as a fence is concerned.
 *
 * The block quote alone. A fence opened inside one ends where the quote does —
 * held open past that, the scan reads the rest of the document as part of an
 * example. A list marker is deliberately not in here: a line beginning `- `
 * inside a fence is content, and reading it as a container would close the
 * block on its first bullet.
 */
function containerOf(line: string | undefined): string {
  return /^[ \t]{0,3}(?:> ?)*/.exec((line ?? "").replace(/\r$/, ""))?.[0]?.trim() ?? "";
}

/** The terminator `line` carried, so an inserted line keeps its neighbour's. */
function terminatorOf(line: string | undefined): string {
  return (line ?? "").endsWith("\r") ? "\r" : "";
}

/** Prepend the template's review directive only when no operative copy exists. */
export function addReviewPointer(existing: string, template: string | null): string {
  const pointer = template
    ?.split(/\r?\n/)
    .find((line) => line.startsWith("Read `REVIEW.md` before reviewing a pull request"));
  if (pointer === undefined) return existing;

  const referenceLabels = new Set<string>();
  const normalizeLabel = (label: string): string =>
    label
      .replace(/[ \t\r\n]+/g, " ")
      .replace(/^ | $/g, "")
      .toLowerCase()
      .toUpperCase();
  const blockTags =
    "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul".replace(
      /[a-z]/g,
      (letter) => `[${letter}${letter.toUpperCase()}]`,
    );
  const interrupt = String.raw` {0,3}(?:#{1,6}(?:[ \t]|\r?$)|>|~{3,}|\x60{3,}[^\x60\r\n]*\r?$|(?:=+|-+)[ \t]*\r?$|(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})\r?$|(?:[-+*]|0{0,8}1[.)])[ \t]+\S|<(?:!--|\?|![A-Za-z]|!\[[cC][dD][aA][tT][aA]\[|(?:[pP][rR][eE]|[sS][cC][rR][iI][pP][tT]|[sS][tT][yY][lL][eE]|[tT][eE][xX][tT][aA][rR][eE][aA])(?=[ \t>]|\r?$)|/?(?:${blockTags})(?=[ \t>]|/>|\r?$)))`;
  const continuation = String.raw`\r?\n(?![ \t]*(?:\r?\n|(?![\s\S])))(?!${interrupt})`;
  const destination = String.raw`(?<destination><(?:\\.|[^<>\\\r\n])*>|(?:\\.|[^\x00-\x20\x7f<>\\])+)`;
  const title = String.raw`(?:"(?:[^"\\\r\n]|\\.|${continuation})*"|'(?:[^'\\\r\n]|\\.|${continuation})*'|\((?:[^()\\\r\n]|\\.|${continuation})*\))`;
  const spacing = String.raw`(?:[ \t]+(?:${continuation}[ \t]*)?|[ \t]*${continuation}[ \t]*)`;
  const paragraphInterrupt = new RegExp(String.raw`^${interrupt}`);
  const htmlContinuation = continuation.replace("[cC][dD][aA][tT][aA]", "CDATA");
  const htmlSpace = new RegExp(String.raw`(?:[ \t]|${htmlContinuation})+`, "y");
  const htmlName = /<\/?[A-Za-z][A-Za-z0-9-]*/y;
  const htmlAttribute = /[A-Za-z_:][A-Za-z0-9:._-]*/y;
  const htmlValue = new RegExp(
    String.raw`(?:[^"'=<>\x60\x00-\x20]+|'(?:[^'\r\n]|${htmlContinuation})*'|"(?:[^"\r\n]|${htmlContinuation})*")`,
    "y",
  );
  const htmlSpaceEnd = (start: number): number => {
    htmlSpace.lastIndex = start;
    return htmlSpace.exec(existing) === null ? start : htmlSpace.lastIndex;
  };
  const htmlTagEnd = (start: number): number => {
    htmlName.lastIndex = start;
    if (htmlName.exec(existing) === null) return start;
    let cursor = htmlName.lastIndex;
    if (existing[start + 1] === "/") {
      cursor = htmlSpaceEnd(cursor);
      return existing[cursor] === ">" ? cursor + 1 : start;
    }
    for (;;) {
      if (existing[cursor] === ">") return cursor + 1;
      if (existing.startsWith("/>", cursor)) return cursor + 2;
      const spaced = htmlSpaceEnd(cursor);
      if (spaced === cursor) return start;
      cursor = spaced;
      if (existing[cursor] === ">") return cursor + 1;
      if (existing.startsWith("/>", cursor)) return cursor + 2;
      htmlAttribute.lastIndex = cursor;
      if (htmlAttribute.exec(existing) === null) return start;
      cursor = htmlAttribute.lastIndex;
      const equals = htmlSpaceEnd(cursor);
      if (existing[equals] !== "=") continue;
      htmlValue.lastIndex = htmlSpaceEnd(equals + 1);
      if (htmlValue.exec(existing) === null) return start;
      cursor = htmlValue.lastIndex;
    }
  };
  const link = new RegExp(
    String.raw`\[(?<text>(?:\\.|[^\[\]\\\r\n]|${continuation})*)\]\([ \t]*(?:${continuation}[ \t]*)?(?:${destination})?(?:${spacing}${title})?[ \t]*(?:${continuation}[ \t]*)?\)`,
    "y",
  );
  const label = String.raw`\[(?<label>(?:\\.|[^\[\]\\\r\n]|${continuation})+)\]`;
  // SIMPLIFIED: closed code spans retain literal comment openers.
  // Lift when: block parsing and code-span preservation share paragraph boundaries.
  const codeSpan = new RegExp(
    "^(`+)(?!`)(?:(?!\\r?\\n[ \\t]*\\r?\\n)(?!\\r?\\n" +
      interrupt.replace("!--|", "").replace(/\$/g, "(?=\\r?\\n|$)") +
      ")[\\s\\S])*?(?<!`)\\1(?!`)",
  );
  const definition = new RegExp(
    String.raw`^\uFEFF?(?: {0,3}(?:>[ \t]?|(?:[-*+]|\d{1,9}[.)])[ \t]+))*[ \t]*${label}:[ \t]*(?:${continuation}[ \t]*)?${destination}(?:${spacing}${title})?[ \t]*\r?$`,
    "gm",
  );
  const referenceImage = new RegExp(
    String.raw`\[(?<text>(?:\\.|[^\[\]\\\r\n]|${continuation})*)\](?:\[(?<reference>(?:\\.|[^\[\]\\\r\n]|${continuation})*)\])?`,
    "y",
  );
  const destinationLength = (target: string, inline = false): number => {
    if (target.startsWith("<")) return target.length;
    let depth = 0;
    for (let index = 0; index < target.length; index += 1) {
      if (target[index] === "\\") {
        index += 1;
        continue;
      }
      if (target[index] === "(") depth += 1;
      if (target[index] === ")") depth -= 1;
      if (depth < 0) return inline ? index : -1;
      if (depth > 32) return -1;
    }
    return depth === 0 ? target.length : -1;
  };
  const definitions = new Map<number, { end: number; label: string }>();
  for (const match of existing.matchAll(definition)) {
    const text = match.groups?.label ?? "";
    if (Buffer.byteLength(text.replace(/\r\n/g, "\n"), "utf8") > 1000 || !/[^ \t\r\n]/.test(text))
      continue;
    if (destinationLength(match.groups?.destination ?? "") < 0) continue;
    definitions.set(match.index, {
      end: match.index + match[0].length,
      label: normalizeLabel(text),
    });
  }
  const columnAfter = (prefix: string): number => {
    let column = 0;
    for (const character of prefix) {
      column += character === "\t" ? 4 - (column % 4) : 1;
    }
    return column;
  };
  // Discover operative definitions before checking forward-reference image descriptions.
  for (let pass = 0; pass < 2; pass += 1) {
    let fence: {
      character: string;
      length: number;
      container: string;
      contentColumn: number;
    } | null = null;
    let comment = false;
    let spanEnd = 0;
    let linkStart = 0;
    let linkEnd = 0;
    let tagEnd = 0;
    let referenceEnd = 0;
    let offset = 0;
    const listContentColumns: number[] = [];
    let indentedCode = false;
    let footnoteColumn: number | null = null;
    let footnoteParagraph = false;
    let htmlEnd: RegExp | null = null;
    let htmlContentColumn = 0;
    let htmlContainer = "";
    let paragraph = false;
    let quotedParagraph = false;
    for (const raw of existing.split("\n")) {
      if (offset < referenceEnd) {
        paragraph = false;
        quotedParagraph = false;
        offset += raw.length + 1;
        continue;
      }
      const container = containerOf(raw);
      const blank = raw.trim().length === 0;
      const rawIndentation = columnAfter(/^\uFEFF?([ \t]*)/.exec(raw)?.[1] ?? "");
      if (
        footnoteColumn !== null &&
        (blank ||
          rawIndentation >= footnoteColumn ||
          (footnoteParagraph && !paragraphInterrupt.test(raw)))
      ) {
        footnoteParagraph =
          !blank &&
          rawIndentation < footnoteColumn + 4 &&
          !paragraphInterrupt.test(raw.trimStart());
        paragraph = false;
        quotedParagraph = false;
        offset += raw.length + 1;
        continue;
      }
      footnoteColumn = null;
      const plain = plainLine(raw);
      const wasQuotedParagraph = quotedParagraph;
      const lazyQuote =
        quotedParagraph && container === "" && !blank && !paragraphInterrupt.test(plain);
      quotedParagraph = false;
      const prefix = /^[ \t]*/.exec(plain)?.[0] ?? "";
      const fenceIndentation = columnAfter(prefix);
      if (
        fence !== null &&
        (container !== fence.container || (!blank && fenceIndentation < fence.contentColumn))
      ) {
        fence = null;
      }
      if (fence !== null) {
        paragraph = false;
        const closing = /^(`{3,}|~{3,})[ \t]*$/.exec(plain.slice(prefix.length))?.[1] ?? "";
        if (
          fenceIndentation <= fence.contentColumn + 3 &&
          closing[0] === fence.character &&
          closing.length >= fence.length
        ) {
          fence = null;
        }
        offset += raw.length + 1;
        continue;
      }
      if (
        htmlEnd !== null &&
        (container !== htmlContainer || (!blank && fenceIndentation < htmlContentColumn))
      ) {
        htmlEnd = null;
      }
      if (htmlEnd !== null) {
        if (htmlEnd.test(raw)) htmlEnd = null;
        paragraph = false;
        offset += raw.length + 1;
        continue;
      }
      const indentation = columnAfter(/^[ \t]*/.exec(raw)?.[0] ?? "");
      while (!blank && indentation < (listContentColumns.at(-1) ?? 0)) listContentColumns.pop();
      const contentColumn = listContentColumns.at(-1) ?? 0;
      const indented = indentation >= contentColumn + 4;
      if (!comment && ((indentedCode && (blank || indented)) || (!paragraph && indented))) {
        indentedCode = true;
        paragraph = false;
        offset += raw.length + 1;
        continue;
      }
      indentedCode = false;
      const footnote = /^\uFEFF? {0,3}\[\^[^\]\r\n]+\]:[ \t]*(.*)/.exec(raw);
      if (
        !comment &&
        offset >= spanEnd &&
        offset >= linkEnd &&
        offset >= tagEnd &&
        footnote !== null
      ) {
        footnoteColumn = rawIndentation + 4;
        footnoteParagraph =
          (footnote[1] ?? "").trim().length > 0 && !paragraphInterrupt.test(footnote[1] ?? "");
        paragraph = false;
        offset += raw.length + 1;
        continue;
      }
      const marker = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)/.exec(raw);
      if (
        !comment &&
        offset >= spanEnd &&
        offset >= linkEnd &&
        offset >= tagEnd &&
        marker !== null &&
        indentation <= contentColumn + 3
      ) {
        const markerEnd = columnAfter(`${marker[1] ?? ""}${marker[2] ?? ""}`);
        const gap = columnAfter(marker[0]) - markerEnd;
        listContentColumns.push(markerEnd + (gap > 4 ? 1 : gap));
        if (gap > 4) {
          indentedCode = true;
          paragraph = false;
          offset += raw.length + 1;
          continue;
        }
      }
      const openingLine = fenceLine(raw);
      const openingPrefix = /^[ \t]*/.exec(openingLine)?.[0] ?? "";
      const openingColumn = columnAfter(openingPrefix);
      const openingBase = marker === null ? (listContentColumns.at(-1) ?? 0) : 0;
      const opening = /^(`{3,}|~{3,})(.*)$/.exec(openingLine.slice(openingPrefix.length));
      const run = opening?.[1] ?? "";
      const rest = opening?.[2] ?? "";
      if (
        !comment &&
        offset >= spanEnd &&
        offset >= linkEnd &&
        offset >= tagEnd &&
        openingColumn >= openingBase &&
        openingColumn <= openingBase + 3 &&
        opening &&
        !(run.startsWith("`") && rest.includes("`"))
      ) {
        fence = {
          character: run[0] ?? "`",
          length: run.length,
          container,
          contentColumn: listContentColumns.at(-1) ?? 0,
        };
        paragraph = false;
        offset += raw.length + 1;
        continue;
      }
      const htmlLine = openingLine.slice(openingPrefix.length);
      if (
        !comment &&
        offset >= spanEnd &&
        offset >= linkEnd &&
        offset >= tagEnd &&
        openingColumn >= openingBase &&
        openingColumn <= openingBase + 3
      ) {
        if (/^<(?:pre|script|style|textarea)(?=[ \t>]|$)/i.test(htmlLine)) {
          htmlEnd = /<\/(?:pre|script|style|textarea)>/i;
        } else if (/^<\?/.test(htmlLine)) {
          htmlEnd = /\?>/;
        } else if (/^<![A-Za-z]/.test(htmlLine)) {
          htmlEnd = />/;
        } else if (/^<!\[CDATA\[/.test(htmlLine)) {
          htmlEnd = /\]\]>/;
        } else if (
          /^ {0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?=[ \t>]|\/>|$)/i.test(
            htmlLine,
          )
        ) {
          htmlEnd = /^[ \t]*\r?$/;
        } else if (
          !paragraph &&
          /^ {0,3}(?:<(?!pre(?:[ \t/>]|$)|script(?:[ \t/>]|$)|style(?:[ \t/>]|$)|textarea(?:[ \t/>]|$))[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9:._-]*(?:[ \t]*=[ \t]*(?:(?:(?!["'=<>`])[\x21-\uFFFF])+|'[^']*'|"[^"]*"))?)*[ \t]*\/?>|<\/[A-Za-z][A-Za-z0-9-]*[ \t]*>)[ \t]*\r?$/i.test(
            htmlLine,
          )
        ) {
          htmlEnd = /^[ \t]*\r?$/;
        }
        if (htmlEnd !== null) {
          htmlContentColumn = listContentColumns.at(-1) ?? 0;
          htmlContainer = container;
          if (htmlEnd.test(raw)) htmlEnd = null;
          paragraph = false;
          offset += raw.length + 1;
          continue;
        }
      }

      const reference = definitions.get(offset);
      const definitionMarker = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)/.exec(plain);
      const definitionGap =
        definitionMarker === null
          ? 0
          : columnAfter(definitionMarker[0]) -
            columnAfter(`${definitionMarker[1] ?? ""}${definitionMarker[2] ?? ""}`);
      const startsContainer =
        (container !== "" && !wasQuotedParagraph) ||
        (definitionMarker !== null && paragraphInterrupt.test(plain));
      const definitionIndented = container !== "" && (fenceIndentation >= 4 || definitionGap > 4);
      if (
        reference !== undefined &&
        (!paragraph || startsContainer) &&
        !comment &&
        !definitionIndented &&
        !lazyQuote &&
        offset >= spanEnd &&
        offset >= linkEnd &&
        offset >= tagEnd
      ) {
        referenceLabels.add(reference.label);
        referenceEnd = reference.end;
        paragraph = false;
        quotedParagraph = container !== "";
        offset += raw.length + 1;
        continue;
      }

      let visible = "";
      let hasInlineLink = offset < linkEnd;
      for (let index = 0; index < raw.length;) {
        if (offset + index < tagEnd) {
          index = Math.min(raw.length, tagEnd - offset);
          continue;
        }
        if (offset + index >= linkStart && offset + index < linkEnd) {
          index = Math.min(raw.length, linkEnd - offset);
          continue;
        }
        if (offset + index < spanEnd) {
          index += 1;
          continue;
        }
        if (comment) {
          const end = raw.indexOf("-->", index);
          if (end === -1) break;
          comment = false;
          index = end + 3;
          continue;
        }
        if (raw.startsWith("<!--", index)) {
          comment = true;
          index += 4;
          continue;
        }
        if (raw[index] === "<" && !/^\uFEFF? {0,3}#{1,6}(?:[ \t]|\r?$)/.test(openingLine)) {
          let escapes = 0;
          for (let before = index - 1; before >= 0 && raw[before] === "\\"; before -= 1)
            escapes += 1;
          const end = escapes % 2 === 0 ? htmlTagEnd(offset + index) : offset + index;
          if (end > offset + raw.length) {
            tagEnd = end;
            visible += "\uFFFC";
            continue;
          }
        }
        if (raw[index] === "[") {
          let escapes = 0;
          for (let before = index - 1; before >= 0 && raw[before] === "\\"; before -= 1)
            escapes += 1;
          const start = offset + index;
          link.lastIndex = start;
          let inline = escapes % 2 === 0 ? link.exec(existing) : null;
          let imageEscapes = 0;
          for (let before = index - 2; before >= 0 && raw[before] === "\\"; before -= 1)
            imageEscapes += 1;
          const image = raw[index - 1] === "!" && imageEscapes % 2 === 0;
          if (inline !== null) {
            const target = inline.groups?.destination ?? "";
            const text = inline.groups?.text ?? "";
            const length = destinationLength(target, true);
            if (length >= 0 && length < target.length) {
              const targetStart = inline[0].indexOf(target, text.length + 3);
              const complete = inline[0].slice(0, targetStart + length + 1);
              link.lastIndex = 0;
              inline = link.exec(complete);
            }
            if (
              length >= 0 &&
              inline !== null &&
              destinationLength(inline.groups?.destination ?? "") >= 0
            ) {
              linkStart = image ? start : start + 1 + text.length;
              linkEnd = start + inline[0].length;
              hasInlineLink = true;
              if (image) visible += "\uFFFC";
              else index += 1;
              continue;
            }
          }
          if (image && escapes % 2 === 0) {
            referenceImage.lastIndex = start;
            const reference = referenceImage.exec(existing);
            const text = reference?.groups?.reference || reference?.groups?.text || "";
            if (
              reference !== null &&
              Buffer.byteLength(text.replace(/\r\n/g, "\n"), "utf8") <= 1000 &&
              referenceLabels.has(normalizeLabel(text))
            ) {
              linkStart = start;
              linkEnd = referenceImage.lastIndex;
              visible += "\uFFFC";
              hasInlineLink = true;
              continue;
            }
          }
        }
        if (raw[index] === "`") {
          const tail = existing.slice(offset + index);
          const span = codeSpan.exec(tail)?.[0];
          if (span === "`REVIEW.md`") {
            visible += span;
            index += span.length;
            continue;
          }
          if (span !== undefined) {
            spanEnd = offset + index + span.length;
            continue;
          }
          const unmatched = /^`+/.exec(tail)?.[0] ?? "`";
          visible += unmatched;
          index += unmatched.length;
          continue;
        }
        visible += raw.charAt(index);
        index += 1;
      }
      const paragraphText = container === "" ? visible : plainLine(visible);
      paragraph =
        (hasInlineLink || paragraphText.trim().length > 0) &&
        !/^ {0,3}(?:#{1,6}(?:[ \t]|$)|(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,}|=+[ \t]*)\r?$)/.test(
          paragraphText,
        );
      if (container !== "" || lazyQuote) {
        const quotePrefix = /^[ \t]*/.exec(paragraphText)?.[0] ?? "";
        const quoteMarker = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)/.exec(paragraphText);
        const quoteGap =
          quoteMarker === null
            ? 0
            : columnAfter(quoteMarker[0]) -
              columnAfter(`${quoteMarker[1] ?? ""}${quoteMarker[2] ?? ""}`);
        if ((!wasQuotedParagraph && columnAfter(quotePrefix) >= 4) || quoteGap > 4)
          paragraph = false;
        quotedParagraph = paragraph && !paragraphInterrupt.test(fenceLine(visible));
      }
      if (
        pass === 1 &&
        container === "" &&
        !lazyQuote &&
        visible.trim().replace(/^(?:[-*+]|\d{1,9}[.)])[ \t]+/, "") === pointer
      )
        return existing;
      offset += raw.length + 1;
    }
  }

  const end = /\r\n|\n/.exec(existing)?.[0] ?? "\n";
  const bom = existing.startsWith("\uFEFF") ? 1 : 0;
  return `${existing.slice(0, bom)}${pointer}${end}${end}${existing.slice(bom)}`;
}

/**
 * Which lines of a document are outside every fenced block.
 *
 * A rule path inside a fence is an example of a citation, not one. Spliced into
 * the fence, the bullets stay examples while the run reports having cited them;
 * counted as a rule list, they send a hand-wired file down a path that has
 * nowhere real to write.
 *
 * A fence belongs to the container it opened in. An unclosed one inside a block
 * quote ends where the quote does, and a scanner holding it open past that
 * reads the rest of the document as an example — including a real managed
 * section, which is then appended a second time.
 */
function outsideFences(lines: readonly string[]): boolean[] {
  let open: { character: string; length: number; container: string } | null = null;
  return lines.map((raw) => {
    const container = containerOf(raw);
    if (open !== null && container !== open.container) {
      // The container the fence opened in has ended, and so has the fence.
      open = null;
    }
    const line = fenceLine(raw);
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence === null) return open === null;
    const run = fence[1] ?? "";
    const rest = fence[2] ?? "";
    if (open === null) {
      // A backtick fence may not carry a backtick in its info string. Such a
      // line opens nothing, so it is ordinary content.
      if (run.startsWith("`") && rest.includes("`")) return true;
      open = { character: run[0] ?? "`", length: run.length, container };
      return false;
    }
    // A block closes on its own character, on a run at least as long as the
    // one that opened it, with nothing after it but spaces. A line carrying an
    // info string is an opener, and an opener inside a block is content — so
    // treating it as a closer resumes the scan in the middle of an example.
    if (run[0] === open.character && run.length >= open.length && rest.trim() === "") {
      open = null;
    }
    return false;
  });
}

/**
 * One past the last line of the list item that starts at `index`.
 *
 * A bullet is not one line: its continuation is indented under it. Inserting
 * between the two moves the project's own explanation under the new bullet,
 * where it describes a rule it was never about.
 */
function endOfListItem(lines: readonly string[], open: readonly boolean[], index: number): number {
  let end = index + 1;
  while (end < lines.length) {
    const line = plainLine(lines[end]);
    // A blank line inside a list item is followed by more of it; two in a row,
    // or an unindented line, end it.
    const continued =
      /^\s+\S/.test(line) || (line.trim() === "" && /^\s+\S/.test(plainLine(lines[end + 1])));
    if (!continued || open[end] !== true) break;
    end += 1;
  }
  return end;
}

/** Whether the line at `index` is a rule bullet a citation can be added after. */
function isRuleBullet(lines: readonly string[], open: readonly boolean[], index: number): boolean {
  if (open[index] !== true) return false;
  const line = plainLine(lines[index]);
  return line.startsWith("- ") && citedRuleMasters(line).length > 0;
}

/**
 * Where the managed section's markers sit, ignoring any inside a fenced block.
 *
 * A document showing what the section looks like carries a marker pair in an
 * example. Found by scanning the text, that example is the managed section: the
 * file reads as connected, and a bullet meant for the rule list is written into
 * the example instead, where it instructs nobody.
 */
function managedSection(existing: string): {
  lines: string[];
  open: boolean[];
  begin: number;
  end: number;
} {
  // Split on the separator alone. Choosing one terminator for the document put
  // an LF-delimited section into a single element of a CRLF split, so the begin
  // and end markers shared one line and the section read as never closed.
  const lines = existing.split("\n");
  const open = outsideFences(lines);
  const begin = lines.findIndex(
    (line, index) => open[index] === true && line.includes(QFAI_AGENT_RULES_BEGIN),
  );
  const end =
    begin === -1
      ? -1
      : lines.findIndex(
          (line, index) =>
            index > begin && open[index] === true && line.includes(QFAI_AGENT_RULES_END),
        );
  return { lines, open, begin, end };
}
/** The template's bullets for the masters `existing` does not already cite. */
function pendingBullets(existing: string, section: string, masters: readonly string[]): string[] {
  const cited = new Set(citedRuleMastersOutsideCode(existing));
  const bullets: string[] = [];
  for (const master of masters) {
    if (cited.has(master)) continue;
    const bullet = bulletFor(section, master);
    if (bullet !== null) bullets.push(bullet);
  }
  return bullets;
}

/** The template's own bullet for `master`, or `null` when it has none. */
function bulletFor(section: string, master: string): string | null {
  for (const line of section.split("\n")) {
    if (line.startsWith("- ") && line.includes(master)) return line;
  }
  return null;
}

/**
 * `existing` with a bullet added for every master in `masters` the file does not
 * already cite.
 *
 * The bullet is lifted from `section` rather than composed here, for the reason
 * the whole section is: one wording, in the template, where it is reviewed.
 * Insertion goes after the last rule bullet inside the managed section, so the
 * prose that closes the section stays closed and anything the project wrote
 * around it is untouched.
 *
 * Returns `existing` unchanged when there is nothing to add, or when the file
 * has no complete marker pair to insert inside.
 */
export function addRuleCitations(
  existing: string,
  section: string,
  masters: readonly string[],
): string {
  const { lines, open, begin, end } = managedSection(existing);
  if (begin === -1 || end === -1) return existing;

  const bullets = pendingBullets(existing, section, masters);
  if (bullets.length === 0) return existing;

  // After the last rule bullet, not the last line: the section closes with
  // prose, and a bullet after it would read as part of that paragraph.
  let insertAfter = -1;
  for (let index = begin + 1; index < end; index += 1) {
    if (isRuleBullet(lines, open, index)) insertAfter = index;
  }
  if (insertAfter === -1) {
    // A section with no rule bullet left — every one deleted, or the citations
    // rewritten as something else. Discarding the bullets here would leave a
    // rule the run shipped uncited for good, so they go at the end of the
    // section as their own block, separated from whatever precedes them.
    const terminator = terminatorOf(lines[end]);
    // Where the section already closes with a blank line, that line is the
    // separator below the bullets: adding another leaves two, so a run that
    // promised one bullet also rewrote the section's whitespace.
    const closing = plainLine(lines[end - 1]).trim() === "";
    lines.splice(
      end - (closing ? 1 : 0),
      0,
      terminator,
      ...bullets.map((bullet) => `${bullet}${terminator}`),
      ...(closing ? [] : [terminator]),
    );
    return lines.join("\n");
  }

  const at = Math.min(endOfListItem(lines, open, insertAfter), end);
  const terminator = terminatorOf(lines[insertAfter]);
  lines.splice(at, 0, ...bullets.map((bullet) => `${bullet}${terminator}`));
  return lines.join("\n");
}
