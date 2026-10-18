import { createInterface } from "node:readline";

const appsScriptUrl = process.env.GCAL_APPS_SCRIPT_URL;
const accessKey = process.env.GCAL_ACCESS_KEY;

if (!appsScriptUrl || !accessKey) {
  console.error("GCAL_APPS_SCRIPT_URL and GCAL_ACCESS_KEY must be set");
  process.exit(1);
}

const tool = {
  name: "get_calendar_events",
  description:
    "Read upcoming events from the user's Google Calendar (read-only). Returns JSON with a range and a list of events. Use when the user asks about their meetings, availability, or calendar.",
  inputSchema: {
    type: "object",
    properties: {
      days: {
        type: "number",
        description: "How many days ahead to fetch, 1-31. Default 7 if omitted.",
      },
    },
  },
};

async function getCalendarEvents(args) {
  const days = Math.min(Math.max(parseInt(args?.days, 10) || 7, 1), 31);
  const url = `${appsScriptUrl}?key=${encodeURIComponent(accessKey)}&days=${days}`;
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.text();

  if (body.trim() === "401") {
    throw new Error("Gateway rejected the access key.");
  }
  if (!response.ok || body.trim().startsWith("<")) {
    throw new Error(
      `Gateway error (HTTP ${response.status}). Check the web app is deployed at /exec with access "Anyone".`,
    );
  }

  return JSON.parse(body);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

const handlers = {
  initialize(params) {
    return {
      protocolVersion: params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "google-calendar", version: "1.0.0" },
    };
  },

  ping() {
    return {};
  },

  "tools/list"() {
    return { tools: [tool] };
  },

  async "tools/call"(params) {
    if (params?.name !== tool.name) {
      throw new Error(`Unknown tool: ${params?.name}`);
    }

    try {
      const data = await getCalendarEvents(params.arguments ?? {});
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  },
};

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });

lines.on("line", async (line) => {
  if (!line.trim()) return;

  let message;
  try {
    message = JSON.parse(line);
  } catch {
    console.error("Ignoring invalid JSON input");
    return;
  }

  if (message.id === undefined) return;

  const handler = handlers[message.method];
  if (!handler) {
    replyError(message.id, -32601, `Method not found: ${message.method}`);
    return;
  }

  try {
    reply(message.id, await handler(message.params ?? {}));
  } catch (error) {
    replyError(
      message.id,
      -32603,
      error instanceof Error ? error.message : String(error),
    );
  }
});
