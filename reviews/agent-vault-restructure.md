# Code Review: Agent/Vault Restructure

**Date**: 2026-10-18
**Reviewed**: The uncommitted working tree: new `agent/`, `shared/`, and `vault/` trees; `docker-compose.yml`; `.dockerignore`; `.gitignore`; `AGENTS.md`; and the new `restart.sh`. The old root-level files are deleted in the same change. Vendored `agent/ponytail/` and the Slack binaries were checked for provenance only.

## Summary

The restructure is a clear improvement. It removes the root-level agent files, gives the agent and vault symmetric directories, aligns UID/GID and home paths with the documented `tadeas` contract, gives the agent OpenCode data a named volume, replaces the vault's duplicate nvm install with the base image's Node runtime, and adds `.dockerignore` plus pinned versions. Both OpenCode configs parse and load their model shortlists.

The main remaining concerns are model/provider drift between the agent's OpenCode and Pi configurations, a migration helper that does not fail fast during a data copy, and the vault agent's still-unrestricted shell/network access to a process environment containing several credentials. No critical runtime bug was found, but no image build or container runtime test was possible here.

## Findings

### 🔴 Critical

No critical issues found. Both entrypoints fail closed when `OPENCODE_SERVER_PASSWORD` is missing, no secret literal was found in tracked files, and both services still bind published ports to host loopback only.

### 🟠 Major

- **[agent/opencode.jsonc:12-26; agent/pi-models.json:8-13; vault/opencode.jsonc:60-84]** The provider/model shortlists have drifted, which is exactly the three-file consistency risk the previous review called out. The agent OpenCode config now has `deepseek-v4.1-flash`, `kimi-k3`, and `glm-5.3-flash`, while Pi still lists `kimi-k2.7-code` and `glm-5.3`; Pi also has no OpenRouter provider while OpenCode has one. Separately, the agent OpenRouter block omits `"package": "@opencode/ai/providers/openrouter"` that the vault block includes. The agent config still resolves and loads because `canonical` supplies the catalog defaults (verified with `opencode models`), but the asymmetry is unexplained and easy to copy incorrectly next time.
  **Suggestion**: Decide whether Pi is meant to expose the same shortlist as OpenCode. If yes, update `agent/pi-models.json` and add OpenRouter there. If not, document the difference in `agent/pi-models.json` or `AGENTS.md`. Make the OpenRouter blocks identical, and add a tiny check that compares the model-ID sets rather than relying on review.

- **[restart.sh:1-26]** The one-off volume migration is not failure-safe. It has no `set -euo pipefail`, does not check the result of `docker volume create`, the `cp -a`, or the verification step, and continues to `docker compose up` even if the copy failed. The old volume is retained, so this is not immediate data loss, but the vault can start against a partially copied session database. The script is also mode `0644`, uses unpinned `alpine:3`, and despite the comment "Start the renamed stack" only starts `vault`, leaving `agent` stopped.
  **Suggestion**: If this is genuinely one-off, run it once and delete it instead of committing it. If it should be kept, add `set -euo pipefail`, check every command, verify the copied file count/size before starting, pin the Alpine image, `chmod +x` it, and either start both services or rename the comment to say it only starts the vault.

- **[vault/opencode.jsonc:9-11; vault/entrypoint.sh:17-20; docker-compose.yml:42-50]** The `chief-of-staff` agent denies `external_directory`, but its only explicit permission is that one rule. The default shell and network tools remain available, and the OpenCode process has Slack, Apify, GitHub, Ollama, OpenRouter, and Google Calendar credentials in its environment. A prompt injection in vault content can ask the agent to run `env` or a `curl` command; `external_directory` does not constrain that. This is unchanged from the previous review.
  **Suggestion**: If vault confinement is a goal, add explicit `shell`, `webfetch`, and `websearch` rules (deny by default, allow a narrow set), or keep the credentials out of the agent's process environment where possible. If full shell access is intentional, document that container isolation, not `external_directory`, is the boundary.

### 🟡 Minor

- **[agent/Dockerfile:3-5,56; vault/Dockerfile:3-5,48; docker-compose.yml:9,12,32,40]** The Dockerfiles still accept `USERNAME`, but `HOME` is hardcoded to `/home/tadeas` and Compose hardcodes the same home in the volume targets. Building with any other `USERNAME` silently creates `/home/<other>` while nvm/npm and the volume paths still use `/home/tadeas`. The repository convention says the user is always `tadeas`, so the argument is now redundant and creates a trap.
  **Suggestion**: Drop the `USERNAME` build argument and use `tadeas` directly, or derive `HOME=/home/$USERNAME` and the Compose volume targets from the same value. Dropping the argument is the smaller change.

