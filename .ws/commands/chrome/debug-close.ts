import { execSync } from "node:child_process";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

export default {
  name: "chrome_debug_close",
  label: "Close",
  description: "Kill the debug Chrome instance (matches by user-data-dir).",
  factory: (workspace) => ({
    handler: async () => {
      try {
        const ps = `
$procs = Get-CimInstance Win32_Process -Filter "name='chrome.exe'" |
  Where-Object { $_.CommandLine -like '*.chrome-debug*' }
if ($procs) {
  $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Write-Output "Killed $($procs.Count) debug Chrome process(es)."
} else {
  Write-Output "No debug Chrome processes found."
}
`;
        const output = execSync(ps, {
          shell: "powershell.exe",
          cwd: workspace.root,
          timeout: 15_000,
          encoding: "utf-8",
        });
        return ok(output.trim());
      } catch (e) {
        return fail(e);
      }
    },
  }),
} satisfies DynamicCommandDef;
