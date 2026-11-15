# US-0001-0313: A checkout that did not reinstall after a qfai upgrade is caught

## User Story

As a maintainer whose project pulled a qfai upgrade, I want every qfai command to say when the installed qfai is not the version the lockfile pins, and `workflow plan` and the gates to stop, so that no checkout runs the old version without saying so.
