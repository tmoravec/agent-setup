---
name: test-curation
description: Audit a test suite and produce a machine-actionable curation report (KEEP / DELETE / REFACTOR / INVESTIGATE per test) in reviews/. Built for codebases developed red-green (TDD) or with heavy AI generation, where scaffolding tests outnumber durable behavioural tests. Use this skill whenever the user asks to review, audit, clean up, prune, curate, or "delete pointless" tests, complains about brittle or excessive tests, mentions TDD scaffolding or AI-generated test bloat, or asks which tests to keep or remove — even if they don't say "curation". Also use it when applying a previously generated curation report.
---

# Test Curation

Classify every test in the codebase as a durable behavioural contract or disposable scaffolding, and write a report that a downstream AI agent can execute mechanically. This skill has two modes: **audit** (produce the report) and **apply** (execute an existing report). Default to audit unless the user points at an existing report.

Core principle: tests written during red-green development fall into two populations. Contract tests encode behaviour someone would notice breaking; scaffolding tests were useful while writing the code but now only add maintenance cost, CI time, and noise. Worse, coding agents read tests as the spec, so implementation-coupled tests teach future agents to preserve accidents. The suite that survives curation is part of the prompt for every future agent.

The single most useful heuristic: **would this test fail under a correct, behaviour-preserving refactor?** If yes, it is never KEEP.

## Audit mode

Do NOT modify or delete any test during audit. The only write is the report.

### 1. Map the suite

Identify test frameworks, runner configuration, directory layout, total test count, and any coverage or mutation-testing config already present. Record the exact test identifier format the runner uses (pytest node IDs, Jest `describe > it` paths, JUnit FQNs, Go `TestX` names). Every entry in the report uses these identifiers verbatim, because the applying agent will pass them straight to the runner or grep for them.

If mutation-testing output exists (mutmut cache, Stryker report, pitest report), read it. "Kills no mutants" is the strongest DELETE evidence available; cite it where applicable.

### 2. Classify module by module

Read the code under test, not just the tests. You cannot distinguish an intended contract from an implementation accident without seeing what the implementation promises publicly.

Assign exactly one verdict per test:

- **KEEP** — encodes a behavioural contract: public API behaviour, documented invariants, edge cases, error handling, regression tests tied to real bugs, integration seams between modules or services.
- **DELETE** — scaffolding. Signs: asserts internal call order or mock choreography; mirrors the implementation line by line; tests private functions already covered through the public API; asserts trivialities (constructor sets field, getter returns value); duplicates another test with no added coverage; fails under correct refactors.
- **REFACTOR** — tests a real contract badly: over-mocked, coupled to internal structure, asserting incidental details (exact log strings, dict ordering), or near-duplicates that should collapse into one parameterised test. Include a one-to-two-sentence replacement sketch.
- **INVESTIGATE** — the asserted behaviour might be intended or might be an accident of the implementation; you cannot tell. State the specific question a human must answer.

Watch for these red-green / AI-generation smells specifically:

- one test per line of implementation
- mock-verification chains (`assert_called_once_with` and friends) with no behavioural assertion
- copy-paste test triplets differing in a single literal
- tests asserting current quirky or buggy behaviour that was never a requirement (INVESTIGATE, not KEEP)
- tautological tests that restate the implementation

### 3. Evidence rules

Every DELETE and REFACTOR verdict cites the specific assertion or pattern that justifies it, and names what still covers the behaviour (or states "sole coverage"). Never mark a test DELETE when it is the sole coverage of real behaviour; downgrade to REFACTOR and say what the replacement asserts. Do not soften verdicts to be diplomatic: the report is reviewed before anything is applied, so a wrong KEEP costs more than a wrong DELETE flag.

### 4. Write the report

Write to `reviews/test-curation-report.md` (create `reviews/` if absent; if the file exists, append a date suffix, e.g. `test-curation-report-2026-08-01.md`). The report is consumed by another AI agent, so it must be unambiguous and mechanically executable: exact runner-format test identifiers, exact file paths, one verdict per test, no hedging in verdicts, no prose that requires interpretation to act on. Follow the exact structure in [references/report-format.md](references/report-format.md).

After writing, tell the user the headline numbers (counts per verdict, coverage risks found) and where the report is.

## Apply mode

When asked to apply a curation report (e.g. "apply the DELETE verdicts from reviews/test-curation-report.md"):

1. Read the report and confirm the suite passes before touching anything.
2. Follow the report's **Execution order** section. Default order: bulk DELETEs first (one module per commit), REFACTORs second (one refactor per commit, suite green after each), INVESTIGATE items never — those wait for a human answer.
3. After each module's deletions, run the suite. After each refactor, run the suite and confirm the new test fails when the behaviour it guards is deliberately broken (mutate, run, revert) — a replacement test that cannot fail is scaffolding with better manners.
4. Do not apply verdicts absent from the report, and do not reinterpret verdicts. If a report entry no longer matches the codebase (test renamed or already deleted), skip it and list all skipped entries at the end.

## Scope notes

- Large suites: audit module by module and write the report incrementally, so partial progress survives interruption.
- If the user names a subdirectory or module, restrict the audit to it but still read enough of the surrounding code to judge contracts.
- This skill judges unit and integration tests. Leave end-to-end and smoke suites alone unless the user includes them explicitly.
