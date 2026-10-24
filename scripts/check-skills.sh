#!/usr/bin/env bash
set -euo pipefail

# Read-only companion to sync-skills.sh. Fails when the skill surface has drifted:
# a canonical skill is malformed, a harness folder holds real content instead of a
# symlink, or a harness is missing a skill. Never writes; repair with `pnpm sync:skills`.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL_DIR="${REPO_ROOT}/.agents/skills"

# Must match TARGET_DIRS in sync-skills.sh. `.codex/` is intentionally absent: Codex
# reads AGENTS.md and .codex/config.toml, and has no skills folder.
TARGET_DIRS=(
  ".claude/skills"
  ".gemini/skills"
  ".antigravity/skills"
  ".opencode/skills"
)

errors=0
fail() {
  printf 'FAIL %s\n' "$1" >&2
  errors=$((errors + 1))
}

if [ ! -d "${CANONICAL_DIR}" ]; then
  echo "Error: canonical skills directory ${CANONICAL_DIR} not found." >&2
  exit 1
fi

SKILLS=()
for skill_dir in "${CANONICAL_DIR}"/*; do
  [ -d "${skill_dir}" ] || continue
  name="$(basename "${skill_dir}")"
  skill_md="${skill_dir}/SKILL.md"

  if [ ! -f "${skill_md}" ]; then
    fail ".agents/skills/${name} has no SKILL.md"
    continue
  fi

  # Frontmatter must be the first block, and carry name and description.
  if ! head -1 "${skill_md}" | grep -qx -- '---'; then
    fail ".agents/skills/${name}/SKILL.md does not start with frontmatter"
  else
    frontmatter="$(awk 'NR==1{next} /^---[[:space:]]*$/{exit} {print}' "${skill_md}")"
    declared="$(printf '%s\n' "${frontmatter}" | sed -n 's/^name:[[:space:]]*//p' | head -1 | tr -d '"'"'"'')"
    description="$(printf '%s\n' "${frontmatter}" | sed -n 's/^description:[[:space:]]*//p' | head -1)"
    if [ -z "${declared}" ]; then
      fail ".agents/skills/${name}/SKILL.md has no name in frontmatter"
    elif [ "${declared}" != "${name}" ]; then
      fail ".agents/skills/${name}/SKILL.md declares name: ${declared}"
    fi
    if [ -z "${description}" ]; then
      fail ".agents/skills/${name}/SKILL.md has no description in frontmatter"
    fi
  fi

  SKILLS+=("${name}")
done

if [ "${#SKILLS[@]}" -eq 0 ]; then
  fail "no canonical skills found under .agents/skills"
fi

for target_rel in "${TARGET_DIRS[@]}"; do
  target_full="${REPO_ROOT}/${target_rel}"
  expected_source="../../.agents/skills"

  if [ ! -d "${target_full}" ]; then
    fail "${target_rel} is missing; run pnpm sync:skills"
    continue
  fi

  # Everything in a harness folder must be a symlink into .agents/skills.
  for entry in "${target_full}"/*; do
    [ -e "${entry}" ] || [ -L "${entry}" ] || continue
    entry_name="$(basename "${entry}")"
    if [ ! -L "${entry}" ]; then
      fail "${target_rel}/${entry_name} is real content, not a symlink"
      continue
    fi
    resolved="$(readlink "${entry}")"
    case "${resolved}" in
      ../../.agents/skills/*) ;;
      *) fail "${target_rel}/${entry_name} points at ${resolved}" ;;
    esac
    if [ ! -d "${entry}" ]; then
      fail "${target_rel}/${entry_name} is a dangling symlink"
    fi
  done

  # Every canonical skill must be reachable from every harness.
  for skill in "${SKILLS[@]}"; do
    if [ ! -L "${target_full}/${skill}" ]; then
      fail "${target_rel}/${skill} missing; run pnpm sync:skills"
    fi
  done
done

# No secrets in harness configs. Names only, never values.
for config in .mcp.json opencode.json .codex/config.toml .gemini/mcp_config.json .antigravity/mcp_config.json .claude/settings.local.json; do
  config_path="${REPO_ROOT}/${config}"
  [ -f "${config_path}" ] || continue
  if grep -nEi '"(api[_-]?key|token|secret|password)"[[:space:]]*:[[:space:]]*"[^"]{8,}"|Bearer [A-Za-z0-9._-]{16,}' "${config_path}" >/dev/null 2>&1; then
    fail "${config} appears to contain a credential value"
  fi
done

if [ "${errors}" -gt 0 ]; then
  printf '\n%d skill-surface problem(s). Fix or run pnpm sync:skills.\n' "${errors}" >&2
  exit 1
fi

printf 'OK %d skills, %d harnesses, no drift.\n' "${#SKILLS[@]}" "${#TARGET_DIRS[@]}"
