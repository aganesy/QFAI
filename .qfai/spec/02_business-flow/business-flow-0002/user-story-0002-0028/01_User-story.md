# US-0002-0028: Relative links in the instruction tree resolve

## User Story

As a QFAI maintainer, I want the pull request lint lane to resolve every relative Markdown link under `.instruction/` and fail naming each link whose target no longer exists, so that deleting or moving a file the tree cites is caught before merge rather than by a reviewer who follows the link.

## Non-goals

- Checking prose or story-tree rows that name a file without linking to it.
- Checking whether the heading a link's fragment names exists.
- Checking links in Markdown outside `.instruction/`.
- Checking links with a URL scheme.
