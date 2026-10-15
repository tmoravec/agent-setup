// ponytail — OpenCode V2 plugin.
//
// Ports the V1 plugin in ../ponytail.mjs to the V2 plugin API:
//   - registers the ponytail slash commands from .opencode/command/*.md
//   - registers the ponytail skills from skills/*/SKILL.md
//   - appends the ponytail ruleset to the system prompt on every agent-loop
//     request, at the active intensity
//
// V2 loads a local plugin from a directory containing an index.* entrypoint.
// Point OpenCode at this directory from opencode.json(c):
//   { "plugins": ["/opt/ponytail/.opencode/plugins/ponytail"] }
//
// The shared instruction builders stay CommonJS; this ES module bridges to them
// so Claude Code, Codex, pi, and OpenCode all read one source of truth.

import { Plugin } from "@opencode/plugin";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const require = createRequire(import.meta.url);
const { getPonytailInstructions } = require("../../../hooks/ponytail-instructions");
const { getDefaultMode, normalizePersistedMode } = require("../../../hooks/ponytail-config");
const { parseCommandFile } = require("../ponytail-frontmatter.cjs");

const root = path.resolve(__dirname, "../../..");
const commandDir = path.join(root, ".opencode", "command");
const skillsDir = path.join(root, "skills");

// OpenCode has no flag-file convention of its own; keep mode beside its config.
const statePath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "opencode",
  ".ponytail-active",
);

function readMode() {
  try {
    return normalizePersistedMode(fs.readFileSync(statePath, "utf8").trim()) || getDefaultMode();
  } catch {
    return getDefaultMode();
  }
}

function writeMode(mode) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, mode);
}

function readSkill(dir) {
  const file = path.join(dir, "SKILL.md");
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim() || path.basename(dir);
  // description is either a single line or a folded block (`description: >`).
  const folded = frontmatter.match(/description:\s*>([\s\S]*)/)?.[1];
  const description = folded
    ? folded.replace(/\r?\n\s+/g, " ").trim()
    : frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  return {
    id: path.basename(dir),
    name,
    description,
    path: file,
    content: content.replace(/^---[\s\S]*?---\r?\n?/, "").trim(),
  };
}

export default Plugin.define({
  id: "ponytail",
  async setup(ctx) {
    // Slash commands from the shared command directory.
    const commands = [];
    try {
      for (const file of fs.readdirSync(commandDir).filter((f) => f.endsWith(".md"))) {
        const parsed = parseCommandFile(path.join(commandDir, file));
        if (parsed) commands.push({ name: path.basename(file, ".md"), ...parsed });
      }
    } catch {}

    if (commands.length > 0) {
      await ctx.command.transform((editor) => {
        for (const command of commands) {
          editor.add({
            name: command.name,
            description: command.description,
            execute: async ({ sessionID, prompt, delivery }) => {
              const args = String(prompt.text || "").trim();
              // `/ponytail <level>` persists the level for the next turn, the
              // same job the V1 command.execute.before hook did.
              if (command.name === "ponytail") {
                const mode = args ? normalizePersistedMode(args) : getDefaultMode();
                if (mode) writeMode(mode);
              }
              await ctx.session.prompt({
                ...prompt,
                sessionID,
                text: String(command.template || "").replaceAll("$ARGUMENTS", args),
                delivery,
              });
            },
          });
        }
      });
    }

    // Skills from the shared skills directory.
    const skills = [];
    try {
      for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skill = readSkill(path.join(skillsDir, entry.name));
        if (skill) skills.push(skill);
      }
    } catch {}

    if (skills.length > 0) {
      await ctx.skill.transform((editor) => {
        for (const skill of skills) {
          if (!editor.get(skill.id)) editor.add(skill);
        }
      });
    }

    // Append the ruleset to the system prompt on every agent-loop request.
    await ctx.session.hook("context", (event) => {
      const mode = readMode();
      if (mode === "off") return;
      event.system.push({ type: "text", text: getPonytailInstructions(mode) });
    });
  },
});
