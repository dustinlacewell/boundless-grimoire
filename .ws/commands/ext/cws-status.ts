import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DynamicCommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const EXTENSION_ID = "penjpgjomhbkcndhilhhkomelnknkcgm";

/** Parse .env file into a key-value map. */
function loadEnv(dir: string): Record<string, string> {
  try {
    const text = readFileSync(join(dir, ".env"), "utf8");
    const env: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const match = line.match(/^(\w+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

/** Mint a fresh access token from the refresh token. */
async function getAccessToken(env: Record<string, string>): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.CHROME_CLIENT_ID,
      client_secret: env.CHROME_CLIENT_SECRET,
      refresh_token: env.CHROME_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token request failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

export default {
  name: "ext_cws_status",
  label: "Chrome Web Store status",
  description: "Check the publish/review status of the extension on the Chrome Web Store.",
  factory: (workspace) => ({
    handler: async () => {
      try {
        const env = loadEnv(workspace.root);
        if (!env.CHROME_CLIENT_ID || !env.CHROME_CLIENT_SECRET || !env.CHROME_REFRESH_TOKEN) {
          return fail("Missing CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, or CHROME_REFRESH_TOKEN in .env");
        }

        const token = await getAccessToken(env);
        const res = await fetch(
          `https://www.googleapis.com/chromewebstore/v1.1/items/${EXTENSION_ID}?projection=DRAFT`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-goog-api-version": "2",
            },
          },
        );
        const json = await res.json();

        const lines: string[] = [];
        lines.push(`Extension: ${json.name ?? EXTENSION_ID}`);
        lines.push(`Status:    ${json.status ?? "unknown"}`);
        if (json.statusDetail) lines.push(`Detail:    ${json.statusDetail}`);
        lines.push(`Version:   ${json.crxVersion ?? "unknown"}`);
        lines.push("");
        lines.push(json.status === "PUBLISHED" ? "Ready for a new release." : "Not ready — wait for review to complete.");

        return ok(lines.join("\n"));
      } catch (e) {
        return fail(e);
      }
    },
  }),
} satisfies DynamicCommandDef;
