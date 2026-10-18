# Code Review: Agent and MCP Container Consistency

**Date**: 2026-10-18
**Reviewed**: Whole repository, with focus on `Dockerfile.agent`, `Dockerfile.mcp`, `docker-compose.yml`, both OpenCode configs, both entrypoints, and shared shell/config assets. Vendored `ponytail/` was checked for provenance only; the Slack binaries were checked by checksum and `--help` only.

## Summary

The two setups are functionally coherent: both install an OpenCode global config at the same path, both gate the server behind `OPENCODE_SERVER_PASSWORD`, both publish ports only on host loopback, and the Ollama provider block is identical today. The role-specific differences (MCP servers and `chief-of-staff` only in MCP, ponytail only in the agent, skills only in the agent) are intentional and reasonable.

The real inconsistencies are organizational and operational: the file layout gives the agent root-level ownership while MCP is split between root and `mcp/`, the provider/model list is duplicated in three files with no guard against drift, the `${USER}` parameterization is undermined by hardcoded `/home/tadeas` paths and conflicting UID/GID defaults, and the MCP image installs Node/npm as root while the agent image installs them as the runtime user. No critical bugs were found. All JSON and shell syntax checks pass.

## Consistency matrix

| Area | Agent | MCP | Assessment |
| --- | --- | --- | --- |
| OpenCode config source | `./opencode.jsonc` | `./mcp/opencode.jsonc` | Asymmetric path; same install target |
| OpenCode install target | `~/.config/opencode/opencode.jsonc` | same | Consistent |
| Agent instructions | `~/.agents/AGENTS.md` symlinked into config dir | `mcp/AGENTS.md` copied into config dir | Different mechanism; content split is intentional |
| MCP servers | none | notion, slack, apify, miro, google-calendar | Role difference |
| Default agent | `build` (implicit) | `chief-of-staff` | Role difference |
| Provider block | `ollama-cloud`, 4 models | same | Identical today, but duplicated |
| Plugin | ponytail | none | Role difference |
| Skills | auto-discovered from `~/.agents/skills` | none | Role difference |
| Node/tool install | nvm as runtime user | base Node 24 plus nvm as root | Inconsistent ownership and duplicate Node |
| UID/GID defaults | 1000/1000 | 501/20 | Inconsistent; Compose overrides both to 501/20 |
| Bashrc | full toolset | same file, aliases for absent tools | Divergent fit |
| OpenCode data persistence | ephemeral | named volume | Inconsistent |
| Ports | 4096, password | 3000 no auth, 4097 password, OAuth 4098→4099 | Mostly consistent |
| Restart policy | `unless-stopped` | `unless-stopped` | Consistent |

## Findings

### 🔴 Critical

No critical issues found. No secrets were found in the reviewed configuration and scripts, both servers fail closed when the password is missing, and runtime processes run as the unprivileged user.

### 🟠 Major

- **[opencode.jsonc:3-15, mcp/opencode.jsonc:58-70, pi-models.json:3-15]** The Ollama provider block is duplicated verbatim in both OpenCode configs, and the same four model IDs are repeated in `pi-models.json` with different metadata. The copies are in sync today (`jq -S .providers` diff is empty), but adding or removing a model requires three coordinated edits. This is the most likely source of future agent/MCP drift.
  **Suggestion**: Keep one documented source of truth and add a tiny check to the repo (see Completeness). A comment in both configs saying “keep in sync with …” is the minimum. Generating both configs from a shared `providers.jsonc` would be more machinery than this problem needs today.

- **[Repository layout]** The agent setup owns the repository root while the MCP setup is split. Agent-only files (`opencode.jsonc`, `pi-models.json`, `pi-settings.json`, `tmux.conf`, `claude-plugins-bootstrap.sh`) sit at root, as does the shared `bashrc.agent`; MCP files are split between root (`Dockerfile.mcp`, `entrypoint-mcp.sh`) and `mcp/` (`opencode.jsonc`, `SYSTEM_PROMPT.md`, `AGENTS.md`, vendor). `agents/` is also shared configuration, not “the agent container,” which makes the naming misleading. The same filename `opencode.jsonc` refers to two different services.
  **Suggestion**: Pick one convention and document it. Either (a) root means agent plus shared files, and rename the root source config to `opencode.agent.jsonc` for clarity while keeping the in-image target name `opencode.jsonc`; or (b) use symmetric `agent/` and `mcp/` directories with per-service Dockerfiles and entrypoints, keeping truly shared files at root. The smallest step is moving `entrypoint-mcp.sh` and optionally `Dockerfile.mcp` under `mcp/`, then updating Compose `dockerfile:` and COPY paths.

