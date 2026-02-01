#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_PID_FILE="$ROOT_DIR/.remotion-dev.pid"
NGROK_PID_FILE="$ROOT_DIR/.ngrok.pid"
DEV_LOG="/tmp/remotion-dev.log"
NGROK_LOG="/tmp/ngrok.log"
DEV_PORT="${REMOTION_PORT:-3000}"
NGROK_BIN="${NGROK_BIN:-$HOME/.local/bin/ngrok}"

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file")"
  [[ -n "$pid" ]] || return 1
  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  return 1
}

start_dev() {
  if is_running "$DEV_PID_FILE"; then
    echo "Dev server already running (pid $(cat "$DEV_PID_FILE"))."
    return 0
  fi
  (cd "$ROOT_DIR" && nohup npm run dev >"$DEV_LOG" 2>&1 & echo $! >"$DEV_PID_FILE")
  echo "Dev server starting on port $DEV_PORT (log: $DEV_LOG)."
}

start_ngrok() {
  if is_running "$NGROK_PID_FILE"; then
    echo "ngrok already running (pid $(cat "$NGROK_PID_FILE"))."
    return 0
  fi
  if [[ ! -x "$NGROK_BIN" ]]; then
    echo "ngrok not found at $NGROK_BIN"
    exit 1
  fi
  nohup "$NGROK_BIN" http "$DEV_PORT" --log=stdout >"$NGROK_LOG" 2>&1 & echo $! >"$NGROK_PID_FILE"
  echo "ngrok starting (log: $NGROK_LOG)."
}

print_url() {
  local url=""
  for _ in {1..20}; do
    url="$(curl -s http://127.0.0.1:4040/api/tunnels | rg -o 'https?://[^"]+' | head -n1 || true)"
    if [[ -n "$url" ]]; then
      echo "Public URL: $url"
      return 0
    fi
    sleep 0.5
  done
  echo "Could not fetch ngrok URL yet. Check $NGROK_LOG."
  return 1
}

stop_all() {
  if is_running "$NGROK_PID_FILE"; then
    kill "$(cat "$NGROK_PID_FILE")" || true
    rm -f "$NGROK_PID_FILE"
    echo "Stopped ngrok."
  else
    echo "ngrok not running."
  fi
  if is_running "$DEV_PID_FILE"; then
    kill "$(cat "$DEV_PID_FILE")" || true
    rm -f "$DEV_PID_FILE"
    echo "Stopped dev server."
  else
    echo "Dev server not running."
  fi
}

status() {
  if is_running "$DEV_PID_FILE"; then
    echo "Dev server running (pid $(cat "$DEV_PID_FILE"))."
  else
    echo "Dev server not running."
  fi
  if is_running "$NGROK_PID_FILE"; then
    echo "ngrok running (pid $(cat "$NGROK_PID_FILE"))."
    print_url || true
  else
    echo "ngrok not running."
  fi
}

case "${1:-start}" in
  start)
    start_dev
    start_ngrok
    print_url
    ;;
  stop)
    stop_all
    ;;
  status)
    status
    ;;
  restart)
    stop_all
    start_dev
    start_ngrok
    print_url
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    exit 1
    ;;
esac
