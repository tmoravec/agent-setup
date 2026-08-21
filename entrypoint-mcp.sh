#!/bin/bash
set -e

cd /app

echo "[mcp-obsidian] Starting mcp-proxy (SSE bridge on :3000)..."

source /home/tadeas/.nvm/nvm.sh
supergateway --port 3000 --outputTransport streamableHttp --stdio "mcp-server-filesystem /data" &

SUPERGATEWAY_PID=$!

sleep 2

echo "[mcp-obsidian] Starting cloudflared tunnel..."

cloudflared tunnel --no-autoupdate run --proxy-connect-timeout 60s --token "$CLOUDFLARED_TOKEN" &
CLOUDFLARED_PID=$!

# If either process exits, kill the other and stop the container
wait -n $SUPERGATEWAY_PID $CLOUDFLARED_PID

echo "[mcp-obsidian] One process exited. Shutting down..."
kill $SUPERGATEWAY_PID $CLOUDFLARED_PID 2>/dev/null || true
exit 1

