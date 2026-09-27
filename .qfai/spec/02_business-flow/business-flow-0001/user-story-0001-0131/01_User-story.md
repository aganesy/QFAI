# US-0001-0131: Shadow-property color scan exclusion

## User Story

As a designer, I want `--*-shadow*:` custom-property declarations carrying `rgba()` literals stripped before color scanning, so that shadow-token CSS does not produce false `designMdViolations[]`.
