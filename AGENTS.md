# Repository guide

This repository builds Docker environments for running AI development tools and MCP services with host-mounted workspaces. Treat container isolation, credential handling, and host file ownership as core product behavior.

## Repository layout

- `Dockerfile.agent` builds the interactive AI-tool image. It installs shell tooling, Node.js through NVM, AI coding CLIs, `uv`, and the user configuration under `agents/`.
- `Dockerfile.mcp` builds the filesystem MCP service image. It runs the MCP filesystem server through Supergateway.
- `docker-compose.yml` defines the local agent service, its build arguments, workspace mount, terminal settings, and runtime environment.
- `entrypoint-agent.sh` registers runtime-mounted Claude plugins and keeps the interactive container running.
- `entrypoint-mcp.sh` starts Supergateway as the container process.
- `bashrc.agent`, `tmux.conf`, and `opencode.jsonc` configure the interactive environment.
- `agents/` is copied into the container and shared by the supported AI tools through symlinks.
- `claude-plugins-bootstrap.sh` installs workspace-provided Claude plugins when they are available.

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

- Preserve host UID/GID mapping so files created in mounted workspaces remain usable by the host user.
- Keep paths and usernames consistent across Dockerfiles, shell configuration, entrypoints, and Compose build arguments.
- Install build-time dependencies before switching to the unprivileged user.
- Run application processes as the unprivileged user unless a task has a documented reason to require root.
- Prefer exec-form `CMD` and explicit process supervision. Ensure background child processes are terminated when a sibling exits or the container stops.
- Keep image layers deterministic where practical. Pin externally installed tool versions when modifying installation steps.

## Validation

There is no automated test suite. And you can't run Docker in this environment (you run inside the very thing you're configuring here). Rely on code review instead.

## Change checklist

- Confirm no secret or host-specific credential was introduced.
- Confirm paths, usernames, versions, and environment-variable names agree across affected files.
- Confirm services still run as the intended non-root user.
- Run applicable syntax, Compose, and image-build checks.
- Report checks that were not run and why.
