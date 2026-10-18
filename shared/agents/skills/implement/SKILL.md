---
name: implement
description: Implement a plan from a markdown file created by /prd-plan. Reads the plan, executes TODO items, and implements the feature step by step.
---

# Implementation Skill

Execute an implementation plan created by the `/prd-plan` command using subagents.

## Usage

Provide the plan file path or name as an argument:

```
/implement plans/user-authentication.md
/implement user-authentication
/implement ./my-plan.md
```

## Instructions

This skill executes an implementation plan created by `/prd-plan`. Follow these steps:

### 1. Load the Plan

If a file path is provided, use the `Read` tool to read it directly. If just a name is provided, read `plans/<name>.md`.

### 2. Validate the Plan

Before starting:
- Confirm the plan file exists and is readable
- Check the TODO list is present and actionable
- Note any dependencies that need to be installed first

### 3. Execute TODOs Sequentially

Work through the TODO list in order:

1. **Check off each item as you complete it**
2. **Update the plan file** to mark TODOs as done: `- [x] Task`
3. **Follow the file modification table** for create/modify actions
4. **Implement tests** as outlined in the testing strategy
5. **Verify each step** before moving to the next

Use a subagent for generating the code.

### 4. Implementation Guidelines

When implementing:
- Follow existing code conventions observed in the codebase
- Match the architecture patterns used in the project
- Add appropriate error handling
- Include comments for complex logic
- Keep functions focused and testable

### 5. Testing

As you implement:
- Write tests alongside implementation (TDD style by default)
- Run existing tests to ensure no regressions
- Perform manual testing steps from the plan

### 6. Completion

When all TODOs are complete:
1. Run the full test suite
2. Perform final verification - review all the context from the plan if it has been addressed
3. Update the plan file with:
   - All TODOs checked off
   - Any deviations from original plan
   - Notes about challenges or changes
   - Date of completion

### 7. Output

Provide a summary of:
- What was implemented
- Files created/modified
- Tests added
- Any issues encountered
- Verification steps completed

---

**Usage Examples:**

```
/implement plans/user-authentication.md
/implement user-authentication
/implement ./my-plan.md
```

Start by reading the plan file and confirming the first TODO item to execute.