- **[docker-compose.yml:7-9, 29-31; bashrc.agent:8, 20; Dockerfile.agent:3-5; Dockerfile.mcp:3-5]** Username and UID/GID handling is inconsistent. Compose parameterizes the user as `${USER}` and hardcodes host UID/GID 501/20, while `bashrc.agent` hardcodes `/home/tadeas` in the Claude alias and PATH, and the Dockerfiles default to different values (1000/1000 vs 501/20). With any other `USER` or UID, the Claude alias points to a nonexistent file, `~/.local/bin` is missing from PATH, and files created in mounted workspaces get the wrong owner. This directly conflicts with the repository rule “Keep paths and usernames consistent across Dockerfiles, shell configuration, entrypoints, and Compose build arguments.”
  **Suggestion**: Use `$HOME` in `bashrc.agent` (`--append-system-prompt-file "$HOME/.claude/..."`, `PATH="$HOME/.local/bin:..."`). Define one UID/GID/username default or require it explicitly (`${USER:?}`, `${HOST_UID:?}`), and use it in both services. If the repository is intentionally macOS/tadeas-only, document that and remove the `${USER}` parameterization.

- **[Dockerfile.mcp:30-38, 54]** The MCP image starts from `node:24-bookworm-slim`, which already provides Node 24, then clones nvm and installs Node 24 again as root before switching to `USER` at line 54. As a result, `/home/$USERNAME/.nvm` and every global npm package are root-owned. The runtime user can execute them but cannot run `nvm` or `npm install -g` without permission errors. The agent image performs the equivalent installs as the unprivileged user. This is both an ownership inconsistency and an unnecessary second Node runtime.
  **Suggestion**: Drop nvm from the MCP image and use the base image’s Node; install `supergateway`, `@modelcontextprotocol/server-filesystem`, and `@opencode/cli` system-wide before `USER`, then remove the nvm source from `entrypoint-mcp.sh` and make the bashrc nvm source conditional. If nvm is required, `chown -R $USERNAME:$USERNAME /home/$USERNAME/.nvm` and run the nvm/npm installs as `USER`. Pin package versions either way.

- **[Dockerfile.agent:75, 77; Dockerfile.agent:60-65; Dockerfile.mcp:34-38; Dockerfile.agent:1; Dockerfile.mcp:1]** Several external installs are unpinned: the uv installer is piped from the network to `sh`, the vim configuration is cloned from the default branch, all npm globals are unversioned, Node `24` floats within the major, and both base images are tag-only. This conflicts with the repository’s own security requirement to avoid unpinned remote content and its convention to pin externally installed tool versions.
  **Suggestion**: Pin the uv version and verify the installer artifact, pin the vim repository to a commit, install npm packages as `pkg@x.y.z`, pin the Node minor, and optionally pin base image digests. The `curl | sh` path is the highest-risk item and should be fixed first.

- **[mcp/opencode.jsonc:9-11]** The `external_directory` deny applies to file tools, but the default policy still allows `shell`, `webfetch`, and `websearch`. OpenCode documentation states that shell runs with the user’s filesystem, process, and network authority and that directory inference from command text is best effort. The MCP container has Slack, Apify, Google, and GitHub tokens in its environment and OAuth state under `~/.local/share/opencode`; a prompt injection from vault content could ask the agent to read those values via shell. The deny gives a false sense of confinement.
  **Suggestion**: If vault confinement is a goal, add explicit `shell` rules (deny by default, allow a narrow set) and consider restricting `webfetch`/`websearch`. If full shell access is intentional, document that `external_directory` only covers file tools and that container isolation, not this rule, is the real boundary.

### 🟡 Minor

- **[Repository root]** There is no `.dockerignore`. Both builds use the repository root as context, so `.git`, `.env`, `.DS_Store` files, and the 32 MB Slack binaries are sent to the Docker daemon on every build. No secret is currently copied into an image, but `.env` exposure to the daemon is unnecessary, and `.DS_Store` files are copied into `~/.agents` by `COPY agents`.
  **Suggestion**: Add `.dockerignore` with `.git`, `.env`, `.env.*`, `**/.DS_Store`, and review output. Keep `mcp/slack` because the MCP build needs it, or give the MCP service a separate build context.

- **[docker-compose.yml:37-39]** The MCP service persists `~/.local/share/opencode` in a named volume, but the agent service has no equivalent volume. Recreating the agent container loses OpenCode sessions, saved approvals, and any future MCP OAuth credentials.
  **Suggestion**: If sessions should survive `docker compose down`, add a named volume for the agent’s OpenCode data. If ephemeral behavior is intentional, state it in `AGENTS.md`.

