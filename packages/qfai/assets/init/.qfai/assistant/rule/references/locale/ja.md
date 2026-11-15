# Japanese locale (`ja`)

Read this file when the specification or `tech.md` states that the product's locale is Japanese. It lists what a Japanese product needs from its contracts and its code, so these points are settled once and not found one screen at a time as bugs.

Each locale has one file in this directory, named by its language tag (`ja.md`), with the headings this file uses. A heading that does not apply to a locale says so in one line.

Write each format below into the contract that owns the field or screen, and record the project's choices (the yen form, the era screens, the fonts) in root `DESIGN.md`. Implement each once in a shared helper or input component, listed in the component catalogue where the project has one, that every screen calls. A screen does not format a value or check an identifier on its own.

## Input normalisation

- Search and comparison use a key made with `value.normalize("NFKC")` on both sides: the stored value and the query. NFKC turns full-width Latin letters and digits (U+FF21 to U+FF3A, U+FF41 to U+FF5A, U+FF10 to U+FF19) into ASCII and half-width katakana (U+FF66 to U+FF9F) into full-width katakana.
- Store what the user typed and compare the normalised key. NFKC also rewrites characters such as the circled digit one (U+2460) to `1` and the parenthesised ideograph for a stock company (U+3231) to three characters, `(`, U+682A and `)`, which a display must not lose.
- NFKC does not change letter case and does not fold hiragana into katakana. Lower-case the key with `toLowerCase()` after NFKC. Where a hiragana letter must match its katakana (U+3042 and U+30A2, for example), map hiragana U+3041 to U+3096 to katakana by adding 0x60 to each code point, on both sides.
- Trim the normalised key. A browser's `trim()` removes the full-width space U+3000 either way, but SQL `TRIM` and many server-side trims remove only ASCII spaces; NFKC turns U+3000 into an ASCII space first, so every trim treats it alike.
- A database search applies the same key. Store it in its own column, or normalise in the query the same way; do not normalise only in the browser.

## IME composition

Japanese is typed through an input method: the user types kana, converts it, and presses Enter to confirm the conversion. That Enter is part of typing, not a submit.

- A `keydown` handler that acts on Enter returns early while `event.isComposing` is true. Safari reports `isComposing` as false on the Enter that ends a composition, so also return when `event.keyCode === 229`. In React, read `event.nativeEvent.isComposing`.
- A handler that reacts to each input, such as an incremental search or validation, waits for `compositionend` before using the value, or ignores `input` events while `isComposing` is true and runs once more on `compositionend`: the last `input` event of a composition still reports `isComposing`, so skipping it alone loses the confirmed text.
- A single-line field inside a `<form>` submits on Enter by default. Where the screen submits by Enter, test the confirming Enter with an IME on the browsers the product supports.

## Currency and numbers

- Format yen with `new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" })`. JPY has no minor unit, so the output has no decimal places; do not store or show sen. The symbol is the full-width yen sign U+FFE5, not U+00A5, which a test or snapshot must match.
- Many business screens show amounts as a number followed by the yen character U+5186. Where the contract chooses that form, format the number with `new Intl.NumberFormat("ja-JP")` and append U+5186. The contract names one form and every screen uses it.
- Keep money in integers of yen. Round tax with the rule the contract states (round down, round half up or round up) at the point the contract states, per line or per invoice.
- `notation: "compact"` with `ja-JP` groups large numbers by ten thousand (U+4E07) and a hundred million (U+5104). Use it only where the contract allows an approximate figure.
- Parse a typed amount after NFKC, then remove the grouping commas. Reject what is still not a whole number.

## Dates and eras

- Format dates with `Intl.DateTimeFormat` and the `ja-JP` locale, for example `{ dateStyle: "long" }` for 2026, U+5E74, 11, U+6708, 15, U+65E5 (year, month and day marks after each number). Do not build date strings by hand per screen.
- Set `timeZone: "Asia/Tokyo"` where a date is shown or a day boundary is computed. A server or CI runtime is often in UTC, and a time near midnight then falls on the wrong day.
- Japanese era years use the locale `ja-JP-u-ca-japanese` with `{ era: "long", year: "numeric" }`, which formats 2026 as the Reiwa era name (U+4EE4 U+548C), 8 and the year mark U+5E74. The first year of an era prints as `1` or as the character U+5143 depending on the runtime; where the product shows U+5143 for the first year, test it on the target runtime.
- An era date the user types is converted to a Gregorian date before it is stored. Store dates in ISO 8601 and convert only for display.
- The contract states which screens show era years. A government form often requires them; most other screens do not.

