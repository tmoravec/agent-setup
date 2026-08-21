#!/bin/bash

set -euo pipefail

source "$HOME/.nvm/nvm.sh"

claude-plugins-bootstrap

exec sleep infinity
