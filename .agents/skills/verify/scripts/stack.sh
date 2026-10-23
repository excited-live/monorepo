#!/usr/bin/env bash
# Launch, check, and stop an isolated local excited.live stack (apps/api + apps/biz-mobile web)
# for agent verification. Uses its own ports and a throwaway SQLite file, so it never touches
# a developer's own `pnpm dev` instance or local data.
#
# Usage: stack.sh up | doctor | down
# Env:   VERIFY_API_PORT (8710), VERIFY_MOBILE_PORT (1530), VERIFY_RUN_DIR (<repo>/.verify)
set -euo pipefail

ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
RUN_DIR="${VERIFY_RUN_DIR:-$ROOT/.verify}"
API_PORT="${VERIFY_API_PORT:-8710}"
MOBILE_PORT="${VERIFY_MOBILE_PORT:-1530}"
API_URL="http://localhost:${API_PORT}"
MOBILE_URL="http://localhost:${MOBILE_PORT}"

command -v ss >/dev/null || { echo "stack.sh needs ss (iproute2) to check ports." >&2; exit 1; }

port_busy() { ss -ltn | grep -q ":$1 "; }

# A pid file holds "<pid> <start time>". The start time guards against PID reuse: after a crash the
# OS may hand the pid to an unrelated process, and we must never signal that one.
save_pid() { echo "$1 $(ps -o lstart= -p "$1")" >"$2"; }

pid_alive() {
	[ -f "$1" ] || return 1
	local pid start
	read -r pid start <"$1"
	[ "$(ps -o lstart= -p "$pid" 2>/dev/null)" = "$start" ]
}

wait_for() { # url, expected-status-regex, seconds
	local i
	for ((i = 0; i < $3; i++)); do
		if curl -s -o /dev/null -w '%{http_code}' "$1" 2>/dev/null | grep -Eq "$2"; then return 0; fi
		sleep 1
	done
	return 1
}

doctor() {
	local ok=0
	if pid_alive "$RUN_DIR/api.pid"; then echo "api     pid $(cut -d" " -f1 "$RUN_DIR/api.pid") alive"; else echo "api     not running (this run dir)"; ok=1; fi
	if pid_alive "$RUN_DIR/mobile.pid"; then echo "mobile  pid $(cut -d" " -f1 "$RUN_DIR/mobile.pid") alive"; else echo "mobile  not running (this run dir)"; ok=1; fi
	local health settings page
	health="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/health" || true)"
	settings="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/api/v1/settings" || true)"
	page="$(curl -s -o /dev/null -w '%{http_code}' "$MOBILE_URL/" || true)"
	echo "api     $API_URL/health -> $health (want 200)"
	echo "api     $API_URL/api/v1/settings without token -> $settings (want 401: auth on)"
	echo "mobile  $MOBILE_URL/ -> $page (want 200)"
	[ "$health" = 200 ] && [ "$settings" = 401 ] && [ "$page" = 200 ] || ok=1
	echo "run dir $RUN_DIR (logs/, evidence/, api.sqlite)"
	return $ok
}

up() {
	if pid_alive "$RUN_DIR/api.pid" || pid_alive "$RUN_DIR/mobile.pid"; then
		echo "A stack from $RUN_DIR is already running. Run 'stack.sh down' first, or set VERIFY_RUN_DIR." >&2
		exit 1
	fi
	for p in "$API_PORT" "$MOBILE_PORT"; do
		if port_busy "$p"; then
			echo "Port $p is in use by something this script did not start. Pick free ports with VERIFY_API_PORT / VERIFY_MOBILE_PORT." >&2
			exit 1
		fi
	done
	mkdir -p "$RUN_DIR/logs" "$RUN_DIR/evidence"

	echo "Building workspace packages the apps import (turbo cache makes repeats fast)..."
	(cd "$ROOT" && pnpm exec turbo run build --filter='@excited-live/api^...' --filter='@excited-live/biz-mobile^...' --output-logs=errors-only >"$RUN_DIR/logs/build.log" 2>&1) || {
		echo "Package build failed, see $RUN_DIR/logs/build.log" >&2
		exit 1
	}

	# Job control puts each background job in its own process group whose id is the pid we save,
	# so `down` stops exactly what `up` started (pnpm, tsx/vite, and their children).
	set -m
	(cd "$ROOT/apps/api" && PORT="$API_PORT" EXCITED_API_DB_PATH="$RUN_DIR/api.sqlite" \
		exec pnpm exec tsx src/index.ts) >"$RUN_DIR/logs/api.log" 2>&1 &
	save_pid $! "$RUN_DIR/api.pid"
	(cd "$ROOT/apps/biz-mobile" && VITE_API_URL="$API_URL" \
		exec pnpm exec vite --port "$MOBILE_PORT" --strictPort) >"$RUN_DIR/logs/mobile.log" 2>&1 &
	save_pid $! "$RUN_DIR/mobile.pid"
	set +m

	wait_for "$API_URL/health" '^200$' 60 || { echo "API did not become healthy, see $RUN_DIR/logs/api.log" >&2; down; exit 1; }
	wait_for "$MOBILE_URL/" '^200$' 60 || { echo "biz-mobile did not serve, see $RUN_DIR/logs/mobile.log" >&2; down; exit 1; }
	doctor
	echo "READY api=$API_URL mobile=$MOBILE_URL"
}

down() {
	local f pid
	for f in "$RUN_DIR/mobile.pid" "$RUN_DIR/api.pid"; do
		[ -f "$f" ] || continue
		if ! pid_alive "$f"; then
			echo "$(basename "$f" .pid): process from this run dir is gone; not signalling a possibly reused pid." >&2
			rm -f "$f"
			continue
		fi
		pid="$(cut -d" " -f1 "$f")"
		kill -TERM -- "-$pid" 2>/dev/null || true
		for _ in 1 2 3 4 5; do pgrep -g "$pid" >/dev/null || break; sleep 1; done
		kill -KILL -- "-$pid" 2>/dev/null || true
		rm -f "$f"
	done
	rm -f "$RUN_DIR/api.sqlite" "$RUN_DIR"/api.sqlite-*
	local p left=0
	for p in "$API_PORT" "$MOBILE_PORT"; do
		if port_busy "$p"; then echo "Port $p is still in use after down. Check it before the next run." >&2; left=1; fi
	done
	echo "Stopped. Evidence kept in $RUN_DIR/evidence"
	return $left
}

case "${1:-}" in
	up) up ;;
	doctor) doctor ;;
	down) down ;;
	*) echo "usage: $0 up|doctor|down" >&2; exit 2 ;;
esac
