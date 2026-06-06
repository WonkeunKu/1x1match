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
  id: "black-and-white",
  title: "흑과백",
  summary: "흑백 색상 힌트와 숫자 패 선택으로 상대의 수를 읽어내는 1:1 심리 숫자 게임",
  rules: [
    "흑과백은 각자 숫자 패를 하나씩 제출해 더 높은 숫자를 낸 플레이어가 승점을 얻는 1:1 게임입니다.",
    "각 플레이어는 0부터 8까지의 숫자 패 9개를 가지고 시작합니다.",
    "숫자 패는 흑색과 백색으로 구분되어 있으며, 색상은 상대에게 줄 수 있는 제한된 힌트로 사용됩니다.",
    "게임은 총 9라운드로 진행됩니다.",
    "라운드마다 선 플레이어가 먼저 숫자 패 1개를 비공개로 제출합니다.",
    "후 플레이어는 선 플레이어가 제출한 패의 색상만 확인한 뒤, 자신도 숫자 패 1개를 비공개로 제출합니다.",
    "두 플레이어가 패를 모두 제출하면 동시에 공개합니다.",
    "더 높은 숫자 패를 제출한 플레이어가 해당 라운드에서 승점 1점을 획득합니다.",
    "두 플레이어가 같은 숫자를 제출한 경우 해당 라운드는 무승부로 처리하며, 어느 쪽도 승점을 얻지 않습니다.",
    "한 번 사용한 숫자 패는 다시 사용할 수 없습니다.",
    "다음 라운드의 선후공은 직전 라운드 결과에 따라 정합니다. 무승부일 경우 직전 라운드의 선후공을 유지합니다.",
    "9라운드가 모두 끝났을 때 승점이 더 높은 플레이어가 승리합니다.",
    "승점이 동률인 경우, 운영자가 정한 연장 규칙에 따라 추가 라운드를 진행합니다.",
  ],
  win_condition: "9라운드 종료 시 더 많은 승점을 획득한 플레이어가 승리",
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