## Identifier fields

Every identifier field accepts full-width digits and full-width hyphens: normalise with NFKC first, then check. NFKC does not turn U+2212 (minus sign), U+2010 to U+2015 (dashes) or U+30FC (prolonged sound mark) into an ASCII hyphen, so an identifier field maps those to `-` itself before it checks the value. Store the digits in one canonical form and format them for display.

- **Postcode.** Seven digits, shown as `NNN-NNNN`. Accept the value with or without the hyphen, and store the seven digits.
- **Phone number.** A domestic number starts with `0` and has 10 or 11 digits: 11 for `070`, `080` and `090` mobile, `050` IP, `0800` free dial and `020` numbers. Check the length only. Where the hyphens go depends on the length of the area code, so store digits only and do not reject a value because of where its hyphens are.
- **Corporate number.** Thirteen digits; the first digit is a check digit over the other twelve. Number the twelve digits `n = 1` to `12` from the rightmost. The check digit is `9 - (sum of digit_n * (n is odd ? 1 : 2)) mod 9`. For example, `7000012050002` is valid.
- **Qualified invoice registration number.** `T` followed by thirteen digits; for a corporation the digits are its corporate number. Accept a lower-case or full-width `T`: normalise with NFKC, then upper-case the leading letter, and check the digits as a corporate number when the registrant is a corporation.

Write each field's accepted input, stored form, display form and error message into its contract.

## Line breaking

Japanese has no spaces between words, and a browser may break a line between any two characters. A long label then wraps in the middle of a word, most visibly on a 375 px screen.

- Set `lang="ja"` on the document or the element. It selects Japanese glyphs for kanji shared with Chinese and enables the phrase rule below.
- Use `word-break: auto-phrase` where the browser supports it, inside `@supports (word-break: auto-phrase)`. It breaks only between phrases, and only in `lang="ja"` content.
- Where it is not supported, split short texts such as headings, buttons and labels with `new Intl.Segmenter("ja", { granularity: "word" })`, put a `<wbr>` between the segments, and set `word-break: keep-all` so the line breaks only there. `Intl.Segmenter` has no phrase granularity, so a particle can still start a line; this is acceptable for labels. Leave long body text to the browser.
- Add `overflow-wrap: anywhere` where `keep-all` is set, so a long run with no break point, such as a URL or a part number, does not overflow its box.
- `line-break: strict` keeps small kana and the prolonged sound mark from starting a line. Use it for body text.
- Check every screen with long Japanese labels at 375 px wide.

## Line height

- Kanji and kana fill the whole em box, so text set at a Latin line height looks cramped. Set body text near `line-height: 1.7`. The W3C Requirements for Japanese Text Layout describe a usual gap between lines of half to the whole character size, which is a line height of 1.5 to 2.
- Headings and compact table cells may go lower, near 1.4. Do not go below the size at which descenders of mixed Latin text touch the next line.
- Do not set a negative `letter-spacing` on Japanese text.

## Fonts

- A Japanese font holds thousands of glyphs and is several megabytes as one file. Never load it as one file on a page.
- Load only subsets: Google Fonts serves Noto Sans JP as many files, each with a `unicode-range`, so the browser downloads only the ranges a page uses. A self-hosted font is split the same way, with one `@font-face` per range.
- Set `font-display: swap` on every `@font-face`, so text renders in a fallback font at once and is replaced when the web font arrives.
- Request only the weights the design uses; a static font adds a set of files for each weight.
- After the face `DESIGN.md` chooses, give a fallback stack that covers Japanese on each platform, for example `"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic Medium", "Yu Gothic", Meiryo, sans-serif`. Plain `"Yu Gothic"` renders thin on Windows at weight 400, so the medium face comes before it.
- Text the user enters can contain any character, so a subset made only from the characters in the page's own copy is used only for that copy, never for user content.
