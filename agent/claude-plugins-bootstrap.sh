#!/bin/bash
# Register the Apify plugin marketplace and install its plugins into ~/.claude.
#
# The marketplace is a "directory" source living on the /workspace mount, so it
# only exists at container runtime — it cannot be installed at image build time.
# Idempotent and quiet: does nothing once the plugins are in the plugin cache.

set -u

MARKETPLACE_DIR=/workspace/agent-skills-internal
MARKETPLACE_NAME=apify-agent-skills-internal
PLUGINS=(principal-review pending-review-comments)

[ -d "$MARKETPLACE_DIR" ] || exit 0
command -v claude > /dev/null || exit 0

missing=()
for plugin in "${PLUGINS[@]}"; do
    [ -d "$HOME/.claude/plugins/cache/$MARKETPLACE_NAME/$plugin" ] || missing+=("$plugin")
done
[ ${#missing[@]} -eq 0 ] && exit 0

claude plugin marketplace add "$MARKETPLACE_DIR" > /dev/null 2>&1

for plugin in "${missing[@]}"; do
    if ! claude plugin install "$plugin@$MARKETPLACE_NAME" > /dev/null 2>&1; then
        echo "warning: failed to install plugin $plugin@$MARKETPLACE_NAME" >&2
    fi
done
