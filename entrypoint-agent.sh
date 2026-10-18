#!/bin/bash

set -euo pipefail

source "$HOME/.nvm/nvm.sh"

if [[ -z "${OPENCODE_SERVER_PASSWORD:-}" ]]; then
	echo "OPENCODE_SERVER_PASSWORD must be set" >&2
	exit 1
fi

claude-plugins-bootstrap

exec opencode serve --hostname 0.0.0.0 --port 4096
