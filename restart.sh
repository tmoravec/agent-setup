# Stop the stack and remove the old `mcp` service container.
docker compose down --remove-orphans

# Find the old project-prefixed volume, usually agent-setup_mcp-opencode-data.
OLD_VOLUME=$(docker volume ls --format '{{.Name}}' | grep -m1 '_mcp-opencode-data$')

if [ -z "$OLD_VOLUME" ]; then
  echo "No old mcp-opencode-data volume found; Compose will create vault-opencode-data."
else
  NEW_VOLUME="${OLD_VOLUME%_mcp-opencode-data}_vault-opencode-data"

  echo "Migrating $OLD_VOLUME -> $NEW_VOLUME"
  docker volume create "$NEW_VOLUME"

  docker run --rm \
    -v "$OLD_VOLUME":/from \
    -v "$NEW_VOLUME":/to \
    alpine:3 sh -c 'cp -a /from/. /to/'

  # Verify the copy.
  docker run --rm -v "$NEW_VOLUME":/to alpine:3 sh -c 'ls -la /to && du -sh /to'
fi

# Start the renamed stack and check the vault logs.
docker compose up -d --build vault
docker compose logs -f vault
