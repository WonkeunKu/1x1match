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
  id: "color-turn",
  title: "컬러턴",
  summary: "말을 이동할 때마다 색이 바뀌는 보드에서 자신의 색 4개를 먼저 연결하는 1:1 전략 게임",
  rules: [
    "컬러턴은 양면 색깔 말과 색 변환 보드를 이용해 자신의 색 4개를 한 줄로 연결하는 1:1 보드게임입니다.",
    "각 플레이어는 서로 다른 색을 담당합니다.",
    "게임판에는 말을 놓을 수 있는 칸들이 있으며, 각 칸은 말을 올렸을 때 색이 유지되는 칸 또는 색이 뒤집히는 칸으로 구성됩니다.",
    "게임 시작 전 모든 말은 정해진 초기 위치에 배치합니다.",
    "선 플레이어부터 번갈아 차례를 진행합니다.",
    "자기 차례에는 말 1개를 선택해 선으로 연결된 인접한 빈 칸으로 이동합니다.",
    "말이 이동한 칸의 효과에 따라 말의 색이 유지되거나 반대 색으로 뒤집힙니다.",
    "말의 소유권은 따로 정해져 있지 않으며, 현재 보이는 색이 해당 플레이어의 말로 취급됩니다.",
    "자기 차례에는 현재 자신의 색으로 보이는 말 중 하나를 이동해야 합니다.",
    "이동 후 가로, 세로, 대각선 중 한 방향으로 자신의 색 말 4개가 연속으로 연결되면 즉시 승리합니다.",
    "4개 연결은 이동을 마친 뒤 최종 색상 기준으로 판정합니다.",
    "상대의 색 4개가 먼저 만들어지도록 이동한 경우에도, 완성된 4목의 색을 가진 플레이어가 승리합니다.",
    "자신의 차례에 이동할 수 있는 자신의 색 말이 없다면 패배합니다.",
    "같은 판세가 반복되거나 승부가 나지 않는다고 판단되면 운영자 판정으로 무승부 또는 재경기를 진행합니다.",
  ],
  win_condition: "자신의 색 말 4개를 가로, 세로, 대각선 중 한 방향으로 먼저 연결한 플레이어가 승리",
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
