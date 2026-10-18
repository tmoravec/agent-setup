# Repository guide

This repository builds Docker environments for running AI development tools and MCP services with host-mounted workspaces. Treat container isolation, credential handling, and host file ownership as core product behavior.

## Repository layout

- `agent/Dockerfile` builds the programming image for `/workspace`. It installs shell tooling, Node.js through NVM, the AI coding CLIs, `uv`, and the agent configuration.
- `vault/Dockerfile` builds the Obsidian vault image. It runs the filesystem MCP server through Supergateway and hosts opencode scoped to `/data`.
- `docker-compose.yml` defines both services, their build arguments, mounts, ports, persistence, and runtime environment.
- `agent/entrypoint.sh` registers runtime-mounted Claude plugins and starts opencode on the workspace.
- `vault/entrypoint.sh` starts Supergateway, the OAuth callback bridge, and opencode, stopping all three if any exits.
- `agent/opencode.jsonc`, `agent/pi-models.json`, `agent/pi-settings.json`, `agent/tmux.conf`, and `agent/claude-plugins-bootstrap.sh` configure the agent image.
- `shared/bashrc` is shared by both images; it sources NVM only when present.
- `shared/agents/` is copied into the agent image and shared by the supported AI tools through symlinks.
- `vault/` holds all vault-container files, including `opencode.jsonc`, `SYSTEM_PROMPT.md`, `AGENTS.md`, `entrypoint.sh`, and the vendored Slack and Google Calendar servers.
- `agent/ponytail/` is the vendored ponytail plugin and CLI extension installed in the agent image.
- `.dockerignore` keeps Git metadata, env files, and editor junk out of the build context. `.gitignore` keeps env files and editor junk out of Git. `reviews/` holds review output.

## Agent vs Vault

- **Agent** (`/workspace`) is the programming environment. It installs Claude Code, Codex, Pi, OpenCode, ponytail, and the `shared/agents/skills` skills. It has no MCP servers configured by default.
- **Vault** (`/data`) is the Obsidian vault environment. It runs the filesystem MCP endpoint on port 3000 and OpenCode with the `chief-of-staff` agent, Notion, Slack, Apify, Miro, and Google Calendar. It does not install the coding CLIs or ponytail.
- **Shared contract**: both images require `OPENCODE_SERVER_PASSWORD`, run as `tadeas` (UID 501, GID 20), publish ports only on host loopback, and persist `~/.local/share/opencode` in named volumes. Each image keeps its own provider/model shortlist, so update the intended config for the right role.

## Working rules

- Preserve unrelated working-tree changes. This repository may be used before its files are committed.
- Keep changes narrowly scoped. Do not upgrade base images, pinned tool versions, or dependencies unless the task requires it.
- Keep shell scripts compatible with Bash. Quote expansions that may contain spaces and use explicit failure handling for critical startup operations.

## Security requirements

- Never add access tokens, passwords, tunnel credentials, private keys, or other secrets to tracked files or image layers.
- Pass secrets at runtime through environment variables, secret mounts, or another external secret store.
- Do not print secret values in logs, diagnostics, test output, or handoff notes.
- Treat host bind mounts as sensitive. Keep filesystem-server roots as narrow as the requested use case permits.
- Do not weaken container isolation, broaden mounts, add privileged mode, or expose additional ports without making the security impact explicit.
- Avoid downloading and executing unpinned remote content when a versioned package or verified artifact is available.

## Container conventions

- The host user is always `tadeas` with UID 501 and GID 20. Keep Dockerfiles, Compose, shell configuration, and volume paths aligned; do not parameterize the user with `${USER}`.
- The agent image installs Node through NVM; the vault image uses the Node runtime from its base image and installs npm globals under the unprivileged user's home. Each image has exactly one Node runtime.
- Both OpenCode services persist `~/.local/share/opencode` in named volumes: `agent-opencode-data` and `vault-opencode-data`.
- Preserve host UID/GID mapping so files created in mounted workspaces remain usable by the host user.
- Keep paths and usernames consistent across Dockerfiles, shell configuration, entrypoints, and Compose build arguments.
- Install build-time dependencies before switching to the unprivileged user.
- Run application processes as the unprivileged user unless a task has a documented reason to require root.
- Prefer exec-form `CMD` and explicit process supervision. Ensure background child processes are terminated when a sibling exits or the container stops.
- Keep image layers deterministic where practical. Pin externally installed tool versions when modifying installation steps. The `tmoravec/vim` clone is intentionally unpinned because it tracks the user's own repository.

## Validation

There is no automated test suite. And you can't run Docker in this environment (you run inside the very thing you're configuring here). Rely on code review instead.

## Change checklist

- Confirm no secret or host-specific credential was introduced.
- Confirm paths, usernames, versions, and environment-variable names agree across affected files.
- Confirm services still run as the intended non-root user.
- Run applicable syntax, Compose, and image-build checks.
- Report checks that were not run and why.
