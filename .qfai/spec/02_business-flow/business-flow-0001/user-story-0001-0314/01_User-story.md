# US-0001-0314: Settle what a Japanese product needs from one locale reference

## User Story

As a project lead building a product whose locale is Japanese, I want the contract and implementation steps to read one locale reference, so that input normalisation, IME composition, yen and date formats, identifier fields, line breaking, line height and font loading are settled once and not found one screen at a time as bugs.

## Non-goals

- Locales other than Japanese; the reference's shape leaves room for them.
- A validate finding for a contract that lacks a locale format.
