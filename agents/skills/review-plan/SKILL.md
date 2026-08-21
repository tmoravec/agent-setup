---
name: review-plan
description: Review an implementation plan created by /prd-plan. Validates the plan for correctness, completeness, feasibility, and actionability so that /implement can execute it successfully.
---

# Plan Review Skill

Review an implementation plan to catch problems **before** implementation begins.

## Usage

Provide the plan file path or name:

```
/review-plan plans/user-authentication.md
/review-plan user-authentication
```

## Why This Exists

A plan is the contract between the planner and the implementer. A flawed plan leads to wasted work, wrong code, or an incomplete feature. This review acts as a quality gate between `/prd-plan` and `/implement`.

## Instructions

### 1. Load the Plan

If a file path is provided, read it directly. If just a name is provided, look for `plans/<name>.md`.

Read the entire plan file before doing anything else.

### 2. Re-read the Codebase

Do **not** trust the plan's context summary blindly. Independently verify it:

- Read the files listed in the "Context Files" section. Do they exist? Does the plan's description of them match reality?
- Check that the project structure, tech stack, and conventions described in the plan are accurate.
- Look for important files or patterns that the plan **missed**.

This is the foundation. If the context is wrong, everything built on it is suspect.

### 3. Evaluate the Plan

Assess each of the following dimensions. For every issue found, note it with a severity level.

#### 3a. Original Request Coverage

- Re-read the "Original Request" in the plan.
- Does the plan fully address every part of the request?
- Are there requirements that were dropped, misunderstood, or only partially covered?

#### 3b. Approach Feasibility

- Is the technical approach compatible with the existing codebase (framework, language version, architecture patterns)?
- Are proposed new dependencies real, maintained, and version-compatible?
- Is there unnecessary complexity? Could a simpler approach work?
- Are there breaking changes? Are they acknowledged and handled?

#### 3c. TODO Quality

This is the most important section. The TODO list is what `/implement` will execute line by line.

**Actionability**: Each TODO must be concrete enough that an implementer can start writing code immediately. Flag any TODO that is vague, hand-wavy, or requires the implementer to make significant design decisions.

- ❌ Bad: "Set up authentication"
- ✅ Good: "Create `src/auth/middleware.ts` exporting a `verifyJwt` middleware that extracts the Bearer token from the Authorization header and verifies it using `jsonwebtoken`"

**Correct ordering**: Walk through the TODOs in sequence. Can each one be completed given only the work done by previous TODOs? Flag dependency violations.

**Completeness**: Mentally execute all the TODOs in order. Does the result fully implement the feature? Look for gaps:
- Missing setup steps (install dependencies, create directories, run migrations)
- Missing integration steps (hooking new code into existing entry points, routers, configs)
- Missing cleanup steps (removing old code, updating imports)
- Missing export/registration steps (new modules not wired into the app)

**Granularity**: Each TODO should be roughly one logical unit of work — not a one-liner, not a whole subsystem. Flag TODOs that are too coarse (need to be split) or too fine (noise).

**No contradictions**: Do any TODOs conflict with each other or with the high-level approach?

#### 3d. Files Table Accuracy

- Does the "Files to Create/Modify" table match the TODOs? Are there TODOs that touch files not listed in the table, or vice versa?
- Are the file paths plausible given the project structure?

#### 3e. Testing Strategy

- Are test cases concrete and specific, not just "test the module"?
- Do they cover error paths and edge cases, not just happy paths?
- Can the tests actually be run with the project's existing test infrastructure?
- Are test file locations consistent with the project's conventions?

#### 3f. Ambiguity and Unresolved Decisions

- Are there places where the plan says "we could do X or Y" without deciding?
- Are there unstated assumptions that the implementer would have to guess about?
- The implementer needs a **decisive** plan with no open questions.

#### 3g. Structural Conformance

Does the plan follow the expected template that `/implement` relies on?

Required sections:
- Original Request
- Context Summary
- High-Level Implementation Plan (with Overview, Approach, Key Components)
- TODO List (with `- [ ]` checkboxes)
- Testing Strategy
- Files to Create/Modify (table)
- Context Files

Flag any missing sections.

#### 3h. External Assumptions

The plan's approach usually rests on beliefs about things outside the codebase: third-party API behaviour, response shapes, auth flows, library capabilities in the installed version. These are the most expensive assumptions to get wrong — code built on them fails late, during implementation or after.

Surface these assumptions **yourself**, by reading the approach and TODOs — do not rely on the plan to declare them. For each load-bearing assumption:

1. **Probe it if cheap** (a minute or two of effort): a scratch script or one-liner run via Bash (`python -c`, `node -e`, curl against the real endpoint), or reading the installed package's actual source and types (`node_modules/`, `site-packages/`). Never use production credentials or make calls with side effects.
2. **Record the evidence**: what you ran, what came back. An unverified ✅ is worthless.
3. **If it can't be verified at review time** (needs credentials, has side effects, rate limits): do **not** silently pass it. Flag it as a risk and recommend a spike TODO that verifies the assumption *first*, before any code builds on it.

Severity guide: a contradicted assumption is 🔴 Critical. An unverifiable load-bearing assumption with no spike TODO ordered before its dependents is 🟠 Major.

### 4. Output

Write the review to a markdown file at `reviews/<plan-name>-review.md` (derive the name from the plan file).

Use this structure:

```markdown
# Plan Review: [Plan Name]

**Date**: [Date]
**Plan file**: [Path to the plan file]
**Original request**: [Copied from the plan]

## Verdict

[One of: ✅ **Ready to implement**, ⚠️ **Needs revision**, or 🛑 **Major rework needed**]

[2–4 sentence summary: overall quality, main strengths, main risks.]

## Findings

### 🔴 Critical

Issues that will cause implementation to fail or produce wrong results.

- **[Section/TODO]**: [Description of the problem]
  **Impact**: [What goes wrong if this isn't fixed]
  **Fix**: [Concrete suggestion]

### 🟠 Major

Issues that will cause significant problems or wasted effort.

- **[Section/TODO]**: [Description]
  **Fix**: [Suggestion]

### 🟡 Minor

Small improvements that would make the plan clearer or more robust.

- **[Section/TODO]**: [Description]
  **Fix**: [Suggestion]

### 🟢 Strengths

What the plan does well.

- [Observation]

## Context Verification

| Claim in plan | Verified? | Notes |
|---------------|-----------|-------|
| [Claim 1]     | ✅ / ❌   | [Details] |

## External Assumptions

Load-bearing assumptions about external APIs and libraries, surfaced independently from the plan:

| Assumption | Verdict | Evidence / how checked |
|------------|---------|------------------------|
| [e.g. "the API returns paginated results with a `next_cursor` field"] | ✅ verified / ❌ contradicted / ⚠️ untestable | [command run + what came back, or why it couldn't be tested] |

## TODO Walkthrough

A step-by-step assessment of the TODO list:

| # | TODO | Actionable? | Correctly ordered? | Notes |
|---|------|-------------|-------------------|-------|
| 1 | [Brief TODO text] | ✅ / ❌ | ✅ / ❌ | [Issues if any] |

## Missing Steps

Steps that should be added to the TODO list:

- [Missing step 1]
- [Missing step 2]

## Recommendations

[Prioritised list of changes the planner should make before handing this to `/implement`.]
```

After writing the review file, print its path and the **Verdict** section.
