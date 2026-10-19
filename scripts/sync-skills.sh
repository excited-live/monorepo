#!/usr/bin/env bash
set -euo pipefail

# Directory where canonical skills live
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL_DIR="${REPO_ROOT}/.agents/skills"

if [ ! -d "${CANONICAL_DIR}" ]; then
  echo "Error: Canonical skills directory ${CANONICAL_DIR} not found." >&2
  exit 1
fi

# Target agent harnesses to support natively:
# - Claude Code: .claude/skills/
# - Antigravity CLI / Gemini: .gemini/skills/ and .antigravity/skills/
# - OpenCode: .opencode/skills/
TARGET_DIRS=(
  ".claude/skills"
  ".gemini/skills"
  ".antigravity/skills"
  ".opencode/skills"
)

# Skills to symlink (any directory containing SKILL.md under .agents/skills)
SKILLS=()
for skill_dir in "${CANONICAL_DIR}"/*; do
  if [ -d "${skill_dir}" ] && [ -f "${skill_dir}/SKILL.md" ]; then
    SKILLS+=("$(basename "${skill_dir}")")
  fi
done

echo "Found ${#SKILLS[@]} canonical skills in ${CANONICAL_DIR}:"
printf ' - %s\n' "${SKILLS[@]}"

for target_rel in "${TARGET_DIRS[@]}"; do
  target_full="${REPO_ROOT}/${target_rel}"

  # If target is currently a symlink (e.g. .claude/skills -> ../.agents/skills), remove it
  if [ -L "${target_full}" ]; then
    echo "Replacing directory symlink ${target_rel} with dedicated directory..."
    rm "${target_full}"
  fi

  mkdir -p "${target_full}"

  # Create individual symlinks for each skill
  for skill in "${SKILLS[@]}"; do
    link_path="${target_full}/${skill}"
    rel_source="../../.agents/skills/${skill}"

    if [ -L "${link_path}" ]; then
      current_target="$(readlink "${link_path}")"
      if [ "${current_target}" != "${rel_source}" ]; then
        ln -sfn "${rel_source}" "${link_path}"
        echo "Updated ${target_rel}/${skill} -> ${rel_source}"
      fi
    elif [ ! -e "${link_path}" ]; then
      ln -s "${rel_source}" "${link_path}"
      echo "Created ${target_rel}/${skill} -> ${rel_source}"
    fi
  done

  # Clean up dangling symlinks if any skills were removed
  for existing_link in "${target_full}"/*; do
    if [ -L "${existing_link}" ]; then
      skill_name="$(basename "${existing_link}")"
      if [ ! -d "${CANONICAL_DIR}/${skill_name}" ]; then
        echo "Removing stale symlink: ${target_rel}/${skill_name}"
        rm "${existing_link}"
      fi
    fi
  done
done

echo "All skill symlinks are synchronized successfully."
