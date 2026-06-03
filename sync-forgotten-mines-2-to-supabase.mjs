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
  id: "forgotten-mines-2",
  title: "망각의 지뢰2",
  summary: "지뢰와 시한폭탄의 위치를 암기하며 보물과 점수를 노리는 전략 이동 게임",
  rules: [
    "게임판은 가로 11칸, 세로 11칸으로 구성됩니다. 중앙과 대각선으로 마주보는 모서리 세 곳에는 보물이 배치됩니다.",
    "보물 칸 이외의 마주보는 두 모서리 칸이 각 플레이어의 출발 지점이며, 각 플레이어는 자신의 말을 출발 지점에 놓고 시작합니다.",
    "각 플레이어는 제한 시간 10분 안에 자신의 지뢰와 시한폭탄 위치를 정해 비공개로 제출합니다.",
    "지뢰는 각 플레이어에게 12개씩 제공됩니다. 지뢰는 각 1점의 가치를 가집니다.",
    "시한폭탄은 각 플레이어에게 3개씩 제공됩니다. 시한폭탄은 각 2점의 가치를 가지며, 설치된 칸을 포함한 9칸에 폭발 효과를 줍니다.",
    "지뢰와 시한폭탄은 한 칸에 하나씩만 설치할 수 있습니다.",
    "지뢰와 시한폭탄은 자신과 상대의 출발 지점으로부터 가로/세로 2칸 반경, 보물 칸을 제외한 구역에만 설치할 수 있습니다.",
    "지뢰가 설치된 칸의 개수는 공개되지만 위치는 게임판에 표시되지 않습니다. 플레이어는 지뢰 위치를 암기해야 하며 필기 도구는 사용할 수 없습니다.",
    "추첨으로 선후공을 정합니다. 자신의 차례에는 말을 상하좌우와 대각선 인접 8칸 중 한 곳으로 이동할 수 있습니다.",
    "상대방의 말이 놓인 칸으로는 이동할 수 없습니다.",
    "이동한 칸에 지뢰나 폭탄이 없으면, 주변 인접 8칸에 존재하는 지뢰와 폭탄의 개수만큼 점수를 얻습니다.",
    "한 칸에 2개의 지뢰가 존재한다면 해당 칸은 2점으로 계산합니다. 단, 누군가 밟아 점수를 획득한 칸은 다시 밟아도 점수를 얻을 수 없습니다.",
    "지뢰를 밟으면 설치한 플레이어가 누구든 즉시 5점이 감점됩니다.",
    "지뢰를 밟은 플레이어는 자신의 출발지 주변 3칸 중 1칸으로 강제 이동합니다.",
    "밟힌 지뢰는 제거됩니다. 한 칸에 지뢰 2개가 배치된 경우 두 지뢰 모두 제거됩니다.",
    "지뢰와 폭탄이 함께 배치된 칸을 밟은 경우 지뢰만 제거됩니다.",
    "각 시한폭탄에는 1~3번 번호가 부여됩니다.",
    "플레이어가 n번 시한폭탄 발동을 선언하면, 상대 플레이어의 2턴 뒤 해당 폭탄이 폭발합니다.",
    "폭발 범위 안에 있는 플레이어는 5점이 감점되며 출발 존으로 말을 되돌립니다.",
    "출발 구역 칸은 시한폭탄 폭발 피해를 받지 않습니다.",
    "시한폭탄이 폭발해도 주변 지뢰는 제거되지 않습니다.",
    "발동되지 않은 시한폭탄을 밟은 경우 작동하지 않으며, 해당 칸을 제외한 인접 8칸의 점수를 획득합니다.",
    "시한폭탄은 한 턴에 여러 개를 발동할 수 없습니다.",
    "보물이 있는 칸에 도착하면 발견 순서에 따라 첫 번째 +15점, 두 번째 +20점, 세 번째 +25점을 획득합니다.",
    "획득한 보물은 사라지며, 해당 칸을 다시 밟아도 승점을 다시 얻을 수 없습니다.",
    "게임은 3개의 보물이 모두 발견되거나 70턴을 초과하면 종료됩니다.",
  ],
  win_condition: "게임 종료 시점에 승점이 더 높은 플레이어가 승리",
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
