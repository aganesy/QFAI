/**
 * The file extensions a project's test globs select outright.
 *
 * An extension-broad glob sweeps data files into a test directory beside the
 * suites it was written for. A scan that reads sources keeps a collected file
 * only when its extension is one the scan reads or one these helpers find named
 * in a glob, so a fixture is not read as a source and a language the project
 * selected on purpose is not dropped.
 */

/**
 * Whether a glob entry withdraws files. A leading `!` does, except where it opens
 * a negated extglob group, which selects: `!(fixtures)/*.py` is a selector.
 */
export function isGlobExclusion(glob: string): boolean {
  const trimmed = glob.trimStart();
  return trimmed.startsWith("!") && !trimmed.startsWith("!(");
}

/** Characters an extension may carry, and the most variants a class expands to. */
const EXTENSION_TOKEN = /^[A-Za-z0-9_+-]+$/;
const MAX_CLASS_VARIANTS = 32;

/**
 * Every spelling a character-class extension selects — `[tj]s` gives `ts` and
 * `js` — or `null` when the classes do not form a short explicit list. A range,
 * a negated class or an empty one selects too much to list, so the glob is
 * treated as extension-broad.
 */
function expandCharacterClasses(extension: string): string[] | null {
  let variants = [""];
  for (const token of extension.match(/\[[^\]]*\]|[^[\]]/g) ?? []) {
    if (!token.startsWith("[")) {
      variants = variants.map((variant) => variant + token);
      continue;
    }
    const members = token.slice(1, -1);
    if (members.length === 0 || /^[!^]/.test(members) || members.includes("-")) {
      return null;
    }
    const next: string[] = [];
    for (const variant of variants) {
      for (const member of members) next.push(variant + member);
    }
    variants = next;
    if (variants.length > MAX_CLASS_VARIANTS) return null;
  }
  return variants;
}

/**
 * Extensions the globs name outright, as `.ext`, spelled as each glob spells
 * them.
 *
 * A glob ending in a literal extension names it; one ending in a brace set, an
 * extglob group or a short character class names each member; one ending in a
 * wildcard names none, which is the extension-broad case a caller filters. A
 * negative entry selects nothing, so it names nothing either. `!(…)` selects
 * every extension except its members and names none.
 *
 * The spelling is kept because a glob is matched against a path, and on a
 * case-sensitive filesystem `*.ts` does not reach `pay.TS`; a caller comparing
 * extensions lowercases its own copy.
 */
export function globExtensions(globs: readonly string[]): string[] {
  const found: string[] = [];
  const pushAlternatives = (alternatives: string[]): void => {
    for (const part of alternatives) {
      // An alternative's own last dotted segment: `{test.zig,spec.zig}` names
      // `.zig` twice.
      const extension = part.trim().split(".").at(-1) ?? "";
      if (EXTENSION_TOKEN.test(extension)) {
        found.push(`.${extension}`);
      }
    }
  };
  for (const glob of globs) {
    if (isGlobExclusion(glob)) continue;
    const braces = /\.\{([^}]+)\}$/.exec(glob);
    if (braces) {
      pushAlternatives((braces[1] ?? "").split(","));
      continue;
    }
    const group = /\.[@?+*]\(([^)]+)\)$/.exec(glob);
    if (group) {
      pushAlternatives((group[1] ?? "").split("|"));
      continue;
    }
    const literal = /\.((?:[A-Za-z0-9_+-]|\[[^\]]*\])+)$/.exec(glob);
    if (literal) {
      for (const variant of expandCharacterClasses(literal[1] ?? "") ?? []) {
        if (EXTENSION_TOKEN.test(variant)) found.push(`.${variant}`);
      }
    }
  }
  return found;
}

