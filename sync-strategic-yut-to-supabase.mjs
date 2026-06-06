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
  id: "strategic-yut",
  title: "전략 윷놀이",
  summary: "앞면과 뒷면 고정 윷을 선택해 결과를 만들고 상대보다 먼저 말을 통과시키는 1:1 심리 보드게임",
  rules: [
    "기본 진행은 일반 윷놀이와 동일하게 윷판 위에서 말을 이동시키는 방식입니다.",
    "원 규칙은 2:2 방식이지만, 1:1 운영에서는 각 플레이어가 두 자리의 선택을 직접 맡아 진행합니다.",
    "각 플레이어는 말 2개를 가지고 시작합니다.",
    "각 플레이어는 앞면만 나오는 윷가락과 뒷면만 나오는 윷가락을 받습니다.",
    "한 차례는 선 플레이어, 후 플레이어, 후 플레이어, 선 플레이어 순서의 4개 선택으로 구성합니다.",
    "각 선택자는 자신이 가진 윷가락 중 하나를 비공개로 선택해 제출하고, 4개가 모두 제출되면 동시에 공개합니다.",
    "공개된 4개의 윷가락 결과를 합산해 도, 개, 걸, 윷, 모를 판정합니다.",
    "도는 뒷도로 처리합니다.",
    "판정된 결과만큼 해당 순서의 플레이어가 자신의 말 1개를 선택해 이동합니다.",
    "뒷도로 출발점에 다시 들어온 경우에는 한 바퀴를 돈 것으로 인정합니다.",
    "상대의 말을 잡으면 한 번 더 진행할 수 있습니다.",
    "윷이나 모가 나와도 추가 진행은 없습니다.",
    "자신의 말이 있는 칸에 도착하면 말을 업을 수 있으며, 업힌 말들은 함께 이동합니다.",
    "상대의 말뿐 아니라 자신의 다른 말도 잡을 수 있습니다.",
    "한 플레이어의 말 2개가 모두 결승점을 통과하면 해당 플레이어가 승리합니다.",
  ],
  win_condition: "자신의 말 2개를 상대보다 먼저 모두 결승점으로 통과시킨 플레이어가 승리",
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
