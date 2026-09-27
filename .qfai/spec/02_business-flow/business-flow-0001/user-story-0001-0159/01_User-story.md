# US-0001-0159: UI contract `primary_tasks` slot per screen

## User Story

As a requirements analyst authoring UI contracts during `/qfai-sdd`, I want the shipped `ui-contract.sample.yaml` template to carry a `primary_tasks: []` slot on every `screens[]` entry and the requirements-analyst agent guide to tell me to fill at least one primary task per screen, so that `/qfai-prototyping` always has explicit primary-task semantics and a validate lane stops it from starting on a UI contract whose `primary_tasks` is empty.
