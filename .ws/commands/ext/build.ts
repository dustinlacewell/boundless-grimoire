import { z } from "zod";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";

export default {
  name: "ext_build",
  label: "Build extension",
  description: "Build a Chrome extension package (production).",
  factory: (workspace) => {
    const exts = workspace.withTag("extension");
    const names = exts.map((p) => p.name) as [string, ...string[]];

    return {
      flags: {
        name: z
          .enum(names)
          .optional()
          .describe(`Extension to build (default: all). Valid: ${names.join(", ")}`),
      },
      handler: async (args) => {
        try {
          const targets = args.name
            ? exts.filter((e) => e.name === args.name)
            : exts;
          if (targets.length === 0) return fail("No extensions matched.");

          const lines: string[] = [];
          for (const ext of targets) {
            lines.push(`-> ${ext.name} (${ext.dir})`);
            const res = spawnSync(pnpm, ["run", "build"], {
              cwd: ext.dir,
              stdio: "inherit",
              shell: platform() === "win32",
            });
            if (res.status !== 0) {
              return fail(`Build failed for ${ext.name} (exit ${res.status})`);
            }
            lines.push(`   ok`);
          }
          return ok(lines.join("\n"));
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
