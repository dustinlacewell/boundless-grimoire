import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";

export default {
  name: "site_build",
  label: "Build site",
  description: "Build the marketing site for production.",
  factory: (workspace) => {
    const sites = workspace.withTag("site");

    return {
      handler: async () => {
        try {
          const target = sites[0];
          if (!target) return fail("No site project found.");

          const res = spawnSync(pnpm, ["run", "build"], {
            cwd: target.dir,
            stdio: "inherit",
            shell: platform() === "win32",
          });

          if (res.status !== 0) return fail(`Build failed (exit ${res.status})`);
          return ok(`Built ${target.name}`);
        } catch (e) {
          return fail(e);
        }
      },
    };
  },
} satisfies DynamicCommandDef;
