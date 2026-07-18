#!/usr/bin/env bash
set -uo pipefail

err=0
tmpd=$(mktemp -d)
trap 'rm -rf "$tmpd"' EXIT

say()  { printf "\033[36m%s\033[0m\n" "$*"; }
ok()   { printf "\033[32m%s\033[0m\n" "$*"; }
fail() { printf "\033[31m%s\033[0m\n" "$*"; }

# run <label> <cmd...>  — gate: non-zero exit → fail
run() {
	local label="$1"; shift
	say ":: ${label}…"
	if "$@" >"$tmpd/out" 2>"$tmpd/err"; then
		ok "   ${label}: ok"
	else
		fail "   ${label}: issues"
		err=1
		[ -s "$tmpd/out" ] && sed 's/^/   │ /' "$tmpd/out"
		[ -s "$tmpd/err" ] && sed 's/^/   │ /' "$tmpd/err"
	fi
	say ""
}

# ---- sync (informational, never gates) ----
say ":: svelte-kit sync…"
bunx svelte-kit sync 2>&1 | sed 's/^/   /'
say ""

# ---- hard gates ----
run "svelte-check" bunx svelte-check --tsconfig ./tsconfig.json
run "tsc"          bunx tsc --noEmit
run "biome"        bunx biome check

# ---- fallow (advisory — stdout has ● findings; stderr has ✗/✓ summary) ----
say ":: fallow…"
bunx fallow >"$tmpd/flw_out" 2>"$tmpd/flw_err" || true
# ● lines in stdout = actual finding sections (unused deps, health issues, etc.)
findings=$(grep -E '^\s*●' "$tmpd/flw_out" 2>/dev/null || true)
if [ -n "$findings" ]; then
	say "   fallow: findings (advisory)"
	# Show only the ● section headers + the lines immediately after them (detail lines)
	grep -A 2 '^\s*●' "$tmpd/flw_out" | grep -v '^--$' | sed 's/^/   │ /'
else
	ok "   fallow: ok"
fi
say ""

# ---- summary ----
if [ "$err" -eq 0 ]; then
	ok "◇ All checks passed"
else
	fail "◇ Some checks failed — see above"
	exit 1
fi
