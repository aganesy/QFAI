/**
 * Detects directives that pin a fixed output language in shipped assistant docs.
 *
 * `constitution/constitution.md` states one Absolute Rule — output in the
 * user's working language — and says it "overrides all other stylistic
 * preferences". A shipped file that also says "報告・出力: 日本語" or "Always
 * respond in English" silently overrides that rule for whichever operator does
 * not work in the named language.
 *
 * The first version of the sweep that guards this looked for two exact
 * Japanese strings (`言語指示`, `報告・出力: 日本語`) — the literal wording of
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
 *    words (`このファイルは出力言語を固定しない…`, `pins no language`).
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
 * Listed explicitly rather than matched as `…語`, which would also catch
 * `用語` / `単語` / `言語` / `述語` and make every glossary a false positive.
 */
export const LANGUAGE_NAMES_JA: readonly string[] = [
  "日本語",
  "英語",
  "中国語",
  "韓国語",
  "朝鮮語",
  "フランス語",
  "ドイツ語",
  "スペイン語",
  "ポルトガル語",
  "イタリア語",
  "ロシア語",
  "ウクライナ語",
  "ポーランド語",
  "オランダ語",
  "トルコ語",
  "アラビア語",
  "ヘブライ語",
  "ヒンディー語",
  "ベンガル語",
  "ベトナム語",
  "タイ語",
  "インドネシア語",
  "マレー語",
  "タガログ語",
  "スウェーデン語",
  "ノルウェー語",
  "デンマーク語",
  "フィンランド語",
  "チェコ語",
  "ギリシャ語",
  "ルーマニア語",
  "ハンガリー語",
  "ペルシャ語",
  "ウルドゥー語",
  "スワヒリ語",
];

const EN = `(?:${LANGUAGE_NAMES_EN.join("|")})`;
const JA = `(?:${LANGUAGE_NAMES_JA.join("|")})`;

/** Verbs that name the act of producing operator-facing output, in English. */
const EN_OUTPUT_VERB =
  "respond|responds|reply|replies|answer|answers|write|writes|written|output|outputs|report|reports|speak|communicate|converse|phrase|produce|deliver|document|explain|summarise|summarize|translate|render";

/** Verbs that name the act of producing operator-facing output, in Japanese. */
const JA_OUTPUT_VERB =
  "出力|回答|応答|返答|報告|記述|記載|説明|要約|翻訳|書い|書く|書き|答え|話し|返す|統一|固定|限定";

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
    // 「日本語で出力」「英語のみで回答」
    name: "ja/language-de-verb",
    pattern: new RegExp(`${JA}(?:のみ|だけ)?(?:で|にて|に|へ)[^。\\n]{0,20}?(?:${JA_OUTPUT_VERB})`),
  },
  {
    // 「報告・出力: 日本語」「使用言語: 英語」
    name: "ja/key-value",
    pattern: new RegExp(`(?:${JA_OUTPUT_VERB}|言語|表記)[^。\\n]{0,20}?[:：]\\s*(?:\\*\\*)?${JA}`),
  },
  {
    // 「日本語に統一」「英語で固定」「日本語とすること」「日本語厳守」
    name: "ja/exclusive",
    pattern: new RegExp(
      `${JA}[^。\\n]{0,10}?(?:に統一|で統一|に固定|で固定|限定|厳守|必須|とする|とすること|に限る)`,
    ),
  },
  {
    // 「必ず日本語」「常に英語」「原則として日本語」
    name: "ja/emphatic",
    pattern: new RegExp(`(?:必ず|常に|原則|一律)[^。\\n]{0,20}?${JA}`),
  },
  {
    // 「日本語のみ使用」
    name: "ja/language-only-use",
    pattern: new RegExp(`${JA}(?:のみ|だけ)(?:を|で)?(?:使用|使う|用いる)`),
  },
  {
    // 「報告/Plan/最終出力は日本語」— the topic marker, with the language last.
    // Every other Japanese shape expects the language before the particle or
    // beside a colon, so the most ordinary way to state the rule read as prose.
    name: "ja/topic-language",
    pattern: new RegExp(`(?:${JA_OUTPUT_VERB})[^。\\n]{0,20}?は[^。\\n]{0,10}?${JA}`),
  },
  {
    // The header that shipped the original defect, whatever follows it.
    name: "ja/language-instruction-header",
    pattern: /言語指示/,
  },
];

/**
 * Carve-out 2: an explicit disclaimer that the file pins nothing.
 *
 * Carve-out 1 is not a regex — see {@link isUserLanguageConditional}.
 */
const PERMITTED_DISCLAIMER_SHAPES: readonly RegExp[] = [
  /固定しない|固定されない|固定はしない/,
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
  /リポジトリ[^。\n]{0,30}?(?:で書く|で書き|で書かれ|で記述)/,
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
  const japanese = /(?:ユーザー?|利用者)[^。]*?(?:場合|なら|に合わせ|に従)/.exec(unit);
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
const SENTENCE_END = /[.。!?！？:：][")'”』」）]*\s*$/;

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
