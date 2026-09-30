/**
 * Detects directives that pin a fixed output language in shipped assistant docs.
 *
 * `constitution/constitution.md` states one Absolute Rule — output in the
 * user's working language — and says it "overrides all other stylistic
 * preferences". A shipped file that also says "reports and output: Japanese" (written in Japanese) or "Always
 * respond in English" silently overrides that rule for whichever operator does
 * not work in the named language.
 *
 * The first version of the sweep that guards this looked for two exact
 * Japanese strings (the header "language instruction" and the line "reports and output:
 * Japanese", both in Japanese) — the literal wording of
 * the one block that had leaked in. Any other phrasing of the same defect, in
 * either language, passed. This matcher generalises it: the invariant is that
 * no shipped assistant document binds output to a *named* language, however it
 * is phrased.
 *
 * ## How it decides
 *
 * A logical unit (see {@link toLogicalUnits}) is an offender when it names a
 * concrete language **and** matches one of the directive shapes below, **and**
 * is not one of the two permitted reference shapes:
 *
 * 1. **User-conditional** — the unit is an `If` / `When` clause about the
 *    *user* whose condition names every language the unit does, so the language
 *    it commands is the one the condition derived from the user
 *    (`If the user writes in Japanese, output Japanese.`). A condition that
 *    names no language is a fallback to a fixed one, not a restatement, and is
 *    reported (`If the user does not specify a language, respond in English.`).
 * 2. **Explicitly non-directive** — the unit disclaims pinning in so many
 *    words (a Japanese sentence meaning "this file does not fix the output language",
 *    or `pins no language`).
 * 3. **About stored text** — the unit names the repository as the thing
 *    written (`this repository is written in English`). That is a rule about
 *    source and Markdown, not about what an agent says.
 *
 * Anything else that names a language in an output-binding context is
 * reported. Prose that merely mentions a language ("critiques pass trivially
 * for Japanese/Chinese copy") names no output obligation and is not matched.
 *
 * ## Known limits
 *
 * Regexes cannot be exhaustive over natural language. Two gaps are accepted
 * deliberately, both fail-open:
 *
 * - A language outside {@link LANGUAGE_NAMES_EN} / {@link LANGUAGE_NAMES_JA}
 *   is invisible. Extend the rosters rather than loosening the shapes.
 * - A unit that both disclaims pinning and issues a directive is exempted by
 *   carve-out 2. A unit that states the repository's written language and then
 *   pins an output language is exempted by carve-out 3 the same way.
 *
 * The shapes are deliberately wide and the carve-outs deliberately narrow, so
 * the failure mode is a false positive a contributor can read and rebut, not a
 * silent miss.
 */

/** Language names written in English. Matched with ASCII word boundaries. */
export const LANGUAGE_NAMES_EN: readonly string[] = [
  "Japanese",
  "English",
  "Chinese",
  "Mandarin",
  "Cantonese",
  "Korean",
  "French",
  "German",
  "Spanish",
  "Portuguese",
  "Italian",
  "Russian",
  "Ukrainian",
  "Polish",
  "Dutch",
  "Turkish",
  "Arabic",
  "Hebrew",
  "Hindi",
  "Bengali",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Tagalog",
  "Filipino",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Czech",
  "Greek",
  "Romanian",
  "Hungarian",
  "Persian",
  "Farsi",
  "Urdu",
  "Swahili",
];

/**
 * Language names written in Japanese.
 *
 * Listed explicitly rather than matched as a bare "...go" suffix (Japanese for
 * "language"), which would also catch the words for "term", "word", "language"
 * and "predicate", and make every glossary a false positive.
 */
