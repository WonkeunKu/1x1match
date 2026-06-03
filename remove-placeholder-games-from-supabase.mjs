import { existsSync, readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
  }

  return env;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const placeholderGameIds = ["number-duel", "auction-mind", "signal-lie"];
const query = placeholderGameIds.map((id) => `"${id}"`).join(",");

const response = await fetch(`${supabaseUrl}/rest/v1/games?id=in.(${query})`, {
  method: "DELETE",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation",
  },
});

if (!response.ok) {
  throw new Error(`Supabase delete failed: ${response.status} ${await response.text()}`);
}

const deletedGames = await response.json();
console.log(`Deleted ${deletedGames.length} placeholder games.`);
