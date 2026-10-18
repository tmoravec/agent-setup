---
name: codereview
description: Review code for quality, correctness, security, and maintainability. Examines a file, directory, or recent changes and produces a structured review report.
---

# Code Review Skill

Perform a thorough code review for a given file, directory, or set of changes. Do not make any changes or fix anything, only provide the code review as instructed below.

## Usage

Provide a file path, directory, or a description of what to review:

```
/codereview src/auth/login.ts
/codereview src/components/
/codereview "recent changes in the payment module"
```

## Instructions

Follow these steps to produce a comprehensive code review:

### 1. Understand the Scope

Determine what to review based on the argument:
- If a **file path** is given, read that file directly.
- If a **directory** is given, list its contents (recursively) and read all relevant source files.
- If a **description** is given, use your standard file discovery tools to locate the relevant files.
- If no argument is given, check for uncommitted changes: `git diff HEAD` or `git status`.

### 2. Gather Context

Before reviewing, understand the broader context:
- **Purpose**: What is this code supposed to do?
- **Dependencies**: What does it import or rely on?
- **Callers**: How and where is this code used? (use the `Grep` tool to find usages)
- **Tests**: Are there existing tests? Read them to understand expected behaviour.
- **Conventions**: Observe the coding style and patterns used elsewhere in the project.

### 3. Review Dimensions

Evaluate the code across these dimensions:

#### Correctness
- Does the code do what it is supposed to do?
- Are there logic errors, off-by-one errors, or incorrect conditionals?
- Are edge cases handled (empty inputs, nulls, large values, concurrent access)?
- Are errors and exceptions handled properly?

#### Security
- Are there injection vulnerabilities (SQL, command, XSS)?
- Is sensitive data (passwords, tokens, PII) handled and stored safely?
- Are inputs validated and sanitised before use?
- Are authentication and authorisation checks in place where needed?

#### Performance
- Are there unnecessary loops, redundant computations, or expensive operations in hot paths?
- Are database queries, network calls, or file I/O used efficiently?
- Are there obvious memory leaks or unbounded resource usage?

#### Maintainability
- Is the code readable and self-explanatory?
- Are functions and classes focused and appropriately sized?
- Is there duplication that could be extracted into shared utilities?
- Are names (variables, functions, types) clear and consistent with the rest of the codebase?
- Is complex logic explained with comments?

#### Completeness
- If a PRD, spec, architecture document, or ticket was provided, read it and check whether all requirements are implemented.
- Are there features, acceptance criteria, or described behaviours that are missing or only partially implemented?
- Are there TODO/FIXME/HACK comments or stubbed-out functions left in the code?
- Does the implementation match the intended design (e.g. API contracts, data models, component boundaries)?

#### Test Coverage
- Are the happy paths tested?
- Are edge cases and error paths tested?
- Are tests clear and maintainable?
- Is there anything that looks untestable due to poor structure?

### 4. Output Format

Write the review as a markdown file at `reviews/<descriptive-name>.md` (kebab-case).

The review file must follow this structure:

```markdown
# Code Review: [Subject]

**Date**: [Date]
**Reviewed**: [File(s) or scope reviewed]

## Summary

[2–4 sentence overall assessment: quality level, main strengths, main concerns.]

## Findings

### 🔴 Critical
Issues that must be fixed before this code ships (security holes, data loss bugs, broken logic).

- **[File:line]** [Description of the issue and why it matters]
  ```
  [Relevant code snippet if helpful]
  ```
  **Suggestion**: [How to fix it]

### 🟠 Major
Significant issues that should be addressed soon (error handling gaps, performance problems, poor security hygiene).

- **[File:line]** [Description]
  **Suggestion**: [How to fix it]

### 🟡 Minor
Small issues worth fixing (naming, readability, minor duplication, missing edge-case handling).

- **[File:line]** [Description]
  **Suggestion**: [How to fix it]

### 🔵 Completeness
Gaps between the code and any provided spec, PRD, or architecture document; unfinished stubs or TODOs.

- **[File:line or Requirement]** [What is missing or incomplete]
  **Suggestion**: [What still needs to be done]

### 🟢 Positive Observations
What the code does well — good patterns worth keeping or spreading.

- [Observation]

## Test Coverage Assessment

[Are the tests adequate? What is missing? Any suggestions for new test cases?]

## Recommendations

[Prioritised list of the most impactful next steps, if any.]

## Files Reviewed

| File | Lines | Notes |
|------|-------|-------|
| path/to/file | N | Brief note |
```

After writing the file, print its path and the **Summary** section so the user gets an immediate overview.