- **[shared/bashrc:8-9,19]** The vault image now shares a bashrc that defines `claude` and `codex` aliases for tools the vault image does not install. The aliases fail with command-not-found if used. `GPG_TTY=$(tty)` also stores the literal `not a tty` in non-interactive shells.
  **Suggestion**: Guard the aliases with `command -v claude` / `command -v codex`, or split the two aliases into an agent-only file. Set `GPG_TTY` only when `tty` succeeds.

- **[vault/entrypoint.sh:10; docker-compose.yml:34]** The filesystem MCP endpoint on port 3000 has no authentication. It is published on host loopback, which is a reasonable local trust boundary, but any local process can read and write the vault through it.
  **Suggestion**: Document the local-trust assumption in `AGENTS.md` or next to the Compose port. If only read access is needed, consider a read-only filesystem server; otherwise leave the loopback binding as the boundary.

- **[vault/google-calendar/server.mjs:28]** The Google Calendar access key is placed in the URL query string. URLs are commonly logged by proxies and Apps Script, so the key can leak into logs.
  **Suggestion**: Send the key in a request header if the Apps Script endpoint can read one. Otherwise document the logging risk and keep the key scoped and rotatable.

### 🔵 Completeness

- **[Repository]** There is still no automated check. The previous review recommended a small consistency check and the refactor has already produced two concrete drifts (Pi vs OpenCode, and the missing OpenRouter `package`). `docker compose config` and image builds also remain manual and were not runnable here.
  **Suggestion**: Add one small `scripts/check.sh` that runs `jq empty` on the JSON configs, `bash -n` on the shell scripts, compares the provider/model ID sets between `agent/opencode.jsonc`, `agent/pi-models.json`, and `vault/opencode.jsonc`, and runs `docker compose config -q` when Docker is available. No test framework is needed.

- **[vault/SYSTEM_PROMPT.md:1; vault/AGENTS.md:1-8]** The system prompt tells `chief-of-staff` to follow `AGENTS.md`. The image ships `vault/AGENTS.md`, but that file contains only GitHub rules; the vault operating instructions must come from `/data/AGENTS.md` in the mounted vault. The old root guide mentioned that dependency; the new `AGENTS.md` no longer does. If the vault is missing that file, the agent gets the system prompt and GitHub rules but no vault instructions.
  **Suggestion**: Document the required `/data/AGENTS.md` in the root guide, or ship a minimal fallback. Keep vault-specific content out of the image.

- **[AGENTS.md:15,23]** The guide calls the Google Calendar server "vendored" (it is hand-written in `vault/google-calendar/`) and says each image keeps its own shortlist without noting that the agent also has Pi's separate `agent/pi-models.json`.
  **Suggestion**: Correct the wording and mention the Pi list alongside the OpenCode config so a future edit does not update only one of them.

- **[restart.sh]** The migration helper is not mentioned in the repository layout or the change checklist.
  **Suggestion**: Document it as a one-off migration step, or delete it after the migration so it does not become an undocumented supported path.

### 🟢 Positive Observations

- The symmetric `agent/`, `shared/`, and `vault/` layout fixes the main organizational findings from the previous review, and the `Agent vs Vault` section makes the intentional role differences explicit.
- UID/GID, home paths, volume paths, and Compose build arguments now agree on `tadeas` / 501 / 20.
- The vault image no longer installs a second Node runtime through nvm; npm globals are installed under the unprivileged user's home, and the agent remains the only nvm consumer.
- The agent OpenCode data is persisted in `agent-opencode-data`, matching the vault's `vault-opencode-data`; both are initialized from directories owned by the runtime user.
- `.dockerignore` excludes Git metadata, env files, editor junk, and review output; `.gitignore` now covers `.env*` while allowlisting `.env.example`.
- Both entrypoints retain the fail-closed password check, both services publish only on `127.0.0.1`, and application processes run as the unprivileged user.
- `vault/entrypoint.sh` still uses `trap` plus `wait -n` to stop all three children when any sibling exits, and the OAuth port coupling is now documented next to the MCP config.
- Base image digests match Docker Hub (`debian:trixie-slim`, `node:24.22.0-bookworm-slim`), all pinned npm versions resolve, the nvm tag and uv installer URL exist, and the Slack SHA-256 values match the vendored binaries.
- Both OpenCode configs parse and load the expected shortlists with `opencode models --standalone`. The ordered `provider.use` deny/allow policies match the documented V2 pattern.
- The Slack MCP remains restricted to read-oriented tools, and no secret literal was found in the reviewed text files.

