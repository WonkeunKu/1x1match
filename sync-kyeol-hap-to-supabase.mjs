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
  id: "kyeol-hap",
  title: "결!합!",
  summary: "공개된 도형 카드 9장 안에서 조건을 만족하는 3장 조합을 빠르게 찾아내는 1:1 패턴 추리 게임",
  rules: [
    "결!합!은 공개된 9장의 카드에서 조건을 만족하는 3장 조합인 합을 찾는 게임입니다.",
    "게임에는 도형, 색, 배경 등 3가지 속성이 조합된 총 27장의 카드를 사용합니다.",
    "라운드가 시작되면 운영자는 카드 9장을 공개합니다.",
    "합은 선택한 카드 3장이 각 속성별로 모두 같거나 모두 다른 경우에 성립합니다.",
    "예를 들어 도형 속성이 3장 모두 같거나 3장 모두 다르고, 색 속성도 3장 모두 같거나 모두 다르며, 배경 속성도 같은 조건을 만족해야 합니다.",
    "플레이어는 합을 찾았다고 판단하면 먼저 합을 외치고 카드 3장을 지정합니다.",
    "지정한 3장이 합이면 해당 플레이어가 승점 1점을 획득합니다.",
    "지정한 3장이 합이 아니면 해당 플레이어는 승점 1점을 잃습니다.",
    "이미 정답으로 인정된 합 조합은 같은 라운드에서 다시 말할 수 없습니다.",
    "더 이상 찾을 수 있는 합이 없다고 판단하면 플레이어는 결을 외칠 수 있습니다.",
    "결 선언이 맞으면 해당 플레이어가 승점 3점을 획득하고 라운드를 종료합니다.",
    "결 선언이 틀리면 해당 플레이어는 승점 1점을 잃고 라운드를 계속 진행합니다.",
    "각 라운드는 결 선언이 성공하거나 운영자가 정한 제한 시간이 끝나면 종료됩니다.",
    "총 10라운드를 진행하며, 모든 라운드 종료 후 승점이 더 높은 플레이어가 승리합니다.",
    "동점일 경우 추가 라운드를 진행해 먼저 앞서는 플레이어가 승리합니다.",
  ],
  win_condition: "10라운드 종료 시 더 많은 승점을 획득한 플레이어가 승리",
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
