# Run these in order inside Claude Code. Complete each phase fully before moving to the next.

# Between each prompt: run migrations if schema changed, test, update CLAUDE.md checklist.

# ── Confirmed Package Versions (from package.json) ──────────────────────────

# next: 16.1.7

# react: 19.2.3

# react-dom: 19.2.3

# next-auth: ^5.0.0-beta.30

# @auth/core: ^0.34.3

# drizzle-orm: ^0.45.1

# drizzle-kit: ^0.31.10

# mysql2: ^3.20.0

# pg: ^8.20.0

# ioredis: ^5.10.0

# zod: ^4.3.6

# zustand: ^5.0.12

# bcryptjs: ^3.0.3 / @types/bcryptjs: ^2.4.6

# @paralleldrive/cuid2: ^3.3.0

# @tanstack/react-query: ^5.90.21

# @tanstack/react-table: ^8.21.3

# @codemirror/lang-sql: ^6.10.0

# @codemirror/state: ^6.6.0

# @codemirror/view: ^6.40.0

# echarts: ^6.0.0

# echarts-for-react: ^3.0.6

# @dnd-kit/core: ^6.3.1

# @dnd-kit/sortable: ^10.0.0

# @dnd-kit/utilities: ^3.2.2

# sql-formatter: ^15.7.2

# tailwindcss: ^4

# typescript: ^5

# eslint: ^9 / eslint-config-next: 16.1.7

# dotenv-cli: ^11.0.0

# ALL packages are already installed — do NOT add npm install steps between prompts

# ─────────────────────────────────────────────────────────────────────────────

---

## Workflow Orchestration
### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
### 3. Self-Improvement Loop
- After ANY correction from the user: update `/prompts/lessons.md` with the pattern  (create if not exist yet)
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it
### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items  
2. **Verify Plan**: Check in before starting implementation  
3. **Track Progress**: Mark items complete as you go  
4. **Explain Changes**: High-level summary at each step  
5. **Document Results**: Add review section to `tasks/todo.md`  
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections  

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.  
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.  
- **Minimal Impact**: Only touch what's necessary. No side effects with new bugs.  

---

### After finishing a task

1. npm run dev — full end to end test:
   a. Register a user
   b. Create a database connection and test it
   c. Create a dataset from a table
   d. Build a chart from the dataset
   e. Create a dashboard and add the chart
   f. Add a filter and verify cross-filtering
   g. Publish the dashboard and verify public URL works
   h. ensure variables are strictly type and is a valid type
2. npm run lint — fix all warnings
3. npm run build — fix issues if there's any
4. Once finished, include description on before and after behavior of each feature added/fixed/refactored/planned
