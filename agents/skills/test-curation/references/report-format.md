# Curation report format

The report is read by another AI agent that will execute it. Optimise for mechanical actionability: exact identifiers, one verdict per line, machine-greppable structure. Use this exact template.

````markdown
# Test curation report

- **Generated:** <ISO date>
- **Scope:** <whole suite | paths audited>
- **Runner:** <e.g. pytest 8.x; identifier format: pytest node IDs>
- **Suite status at audit time:** <passing / failing, count>

## Summary

| Module | KEEP | DELETE | REFACTOR | INVESTIGATE | Total |
|---|---|---|---|---|---|
| <module> | n | n | n | n | n |
| **Total** | n | n | n | n | n |

## Verdicts

One `### <module path>` section per module. Within it, one entry per test:

### tests/parser/test_tokenizer.py

- `tests/parser/test_tokenizer.py::test_init_sets_buffer` — **DELETE** — asserts constructor stores argument in private field; behaviour covered via `test_parse_roundtrip`. <!-- verdict:DELETE -->
- `tests/parser/test_tokenizer.py::test_parse_calls_tokenize_once` — **DELETE** — mock choreography only (`assert_called_once_with`), no behavioural assertion; sole caller behaviour covered by `test_parse_roundtrip`. <!-- verdict:DELETE -->
- `tests/parser/test_tokenizer.py::test_parse_roundtrip` — **KEEP** — public API contract, exercises full parse/serialise cycle. <!-- verdict:KEEP -->
- `tests/parser/test_tokenizer.py::test_unicode_a` / `_b` / `_c` — **REFACTOR** — three copies differing in one literal; collapse into one parameterised test on `parse()`, drop the tokenizer mock. <!-- verdict:REFACTOR -->
- `tests/parser/test_tokenizer.py::test_trailing_comma_accepted` — **INVESTIGATE** — asserts trailing commas parse silently; spec is silent on this. Question for human: is trailing-comma tolerance intended API, or an implementation accident to stop guaranteeing? <!-- verdict:INVESTIGATE -->

Rules for entries:
- Identifier must be exact and runner-executable (copy-paste into the runner selects that test).
- Verdict in bold, one of the four values, nothing else.
- The trailing HTML comment `<!-- verdict:X -->` duplicates the verdict for trivial grepping; keep it on every entry.
- Justification: one line, cites the specific assertion/pattern, names remaining coverage or says "sole coverage".
- REFACTOR entries include the replacement sketch in the same line or an indented follow-up line.
- INVESTIGATE entries end with an explicit question a human can answer yes/no or in one sentence.

## Coverage risk

Behaviours that lose their only test if all DELETEs are applied. Should normally be empty (such tests must be downgraded to REFACTOR); if non-empty, explain why deletion is still correct.

## Execution order

Numbered steps for the applying agent, e.g.:

1. Delete all DELETE verdicts in `tests/parser/` — 1 commit, run suite.
2. Delete all DELETE verdicts in `tests/api/` — 1 commit, run suite.
3. Apply REFACTOR for unicode tests in `tests/parser/test_tokenizer.py` — 1 commit, verify replacement fails under deliberate breakage.
4. INVESTIGATE items — blocked on human answers listed above; do not apply.

## Skipped / anomalies

Tests that could not be classified (unreadable, generated at runtime, flaky) with reason.
````

Formatting constraints:
- No hedged verdicts ("probably DELETE"). Uncertainty means INVESTIGATE.
- No entry without an identifier. No identifier without a verdict.
- Keep justifications to one line; the applying agent does not need an essay, the human reviewer skims.
