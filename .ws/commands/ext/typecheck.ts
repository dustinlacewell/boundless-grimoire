import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";

export default {
  name: "ext_typecheck",
  label: "Typecheck extension",
  description: "Run tsc --noEmit on the Chrome extension.",
  factory: (workspace) => {
    const exts = workspace.withTag("extension");
    const names = exts.map((p) => p.name) as [string, ...string[]];

    return {
      handler: async () => {
        try {
          const lines: string[] = [];
          for (const ext of exts) {
            lines.push(`-> ${ext.name}`);
            const res = spawnSync(pnpm, ["run", "typecheck"], {
              cwd: ext.dir,
              stdio: "inherit",
              shell: platform() === "win32",
            });
            if (res.status !== 0) return fail(`Typecheck failed for ${ext.name} (exit ${res.status})`);
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
