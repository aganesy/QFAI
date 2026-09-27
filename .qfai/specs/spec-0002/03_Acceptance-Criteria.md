# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0002-0001
Scenario: discussion-pack が 15 必須ファイルを含む
  Given discussion-pack ディレクトリが存在する
  When 必須ファイルを検証する
  Then 01_Context.md から 99_delta.md までの 15 ファイルが存在する
```

```gherkin
# AC-0002-0008
Scenario: discussion ranks no screen exploration
  Given a UI-bearing discussion pack
  When its discussion artifacts are inspected
  Then neither a selected screen exploration nor a finalized design system is a discussion completion condition
  And the only direction discussion records is the brand direction the user chose
```

```gherkin
# AC-0002-0009
Scenario: 非 UI パックは sidecar requirement をバイパスする
  Given non-UI discussion pack
  When discussion completion を検証する
  Then UI sidecar 欠落だけではエラーにならない
```

```gherkin
# AC-0002-0010
Scenario: prototyping.yaml is optional for a pack with a visual prototyping surface
  Given the shipped discussion README and skill contract
  When their wording for `prototyping.yaml` is inspected
  Then they offer it as optional to a pack whose surfaces include web, mobile, desktop or mixed
  And they say a cli-only pack carries none
```

## AC Catalog (optional)

| AC-ID        | Title                                 | Notes    | Priority |
| ------------ | ------------------------------------- | -------- | -------- |
| AC-0002-0001 | 15 必須ファイル                       | REQ-0001 | P1       |
| AC-0002-0008 | planner-first / explorations unranked | REQ-0012 | P1       |
| AC-0002-0009 | non-UI safe skip                      | REQ-0005 | P1       |
| AC-0002-0010 | prototyping.yaml optionality text     | REQ-0005 | P1       |

> v1.8.9: AC-0002-0002..0007 (the legacy exploration-sidecar / OQ-blocker
> behaviors proven by the now-retired `discussionDesignHardening` validator)
> were superseded by DESIGN.md-driven equivalents now owned by the post-1.8.9
> prototyping spec, and have been removed from this active AC catalog
> together with the corresponding TC / TDD ledger rows.