/**
 * A predicate for a file path that a glob naming its files selects: a glob
 * whose last segment names something besides wildcards, whether an extension
 * as `*.json` does, a name as `*.test.*` and `test_[0-9].*` do, or a whole file
 * name as `test_pay` does.
 *
 * Such a glob vouches for what it selects, so a file it matches is a source
 * whatever extensions the caller reads by default. A negated group names what
 * it leaves out, so `*.!(json)` selects `pay.zig` this way. Each glob is read
 * against the whole path it would select, so what one package's glob names
 * does not vouch for a file only another package's broad glob collected. A
 * last segment of wildcards alone names nothing, and a negative entry selects
 * nothing. Matched case-sensitively, as the glob that collected the file was,
 * against a path written with `/`.
 */
export function namedTestFileMatcher(globs: readonly string[]): (filePath: string) => boolean {
  const patterns: RegExp[] = [];
  for (const glob of globs) {
    if (isGlobExclusion(glob)) continue;
    const last = glob.split("/").at(-1) ?? "";
    if (!/[^*?.]/.test(last)) continue;
    // SIMPLIFIED: a glob this reader cannot translate — an unclosed group, brace
    // or bracket, or a negated group inside another group — vouches for no file.
    // Lift when: a project names its tests with a glob of that shape.
    const source = globPathPattern(glob);
    if (source === null) continue;
    try {
      patterns.push(new RegExp(`^${source}$`));
    } catch {
      // A class the engine rejects, such as the reversed range `[z-a]`, selects
      // no file, so it vouches for none.
    }
  }
  return (filePath) => patterns.some((pattern) => pattern.test(filePath));
}

/**
 * A whole glob as a regular-expression source over a `/`-separated path, or
 * `null` for syntax this reader does not translate. `**` spans any number of
 * directories, and every other segment is read by {@link segmentPattern}.
 */
function globPathPattern(glob: string): string | null {
  const segments = glob.trim().replace(/^\.\//, "").split("/");
  let source = "";
  for (const [index, segment] of segments.entries()) {
    const last = index === segments.length - 1;
    if (segment === "**") {
      source += last ? "(?:[^/]*(?:/[^/]*)*)" : "(?:[^/]+/)*";
      continue;
    }
    const part = segmentPattern(segment);
    if (part === null) return null;
    source += last ? part : `${part}/`;
  }
  return source;
}

/**
 * One glob path segment as a regular-expression source, or `null` for syntax
 * this reader does not translate. Braces and extglob groups become
 * alternations, a bracket expression stays a character class, and `*` and `?`
 * stay inside the segment.
 *
 * A negated group matches wherever none of its alternatives, followed by the
 * rest of the segment, would, which is how the glob matcher reads it. Inside
 * another group it is not translated.
 */
function segmentPattern(segment: string, nested = false): string | null {
  let source = "";
  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? "";
    if ("@?+*!".includes(char) && segment[index + 1] === "(") {
      const close = segment.indexOf(")", index + 2);
      if (close < 0) return null;
      const group = alternation(segment.slice(index + 2, close).split("|"));
      if (group === null) return null;
      if (char === "!") {
        const rest = nested ? null : segmentPattern(segment.slice(close + 1));
        if (rest === null) return null;
        return `${source}(?:(?!${group}${rest}(?:/|$))[^/]*?)${rest}`;
      }
      source += char === "@" ? group : `${group}${char}`;
      index = close;
    } else if (char === "{") {
      const close = segment.indexOf("}", index + 1);
      const group = close < 0 ? null : alternation(segment.slice(index + 1, close).split(","));
      if (group === null) return null;
      source += group;
      index = close;
    } else if (char === "[") {
      const close = segment.indexOf("]", index + 2);
      if (close < 0) return null;
      const members = segment.slice(index + 1, close).replaceAll("\\", "\\\\");
      source += `[${members.replace(/^[!^]/, "^")}]`;
      index = close;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.^$|\\+(){}[\]]/g, "\\$&");
    }
  }
  return source;
}

function alternation(alternatives: readonly string[]): string | null {
  const sources: string[] = [];
  for (const alternative of alternatives) {
    const source = segmentPattern(alternative, true);
    if (source === null) return null;
    sources.push(source);
  }
  return `(?:${sources.join("|")})`;
}