- **[Dockerfile.mcp:28; bashrc.agent:8-9, 20]** The MCP image copies `bashrc.agent`, but it does not install `claude` or `codex`; those aliases fail if used, and the PATH references a `~/.local/bin` that the MCP image does not populate.
  **Suggestion**: Create a `bashrc.mcp` containing only common settings, or guard the aliases with `command -v` and source nvm only when present.

- **[entrypoint-mcp.sh:11; AGENTS.md:11-14]** Log and documentation labels have drifted from the implementation. The log says “mcp-proxy (SSE bridge)” but runs `supergateway` with `streamableHttp`; the root guide says the entrypoint stops “both” processes although there are now three children (Supergateway, socat, OpenCode); the layout section does not mention `pi-models.json`, `pi-settings.json`, or `ponytail/`. `mcp/AGENTS.md` spells “GitHub” while `agents/AGENTS.md` spells “Github.”
  **Suggestion**: Update the log labels and the root guide to match the actual processes and assets. Use one spelling of GitHub so the duplicated policy reads consistently.

- **[docker-compose.yml:33; entrypoint-mcp.sh:12]** The filesystem MCP endpoint on port 3000 has no authentication. It is bound to host loopback, which is a reasonable local trust boundary, but unlike OpenCode on port 4097 it has no password. Any local process can read and write the vault through it.
  **Suggestion**: Document the local-trust assumption. If external local clients only need read access, consider a read-only filesystem server or an authenticating proxy. Otherwise leave it as is.

- **[mcp/opencode.jsonc:20, 44; docker-compose.yml:36; entrypoint-mcp.sh:16]** The OAuth callback port is coupled across three files: the MCP config expects 4098, Compose maps host 4098 to container 4099, and socat bridges 4099 back to 4098. Changing the port requires three coordinated edits. The Compose comment explains the bridge, but the config does not point to it.
  **Suggestion**: Add a note near the OAuth entries in `mcp/opencode.jsonc` pointing at the Compose/entrypoint bridge, or parameterize the published port and socat target through an environment variable if this is expected to change.

- **[mcp/google-calendar/server.mjs:28]** The Google Calendar access key is placed in the URL query string. URLs are commonly logged by proxies and Apps Script, so the key can leak into logs.
  **Suggestion**: If the Apps Script endpoint can read a request header (for example `X-Access-Key`), send the key there. Otherwise document the logging risk and keep the key scoped and rotatable.

- **[.gitignore:1-2]** Only `.env` is ignored. A `.env.local` or `.env.production` containing secrets could be committed accidentally.
  **Suggestion**: Ignore `.env*` and allowlist `.env.example` if one is added.

### 🔵 Completeness

- **[Repository]** There are no automated checks. JSON and shell syntax pass manually, but the provider duplication, model-list consistency, and OAuth port coupling have no guard. `docker compose config` and image builds were not run in this environment because Docker is unavailable.
  **Suggestion**: Add a small `scripts/check.sh` or Makefile target that runs `jq empty` on all configs, `bash -n` on all shell scripts, diffs the provider blocks and model ID sets between `opencode.jsonc`, `mcp/opencode.jsonc`, and `pi-models.json`, and runs `docker compose config -q`. No test framework is needed.

- **[mcp/SYSTEM_PROMPT.md:1; mcp/AGENTS.md]** The system prompt tells the chief-of-staff to follow `AGENTS.md`. The image supplies `mcp/AGENTS.md`, but that file contains only GitHub rules. The root guide says `/data/AGENTS.md` supplies the ambient vault instructions, but that file lives in the mounted vault and cannot be verified from this repository. If it is absent, the agent receives the system prompt and GitHub rules but no vault operating instructions.
  **Suggestion**: Document the required `/data/AGENTS.md` in the root guide or ship a minimal fallback in the image. Keep vault-specific content out of the image.

- **[AGENTS.md:5-15]** The intentional differences between the agent and MCP configurations are not documented. A future edit could “fix” the divergence by copying one config over the other, removing the chief-of-staff, MCP servers, or ponytail by accident.
  **Suggestion**: Add a short “Agent vs MCP” table to `AGENTS.md` listing what must stay in sync (provider/model list, OpenCode config target, password/port conventions) and what must differ (MCP servers, agent definitions, plugins, skills).

### 🟢 Positive Observations

