#!/bin/bash
set -euo pipefail

if [[ -z "${OPENCODE_SERVER_PASSWORD:-}" ]]; then
	echo "OPENCODE_SERVER_PASSWORD must be set" >&2
	exit 1
fi

echo "[vault-filesystem] Starting Supergateway (streamable HTTP on :3000)..."
supergateway --port 3000 --outputTransport streamableHttp --stdio "mcp-server-filesystem /data" &
mcp_pid=$!

echo "[vault-oauth] Bridging OAuth callback from :4099 to :4098..."
socat TCP-LISTEN:4099,fork,reuseaddr TCP:127.0.0.1:4098 &
oauth_pid=$!

echo "[opencode] Starting web interface on :4097 in /data..."
cd /data
opencode serve --hostname 0.0.0.0 --port 4097 &
opencode_pid=$!

trap 'kill "$mcp_pid" "$oauth_pid" "$opencode_pid" 2>/dev/null; wait || true' EXIT
trap 'exit 0' INT TERM

wait -n "$mcp_pid" "$oauth_pid" "$opencode_pid"
