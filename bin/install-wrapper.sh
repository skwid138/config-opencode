#!/usr/bin/env bash
# install-wrapper.sh — create / repair / verify the opencode-wrapper symlink.
#
# The conditional-config wrapper at $OPENCODE_BIN/opencode is a symlink to
# the source-of-truth script in ~/code/scripts/personal/opencode-wrapper.sh.
# This installer is the canonical way to create or repair that symlink.
#
# Why this exists
# ----------------
# The wrapper directory ($HOME/.config/opencode/bin) is prepended to $PATH
# by ~/code/scripts/shell/env/paths.zsh, but the directory only does useful
# work if the symlink exists and resolves to the live source script. Three
# failure modes prompted this installer:
#
#   1. Fresh clone of ~/.config/opencode — symlink missing entirely.
#   2. Dangling symlink (e.g. ~/code/scripts not yet cloned on a new box).
#   3. Drift — the link replaced by a regular file or pointed elsewhere.
#
# scripts-doctor checks for failure (1)–(3); this installer fixes them.
#
# Behavior
# --------
# Default mode: idempotent install.
#   - mkdirs the bin/ dir.
#   - Refuses to create a symlink to a non-existent target (would leave a
#     dangling link that breaks `opencode` invocations system-wide).
#   - `ln -sfn` semantics: replaces an existing symlink/file in-place. We
#     refuse to overwrite a regular file by default; pass --force to allow.
#
# --check mode: read-only verification, exit 0 on healthy state, 1 otherwise.
#   Suitable for CI / scripts-doctor symmetry / paranoid pre-commit hooks.
#
# Exit codes follow ~/code/scripts/lib/common.sh:
#   0  symlink is healthy (--check) or was created/repaired
#   1  --check found a problem
#   2  usage error
#   3  source-of-truth script not found (~/code/scripts not cloned)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# This script lives in ~/.config/opencode/bin/, but it sources lib/common.sh
# from ~/code/scripts/lib/. If that's missing, fall back to a minimal local
# implementation so the installer can still tell the user what's wrong.
COMMON_LIB="$HOME/code/scripts/lib/common.sh"
if [[ -r "$COMMON_LIB" ]]; then
  # shellcheck source=/dev/null
  source "$COMMON_LIB"
else
  die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
  die_usage() { printf 'Usage error: %s\n' "$*" >&2; exit 2; }
  die_missing_dep() { printf 'Missing dependency: %s\n' "$*" >&2; exit 3; }
  warn() { printf 'Warning: %s\n' "$*" >&2; }
  info() { printf '✓ %s\n' "$*" >&2; }
fi

usage() {
  cat <<'EOF'
Usage: install-wrapper.sh [--check] [--force]

Create or repair the conditional-config opencode wrapper symlink:

  $HOME/.config/opencode/bin/opencode  →  $HOME/code/scripts/personal/opencode-wrapper.sh

Options:
  --check       Read-only verification. Exit 0 if healthy, 1 if not.
                Suitable for CI / scripts-doctor parity.
  --force       Overwrite a regular file at the link path. The default
                refuses (it might be the user's hand-crafted shim).
  -h, --help    Show this help.

Exit codes:
  0  Healthy (--check) or installed/repaired (default).
  1  --check found a problem (missing, dangling, drifted).
  2  Usage error.
  3  Source-of-truth script not found at expected path
     (is ~/code/scripts cloned?).
EOF
}

# --- arg parsing ---

CHECK=0
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --check)
      CHECK=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -*)
      die_usage "unknown flag: $1"
      ;;
    *)
      die_usage "unexpected argument: $1"
      ;;
  esac
done

# --- paths (overridable for testing) ---
#
# The defaults are the canonical paths. Tests override via env vars to
# exercise the logic against a sandbox $HOME.

LINK_PATH="${OPENCODE_WRAPPER_LINK:-$HOME/.config/opencode/bin/opencode}"
TARGET_PATH="${OPENCODE_WRAPPER_TARGET:-$HOME/code/scripts/personal/opencode-wrapper.sh}"

# --- check mode -------------------------------------------------------------

if [[ "$CHECK" -eq 1 ]]; then
  rc=0
  if [[ ! -e "$LINK_PATH" && ! -L "$LINK_PATH" ]]; then
    warn "wrapper symlink missing: $LINK_PATH"
    rc=1
  elif [[ ! -L "$LINK_PATH" ]]; then
    warn "wrapper path is a regular file, not a symlink: $LINK_PATH"
    rc=1
  else
    actual="$(readlink "$LINK_PATH")"
    # Resolve relative-target symlinks against the link's directory for the
    # equality check, so a relative `../scripts/...` link still passes if
    # it ends up at the right place.
    if [[ "$actual" != /* ]]; then
      actual="$(cd "$(dirname "$LINK_PATH")" && cd "$(dirname "$actual")" 2>/dev/null && pwd)/$(basename "$actual")"
    fi
    if [[ "$actual" != "$TARGET_PATH" ]]; then
      warn "wrapper symlink drift: $LINK_PATH → $actual (expected → $TARGET_PATH)"
      rc=1
    fi
    if [[ ! -f "$TARGET_PATH" ]]; then
      warn "symlink target missing: $TARGET_PATH (is ~/code/scripts cloned?)"
      rc=1
    fi
  fi
  if [[ "$rc" -eq 0 ]]; then
    info "wrapper symlink healthy: $LINK_PATH → $TARGET_PATH"
  fi
  exit "$rc"
fi

# --- install mode -----------------------------------------------------------

# Source-of-truth script must exist before we point a symlink at it.
if [[ ! -f "$TARGET_PATH" ]]; then
  die_missing_dep "source-of-truth wrapper not found: $TARGET_PATH (clone ~/code/scripts first)"
fi

# Ensure parent dir exists.
link_dir="$(dirname "$LINK_PATH")"
if [[ ! -d "$link_dir" ]]; then
  mkdir -p "$link_dir" || die "could not create $link_dir"
fi

# If something already exists at LINK_PATH:
#   - symlink: replace (idempotent)
#   - regular file: refuse without --force (might be a hand-crafted shim)
#   - directory: always refuse
if [[ -L "$LINK_PATH" ]]; then
  : # ln -sfn handles this
elif [[ -d "$LINK_PATH" ]]; then
  die "$LINK_PATH is a directory; refusing to replace"
elif [[ -e "$LINK_PATH" ]]; then
  if [[ "$FORCE" -eq 0 ]]; then
    die "$LINK_PATH exists as a regular file; pass --force to overwrite"
  fi
  rm -f "$LINK_PATH" || die "could not remove $LINK_PATH"
fi

ln -sfn "$TARGET_PATH" "$LINK_PATH" || die "ln -sfn failed: $TARGET_PATH → $LINK_PATH"
info "wrapper symlink installed: $LINK_PATH → $TARGET_PATH"
