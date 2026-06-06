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

const game = {
  id: "twelve-shogi",
  title: "십이장기",
  summary: "3x4 장기판에서 작은 기물 4종으로 상대의 왕을 노리는 1:1 미니 장기 게임",
  rules: [
    "십이장기는 가로 3칸, 세로 4칸의 장기판에서 진행하는 1:1 보드게임입니다.",
    "각 플레이어는 왕, 장, 상, 자 4개의 기물을 가지고 시작합니다.",
    "왕은 상하좌우와 대각선 모든 방향으로 1칸 이동할 수 있습니다.",
    "장은 상하좌우 방향으로 1칸 이동할 수 있습니다.",
    "상은 대각선 방향으로 1칸 이동할 수 있습니다.",
    "자는 앞으로 1칸 이동할 수 있습니다.",
    "자가 상대 진영 끝 칸에 도착하면 후로 승격합니다.",
    "후는 뒤쪽 대각선 2방향을 제외한 모든 방향으로 1칸 이동할 수 있습니다.",
    "자기 차례에는 자신의 기물 1개를 이동하거나, 잡아 둔 상대 기물 1개를 판 위에 내려놓을 수 있습니다.",
    "상대 기물이 있는 칸으로 이동하면 그 기물을 잡을 수 있습니다.",
    "잡은 기물은 자신의 기물로 사용할 수 있으며, 내려놓을 때는 자신의 진영 안 빈 칸에만 둘 수 있습니다.",
    "잡은 후를 다시 내려놓을 때는 자로 되돌려 내려놓습니다.",
    "상대의 왕을 잡으면 즉시 승리합니다.",
    "자신의 왕이 상대 진영에 들어간 뒤, 다음 상대 차례에도 잡히지 않고 살아남으면 승리합니다.",
    "같은 판세가 반복되거나 더 이상 승부가 나지 않는다고 판단되면 운영자 판정으로 무승부 또는 재경기를 진행합니다.",
  ],
  win_condition: "상대의 왕을 잡거나, 자신의 왕이 상대 진영에 들어가 한 턴을 버티면 승리",
};

const response = await fetch(`${supabaseUrl}/rest/v1/games?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(game),
});

if (!response.ok) {
  throw new Error(`Supabase upsert failed: ${response.status} ${await response.text()}`);
}

const [savedGame] = await response.json();
console.log(`Synced game: ${savedGame.id}`);