export const LANGUAGE_NAMES_JA: readonly string[] = [
  "\u65e5\u672c\u8a9e",
  "\u82f1\u8a9e",
  "\u4e2d\u56fd\u8a9e",
  "\u97d3\u56fd\u8a9e",
  "\u671d\u9bae\u8a9e",
  "\u30d5\u30e9\u30f3\u30b9\u8a9e",
  "\u30c9\u30a4\u30c4\u8a9e",
  "\u30b9\u30da\u30a4\u30f3\u8a9e",
  "\u30dd\u30eb\u30c8\u30ac\u30eb\u8a9e",
  "\u30a4\u30bf\u30ea\u30a2\u8a9e",
  "\u30ed\u30b7\u30a2\u8a9e",
  "\u30a6\u30af\u30e9\u30a4\u30ca\u8a9e",
  "\u30dd\u30fc\u30e9\u30f3\u30c9\u8a9e",
  "\u30aa\u30e9\u30f3\u30c0\u8a9e",
  "\u30c8\u30eb\u30b3\u8a9e",
  "\u30a2\u30e9\u30d3\u30a2\u8a9e",
  "\u30d8\u30d6\u30e9\u30a4\u8a9e",
  "\u30d2\u30f3\u30c7\u30a3\u30fc\u8a9e",
  "\u30d9\u30f3\u30ac\u30eb\u8a9e",
  "\u30d9\u30c8\u30ca\u30e0\u8a9e",
  "\u30bf\u30a4\u8a9e",
  "\u30a4\u30f3\u30c9\u30cd\u30b7\u30a2\u8a9e",
  "\u30de\u30ec\u30fc\u8a9e",
  "\u30bf\u30ac\u30ed\u30b0\u8a9e",
  "\u30b9\u30a6\u30a7\u30fc\u30c7\u30f3\u8a9e",
  "\u30ce\u30eb\u30a6\u30a7\u30fc\u8a9e",
  "\u30c7\u30f3\u30de\u30fc\u30af\u8a9e",
  "\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9\u8a9e",
  "\u30c1\u30a7\u30b3\u8a9e",
  "\u30ae\u30ea\u30b7\u30e3\u8a9e",
  "\u30eb\u30fc\u30de\u30cb\u30a2\u8a9e",
  "\u30cf\u30f3\u30ac\u30ea\u30fc\u8a9e",
  "\u30da\u30eb\u30b7\u30e3\u8a9e",
  "\u30a6\u30eb\u30c9\u30a5\u30fc\u8a9e",
  "\u30b9\u30ef\u30d2\u30ea\u8a9e",
];

const EN = `(?:${LANGUAGE_NAMES_EN.join("|")})`;
const JA = `(?:${LANGUAGE_NAMES_JA.join("|")})`;

/** Verbs that name the act of producing operator-facing output, in English. */
const EN_OUTPUT_VERB =
  "respond|responds|reply|replies|answer|answers|write|writes|written|output|outputs|report|reports|speak|communicate|converse|phrase|produce|deliver|document|explain|summarise|summarize|translate|render";

/** Verbs that name the act of producing operator-facing output, in Japanese. */
const JA_OUTPUT_VERB =
  "\u51fa\u529b|\u56de\u7b54|\u5fdc\u7b54|\u8fd4\u7b54|\u5831\u544a|\u8a18\u8ff0|\u8a18\u8f09|\u8aac\u660e|\u8981\u7d04|\u7ffb\u8a33|\u66f8\u3044|\u66f8\u304f|\u66f8\u304d|\u7b54\u3048|\u8a71\u3057|\u8fd4\u3059|\u7d71\u4e00|\u56fa\u5b9a|\u9650\u5b9a";

/** One named way of binding output to a language. */
interface DirectiveShape {
  /** Short label, quoted back in the failure so the match is arguable. */
  readonly name: string;
  readonly pattern: RegExp;
}

/**
 * Shapes that bind output to a named language.
 *
 * Each is anchored on a language name so that a unit has to *name* a language
 * to be considered at all; the surrounding shape is what turns a mention into
 * a directive.
 */
