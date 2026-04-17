import { spawn } from "node:child_process";
import { platform } from "node:os";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";

function extractUrl(line: string): string | null {
  const match = line.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

export default {
  name: "site_dev",
  label: "Dev server",
  description: "Start the Astro dev server for the marketing site (includes /demo route).",
  factory: (workspace) => {
    const sites = workspace.withTag("site");

    return {
      handler: () => {
        return new Promise((resolve) => {
          try {
            const target = sites[0];
            if (!target) return resolve(fail("No site project found."));

            const child = spawn(pnpm, ["run", "dev"], {
              cwd: target.dir,
              stdio: ["ignore", "pipe", "pipe"],
              detached: true,
              shell: platform() === "win32",
            });

            let url: string | null = null;

            const onData = (chunk: Buffer) => {
              for (const line of chunk.toString().split("\n")) {
                url ??= extractUrl(line);
              }
              if (url) {
                child.stdout?.off("data", onData);
                child.stderr?.off("data", onData);
                child.unref();
                resolve(ok(
                  `Dev server started for ${target.name} (PID ${child.pid})\n` +
                  `Local: ${url}`,
                ));
              }
            };

            child.stdout?.on("data", onData);
            child.stderr?.on("data", onData);

            child.on("error", (e) => resolve(fail(e)));
          } catch (e) {
            resolve(fail(e));
          }
        });
      },
    };
  },
} satisfies DynamicCommandDef;
