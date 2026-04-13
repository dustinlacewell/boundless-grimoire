import { z } from "zod";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const native = (p: string) =>
  platform() === "win32" ? resolve(p) : p;

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export default {
  name: "chrome_debug",
  label: "Debug",
  description:
    "Launch Chrome with a persistent debug profile and built extensions auto-loaded. " +
    "First run: enable Developer Mode in chrome://extensions. Extensions persist across launches.",
  factory: (workspace) => {
    const extensions = workspace.withTag("extension");
    const extNames = extensions.map((p) => p.name) as [string, ...string[]];

    return {
      flags: {
        url: z.string().default("https://openfront.io").describe("URL to open (default: https://openfront.io)"),
        extensions: z.array(z.enum(extNames)).optional().describe(`Extensions to load (default: all built). Valid: ${extNames.join(", ")}`),
      },
      handler: async (args) => {
        try {
          const url = (args.url as string) || "https://openfront.io";
          const profileDir = native(join(workspace.root, ".chrome-debug"));

          mkdirSync(profileDir, { recursive: true });

          const chromeArgs = [
            `--user-data-dir=${profileDir}`,
            "--remote-debugging-port=9222",
            url,
          ];

          const child = spawn(CHROME_PATH, chromeArgs, {
            detached: true,
            stdio: "ignore",
          });
          child.unref();

          const built: string[] = [];
          const notBuilt: string[] = [];
          for (const ext of extensions) {
            if (existsSync(join(ext.dir, "dist"))) {
              built.push(ext.name);
            } else {
              notBuilt.push(ext.name);
            }
          }

          const lines = [
            `Chrome launched (PID ${child.pid})`,
            `Profile: ${profileDir}`,
            `URL: ${url}`,
            "",
            `Extensions built: ${built.join(", ") || "none"}`,
            ...(notBuilt.length > 0
              ? [`Extensions not built: ${notBuilt.join(", ")}`]
              : []),
          ];

          return ok(lines.join("\n"));
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