- The provider blocks are byte-identical today, and the four model IDs match between both OpenCode configs and `pi-models.json`.
- Both OpenCode configs use the V2 configuration shape correctly: `providers`, `plugins`, `mcp.servers`, `agents`, `default_agent`, and `permissions` all match the V2 documentation. The `{file:SYSTEM_PROMPT.md}` reference resolves relative to the config file.
- Agent skills are discovered through OpenCode’s global compatibility path (`~/.agents/skills`), so the lack of an explicit OpenCode skills symlink is not a bug.
- Both entrypoints fail closed when `OPENCODE_SERVER_PASSWORD` is missing.
- Both services publish ports on `127.0.0.1` only; no secret literal appears in the reviewed configuration and scripts.
- `entrypoint-mcp.sh` uses `trap` plus `wait -n` to stop the three supervised processes when any sibling exits, and the OAuth bridge is explained in Compose.
- The Slack MCP is restricted to read-oriented tools through `SLACK_MCP_ENABLED_TOOLS`; no message-posting tool is enabled.
- The Slack binaries are vendored with a version and SHA-256 digests; the digests match the tracked files. Ponytail is vendored with an upstream commit.
- The images use `COPY --chown`, create a non-root user, and run the application processes as that user.

## Test Coverage Assessment

There is no test suite, consistent with the repository guide. The following checks were run during this review:

- `jq empty` on `opencode.jsonc`, `mcp/opencode.jsonc`, `pi-models.json`, `pi-settings.json`, and `agents/settings.json`: passed.
- `bash -n` on `entrypoint-agent.sh`, `entrypoint-mcp.sh`, `claude-plugins-bootstrap.sh`, and `bashrc.agent`: passed.
- `git diff --check`: clean.
- `jq -S .providers` diff between the two OpenCode configs: empty.
- Model ID sets in both OpenCode configs and `pi-models.json`: identical.
- Slack binary `--help` confirms the `-no-cache` and `--transport stdio` flags; README SHA-256 values match.
- `docker compose config` and image builds were not run because Docker is unavailable in this environment.

The highest-value additions are a provider/model consistency check and a Compose validation step. They are cheap and would have caught the main drift risks identified above.

## Recommendations

1. Document and enforce configuration ownership: either move `entrypoint-mcp.sh`/`Dockerfile.mcp` under `mcp/` and rename the root OpenCode config, or add an explicit ownership table to `AGENTS.md`.
2. Add a small config check that diffs the provider blocks and model ID sets, and run it alongside `docker compose config`.
3. Fix the username/UID parameterization: use `$HOME` in `bashrc.agent`, align Dockerfile defaults, and require or default the Compose variables.
4. Remove the duplicate Node/nvm install from the MCP image or chown the nvm tree and install as the runtime user.
5. Pin the uv installer, vim repository, npm globals, Node minor, and ideally base image digests.
6. Decide whether OpenCode data should persist for the agent, add `.dockerignore`, update stale log/doc labels, and document the `external_directory`/shell security boundary.

## Files Reviewed

| File | Lines | Notes |
| --- | --- | --- |
| `AGENTS.md` | 51 | Root guide; layout and validation rules |
| `Dockerfile.agent` | 83 | Agent image; nvm/npm as user; unpinned installs |
| `Dockerfile.mcp` | 55 | MCP image; base Node plus nvm as root |
| `docker-compose.yml` | 53 | Services, ports, mounts, env, persistence |
| `entrypoint-agent.sh` | 14 | Password gate and OpenCode start |
| `entrypoint-mcp.sh` | 27 | Three-process supervision and OAuth bridge |
| `bashrc.agent` | 21 | Shared shell config; hardcoded paths |
| `claude-plugins-bootstrap.sh` | 29 | Runtime Claude plugin install |
| `opencode.jsonc` | 17 | Agent OpenCode config |
| `pi-models.json` | 16 | Pi provider/model metadata |
| `pi-settings.json` | 3 | Pi thinking level |
| `tmux.conf` | 7 | Agent tmux settings |
| `agents/AGENTS.md` | 15 | Shared agent instructions |
| `agents/settings.json` | 43 | Claude settings and plugin marketplaces |
| `agents/sr_opus_5_system_prompt.md` | 140 | Claude system prompt |
| `mcp/AGENTS.md` | 8 | MCP GitHub rules |
| `mcp/SYSTEM_PROMPT.md` | 3 | Chief-of-staff system prompt |
| `mcp/opencode.jsonc` | 71 | MCP OpenCode config |
| `mcp/google-calendar/server.mjs` | 128 | Local calendar MCP server |
| `mcp/slack/README.md` | 14 | Slack binary provenance and checksums |
| `ponytail/VENDORED.md` | 13 | Vendored dependency provenance |
| `.gitignore` | 2 | Ignores `.DS_Store` and `.env` |
