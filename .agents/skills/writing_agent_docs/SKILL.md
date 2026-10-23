---
name: writing_agent_docs
description: >-
  How to write and edit documents agents read in excited.live: AGENTS.md, skills under
  .agents/skills, skill descriptions, and plan files. Covers what belongs in always-loaded context,
  how to word a trigger, progressive disclosure, and how to prove a skill change works. Use this
  skill when creating or editing a skill, changing AGENTS.md, or encoding a lesson after a run.
---

# Writing Agent Docs

Every line in AGENTS.md and every skill description is read on every turn by every agent. Make each line change behavior, or cut it.

---

## 1. Where material belongs

Rank material by how often an agent needs it, and push it as far down as it can go:

1. **AGENTS.md**: hard rules and pointers only. The rules every task must obey (branching, secrets, done criteria) and one line per skill saying when to load it.
2. **Skill description**: what the skill is and the distinct situations that should trigger it. It is always loaded, so it is a pointer, not a summary.
3. **SKILL.md body**: steps and rules the agent needs once the skill fires.
4. **`references/` inside the skill**: inventories, tables, long examples that only some branches need.

A mechanical rule (a banned import, a file-location rule, a format) belongs in a lint rule, test, or script, not prose. ESLint already enforces no raw HTML; follow that pattern. Prose is for judgment calls no check can make.

Leave out what the environment already says: `package.json` scripts, config values, directory listings. Restating them creates a copy that goes stale. Write down what nobody can discover by looking: the unwritten convention, the reason behind a choice, the gotcha.

## 2. Writing a trigger

The description decides when a skill loads. Its wording matters more than its body.

- Lead with the subject (`How excited.live builds, tests, and deploys...`), then `Use this skill when ...`.
- One trigger per distinct situation. Synonyms for the same situation are one trigger.
- Name the paths and words an agent will actually see in the task: `packages/tax`, `en/th strings`, "run until done".

## 3. Writing the body

- **Steps end in a checkable criterion.** "Every modified model accounted for" beats "review the models". A fuzzy end invites the agent to stop early.
- **State the target, not the ban.** "Write one-line comments that explain why" works better than "don't write long comments". Keep a prohibition only for a hard guardrail, and pair it with what to do instead.
- **One meaning, one place.** If two skills need the same rule, one owns it and the other points at it. Duplicates drift apart.
- **Cut no-ops.** A sentence the model already obeys by default ("be careful", "write good code") costs tokens and changes nothing. Delete the whole sentence.
- **Exact paths and copy-pasteable commands.** House voice: English, plain, no em-dashes, no filler.
- **Keep it short.** Past roughly 300 lines, split by branch into `references/` or a second skill.

## 4. Adding or changing a skill

1. Create `.agents/skills/<snake_case_name>/SKILL.md`. The directory name and the frontmatter `name` match.
2. Run `pnpm sync:skills` to link it into `.claude/`, `.gemini/`, `.antigravity/`, and `.opencode/`. Commit the new symlinks.
3. Add its one-line trigger to the skill list in AGENTS.md and to `.agents/skills/README.md`.
4. Prove it: start a fresh agent session on a task the skill should catch and check that it loads the skill and follows the steps. A skill nobody has run is a draft. For a change meant to fix a past failure, replay that task.

## 5. Encoding a lesson

After a correction, a review finding, or a bug that a rule could have prevented:

- Decide whether it is mechanical (encode as a check) or judgment (edit the matching skill).
- Edit the existing skill that owns the area before creating a new one.
- Never weaken a safety rule (engine purity, no raw HTML, secrets, deploy gates) to make a task pass. Fix the code or the process, then update the skill to match.
- Remove instructions that turned out stale or wrong in the same edit. Stale lines are worse than missing ones.