## Test Coverage Assessment

There is no test suite, consistent with the repository guide. The following checks were run during this review:

- `bash -n` on `agent/entrypoint.sh`, `vault/entrypoint.sh`, `shared/bashrc`, `agent/claude-plugins-bootstrap.sh`, and `restart.sh`: passed.
- `jq empty` on `agent/pi-models.json`, `agent/pi-settings.json`, `shared/agents/settings.json`, and the ponytail package manifests: passed.
- `opencode models --standalone` against temporary copies of both OpenCode configs: both parsed and listed the expected models.
- `jq -S .providers` comparison between the two OpenCode configs: the only difference is the OpenRouter `package` line.
- Slack `sha256sum` against `vault/slack/README.md`: both digests match.
- Docker Hub manifest checks for both base image digests: match.
- npm registry checks for all pinned package versions, the nvm tag, and the uv installer URL: all resolve.
- A text scan for common secret patterns and a trailing-whitespace scan: no secret matches; whitespace only in an unchanged prompt file.

`docker compose config`, image builds, and container runtime checks were not run because Docker is unavailable in this environment. `shellcheck` is also unavailable. The highest-value additions are the small consistency check described above and a real build/runtime smoke test of both images.

## Recommendations

1. Align the agent OpenCode and Pi model/provider lists, or document why they differ, and add the model-set check so this cannot drift silently again.
2. Fix or remove `restart.sh`: fail fast on copy errors, pin Alpine, decide whether it starts both services, and remove the executable-bit trap.
3. Decide the vault agent's shell/network policy and either restrict it or state explicitly that container isolation is the boundary.
4. Remove the redundant `USERNAME` build argument (or derive `HOME` from it), and guard the agent-only bashrc aliases in the shared file.
5. Document the required `/data/AGENTS.md` and consider adding the small `scripts/check.sh`; then run `docker compose config` and both image builds on a machine with Docker.

## Files Reviewed

| File | Lines | Notes |
|------|-------|-------|
| `AGENTS.md` | 62 | Updated layout, role split, conventions; still missing `/data/AGENTS.md` dependency |
| `docker-compose.yml` | 55 | New service names, agent volume, aligned UID/GID/home paths |
| `.dockerignore` | 6 | Added; excludes Git, env, editor junk, reviews |
| `.gitignore` | 3 | `.env*` with `.env.example` exception |
| `agent/Dockerfile` | 86 | Pinned base/npm/Node; nvm and CLIs as user; hardcoded `HOME` |
| `agent/entrypoint.sh` | 14 | Password gate, plugin bootstrap, exec OpenCode |
| `agent/opencode.jsonc` | 34 | Shortlists and provider policies; OpenRouter block lacks `package` |
| `agent/pi-models.json` | 16 | Separate Ollama model list; drifts from OpenCode |
| `agent/pi-settings.json` | 3 | Thinking level |
| `agent/tmux.conf` | 7 | Unchanged |
| `agent/claude-plugins-bootstrap.sh` | 29 | Unchanged; runtime marketplace install |
| `agent/ponytail/VENDORED.md` | 13 | Provenance note; kept files exist |
| `shared/bashrc` | 23 | Shared shell config; dead vault aliases |
| `shared/agents/AGENTS.md` | 15 | Shared GitHub/code/git rules |
| `shared/agents/settings.json` | 43 | Claude settings and plugin marketplaces |
| `shared/agents/sr_opus_5_system_prompt.md` | 140 | Unchanged |
| `shared/agents/skills/*` | 752 | Unchanged skill files |
| `vault/Dockerfile` | 53 | Base Node runtime, user-owned npm globals, arch-specific Slack binary |
| `vault/entrypoint.sh` | 25 | Three-process supervision and OAuth bridge |
| `vault/opencode.jsonc` | 91 | MCP servers, chief-of-staff, shortlists, policies |
| `vault/SYSTEM_PROMPT.md` | 3 | `chief-of-staff` prompt; depends on `/data/AGENTS.md` |
| `vault/AGENTS.md` | 8 | GitHub rules only |
| `vault/google-calendar/server.mjs` | 128 | Hand-written MCP server; key in query string |
| `vault/slack/README.md` | 14 | Checksums verified |
| `restart.sh` | 26 | One-off migration; not failure-safe; only starts vault |
