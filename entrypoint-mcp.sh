#!/bin/bash
set -e

cd /app

echo "[mcp-obsidian] Starting mcp-proxy (SSE bridge on :3000)..."

source "$HOME/.nvm/nvm.sh"
exec supergateway --port 3000 --outputTransport streamableHttp --stdio "mcp-server-filesystem /data"
