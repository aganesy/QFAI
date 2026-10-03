# When a Fact Lookup Fails

- `unavailable`: stop dispatching lookups and read what can be read directly,
  under the baseline's sanctioned exception for a read-only fact lookup
  (`.qfai/assistant/rule/shared-skill-delegation-baseline.md`). This is
  not an override of the hard stop — the exception is what permits it, and it
  permits reading only. Report the class, report every fact that stayed unread,
  and hold the decisions downstream of it open rather than asking the user for
  it.
- `saturated`: use the baseline's bounded retry branch. The session stays open.
- Do not simulate roles. An agent that answers a dispatched lookup out of its
  own recollection has recorded a guess as a fact, which the frontier then
  treats as settled.