const DIRECTIVE_SHAPES: readonly DirectiveShape[] = [
  {
    // "respond in English", "all reports are written in Japanese"
    name: "en/verb-in-language",
    pattern: new RegExp(`\\b(?:${EN_OUTPUT_VERB})\\b[^.]{0,60}?\\bin\\s+(?:the\\s+)?${EN}\\b`, "i"),
  },
  {
    // "English only", "in Japanese at all times"
    name: "en/exclusive",
    pattern: new RegExp(`\\b${EN}\\b[^.]{0,30}?\\b(?:only|at all times|regardless)\\b`, "i"),
  },
  {
    // "use English", "stick to Japanese"
    name: "en/use-language",
    pattern: new RegExp(`\\b(?:use|using|stick to|default to|prefer)\\s+(?:the\\s+)?${EN}\\b`, "i"),
  },
  {
    // "always ... English", "output must be Japanese", "never ... English"
    name: "en/modal-language",
    pattern: new RegExp(
      `\\b(?:always|must|shall|should|never|only|required to)\\b[^.]{0,60}?\\b${EN}\\b`,
      "i",
    ),
  },
  {
    // "Output language: English", "language = Japanese"
    name: "en/key-value",
    pattern: new RegExp(
      `\\b(?:language|output|report|response)\\s*[:=]\\s*(?:the\\s+)?${EN}\\b`,
      "i",
    ),
  },
  {
    // Matches phrases meaning "output in Japanese" and "answer in English only".
    name: "ja/language-de-verb",
    pattern: new RegExp(
      `${JA}(?:\u306e\u307f|\u3060\u3051)?(?:\u3067|\u306b\u3066|\u306b|\u3078)[^\u3002\\n]{0,20}?(?:${JA_OUTPUT_VERB})`,
    ),
  },
  {
    // Matches key-value phrases meaning "reports and output: Japanese" and "language used: English".
    name: "ja/key-value",
    pattern: new RegExp(
      `(?:${JA_OUTPUT_VERB}|\u8a00\u8a9e|\u8868\u8a18)[^\u3002\\n]{0,20}?[:\uff1a]\\s*(?:\\*\\*)?${JA}`,
    ),
  },
  {
    // Matches phrases meaning "unify on Japanese", "fix to English", "must be Japanese" and
    // "Japanese strictly".
    name: "ja/exclusive",
    pattern: new RegExp(
      `${JA}[^\u3002\\n]{0,10}?(?:\u306b\u7d71\u4e00|\u3067\u7d71\u4e00|\u306b\u56fa\u5b9a|\u3067\u56fa\u5b9a|\u9650\u5b9a|\u53b3\u5b88|\u5fc5\u9808|\u3068\u3059\u308b|\u3068\u3059\u308b\u3053\u3068|\u306b\u9650\u308b)`,
    ),
  },
  {
    // Matches phrases meaning "always Japanese", "always English" and "Japanese in principle".
    name: "ja/emphatic",
    pattern: new RegExp(
      `(?:\u5fc5\u305a|\u5e38\u306b|\u539f\u5247|\u4e00\u5f8b)[^\u3002\\n]{0,20}?${JA}`,
    ),
  },
  {
    // Matches a phrase meaning "use Japanese only".
    name: "ja/language-only-use",
    pattern: new RegExp(
      `${JA}(?:\u306e\u307f|\u3060\u3051)(?:\u3092|\u3067)?(?:\u4f7f\u7528|\u4f7f\u3046|\u7528\u3044\u308b)`,
    ),
  },
  {
    // Matches a phrase meaning "reports / Plan / final output are in Japanese" — the topic
    // marker, with the language last.
    // Every other Japanese shape expects the language before the particle or
    // beside a colon, so the most ordinary way to state the rule read as prose.
    name: "ja/topic-language",
    pattern: new RegExp(`(?:${JA_OUTPUT_VERB})[^\u3002\\n]{0,20}?\u306f[^\u3002\\n]{0,10}?${JA}`),
  },
  {
    // The header that shipped the original defect, whatever follows it.
    name: "ja/language-instruction-header",
    pattern: /\u8a00\u8a9e\u6307\u793a/,
  },
];

/**
 * Carve-out 2: an explicit disclaimer that the file pins nothing.
 *
 * Carve-out 1 is not a regex — see {@link isUserLanguageConditional}.
 */
const PERMITTED_DISCLAIMER_SHAPES: readonly RegExp[] = [
  /\u56fa\u5b9a\u3057\u306a\u3044|\u56fa\u5b9a\u3055\u308c\u306a\u3044|\u56fa\u5b9a\u306f\u3057\u306a\u3044/,
  /\b(?:pins no|does not pin|do not pin|never pins)\b/i,
];

/**
 * Carve-out 3: the subject is the text this repository stores, not an output.
 *
 * "This repository is written in English" is a rule about source, comments and
 * Markdown — `.agents/rules/repository-language.md` owns it, and it says in so
 * many words that it does not decide the language an assistant replies in. The
 * `en/verb-in-language` shape cannot tell the two apart: `written` is an output
 * verb, and a repository is not an output.
 *
 * Narrow on purpose. The unit has to name the repository as the thing written,
 * so a sentence about what an agent writes is untouched.
 */
const STORED_TEXT_SHAPES: readonly RegExp[] = [
  /\brepositor(?:y|ies)\b[^.]{0,60}?\bwritten in\b/i,
  /\u30ea\u30dd\u30b8\u30c8\u30ea[^\u3002\n]{0,30}?(?:\u3067\u66f8\u304f|\u3067\u66f8\u304d|\u3067\u66f8\u304b\u308c|\u3067\u8a18\u8ff0)/,
];

const describesStoredText = (unit: string): boolean =>
  STORED_TEXT_SHAPES.some((shape) => shape.test(unit));

/**
 * The condition clause a user-conditional unit opens with, or `null`.
 *
 * English: `if` / `when` / `whenever` at the head, the user named inside the
 * clause, and the clause running to the comma that closes it. Japanese: the
 * user named, and the clause running to its ender.
 *
 * The clause is extracted rather than merely detected because carve-out 1
 * turns on WHERE the language is named, not on the unit being conditional.
 */
function userConditionClause(unit: string): string | null {
  const english = /^(?:if|when|whenever)\b[^,]*?\buser'?’?s?\b[^,]*/i.exec(unit);
  if (english !== null) return english[0];
  const japanese =
    /(?:\u30e6\u30fc\u30b6\u30fc?|\u5229\u7528\u8005)[^\u3002]*?(?:\u5834\u5408|\u306a\u3089|\u306b\u5408\u308f\u305b|\u306b\u5f93)/.exec(
      unit,
    );
  return japanese?.[0] ?? null;
}

