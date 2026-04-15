import { spawn } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";

export default {
  name: "site_dev",
  label: "Dev server",
  description: "Start the Astro dev server for the marketing site (includes /demo route).",
  factory: (workspace) => {
    const sites = workspace.withTag("site");

    return {
      handler: async () => {
        try {
          const target = sites[0];
          if (!target) return fail("No site project found.");

          const child = spawn(pnpm, ["run", "dev"], {
            cwd: target.dir,
            stdio: "inherit",
            detached: true,
            shell: platform() === "win32",
          });
          child.unref();

          return ok(
            `Dev server started for ${target.name} (PID ${child.pid})\n` +
            `Cwd: ${target.dir}`,
          );
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
