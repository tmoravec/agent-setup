FROM node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5

ARG HOST_UID=501
ARG HOST_GID=20
ARG USERNAME=tadeas
ARG TARGETARCH

RUN echo 'APT::Install-Recommends "false";\nAPT::Install-Suggests "false";' \
    > /etc/apt/apt.conf.d/99no-recommends

RUN apt-get update
RUN apt-get install -y locales curl ca-certificates
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN locale-gen

RUN mkdir -p -m 755 /etc/apt/keyrings \
	&& curl -fsSL -o /etc/apt/keyrings/github-cli-archive-keyring.gpg \
		https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	&& chmod go+r /etc/apt/keyrings/github-cli-archive-keyring.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/github-cli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
		> /etc/apt/sources.list.d/github-cli.list \
	&& apt-get update \
	&& apt-get install -y git vim ripgrep socat gh

RUN groupadd -g $HOST_GID --non-unique $USERNAME
RUN useradd -m -u $HOST_UID -g $HOST_GID --non-unique -s /bin/bash $USERNAME

COPY --chown=$USERNAME:$USERNAME shared/bashrc /home/$USERNAME/.bashrc

RUN mkdir -p /home/$USERNAME/.config/opencode /home/$USERNAME/.local/share/opencode \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME/.config /home/$USERNAME/.local
COPY --chown=$USERNAME:$USERNAME vault/opencode.jsonc /home/$USERNAME/.config/opencode/opencode.jsonc
COPY --chown=$USERNAME:$USERNAME vault/SYSTEM_PROMPT.md /home/$USERNAME/.config/opencode/SYSTEM_PROMPT.md
COPY --chown=$USERNAME:$USERNAME vault/AGENTS.md /home/$USERNAME/.config/opencode/AGENTS.md

COPY vault/slack/slack-mcp-server-linux-${TARGETARCH} /usr/local/bin/slack-mcp-server
RUN chmod +x /usr/local/bin/slack-mcp-server

WORKDIR /app
COPY --chown=$USERNAME:$USERNAME vault/entrypoint.sh /app/entrypoint.sh
COPY --chown=$USERNAME:$USERNAME vault/google-calendar/server.mjs /app/google-calendar-server.mjs
RUN chmod +x /app/entrypoint.sh

USER $USERNAME

# Use the base image's Node runtime. Install global packages under the
# unprivileged user so they remain writable at runtime.
ENV HOME=/home/tadeas
ENV NPM_CONFIG_PREFIX=/home/tadeas/.npm-global
ENV PATH=/home/tadeas/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN npm install -g supergateway@4.2.0 @modelcontextprotocol/server-filesystem@1.0.0 @opencode/cli@2.0.32

CMD ["/app/entrypoint.sh"]
