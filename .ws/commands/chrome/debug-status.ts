import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail, execRaw } from "@ldlework/workmark/helpers";

export default {
  name: "chrome_debug_status",
  label: "Status",
  description:
    "Check if the debug Chrome instance is running and show profile/extension status.",
  factory: (workspace) => ({
    handler: async () => {
      try {
        const profileDir = join(workspace.root, ".chrome-debug");
        const extensions = workspace.withTag("extension");
        const lines: string[] = [];

        const profileExists = existsSync(profileDir);
        lines.push(`Profile: ${profileDir}`);
        lines.push(`Profile exists: ${profileExists}`);

        if (profileExists) {
          const hasDefault = existsSync(join(profileDir, "Default"));
          lines.push(`Profile initialized: ${hasDefault}`);
        }

        lines.push("");
        lines.push("Extensions:");
        for (const ext of extensions) {
          const dist = join(ext.dir, "dist");
          const built = existsSync(dist);
          lines.push(`  ${ext.name}: ${built ? "built" : "not built"}`);
        }

        lines.push("");
        try {
          const tasklist = execRaw(
            `tasklist //FI "IMAGENAME eq chrome.exe" //FO CSV //NH 2>/dev/null | head -5`,
            { cwd: workspace.root, timeout: 5_000 },
          );
          const chromeRunning = tasklist.includes("chrome.exe");
          lines.push(`Chrome processes running: ${chromeRunning ? "yes" : "no"}`);
        } catch {
          lines.push("Chrome processes running: unknown (tasklist failed)");
        }

        return ok(lines.join("\n"));
      } catch (e) {
        return fail(e);
      }
    },
  }),
} satisfies DynamicCommandDef;
