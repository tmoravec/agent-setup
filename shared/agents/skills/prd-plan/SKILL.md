---
name: prd-plan
description: Create an implementation plan for a feature/task. Gathers context, plans implementation, breaks into TODOs, outlines testing, and writes to a markdown file ready for /implement.
---

# Planning Skill

Create a detailed implementation plan for a given task or feature.

## Usage

Provide the task description or feature request as an argument:

```
/prd-plan "Add user authentication with JWT tokens"
/prd-plan "Create a React component library"
```

## Instructions

Follow these steps to create a comprehensive implementation plan:

### 1. Context Gathering

First, explore the codebase to understand:
- **Project structure**: Identify the tech stack, main directories, and architecture patterns
- **Existing code**: Find relevant files, modules, or components that relate to the requested feature
- **Dependencies**: Note any libraries, frameworks, or external services already in use
- **Code conventions**: Observe naming patterns, file organization, and coding styles
- **Testing setup**: Check existing test frameworks, patterns, and TDD conventions used in the project

Use the `Glob`, `Grep`, and `Read` tools to explore the codebase thoroughly.

### 2. High-Level Plan

Create a clear, high-level implementation strategy covering:
- **Overview**: Brief description of what will be built
- **Approach**: The chosen technical approach and rationale
- **Test-driven development**: How tests will be written before implementation (Red-Green-Refactor cycle)
- **Key components**: Main modules/files that need to be created or modified
- **Integration points**: How this feature connects to existing code
- **Dependencies**: Any new libraries or services needed

### 3. TODO Breakdown

**Test-driven development is required.** For each feature or module, follow the TDD cycle:
1. Write a failing test first (Red)
2. Write the minimal code to make it pass (Green)
3. Refactor as needed (Refactor)

Create a detailed, actionable TODO list:
- Break down into small, concrete tasks
- Order tasks by dependency (what must be done first)
- Group related tasks logically
- Include file paths where known
- Mark prerequisites clearly
- **Always start with tests**: For each implementation task, include the corresponding test task before it

Use this format:
```
TODO list:

- [ ] Test Task 1: Write test for [feature]
- [ ] Task 1: Implement [feature]
- [ ] Test Task 2: Write test for [feature]
- [ ] Task 2: Implement [feature]
      - Sub-task if needed
- [ ] Task 3: Integrate [component]
```

### 4. Test-Driven Development Strategy

Outline the TDD workflow for this feature:
- **Test file locations**: Where tests should be placed (e.g., `__tests__/`, `.test.ts`, `*_test.py`)
- **Test naming conventions**: Follow project's existing patterns
- **Test structure**: Follow Arrange-Act-Assert (AAA) pattern
- **Red-Green-Refactor cycle**: Describe the TDD cycle for each module
- **Edge cases**: Identify boundary conditions and error scenarios to test
- **Mock/stub strategy**: How to handle external dependencies in tests

### 6. Testing Outline (Verification)

After implementation, verify correctness with:
- **Unit tests**: All tests should already be written (TDD)
- **Integration tests**: How to test component interactions
- **End-to-end tests**: If applicable, user flow testing
- **Manual testing**: Steps to verify manually if needed

### 7. Output

Write the complete plan to a markdown file at `plans/<feature-name>.md` (use kebab-case for the filename).

The plan file must include:

```markdown
# Implementation Plan: [Feature Name]

**Created**: [Date]
**Original Request**: [User request]

## Context Summary

[Brief summary of codebase context gathered]

## High-Level Implementation Plan

### Overview
[What will be built]

### Approach
[Technical approach and rationale]

### Test-Driven Development
[How tests will be written first following Red-Green-Refactor]

### Key Components
- [Component 1]: [Description and location]
- [Component 2]: [Description and location]

### Dependencies
- [Dependency 1]: [Purpose]
- [Dependency 2]: [Purpose]

## TODO List

**TDD Required**: Write tests first, then implementation.

- [ ] [Test Task 1]: Write test for [feature]
- [ ] [Task 1]: Implement [feature]
- [ ] [Test Task 2]: Write test for [feature]
- [ ] [Task 2]: Implement [feature]
...

## TDD Strategy

### Test Locations
- [Where tests will be placed]

### Test Patterns
- [Conventions to follow (e.g., AAA pattern)]

### Mock Strategy
- [How to handle external dependencies]

## Testing Verification

### Unit Tests
- [All tests should already exist from TDD]

### Integration Tests
- [How to test interactions]

### Manual Testing
1. [Step 1]
2. [Step 2]

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| path/to/file | Create | Test file for [feature] |
| path/to/file | Create | Implementation of [feature] |
| path/to/file | Modify | Description |

## Notes

[Any additional notes, considerations, or alternative approaches]

---

## Context Files (Auto-Generated)

The following files were examined during planning:

- [File path 1]: [Relevance]
- [File path 2]: [Relevance]
```

After writing the file, confirm its location and provide a brief summary of the plan.
