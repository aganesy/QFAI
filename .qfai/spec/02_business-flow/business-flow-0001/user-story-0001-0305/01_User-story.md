# US-0001-0305: Validate warns when tech.md names a catalogue no registry serves

## User Story

As an adopter whose agents procure screen components from a catalogue, I want `qfai validate` to warn when the Stack table of `tech.md` names a component catalogue while `qfai.config.yaml` declares no `uiux.registries` entry, so that a catalogue nobody set up is caught before a reviewer reads the screens.
