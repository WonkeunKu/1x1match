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
  id: "formula-maze",
  title: "수식미로",
  summary: "암기력과 암산으로 숫자 길을 연결해 정답 값을 만드는 1:1 계산 퍼즐 게임",
  rules: [
    "수식미로는 무작위로 적힌 숫자 중 합산을 통해 정답 값을 만들 수 있는 숫자를 찾아, 상대보다 빠르게 길을 완성해야 하는 1:1 게임입니다.",
    "게임은 총 3라운드로 진행합니다.",
    "1라운드와 2라운드는 각각 2개의 문제가 출제되고, 3라운드는 1개의 문제가 출제됩니다. 총 5개의 문제가 순서대로 진행됩니다.",
    "라운드가 시작되면 16개의 숫자가 적힌 게임판의 앞면이 공개됩니다.",
    "1분 뒤 게임판은 알파벳이 적힌 뒷면으로 교체됩니다.",
    "이후 모니터를 통해 각 문제의 출발점, 도착점, 정답 값이 공개됩니다.",
    "플레이어는 앞면에 적힌 숫자를 기억해 출발점부터 도착점까지 이어지는 길을 완성해야 합니다.",
    "길로 이어진 모든 숫자는 합산됩니다.",
    "상하좌우로 변이 맞닿아 있는 숫자끼리만 연결할 수 있습니다.",
    "길을 완성한 플레이어는 정답을 외친 뒤 해당되는 알파벳 경로를 말합니다.",
    "정답인 경우 승점 1점을 획득합니다.",
    "오답인 경우 점수 차감은 없으며, 발언 기회가 상대 플레이어에게 넘어갑니다.",
    "한 라운드가 끝나고 다음 라운드로 넘어갈 때마다 게임판 앞면의 숫자는 교체됩니다.",
    "숫자가 교체된 뒤 다시 1분간 암기 시간이 제공됩니다.",
    "3라운드 종료 시 더 높은 승점을 획득한 플레이어가 승리합니다.",
    "먼저 3점을 달성한 플레이어가 있다면 즉시 승리합니다.",
    "빠른 암기와 암산이 중요하며, 16개의 타일을 전부 외워 빠르게 계산하는 것이 가장 확실한 전략입니다.",
  ],
  win_condition: "3라운드 종료 시 더 높은 승점을 획득하거나 먼저 3점을 달성한 플레이어가 승리",
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
