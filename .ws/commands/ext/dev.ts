import { z } from "zod";
import { spawn } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";

export default {
  name: "ext_dev",
  label: "Watch-build extension",
  description: "Watch-build a Chrome extension (vite build --watch).",
  factory: (workspace) => {
    const exts = workspace.withTag("extension");
    const names = exts.map((p) => p.name) as [string, ...string[]];

    return {
      flags: {
        name: z
          .enum(names)
          .optional()
          .describe(`Extension to watch (default: first). Valid: ${names.join(", ")}`),
      },
      handler: async (args) => {
        try {
          const target = args.name
            ? exts.find((e) => e.name === args.name)
            : exts[0];
          if (!target) return fail("No extension matched.");

          const child = spawn(pnpm, ["run", "dev"], {
            cwd: target.dir,
            stdio: "inherit",
            detached: true,
            shell: platform() === "win32",
          });
          child.unref();

          return ok(
            `Watch-build started for ${target.name} (PID ${child.pid})\n` +
            `Cwd: ${target.dir}\n` +
            `Reload the extension in chrome://extensions after changes.`
          );
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
