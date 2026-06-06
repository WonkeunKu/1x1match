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
  id: "same-number-finder",
  title: "같은 숫자 찾기",
  summary: "숨겨진 숫자와 연산기호의 위치를 기억해 목표 숫자를 만드는 수식을 찾아내는 1:1 암기 계산 게임",
  rules: [
    "같은 숫자 찾기는 숫자와 연산기호의 위치를 기억한 뒤, 목표 숫자와 같은 값이 되는 수식을 찾는 게임입니다.",
    "게임판은 A부터 P까지 16개의 알파벳 칸으로 구성됩니다.",
    "각 칸의 뒷면에는 숫자 또는 연산기호가 하나씩 적혀 있으며, 게임 시작 전 플레이어들은 모든 칸의 내용을 일정 시간 동안 확인합니다.",
    "확인 시간이 끝나면 모든 칸은 다시 가려지고, 플레이어들은 칸의 내용을 기억한 상태로 게임을 진행합니다.",
    "라운드마다 운영자는 목표 숫자를 제시합니다.",
    "목표 숫자가 제시되면 먼저 답을 외친 플레이어에게 풀이 기회가 주어집니다.",
    "풀이 기회를 얻은 플레이어는 제한 시간 5초 안에 알파벳 칸 3개를 순서대로 말해야 합니다.",
    "말한 3개의 칸은 숫자, 연산기호, 숫자의 순서가 되어야 하며, 계산 결과가 목표 숫자와 같아야 합니다.",
    "정답이면 해당 플레이어가 승점 1점을 획득합니다.",
    "오답이거나 제한 시간 안에 답하지 못하면 상대 플레이어가 승점 1점을 획득합니다.",
    "한 번 정답으로 사용된 칸 조합은 다시 사용할 수 없습니다.",
    "라운드마다 새로운 목표 숫자를 제시하며 같은 방식으로 반복합니다.",
    "먼저 10점을 획득한 플레이어가 승리합니다.",
  ],
  win_condition: "목표 숫자와 같은 값을 만드는 수식을 찾아 먼저 10점을 획득한 플레이어가 승리",
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
