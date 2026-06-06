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
  id: "battle-ascending",
  title: "배틀 오름차순",
  summary: "랜덤으로 뽑은 숫자를 상대 시트에 기입해 오름차순을 최대한 길게 배열하는 1:1 숫자 전략 게임",
  rules: [
    "배틀 오름차순은 랜덤으로 뽑은 숫자를 서로의 시트에 기입해, 오름차순으로 이어진 칸을 최대한 길게 만드는 1:1 게임입니다.",
    "각 플레이어는 순서대로 번갈아가며 한 명씩 투표룸에 입장합니다.",
    "입장한 플레이어는 1부터 10까지의 카드 중 두 장을 랜덤으로 뽑습니다.",
    "한 플레이어가 뽑은 두 장의 카드는 모니터를 통해 상대 플레이어에게도 고지됩니다.",
    "투표룸에 있는 플레이어는 두 장 중 한 장을 선택해 본인의 원하는 칸에 해당 숫자를 기입합니다.",
    "선택하지 않은 카드는 자동으로 상대방에게 넘어갑니다.",
    "상대 플레이어는 본인의 시트에서 원하는 칸에 넘겨받은 숫자를 기입합니다.",
    "같은 방식으로 각 플레이어의 시트 칸이 모두 채워질 때까지 턴을 반복합니다.",
    "게임 종료 시 각 플레이어의 시트에서 오름차순으로 이어진 칸의 개수를 확인합니다.",
    "오름차순은 낮은 숫자에서 높은 숫자로 이어지는 배열이며, 연속된 동일 숫자도 오름차순으로 인정합니다.",
    "오름차순으로 이어진 칸의 개수가 가장 많은 구간의 길이가 해당 플레이어의 승점이 됩니다.",
    "예를 들어 5, 7, 8, 9처럼 이어진 구간은 4점으로 계산하며, 5, 7, 8, 8, 9처럼 같은 숫자가 연속되어도 이어진 것으로 인정합니다.",
    "숫자를 어느 칸에 넣을지는 각 플레이어가 자유롭게 선택할 수 있으나, 한 번 기입한 숫자는 옮길 수 없습니다.",
    "상대에게 어떤 숫자를 넘길지와 자신의 시트 어디에 숫자를 배치할지가 핵심 전략입니다.",
    "승점이 더 높은 플레이어가 데스매치에서 승리합니다.",
  ],
  win_condition: "오름차순으로 이어진 가장 긴 구간의 칸 수가 더 많은 플레이어가 승리",
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