/** Every language from the two rosters that `text` names. */
function namedLanguages(text: string): Set<string> {
  const found = new Set<string>();
  for (const name of LANGUAGE_NAMES_EN) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) found.add(name);
  }
  for (const name of LANGUAGE_NAMES_JA) {
    if (text.includes(name)) found.add(name);
  }
  return found;
}

/**
 * Carve-out 1: the unit restates the Absolute Rule for one language.
 *
 * Being conditional on the user is NOT enough, which is what the first version
 * of this carve-out asserted: `If the user does not specify a language, always
 * respond in English.` opens with `If`, names the user, and is a fallback to a
 * fixed language for every operator who does not work in it — the exact defect
 * this matcher exists to find, wearing the exemption's clothes.
 *
 * What separates a restatement from a fallback is where the language comes
 * from: in `If the user writes in Japanese, output Japanese.` the condition
 * names the language and the directive echoes it, so the language IS the
 * user's. So every language the unit names must be one its condition already
 * named. A condition that names none — `does not specify a language`, `has not
 * chosen one` — exempts nothing, and the shapes below judge the unit.
 */
function isUserLanguageConditional(unit: string): boolean {
  const clause = userConditionClause(unit);
  if (clause === null) return false;
  const fromUser = namedLanguages(clause);
  return [...namedLanguages(unit)].every((name) => fromUser.has(name));
}

/** A soft-wrap-joined sentence, with the 1-based line it starts on. */
export interface LogicalUnit {
  readonly line: number;
  readonly text: string;
}

/** An offending unit, with the name of the shape that flagged it. */
export interface FixedLanguageDirective extends LogicalUnit {
  /** {@link DirectiveShape.name} of the shape that matched. */
  readonly shape: string;
}

const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const BLOCK_START = /^\s*(?:#{1,6}\s|>+\s*$|\||```|---\s*$)/;
const SENTENCE_END = /[.\u3002!?\uff01\uff1f:\uff1a][")'”\u300f\u300d\uff09]*\s*$/;

/** Strip the markdown scaffolding that a wrapped sentence carries per line. */
const stripScaffolding = (line: string): string =>
  line
    .replace(/^\s*>+\s?/, "")
    .replace(LIST_MARKER, "")
    .trim();

/**
 * Split markdown into sentence-ish units, joining soft-wrapped continuations.
 *
 * A directive wrapped over two source lines is one directive; matching per
 * raw line would miss it. A line continues the previous unit only when the
 * previous line did not end a sentence and the line does not open a new block
 * (heading, list item, table row, fence, blank).
 */
export function toLogicalUnits(text: string): LogicalUnit[] {
  const units: LogicalUnit[] = [];
  const lines = text.split(/\r?\n/);

  let previousEndedSentence = true;
  lines.forEach((raw, index) => {
    const stripped = stripScaffolding(raw);
    if (stripped === "") {
      previousEndedSentence = true;
      return;
    }

    const opensBlock = BLOCK_START.test(raw) || LIST_MARKER.test(raw.replace(/^\s*>+\s?/, ""));
    const last = units.at(-1);
    if (last !== undefined && !previousEndedSentence && !opensBlock) {
      units[units.length - 1] = { line: last.line, text: `${last.text} ${stripped}` };
    } else {
      units.push({ line: index + 1, text: stripped });
    }

    previousEndedSentence = SENTENCE_END.test(stripped);
  });

  return units;
}

/** True when the unit is one of the three permitted ways to name a language. */
const isPermittedReference = (unit: string): boolean =>
  isUserLanguageConditional(unit) ||
  PERMITTED_DISCLAIMER_SHAPES.some((shape) => shape.test(unit)) ||
  describesStoredText(unit);

/**
 * Every unit of `text` that pins output to a named language.
 *
 * Returns `[]` for a document that names no language, names one only in
 * prose, or names one through a permitted reference shape.
 */
export function findFixedLanguageDirectives(text: string): FixedLanguageDirective[] {
  const offenders: FixedLanguageDirective[] = [];

  for (const unit of toLogicalUnits(text)) {
    if (isPermittedReference(unit.text)) {
      continue;
    }
    const shape = DIRECTIVE_SHAPES.find((candidate) => candidate.pattern.test(unit.text));
    if (shape !== undefined) {
      offenders.push({ line: unit.line, text: unit.text, shape: shape.name });
    }
  }

  return offenders;
}

/**
 * `path:line [shape] text` labels for the offenders in `text`.
 *
 * Naming the shape is what makes a false positive arguable: a contributor
 * reading the failure can see which rule fired and say why their line is not
 * a directive, instead of guessing.
 */
export function fixedLanguageOffenders(relativePath: string, text: string): string[] {
  return findFixedLanguageDirectives(text).map(
    (offender) => `${relativePath}:${offender.line} [${offender.shape}] ${offender.text}`,
  );
}
