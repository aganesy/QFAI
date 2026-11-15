# US-0001-0311: Check every route of the built app for accessibility

## User Story

As a project lead whose product has web screens, I want the built app checked for accessibility on every route the UI contracts declare, for each role that can reach it, so that a violation fails the verify gate instead of shipping unnoticed.

## Non-goals

- An accessibility dependency in QFAI itself: the axe packages belong to the adopting project.
- Automated checks of keyboard order or screen-reader names, which stay in the screen review.
